import db from '@/lib/db';
import redis from '@/lib/redis';
import { type RouterDecision } from '@/lib/intelligence/gemini-optimizer';

export const RATE_LIMITS = {
    audit: { requests: 5, windowMs: 3600000 },      // 5 audits per hour
    anomaly: { requests: 100, windowMs: 60000 },    // 100 detections per minute
    code_audit: { requests: 3, windowMs: 1800000 }, // 3 public code audits per 30 mins
};

export async function checkRateLimit(
    tenantId: string,
    operation: 'audit' | 'anomaly'
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = `ratelimit:intelligence:${operation}:${tenantId}`;
    const limit = RATE_LIMITS[operation];

    if (!redis) {
        // Fallback if redis is not available in local dev
        return { allowed: true, remaining: limit.requests, resetAt: Date.now() + limit.windowMs };
    }

    const current = await redis.incr(key);
    if (current === 1) {
        await redis.pexpire(key, limit.windowMs);
    }

    const ttl = await redis.pttl(key);

    return {
        allowed: current <= limit.requests,
        remaining: Math.max(0, limit.requests - current),
        resetAt: Date.now() + ttl
    };
}

export async function checkIPRateLimit(
    ip: string,
    operation: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = `ratelimit:ip:${operation}:${ip}`;
    const limit = RATE_LIMITS[operation];

    if (!redis) {
        return { allowed: true, remaining: limit.requests, resetAt: Date.now() + limit.windowMs };
    }

    const current = await redis.incr(key);
    if (current === 1) {
        await redis.pexpire(key, limit.windowMs);
    }

    const ttl = await redis.pttl(key);

    return {
        allowed: current <= limit.requests,
        remaining: Math.max(0, limit.requests - current),
        resetAt: Date.now() + ttl
    };
}

export async function getLedgerData(tenantId: string, days: number = 7): Promise<RouterDecision[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const res = await db.query(`
    SELECT 
      request_id as id,
      request_id,
      created_at as timestamp,
      COALESCE(metadata->>'prompt', 'General Task') as task,
      COALESCE((metadata->>'prompt_tokens')::int, 0) as input_tokens,
      COALESCE((metadata->>'completion_tokens')::int, 0) as output_tokens,
      'cost' as requested_mode,
      selected_provider_id as selected_provider,
      COALESCE(metadata->>'model', 'unknown') as selected_model,
      'cost_optimal' as reason,
      cost_usd,
      COALESCE((metadata->>'latency')::int, 0) as latency_ms,
      (reason = 'semantic_hit') as cache_hit,
      true as success,
      tenant_id
    FROM router_decisions
    WHERE tenant_id = $1 
      AND created_at > $2
    ORDER BY created_at DESC
    LIMIT 10000
  `, [tenantId, cutoff.toISOString()]);

    return res.rows.map((row: any) => ({
        ...row,
        timestamp: new Date(row.timestamp),
        cost_usd: parseFloat(row.cost_usd || '0'),
        input_tokens: parseInt(row.input_tokens || '0'),
        output_tokens: parseInt(row.output_tokens || '0'),
        latency_ms: parseInt(row.latency_ms || '0')
    }));
}

export async function getHistoricalBaseline(tenantId: string): Promise<{ avgCost: number; avgLatency: number; expectedCacheHitRate: number }> {
    // Calculate baseline from last 30 days
    const res = await db.query(`
    SELECT 
      AVG(cost_usd) as avg_cost,
      AVG(CASE WHEN metadata->>'latency' IS NOT NULL THEN (metadata->>'latency')::int ELSE 0 END) as avg_latency,
      AVG(CASE WHEN reason = 'semantic_hit' THEN 1 ELSE 0 END) as cache_hit_rate
    FROM router_decisions
    WHERE tenant_id = $1 
      AND created_at > NOW() - INTERVAL '30 days'
  `, [tenantId]);

    const stats = res.rows[0];

    return {
        avgCost: parseFloat(stats?.avg_cost || '0.001'),
        avgLatency: parseFloat(stats?.avg_latency || '200'),
        expectedCacheHitRate: parseFloat(stats?.cache_hit_rate || '0.1')
    };
}
