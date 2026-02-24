import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
    // 1. Secure the internal cron route
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CRON] Starting incremental KPI rollup...');

    try {
        // 2. Revenue Rollup — only last 2 days (handles late-arriving settlements)
        // Reads from x402_payments which is indexed on (created_at, status).
        // This query runs in milliseconds even at scale.
        await db.query(`
            INSERT INTO kpi_daily_revenue (
                date, tenant_id, plan_tier, 
                total_x402_volume_micros, total_platform_fees_micros
            )
            SELECT 
                DATE(created_at) AS date,
                tenant_id,
                COALESCE(plan_at_time, 'free') AS plan_tier,
                SUM(amount_usd_micros) AS total_x402_volume_micros,
                SUM(platform_fee_usd_micros) AS total_platform_fees_micros
            FROM x402_payments
            WHERE status = 'settled' 
              AND created_at >= NOW() - INTERVAL '2 days'
            GROUP BY DATE(created_at), tenant_id, plan_at_time
            ON CONFLICT (date, tenant_id) 
            DO UPDATE SET 
                total_x402_volume_micros = EXCLUDED.total_x402_volume_micros,
                total_platform_fees_micros = EXCLUDED.total_platform_fees_micros,
                updated_at = NOW()
        `);

        // 3. Adoption & Safety Rollup — tracks task volume, cache efficiency, and quarantines
        await db.query(`
            INSERT INTO kpi_daily_adoption (
                date, tenant_id, total_a2a_tasks, cache_hits, safety_blocks
            )
            SELECT 
                DATE(timestamp) AS date,
                tenant_id,
                COUNT(*) AS total_a2a_tasks,
                SUM(CASE WHEN cache_hit = true THEN 1 ELSE 0 END) AS cache_hits,
                SUM(CASE WHEN status = 'failed' AND error_code IN (
                    'SECURITY_PACK_BLOCKED', 'ERC8004_QUARANTINE'
                ) THEN 1 ELSE 0 END) AS safety_blocks
            FROM a2a_tasks
            WHERE timestamp >= NOW() - INTERVAL '2 days'
            GROUP BY DATE(timestamp), tenant_id
            ON CONFLICT (date, tenant_id)
            DO UPDATE SET 
                total_a2a_tasks = EXCLUDED.total_a2a_tasks,
                cache_hits = EXCLUDED.cache_hits,
                safety_blocks = EXCLUDED.safety_blocks,
                updated_at = NOW()
        `);

        // 4. Log to billing reconciliation for audit trail
        await db.query(`
            INSERT INTO billing_reconciliation_runs (run_type, processed, failed, completed_at)
            VALUES ('kpi_rollup', 1, 0, NOW())
        `);

        return NextResponse.json({ success: true, message: 'KPI rollup completed.' });

    } catch (error: any) {
        console.error('[CRON] KPI rollup failed:', error);
        return NextResponse.json({ error: 'Rollup failed' }, { status: 500 });
    }
}
