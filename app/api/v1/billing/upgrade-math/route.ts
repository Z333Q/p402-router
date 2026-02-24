import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';

/**
 * GET /api/v1/billing/upgrade-math
 * 
 * Calculates personalized savings for upgrading to Pro/Enterprise.
 * Based on 30-day trailing volume and failed settlement costs.
 */
export async function GET(req: NextRequest) {
    const access = await requireTenantAccess(req);
    if (access.error) {
        return NextResponse.json({
            authenticated: false,
            message: 'Login to see personalized savings'
        }, { status: 200 }); // Return 200 so the UI can handle anonymous state gracefully
    }

    const tenantId = access.tenantId;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
        // 1. Calculate 30-day trailing volume ($) from completed x402 payments
        const volumeQuery = `
            SELECT SUM(amount_usd) as total_volume
            FROM x402_payments
            WHERE tenant_id = $1
            AND status = 'completed'
            AND created_at >= $2
        `;
        const volumeResult = await db.query(volumeQuery, [tenantId, thirtyDaysAgo]);
        const trailingVolume = parseFloat(volumeResult.rows[0]?.total_volume || '0');

        // 2. Calculate "Cost of Issues" - estimated loss from failed settlements/routing
        // We look for failed router decisions that might have been avoided with Pro retries/priority
        const issuesQuery = `
            SELECT COUNT(*) as failed_count, SUM(cost_usd) as failed_cost
            FROM router_decisions
            WHERE tenant_id = $1
            AND success = false
            AND created_at >= $2
        `;
        const issuesResult = await db.query(issuesQuery, [tenantId, thirtyDaysAgo]);
        const failedCount = parseInt(issuesResult.rows[0]?.failed_count || '0');
        const failedCost = parseFloat(issuesResult.rows[0]?.failed_cost || '0');

        // 3. Calculate Fee Savings
        // Free: 1.00% | Pro: 0.75% | Enterprise: 0.40%
        const currentFees = trailingVolume * 0.01;
        const proFees = trailingVolume * 0.0075;
        const enterpriseFees = trailingVolume * 0.004;

        const proSavings = currentFees - proFees;
        const enterpriseSavings = currentFees - enterpriseFees;

        return NextResponse.json({
            authenticated: true,
            tenant_id: tenantId,
            trailing_30d: {
                volume_usd: trailingVolume,
                failed_count: failedCount,
                estimated_issue_cost_usd: failedCost + (failedCount * 0.05), // $0.05 overhead per failure simulation
            },
            fees: {
                current_1pct: currentFees,
                pro_075pct: proFees,
                enterprise_040pct: enterpriseFees
            },
            potential_savings: {
                pro_monthly: proSavings,
                enterprise_monthly: enterpriseSavings,
                pro_yearly: proSavings * 12
            }
        });

    } catch (error: any) {
        console.error('[Billing/UpgradeMath] Error:', error);
        return NextResponse.json({ error: 'Failed to calculate upgrade math' }, { status: 500 });
    }
}
