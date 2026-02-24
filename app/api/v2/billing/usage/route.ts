import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        // 1. Get plan and spend limit
        const tenantRes = await db.query(
            'SELECT plan FROM tenants WHERE id = $1',
            [tenantId]
        );
        const tenant = tenantRes.rows[0];

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        const planId = tenant.plan || 'free';
        const maxSpendUsd = planId === 'pro' ? 5000.00 : 5.00;

        // 2. Aggregate spend for the current UTC month
        const startOfMonth = new Date();
        startOfMonth.setUTCDate(1);
        startOfMonth.setUTCHours(0, 0, 0, 0);

        const usageRes = await db.query(`
            SELECT (
                COALESCE((SELECT SUM(cost_usd) FROM router_decisions 
                 WHERE tenant_id = $1 AND timestamp >= $2), 0) +
                COALESCE((SELECT SUM(cost_usd) FROM a2a_tasks 
                 WHERE tenant_id = $1 AND created_at >= $2), 0)
            ) as total_spend
        `, [tenantId, startOfMonth.toISOString()]);

        const currentUsageUsd = parseFloat(usageRes.rows[0].total_spend || '0');
        const usagePercent = maxSpendUsd > 0 ? (currentUsageUsd / maxSpendUsd) * 100 : 0;

        return NextResponse.json({
            planId,
            maxSpendUsd,
            currentUsageUsd,
            usagePercent,
            tenantId
        });
    } catch (error) {
        console.error('Usage API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
