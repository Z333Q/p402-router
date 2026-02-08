import { db } from '@/lib/db';

/**
 * Real database queries to replace simulation.ts mock data
 * Used by dashboard to show actual P402 traffic and analytics
 */

export interface TrafficRow {
  id: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number;
  created_at: string;
  session_id: string;
  anomaly_type?: string;
  severity?: string;
}

export interface TrafficStats {
  total_requests: number;
  total_cost: number;
  avg_latency: number;
  unique_sessions: number;
  providers_used: string[];
}

export interface PolicyViolation {
  id: string;
  anomaly_type: string;
  severity: string;
  details: any;
  created_at: string;
  model: string;
  cost_usd: number;
}

export interface Settlement {
  id: string;
  session_id: string;
  scheme: 'exact' | 'onchain' | 'receipt';
  tx_hash?: string;
  payment_hash?: string;
  amount_usd: number;
  payer: string;
  verified_at: string;
  created_at: string;
}

/**
 * Get recent AI model usage traffic
 */
export async function getRecentTraffic(tenantId: string, limit = 100): Promise<{ rows: TrafficRow[] }> {
  const query = `
    SELECT
      mu.id,
      mu.model,
      mu.provider,
      mu.input_tokens,
      mu.output_tokens,
      mu.cost_usd,
      mu.latency_ms,
      mu.created_at,
      mu.session_id,
      ba.anomaly_type,
      ba.severity
    FROM model_usage mu
    LEFT JOIN sessions s ON mu.session_id = s.id
    LEFT JOIN billing_anomalies ba ON mu.id = ba.usage_id
    WHERE s.tenant_id = $1
    ORDER BY mu.created_at DESC
    LIMIT $2
  `;

  try {
    return await db.query(query, [tenantId, limit]);
  } catch (error) {
    console.error('Error fetching traffic:', error);
    return { rows: [] };
  }
}

/**
 * Get aggregated traffic statistics
 */
export async function getTrafficStats(tenantId: string, since: Date): Promise<{ rows: TrafficStats[] }> {
  const query = `
    SELECT
      COUNT(*)::int as total_requests,
      COALESCE(SUM(mu.cost_usd), 0) as total_cost,
      COALESCE(AVG(mu.latency_ms), 0) as avg_latency,
      COUNT(DISTINCT mu.session_id)::int as unique_sessions,
      COALESCE(array_agg(DISTINCT mu.provider) FILTER (WHERE mu.provider IS NOT NULL), ARRAY[]::text[]) as providers_used
    FROM model_usage mu
    LEFT JOIN sessions s ON mu.session_id = s.id
    WHERE s.tenant_id = $1 AND mu.created_at >= $2
  `;

  try {
    return await db.query(query, [tenantId, since.toISOString()]);
  } catch (error) {
    console.error('Error fetching traffic stats:', error);
    return { rows: [{
      total_requests: 0,
      total_cost: 0,
      avg_latency: 0,
      unique_sessions: 0,
      providers_used: []
    }] };
  }
}

/**
 * Get policy violations and billing anomalies
 */
export async function getPolicyViolations(tenantId: string, limit = 50): Promise<{ rows: PolicyViolation[] }> {
  const query = `
    SELECT
      ba.id,
      ba.anomaly_type,
      ba.severity,
      ba.details,
      ba.created_at,
      mu.model,
      mu.cost_usd
    FROM billing_anomalies ba
    JOIN model_usage mu ON ba.usage_id = mu.id
    JOIN sessions s ON mu.session_id = s.id
    WHERE s.tenant_id = $1
    ORDER BY ba.created_at DESC
    LIMIT $2
  `;

  try {
    return await db.query(query, [tenantId, limit]);
  } catch (error) {
    console.error('Error fetching policy violations:', error);
    return { rows: [] };
  }
}

/**
 * Get recent payment settlements
 */
export async function getSettlements(tenantId: string, limit = 100): Promise<{ rows: Settlement[] }> {
  const query = `
    SELECT
      pth.tx_hash as id,
      pth.request_id as session_id,
      pth.settlement_type as scheme,
      pth.tx_hash,
      pth.tx_hash as payment_hash,
      COALESCE(pth.amount_usd, 0) as amount_usd,
      'unknown' as payer,
      pth.processed_at as verified_at,
      pth.processed_at as created_at
    FROM processed_tx_hashes pth
    WHERE pth.tenant_id = $1
    ORDER BY pth.processed_at DESC
    LIMIT $2
  `;

  try {
    return await db.query(query, [tenantId, limit]);
  } catch (error) {
    console.error('Error fetching settlements:', error);
    return { rows: [] };
  }
}

/**
 * Get active facilitators and their health status
 */
export async function getActiveFacilitators(): Promise<{ rows: any[] }> {
  const query = `
    SELECT
      f.facilitator_id,
      f.name,
      f.type,
      f.status,
      fh.p95_verify_ms,
      fh.p95_settle_ms,
      fh.success_rate,
      fh.last_checked_at,
      fh.last_error
    FROM facilitators f
    LEFT JOIN facilitator_health fh ON f.facilitator_id = fh.facilitator_id
    WHERE f.status = 'active'
    ORDER BY f.name
  `;

  try {
    return await db.query(query);
  } catch (error) {
    console.error('Error fetching facilitators:', error);
    return { rows: [] };
  }
}

/**
 * Get session analytics
 */
export async function getSessionAnalytics(sessionId: string): Promise<{
  requestCount: number;
  totalCost: number;
  avgLatency: number;
  costHistory: Array<{ timestamp: string; cost: number }>
}> {
  const query = `
    SELECT
      COUNT(*)::int as request_count,
      COALESCE(SUM(cost_usd), 0) as total_cost,
      COALESCE(AVG(latency_ms), 0) as avg_latency,
      json_agg(
        json_build_object(
          'timestamp', created_at,
          'cost', cost_usd
        )
        ORDER BY created_at
      ) as cost_history
    FROM model_usage
    WHERE session_id = $1
  `;

  try {
    const result = await db.query(query, [sessionId]);
    const row = result.rows[0];

    return {
      requestCount: row.request_count || 0,
      totalCost: parseFloat(row.total_cost || '0'),
      avgLatency: parseFloat(row.avg_latency || '0'),
      costHistory: row.cost_history || []
    };
  } catch (error) {
    console.error('Error fetching session analytics:', error);
    return {
      requestCount: 0,
      totalCost: 0,
      avgLatency: 0,
      costHistory: []
    };
  }
}

/**
 * Check if tenant has any usage data
 */
export async function hasUsageData(tenantId: string): Promise<boolean> {
  const query = `
    SELECT 1
    FROM model_usage mu
    JOIN sessions s ON mu.session_id = s.id
    WHERE s.tenant_id = $1
    LIMIT 1
  `;

  try {
    const result = await db.query(query, [tenantId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking usage data:', error);
    return false;
  }
}

/**
 * Get current tenant ID from session or default
 */
export async function getCurrentTenantId(): Promise<string> {
  // In a real implementation, this would get the tenant ID from the current session
  // For now, return the default tenant
  return '00000000-0000-0000-0000-000000000001';
}