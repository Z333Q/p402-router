/**
 * P402 Intelligence API Routes
 * 
 * Endpoints:
 * - POST /api/v1/intelligence/audit - Run forensic audit
 * - POST /api/v1/intelligence/anomaly - Real-time anomaly detection
 * - GET  /api/v1/intelligence/status - Agent status and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { GeminiOptimizer, type LedgerEntry, type CostMetric } from '@/lib/intelligence/gemini-optimizer';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

// ============================================================================
// CONFIGURATION
// ============================================================================

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;

// Rate limiting for intelligence endpoints (expensive operations)
const RATE_LIMITS = {
  audit: { requests: 5, windowMs: 3600000 },      // 5 audits per hour
  anomaly: { requests: 100, windowMs: 60000 },    // 100 detections per minute
};

// ============================================================================
// HELPERS
// ============================================================================

async function checkRateLimit(
  tenantId: string, 
  operation: 'audit' | 'anomaly'
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:intelligence:${operation}:${tenantId}`;
  const limit = RATE_LIMITS[operation];
  
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

async function getLedgerData(tenantId: string, days: number = 7): Promise<LedgerEntry[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  // In production, this queries PostgreSQL
  const rows = await db.query<LedgerEntry>(`
    SELECT 
      id,
      tenant_id,
      request_id,
      model,
      provider,
      input_tokens,
      output_tokens,
      cost_usd,
      latency_ms,
      cache_hit,
      created_at,
      metadata
    FROM router_decisions
    WHERE tenant_id = $1 
      AND created_at > $2
    ORDER BY created_at DESC
    LIMIT 10000
  `, [tenantId, cutoff.toISOString()]);
  
  return rows;
}

async function getHistoricalBaseline(tenantId: string): Promise<{ mean: number; stdDev: number }> {
  // Calculate baseline from last 30 days
  const stats = await db.queryOne<{ mean: number; std_dev: number }>(`
    SELECT 
      AVG(cost_usd) as mean,
      STDDEV(cost_usd) as std_dev
    FROM router_decisions
    WHERE tenant_id = $1 
      AND created_at > NOW() - INTERVAL '30 days'
  `, [tenantId]);
  
  return {
    mean: stats?.mean || 0.001,
    stdDev: stats?.std_dev || 0.0005
  };
}

// ============================================================================
// POST /api/v1/intelligence/audit
// Run a full forensic audit with autonomous optimization
// ============================================================================

export async function POST_audit(request: NextRequest) {
  try {
    // Extract tenant from auth
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'MISSING_TENANT' },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(tenantId, 'audit');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          code: 'RATE_LIMITED',
          retry_after: Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimit.resetAt),
            'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000))
          }
        }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const {
      days = 7,
      execute_actions = true,
      max_actions = 10,
      budget_constraint,
      dry_run = false
    } = body;

    // Fetch ledger data
    const ledgerData = await getLedgerData(tenantId, days);
    
    if (ledgerData.length === 0) {
      return NextResponse.json({
        audit_id: `audit_empty_${Date.now()}`,
        tenant_id: tenantId,
        thinking_trace: ['No ledger data found for the specified time period'],
        findings: [],
        recommendations: [],
        executed_actions: [],
        total_savings_usd: 0,
        created_at: new Date().toISOString(),
        model_used: 'gemini-3-pro-preview',
        thinking_level: 'high',
        context_tokens_used: 0,
        p402: { cached: false, source: 'empty_ledger' }
      });
    }

    // Initialize optimizer and run audit
    const optimizer = new GeminiOptimizer(GOOGLE_API_KEY, tenantId);
    
    const result = await optimizer.runForensicAudit(ledgerData, {
      executeActions: execute_actions && !dry_run,
      maxActions: max_actions,
      budgetConstraint: budget_constraint
    });

    // Store audit result for historical tracking
    await db.query(`
      INSERT INTO intelligence_audits (
        audit_id, tenant_id, findings_count, actions_executed, 
        total_savings_usd, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      result.audit_id,
      tenantId,
      result.findings.length,
      result.executed_actions.length,
      result.total_savings_usd,
      result.created_at
    ]);

    // Return with P402 metadata
    return NextResponse.json({
      ...result,
      p402: {
        cached: result.thinking_trace[0]?.includes('[CACHE HIT]') || false,
        source: result.thinking_trace[0]?.includes('[CACHE HIT]') ? 'semantic_cache' : 'gemini_pro',
        ledger_entries_analyzed: ledgerData.length,
        dry_run
      }
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-P402-Model': result.model_used,
        'X-P402-Thinking-Level': result.thinking_level
      }
    });

  } catch (error) {
    console.error('Intelligence audit error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'AUDIT_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/v1/intelligence/anomaly
// Real-time anomaly detection for a single metric
// ============================================================================

export async function POST_anomaly(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'MISSING_TENANT' },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(tenantId, 'anomaly');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const metric: CostMetric = body.metric;
    
    if (!metric) {
      return NextResponse.json(
        { error: 'Missing metric in request body', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    // Get baseline for comparison
    const baseline = await getHistoricalBaseline(tenantId);

    // Run anomaly detection
    const optimizer = new GeminiOptimizer(GOOGLE_API_KEY, tenantId);
    const result = await optimizer.detectAnomaly(metric, baseline);

    // If critical anomaly, trigger async audit
    if (result.is_anomaly && (result.severity === 'high' || result.severity === 'critical')) {
      // Queue background audit (don't await)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1/intelligence/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-internal-trigger': 'anomaly_escalation'
        },
        body: JSON.stringify({ days: 1, execute_actions: true, max_actions: 3 })
      }).catch(console.error);
    }

    return NextResponse.json({
      ...result,
      baseline,
      p402: {
        model: 'gemini-3-flash-preview',
        thinking_level: 'low',
        latency_target_ms: 500
      }
    });

  } catch (error) {
    console.error('Anomaly detection error:', error);
    return NextResponse.json(
      { error: 'Detection failed', code: 'ANOMALY_FAILED' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/v1/intelligence/status
// Get intelligence agent status and recent activity
// ============================================================================

export async function GET_status(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'MISSING_TENANT' },
        { status: 401 }
      );
    }

    // Get recent audit history
    const recentAudits = await db.query<{
      audit_id: string;
      findings_count: number;
      actions_executed: number;
      total_savings_usd: number;
      created_at: string;
    }>(`
      SELECT audit_id, findings_count, actions_executed, total_savings_usd, created_at
      FROM intelligence_audits
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [tenantId]);

    // Calculate aggregate stats
    const stats = await db.queryOne<{
      total_audits: number;
      total_savings: number;
      total_actions: number;
      avg_findings: number;
    }>(`
      SELECT 
        COUNT(*) as total_audits,
        COALESCE(SUM(total_savings_usd), 0) as total_savings,
        COALESCE(SUM(actions_executed), 0) as total_actions,
        COALESCE(AVG(findings_count), 0) as avg_findings
      FROM intelligence_audits
      WHERE tenant_id = $1
        AND created_at > NOW() - INTERVAL '30 days'
    `, [tenantId]);

    // Get rate limit status
    const auditRateLimit = await checkRateLimit(tenantId, 'audit');
    const anomalyRateLimit = await checkRateLimit(tenantId, 'anomaly');

    return NextResponse.json({
      status: 'operational',
      agent: {
        name: 'P402 Protocol Economist',
        version: '1.0.0',
        models: {
          sentinel: 'gemini-3-flash-preview',
          economist: 'gemini-3-pro-preview',
          embedding: 'text-embedding-004'
        },
        capabilities: [
          'real_time_anomaly_detection',
          'forensic_cost_audit',
          'autonomous_optimization',
          'semantic_caching',
          'multi_turn_tool_execution'
        ]
      },
      stats: {
        last_30_days: {
          total_audits: stats?.total_audits || 0,
          total_savings_usd: stats?.total_savings || 0,
          total_actions_executed: stats?.total_actions || 0,
          avg_findings_per_audit: stats?.avg_findings || 0
        }
      },
      recent_audits: recentAudits,
      rate_limits: {
        audit: {
          remaining: auditRateLimit.remaining,
          reset_at: new Date(auditRateLimit.resetAt).toISOString()
        },
        anomaly: {
          remaining: anomalyRateLimit.remaining,
          reset_at: new Date(anomalyRateLimit.resetAt).toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Status check failed', code: 'STATUS_FAILED' },
      { status: 500 }
    );
  }
}
