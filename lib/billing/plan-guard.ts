import db from '@/lib/db';
import { getPlan } from './plans';
import { ApiError } from '@/lib/errors';

export async function getTenantPlan(tenantId: string): Promise<string> {
    const { rows } = await db.query(
        `SELECT plan FROM tenants WHERE id = $1`,
        [tenantId]
    ) as { rows: { plan: string }[] };

    if (!rows || rows.length === 0 || !rows[0]) {
        return 'free'; // Default fallback assumption
    }

    return rows[0].plan;
}

export async function assertWithinCap(tenantId: string, requestedCostUsd: number): Promise<void> {
    const planId = await getTenantPlan(tenantId);
    const plan = getPlan(planId);

    // 1. Check Hard Cap from Plan Matrix
    const maxSpendUsd = plan.maxMonthlySpendUsd;

    // 2. Query Current Cycle Usage
    // We sum all billing events for the tenant in the current month (UTC)
    const { rows } = await db.query(`
        SELECT SUM(cost_usd_micros) as total_micros
        FROM billing_usage_events
        WHERE tenant_id = $1
          AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
    `, [tenantId]) as { rows: { total_micros: string | null }[] };

    const currentUsageMicros = rows[0]?.total_micros ? BigInt(rows[0].total_micros) : BigInt(0);
    const currentUsageUsd = Number(currentUsageMicros) / 1_000_000;

    // 3. Assert Projection
    if (currentUsageUsd + requestedCostUsd > maxSpendUsd) {
        throw new ApiError({
            code: 'PLAN_CAP_EXCEEDED',
            status: 402,
            message: `Usage cap of $${maxSpendUsd.toFixed(2)} exceeded for ${plan.name} plan.`,
            requestId: `cap_check_${Date.now()}`,
            metadata: {
                requiredPlan: planId === 'free' ? 'pro' : 'enterprise',
                usagePercent: ((currentUsageUsd + requestedCostUsd) / maxSpendUsd) * 100
            }
        });
    }
}
