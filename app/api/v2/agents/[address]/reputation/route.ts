/**
 * GET /api/v2/agents/{address}/reputation
 *
 * Returns the World ID–anchored reputation score for an agent wallet address.
 *
 * The score is indexed on the World ID nullifier hash (human_id_hash), not the
 * wallet address itself — so multiple wallets belonging to the same verified
 * human share one reputation. Wallet rotation does not reset it.
 *
 * Privacy contract:
 *   - human_id_hash is NEVER returned in the response
 *   - Only score, component scores, counters, and public_profile flag are exposed
 *   - AgentBook lookup is required (AGENTKIT_ENABLED=true)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAgentBookVerifier } from '@worldcoin/agentkit';
import { getReputation } from '@/lib/identity/reputation';

export const dynamic = 'force-dynamic';

const AGENTKIT_ENABLED = process.env.AGENTKIT_ENABLED === 'true';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ address: string }> }
) {
    const { address } = await params;

    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
        return NextResponse.json(
            { error: 'Invalid address parameter' },
            { status: 400 }
        );
    }

    if (!AGENTKIT_ENABLED) {
        return NextResponse.json(
            { error: 'Reputation requires World AgentKit (AGENTKIT_ENABLED=false)' },
            { status: 501 }
        );
    }

    try {
        // Look up the human_id_hash for this address in AgentBook
        const agentBook = createAgentBookVerifier({ network: 'base' });
        const humanId = await agentBook.lookupHuman(address, 'eip155:8453');

        if (!humanId) {
            return NextResponse.json({
                address,
                registered: false,
                reputation: null,
                message: 'Address is not registered in AgentBook. Reputation requires World ID verification.',
            });
        }

        // Fetch reputation record (DO NOT expose humanId)
        const rep = await getReputation(humanId);

        if (!rep) {
            // Registered human with no activity yet — return neutral defaults
            return NextResponse.json({
                address,
                registered: true,
                reputation: {
                    score: 0.5,
                    components: {
                        settlement: 0.5,
                        session: 0.5,
                        dispute: 1.0,
                        sentinel: 1.0,
                    },
                    activity: {
                        settled_count: 0,
                        session_count: 0,
                        session_completed_count: 0,
                        dispute_count: 0,
                        anomaly_count: 0,
                    },
                    public_profile: false,
                    first_seen_at: null,
                    last_updated_at: null,
                },
            });
        }

        return NextResponse.json({
            address,
            registered: true,
            reputation: {
                score: rep.score,
                components: {
                    settlement: rep.settlementScore,
                    session: rep.sessionScore,
                    dispute: rep.disputeScore,
                    sentinel: rep.sentinelScore,
                },
                activity: {
                    settled_count: rep.settledCount,
                    session_count: rep.sessionCount,
                    session_completed_count: rep.sessionCompletedCount,
                    dispute_count: rep.disputeCount,
                    anomaly_count: rep.anomalyCount,
                },
                public_profile: rep.publicProfile,
                first_seen_at: rep.firstSeenAt,
                last_updated_at: rep.lastUpdatedAt,
            },
        });
    } catch (err: unknown) {
        console.error('[Reputation] GET error:', err);
        return NextResponse.json(
            { error: 'Reputation lookup failed', details: (err as Error).message },
            { status: 502 }
        );
    }
}
