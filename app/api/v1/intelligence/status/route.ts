import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { checkRateLimit } from '@/lib/intelligence/api-helpers';

export async function GET(request: NextRequest) {
    try {
        const tenantId = request.headers.get('x-tenant-id');
        if (!tenantId) {
            return NextResponse.json(
                { error: 'Unauthorized', code: 'MISSING_TENANT' },
                { status: 401 }
            );
        }

        const { rows: recentAudits } = await db.query(`
      SELECT audit_id, findings_count, actions_executed, total_savings_usd, created_at
      FROM intelligence_audits
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [tenantId]);

        const res = await db.query(`
      SELECT 
        COUNT(*) as total_audits,
        COALESCE(SUM(total_savings_usd), 0) as total_savings,
        COALESCE(SUM(actions_executed), 0) as total_actions,
        COALESCE(AVG(findings_count), 0) as avg_findings
      FROM intelligence_audits
      WHERE tenant_id = $1
        AND created_at > NOW() - INTERVAL '30 days'
    `, [tenantId]);

        const stats = res.rows[0];

        const auditRateLimit = await checkRateLimit(tenantId, 'audit');
        const anomalyRateLimit = await checkRateLimit(tenantId, 'anomaly');

        return NextResponse.json({
            status: 'operational',
            agent: {
                name: 'P402 Protocol Economist (OpenRouter-Aware)',
                version: '2.0.0',
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
                    total_audits: parseInt(stats?.total_audits || '0'),
                    total_savings_usd: parseFloat(stats?.total_savings || '0'),
                    total_actions_executed: parseInt(stats?.total_actions || '0'),
                    avg_findings_per_audit: parseFloat(stats?.avg_findings || '0')
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
