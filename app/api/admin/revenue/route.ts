import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const url = new URL(req.url);
        const days = Math.min(parseInt(url.searchParams.get('days') || '30', 10), 365);

        // Zero-latency reads — queries the pre-calculated rollup table only
        const revenueData = await db.query(`
            SELECT 
                date,
                SUM(total_x402_volume_micros)      AS volume_micros,
                SUM(total_platform_fees_micros)    AS fees_micros,
                SUM(subscription_revenue_micros)   AS subscriptions_micros,
                COUNT(DISTINCT tenant_id)          AS active_tenants
            FROM kpi_daily_revenue
            WHERE date >= CURRENT_DATE - $1::int
            GROUP BY date
            ORDER BY date ASC
        `, [days]);

        const adoptionData = await db.query(`
            SELECT
                date,
                SUM(total_a2a_tasks)   AS total_tasks,
                SUM(cache_hits)        AS cache_hits,
                SUM(safety_blocks)     AS safety_blocks
            FROM kpi_daily_adoption
            WHERE date >= CURRENT_DATE - $1::int
            GROUP BY date
            ORDER BY date ASC
        `, [days]);

        return NextResponse.json({
            period_days: days,
            revenue: revenueData.rows,
            adoption: adoptionData.rows,
        });

    } catch (error: any) {
        console.error('Admin revenue fetch failed:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
