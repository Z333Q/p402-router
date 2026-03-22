/**
 * GET /api/v2/credits/history
 *
 * Returns paginated transaction history for the authenticated user's credit account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth';
import { checkAgentkitAccess } from '@/lib/identity/agentkit';
import { getHistory, CREDITS_PER_USD } from '@/lib/services/credits-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const access = await requireTenantAccess(req);
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const tenantId = access.tenantId;

    let humanIdHash: string | undefined;
    if (process.env.AGENTKIT_ENABLED === 'true') {
        const agentkit = await checkAgentkitAccess(req, '/api/v2/credits/history').catch(() => null);
        if (agentkit?.humanId) humanIdHash = agentkit.humanId;
    }

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10), 200);

    try {
        const transactions = await getHistory(humanIdHash, tenantId, limit);

        return NextResponse.json({
            object: 'list',
            data: transactions.map(t => ({
                id: t.id,
                type: t.type,
                credits: t.amount,         // positive = credit, negative = debit
                balance_after: t.balanceAfter,
                usd_equivalent: t.usdEquivalent,
                discount_pct: t.discountPct,
                reference_id: t.referenceId,
                created_at: t.createdAt,
            })),
            count: transactions.length,
        });
    } catch (error: unknown) {
        console.error('[Credits] History error:', error);
        return NextResponse.json({ error: 'Failed to fetch credit history' }, { status: 500 });
    }
}
