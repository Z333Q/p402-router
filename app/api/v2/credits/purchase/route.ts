/**
 * POST /api/v2/credits/purchase
 *
 * Purchase credits. Volume discounts applied automatically:
 *   < 10,000 credits   → face value ($0.01/credit)
 *   10,000–99,999      → 5% off  ($0.0095/credit)
 *   100,000+           → 10% off ($0.009/credit)
 *
 * World ID-verified humans get an additional +5% discount (capped at 15%).
 *
 * V1: This endpoint records the intent. Actual USDC transfer happens via
 * the x402 settlement flow or MiniKit Pay — the caller must settle payment
 * separately and reference the `reference_id` returned here.
 *
 * Body:
 *   { credits: number, payment_tx_hash?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth';
import { checkAgentkitAccess } from '@/lib/identity/agentkit';
import { purchaseCredits, computeDiscount } from '@/lib/services/credits-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const access = await requireTenantAccess(req);
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const tenantId = access.tenantId;

    let humanIdHash: string | undefined;
    if (process.env.AGENTKIT_ENABLED === 'true') {
        const agentkit = await checkAgentkitAccess(req, '/api/v2/credits/purchase').catch(() => null);
        if (agentkit?.humanId) humanIdHash = agentkit.humanId;
    }

    try {
        const body = await req.json();
        const { credits, payment_tx_hash } = body;

        if (!credits || typeof credits !== 'number' || credits < 1) {
            return NextResponse.json({
                error: { code: 'INVALID_AMOUNT', message: 'credits must be a positive integer' }
            }, { status: 400 });
        }

        if (credits > 10_000_000) {
            return NextResponse.json({
                error: { code: 'AMOUNT_TOO_LARGE', message: 'Maximum single purchase is 10,000,000 credits' }
            }, { status: 400 });
        }

        const referenceId = payment_tx_hash ?? `purchase_${crypto.randomUUID()}`;

        const result = await purchaseCredits(humanIdHash, tenantId, credits, referenceId);

        return NextResponse.json({
            object: 'credit_purchase',
            credits_added: result.creditsAdded,
            discount_pct: result.discountPct,
            usd_charged: result.usdCharged,
            new_balance: result.account.balance,
            new_balance_usd: parseFloat((result.account.balance / 100).toFixed(4)),
            reference_id: referenceId,
            human_verified: result.account.humanIdHash !== null,
        }, { status: 201 });

    } catch (error: unknown) {
        console.error('[Credits] Purchase error:', error);
        return NextResponse.json({ error: 'Failed to process credit purchase' }, { status: 500 });
    }
}

/**
 * GET /api/v2/credits/purchase — pricing preview (no auth required)
 * Returns pricing tiers for a given ?credits= amount.
 */
export async function GET(req: NextRequest) {
    const credits = parseInt(req.nextUrl.searchParams.get('credits') ?? '1000', 10);
    if (isNaN(credits) || credits < 1) {
        return NextResponse.json({ error: 'credits must be a positive integer' }, { status: 400 });
    }

    const standard = computeDiscount(credits, false);
    const verified = computeDiscount(credits, true);

    return NextResponse.json({
        credits,
        standard: {
            discount_pct: standard.discountPct,
            price_per_credit: standard.pricePerCredit,
            total_usd: standard.totalUsd,
        },
        verified_human: {
            discount_pct: verified.discountPct,
            price_per_credit: verified.pricePerCredit,
            total_usd: verified.totalUsd,
        },
        tiers: [
            { min_credits: 0,       discount_pct: 0,  label: 'Standard' },
            { min_credits: 10_000,  discount_pct: 5,  label: 'Volume 5%' },
            { min_credits: 100_000, discount_pct: 10, label: 'Volume 10%' },
        ],
        verified_bonus: '+5% for World ID-verified humans (stacks with volume tier, max 15%)',
    });
}
