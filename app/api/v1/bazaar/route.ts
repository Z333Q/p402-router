import { NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * GET /api/v1/bazaar
 * Public endpoint for x402 Bazaar discovery
 * Returns all discoverable x402-compatible services
 * Spec: https://x402.gitbook.io/x402/core-concepts/bazaar-discovery-layer
 */
export async function GET() {
    try {
        const result = await pool.query(`
          WITH metrics AS (
            SELECT 
                route_id,
                COUNT(*) as total_calls,
                CASE 
                    WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / COUNT(*))
                    ELSE 1.0 
                END as real_success_rate,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as real_p95_latency
            FROM router_decisions
            GROUP BY route_id
          )
          SELECT 
            r.*,
            fh.status as health_status,
            fh.last_checked_at as health_last_checked,
            COALESCE(m.total_calls, 0) as total_calls,
            COALESCE(m.real_success_rate, 1.0) as success_rate_ledger,
            COALESCE(m.real_p95_latency, 0) as p95_latency_ledger
          FROM bazaar_resources r
          LEFT JOIN facilitator_health fh ON r.source_facilitator_id = fh.facilitator_id
          LEFT JOIN metrics m ON m.route_id = 'route_' || r.canonical_route_id
          ORDER BY r.rank_score DESC, r.updated_at DESC
        `);

        return NextResponse.json({
            resources: result.rows,
            count: result.rows.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Bazaar API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch bazaar resources' },
            { status: 500 }
        );
    }
}
