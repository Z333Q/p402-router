/**
 * GET /api/v1/agentkit/lookup?address=<wallet_address>
 *
 * Checks whether a wallet address is registered in the AgentBook contract
 * on Base mainnet with a World ID proof-of-human.
 *
 * Used by the P402 CLI (`p402 agent register` / `p402 agent status`) and
 * any external tool that needs to verify agent humanity before initiating
 * payments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAgentBookVerifier } from '@worldcoin/agentkit';

export const dynamic = 'force-dynamic';

// Re-use the AGENTKIT_ENABLED flag from the identity module without importing
// the full module (avoids DB/singleton init at build time).
const AGENTKIT_ENABLED = process.env.AGENTKIT_ENABLED === 'true';

export async function GET(req: NextRequest) {
    const address = req.nextUrl.searchParams.get('address');

    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
        return NextResponse.json(
            { error: 'Missing or invalid address parameter (must be a 0x-prefixed EVM address)' },
            { status: 400 }
        );
    }

    if (!AGENTKIT_ENABLED) {
        return NextResponse.json({
            address,
            registered: false,
            human_id: null,
            agentkit_enabled: false,
            message: 'World AgentKit is not enabled on this instance (AGENTKIT_ENABLED=false)',
        });
    }

    try {
        const agentBook = createAgentBookVerifier({ network: 'base' });
        // lookupHuman takes a CAIP-2 chainId — we look up on Base mainnet
        const humanId = await agentBook.lookupHuman(address, 'eip155:8453');

        return NextResponse.json({
            address,
            registered: !!humanId,
            human_id: humanId ? `${humanId.slice(0, 10)}…` : null, // truncate for privacy
            agentkit_enabled: true,
            agentbook_contract: '0xE1D1D3526A6FAa37eb36bD10B933C1b77f4561a4',
            network: 'eip155:8453',
            message: humanId
                ? 'Agent is registered in AgentBook with a World ID proof-of-human.'
                : 'Agent is not registered in AgentBook. Visit https://worldcoin.org to verify your humanity, then register your wallet in the World App.',
        });
    } catch (err: unknown) {
        console.error('[AgentKit/lookup] Error:', err);
        return NextResponse.json(
            { error: 'AgentBook lookup failed', details: (err as Error).message },
            { status: 502 }
        );
    }
}
