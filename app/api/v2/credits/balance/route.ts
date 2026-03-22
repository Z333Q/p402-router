/**
 * GET /api/v2/credits/balance
 *
 * Returns current credit balance for the authenticated user.
 * Balance is anchored to human_id_hash if the user is World ID-verified,
 * otherwise to tenant_id.
 *
 * Automatically grants the 500-credit free trial on first call for
 * World ID-verified humans.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth';
import { checkAgentkitAccess } from '@/lib/identity/agentkit';
import { getOrCreateAccount, CREDITS_PER_USD, FREE_TRIAL_CREDITS } from '@/lib/services/credits-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const access = await requireTenantAccess(req);
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const tenantId = access.tenantId;

    // Resolve World ID hash if available
    let humanIdHash: string | undefined;
    if (process.env.AGENTKIT_ENABLED === 'true') {
        const agentkit = await checkAgentkitAccess(req, '/api/v2/credits/balance').catch(() => null);
        if (agentkit?.humanId) humanIdHash = agentkit.humanId;
    }

    try {
        const account = await getOrCreateAccount(humanIdHash, tenantId);

        return NextResponse.json({
            balance: account.balance,
            balance_usd: parseFloat((account.balance / CREDITS_PER_USD).toFixed(4)),
            human_verified: account.humanIdHash !== null,
            free_trial_granted: account.freeTrialGranted,
            free_trial_credits: FREE_TRIAL_CREDITS,
            lifetime_purchased: account.lifetimePurchased,
            lifetime_spent: account.lifetimeSpent,
            created_at: account.createdAt,
        });
    } catch (error: unknown) {
        console.error('[Credits] Balance error:', error);
        return NextResponse.json({ error: 'Failed to fetch credit balance' }, { status: 500 });
    }
}
