import { NextRequest } from 'next/server';
import {
  CIRCLE_WALLETS_BLOCKCHAIN_ARC_TESTNET,
  USDC_ARC_TESTNET,
  ARC_TYPICAL_GAS_COST_USDC,
  NANOPAYMENTS_API_BASE,
} from '@/lib/chains/arc';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// POST /api/meter/fund
// Create a Circle Developer-Controlled Wallet on Arc testnet and open a nanopayment channel.
// Visible in Circle Developer Console, required for video proof.

interface FundRequest {
  sessionId: string;
  budgetCapUsd: number;
  workOrderId?: string;
}

interface CircleWalletResponse {
  walletId: string;
  address: string;
  blockchain: string;
  state: string;
  createDate: string;
}

interface CircleWalletSetResponse {
  walletSetId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as FundRequest;
    const { sessionId, budgetCapUsd, workOrderId } = body;

    if (!sessionId) {
      return Response.json({ error: 'sessionId required' }, { status: 400 });
    }

    const apiKey = process.env.CIRCLE_API_KEY;

    // ── Circle Wallets API ────────────────────────────────────────────────────
    // Creates a Developer-Controlled Wallet on ARC-TESTNET.
    // Visible in Circle Developer Console for video proof requirement.
    if (!apiKey) {
      // Graceful degradation, return a demo wallet reference for local dev
      return Response.json({
        walletId: `demo_wallet_${crypto.randomUUID().slice(0, 8)}`,
        address: `0x${crypto.randomBytes(20).toString('hex')}`,
        blockchain: CIRCLE_WALLETS_BLOCKCHAIN_ARC_TESTNET,
        sessionId,
        budgetCapUsd,
        fundedAt: new Date().toISOString(),
        usdcContractAddress: USDC_ARC_TESTNET,
        estimatedGasCostUsd: ARC_TYPICAL_GAS_COST_USDC,
        nanopaymentChannelOpen: false,
        degraded: true,
        degradedReason: 'CIRCLE_API_KEY not configured, demo wallet reference returned',
      });
    }

    const baseUrl = 'https://api.circle.com/v1/w3s';
    const idempotencyKey = crypto.randomUUID();

    // Step 1: Create a wallet set for this session
    const walletSetRes = await fetch(`${baseUrl}/walletSets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Request-Id': idempotencyKey,
      },
      body: JSON.stringify({
        idempotencyKey,
        name: `p402-meter-session-${sessionId.slice(0, 12)}`,
      }),
    });

    if (!walletSetRes.ok) {
      const errText = await walletSetRes.text();
      throw new Error(`Circle walletSets failed: ${walletSetRes.status} ${errText}`);
    }

    const walletSetData = await walletSetRes.json() as { data?: CircleWalletSetResponse };
    const walletSetId = walletSetData.data?.walletSetId;
    if (!walletSetId) throw new Error('No walletSetId returned from Circle');

    // Step 2: Create a wallet on ARC-TESTNET
    const walletIdempotencyKey = crypto.randomUUID();
    const walletRes = await fetch(`${baseUrl}/wallets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Request-Id': walletIdempotencyKey,
      },
      body: JSON.stringify({
        idempotencyKey: walletIdempotencyKey,
        walletSetId,
        blockchains: [CIRCLE_WALLETS_BLOCKCHAIN_ARC_TESTNET],
        count: 1,
        metadata: [
          {
            name: `meter-session-${sessionId}`,
            refId: workOrderId ?? sessionId,
          },
        ],
      }),
    });

    if (!walletRes.ok) {
      const errText = await walletRes.text();
      throw new Error(`Circle wallets create failed: ${walletRes.status} ${errText}`);
    }

    const walletData = await walletRes.json() as { data?: { wallets?: CircleWalletResponse[] } };
    const wallet = walletData.data?.wallets?.[0];
    if (!wallet) throw new Error('No wallet returned from Circle');

    // ── Nanopayments channel ──────────────────────────────────────────────────
    // Open a nanopayment channel if NANOPAYMENTS_API_BASE is configured.
    let nanopaymentChannelOpen = false;
    let nanopaymentChannelId: string | undefined;

    // Circle Gateway x402, verify the wallet can settle on Arc testnet
    // Endpoint: {NANOPAYMENTS_API_BASE}/gateway/v1/x402/settle
    if (NANOPAYMENTS_API_BASE) {
      try {
        const verifyRes = await fetch(`${NANOPAYMENTS_API_BASE}/gateway/v1/x402/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            walletAddress: wallet.address,
            blockchain: CIRCLE_WALLETS_BLOCKCHAIN_ARC_TESTNET,
            sessionRef: sessionId,
          }),
        });

        if (verifyRes.ok) {
          nanopaymentChannelOpen = true;
          const verifyData = await verifyRes.json() as { channelId?: string; id?: string };
          nanopaymentChannelId = verifyData.channelId ?? verifyData.id;
        }
      } catch { /* non-fatal, gateway optional */ }
    }

    return Response.json({
      walletId: wallet.walletId,
      address: wallet.address,
      blockchain: wallet.blockchain,
      walletSetId,
      sessionId,
      budgetCapUsd,
      fundedAt: new Date().toISOString(),
      usdcContractAddress: USDC_ARC_TESTNET,
      estimatedGasCostUsd: ARC_TYPICAL_GAS_COST_USDC,
      nanopaymentChannelOpen,
      nanopaymentChannelId,
      degraded: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'fund failed';
    return Response.json({ error: message }, { status: 500 });
  }
}

// GET /api/meter/fund?sessionId=<id>
// Returns wallet funding status for a session
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return Response.json({ error: 'sessionId required' }, { status: 400 });
  }

  // Stub, real impl would look up wallet by sessionId from DB
  return Response.json({
    sessionId,
    funded: false,
    message: 'Use POST /api/meter/fund to create a wallet for this session',
  });
}
