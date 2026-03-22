/**
 * GET  /api/v2/escrow  — List escrows (payer or provider = tenant wallet)
 * POST /api/v2/escrow  — Create a new escrow
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';
import {
    createEscrow,
    listEscrows,
    type EscrowState,
} from '@/lib/services/escrow-service';
import { checkAgentkitAccess } from '@/lib/identity/agentkit';

export const dynamic = 'force-dynamic';

// =============================================================================
// LIST
// =============================================================================

export async function GET(req: NextRequest) {
    const access = await requireTenantAccess(req);
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = req.nextUrl;
    const address = searchParams.get('address') ?? undefined;
    const state = (searchParams.get('state') as EscrowState | null) ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

    try {
        const escrows = await listEscrows({ address, state, limit });
        return NextResponse.json({ object: 'list', data: escrows, count: escrows.length });
    } catch (error: unknown) {
        return toApiErrorResponse(error, crypto.randomUUID());
    }
}

// =============================================================================
// CREATE
// =============================================================================

export async function POST(req: NextRequest) {
    const access = await requireTenantAccess(req);
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    try {
        const body = await req.json();
        const { reference_id, payer, provider, net_amount_usd } = body;

        if (!reference_id || !payer || !provider || !net_amount_usd) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    code: 'MISSING_FIELDS',
                    message: 'reference_id, payer, provider, and net_amount_usd are required',
                }
            }, { status: 400 });
        }

        if (net_amount_usd < 0.01) {
            return NextResponse.json({
                error: { type: 'invalid_request', code: 'AMOUNT_TOO_LOW', message: 'Minimum escrow is $0.01' }
            }, { status: 400 });
        }

        // Optionally resolve World ID human_id_hash for both parties
        const agentkit = await checkAgentkitAccess(req, '/api/v2/escrow').catch(() => null);
        let payerHumanId: string | undefined;
        let providerHumanId: string | undefined;

        if (process.env.AGENTKIT_ENABLED === 'true') {
            // Resolve payer via session token
            if (agentkit?.humanId) payerHumanId = agentkit.humanId;

            // Resolve provider via AgentBook lookup (fire-and-forget — non-blocking)
            if (provider) {
                try {
                    const { createAgentBookVerifier } = await import('@worldcoin/agentkit');
                    const agentBook = createAgentBookVerifier({ network: 'base' });
                    const humanId = await agentBook.lookupHuman(provider, 'eip155:8453');
                    if (humanId) providerHumanId = humanId;
                } catch { /* non-blocking */ }
            }
        }

        const escrow = await createEscrow({
            referenceId: reference_id,
            payer,
            provider,
            netAmountUsd: Number(net_amount_usd),
            payerHumanId,
            providerHumanId,
        });

        return NextResponse.json({ object: 'escrow', ...escrow }, { status: 201 });
    } catch (error: unknown) {
        console.error('[Escrow] Create error:', error);
        return toApiErrorResponse(error, crypto.randomUUID());
    }
}
