import pool from '../db';

export class BillingError extends Error {
    constructor(public code: 'LIMIT_EXCEEDED' | 'UNAUTHORIZED' | 'MISSING_PLAN', message: string) {
        super(message);
        this.name = 'BillingError';
    }
}

export async function checkUsageLimit(tenantId: string): Promise<void> {
    // 1. Get plan and spend limit
    const tenantRes = await pool.query(
        'SELECT plan FROM tenants WHERE id = $1',
        [tenantId]
    );
    const tenant = tenantRes.rows[0];

    if (!tenant) {
        throw new BillingError('UNAUTHORIZED', 'Tenant not found');
    }

    const planId = tenant.plan || 'free';
    const maxSpendUsd = planId === 'pro' ? 5000.00 : 5.00;

    // 2. Aggregate spend for the current UTC month
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const usageRes = await pool.query(`
        SELECT (
            COALESCE((SELECT SUM(cost_usd) FROM router_decisions 
             WHERE tenant_id = $1 AND timestamp >= $2), 0) +
            COALESCE((SELECT SUM(cost_usd) FROM a2a_tasks 
             WHERE tenant_id = $1 AND created_at >= $2), 0)
        ) as total_spend
    `, [tenantId, startOfMonth.toISOString()]);

    const currentUsageUsd = parseFloat(usageRes.rows[0].total_spend || '0');

    if (currentUsageUsd >= maxSpendUsd) {
        throw new BillingError(
            'LIMIT_EXCEEDED',
            `Monthly spend limit of $${maxSpendUsd.toFixed(2)} reached for ${planId} plan. Please upgrade to Pro for more bandwidth.`
        );
    }
}
