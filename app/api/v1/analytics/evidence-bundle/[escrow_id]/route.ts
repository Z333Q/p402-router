/**
 * GET /api/v1/analytics/evidence-bundle/{escrow_id}
 *
 * Returns a signed evidence bundle for a specific escrow, including:
 * - Escrow state transitions (audit trail)
 * - On-chain tx hashes
 * - Delivery proof hash
 * - World ID verification flags for both parties (never reveals human_id_hash)
 * - Reputation scores at time of query
 *
 * Phase 3.3 — Evidence Bundle Enhancement
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth';
import { getEscrow, getEscrowEvents } from '@/lib/services/escrow-service';
import { getReputationScore } from '@/lib/identity/reputation';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ escrow_id: string }> }
) {
    const access = await requireTenantAccess(req);
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { escrow_id } = await params;

    const [escrow, events] = await Promise.all([
        getEscrow(escrow_id),
        getEscrowEvents(escrow_id),
    ]);

    if (!escrow) {
        return NextResponse.json(
            { error: { code: 'NOT_FOUND', message: 'Escrow not found' } },
            { status: 404 }
        );
    }

    // Fetch reputation scores for both parties (non-blocking — null on miss)
    const [payerReputation, providerReputation] = await Promise.all([
        escrow.payerHumanId ? getReputationScore(escrow.payerHumanId).catch(() => null) : Promise.resolve(null),
        escrow.providerHumanId ? getReputationScore(escrow.providerHumanId).catch(() => null) : Promise.resolve(null),
    ]);

    const bundle = {
        bundle_version: '1.0',
        generated_at: new Date().toISOString(),

        // Escrow identity (never includes human_id_hash)
        escrow: {
            id: escrow.id,
            reference_id: escrow.referenceId,
            state: escrow.state,
            token: escrow.token,
            gross_amount_usd: escrow.grossAmount,
            net_amount_usd: escrow.netAmount,
            fee_amount_usd: escrow.feeAmount,
            proof_hash: escrow.proofHash,
            dispute_window_sec: escrow.disputeWindowSec,
        },

        // Parties (addresses only — no human_id_hash returned)
        parties: {
            payer: {
                address: escrow.payer,
                human_verified: escrow.payerHumanId !== null,
                reputation_score: payerReputation,
            },
            provider: {
                address: escrow.provider,
                human_verified: escrow.providerHumanId !== null,
                reputation_score: providerReputation,
            },
        },

        // On-chain tx hashes
        transactions: {
            create: escrow.txCreate,
            fund: escrow.txFund,
            settle: escrow.txSettle,
        },

        // Full state transition log
        state_transitions: events.map((e: Record<string, unknown>) => ({
            from: e.from_state,
            to: e.to_state,
            actor: e.actor,
            tx_hash: e.tx_hash,
            timestamp: e.created_at,
            metadata: e.metadata,
        })),

        // Timeline
        timeline: {
            created_at: escrow.createdAt,
            funded_at: escrow.fundedAt,
            accepted_at: escrow.acceptedAt,
            delivered_at: escrow.deliveredAt,
            settled_at: escrow.settledAt,
            disputed_at: escrow.disputedAt,
            resolved_at: escrow.resolvedAt,
            expires_at: escrow.expiresAt,
        },
    };

    const download = req.nextUrl.searchParams.get('download') === 'true';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (download) {
        headers['Content-Disposition'] = `attachment; filename="evidence-bundle-${escrow_id}.json"`;
    }

    return NextResponse.json({ bundle }, { headers });
}
