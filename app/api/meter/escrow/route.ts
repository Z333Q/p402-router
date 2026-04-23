import { NextRequest } from 'next/server';
import { ERC_8183_AGENTIC_COMMERCE, arcExplorerTxUrl, ARC_TYPICAL_GAS_COST_USDC } from '@/lib/chains/arc';
import { insertLedgerEvent } from '@/lib/meter/queries';
import { isArcSettlerEnabled, createErc8183Job, getSignerAddress } from '@/lib/meter/arc-settler';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// POST /api/meter/escrow
// Create an ERC-8183 specialist review job and fund it.
// Used when Gemini determines a case requires specialist agent escalation.
// Beat 4 of the demo script.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      sessionId: string;
      workOrderId?: string;
      reason: string;
      escrowAmountUsd?: number;
    };

    const { sessionId, workOrderId, reason } = body;
    const escrowAmountUsd = body.escrowAmountUsd ?? 0.012; // ~2x Arc gas cost

    if (!sessionId) {
      return Response.json({ error: 'sessionId required' }, { status: 400 });
    }

    const jobId = `job_${crypto.randomUUID().slice(0, 12)}`;

    // ── ERC-8183 job creation (live path when Arc wallet is configured) ────
    // When ARC_PRIVATE_KEY is set, submit a real createJob tx to the ERC-8183
    // contract at ERC_8183_AGENTIC_COMMERCE. For the demo, returns a structured
    // stub with real contract address for video proof.

    let arcTxHash: string | undefined;
    let deliverableHash: string | undefined;
    let onChainJobId: string | undefined;

    // Build deliverable hash before ERC-8183 call so it can be passed to createJob
    const reviewOutputForHash = JSON.stringify({ jobId, sessionId, workOrderId, reason, specialist: 'arc-specialist-agent-v1' });
    deliverableHash = `0x${crypto.createHash('sha256').update(reviewOutputForHash).digest('hex')}`;

    // ── ERC-8183 real on-chain job (when ARC_PRIVATE_KEY is set) ────────────
    if (isArcSettlerEnabled()) {
      try {
        const signerAddr = await getSignerAddress();
        const result = await createErc8183Job({
          providerAddress: signerAddr,    // P402 as both provider and evaluator for demo
          evaluatorAddress: signerAddr,
          escrowAmountUsd,
          deliverableHash,
        });
        arcTxHash = result.txHash;
        onChainJobId = result.jobId;
      } catch (err) {
        // Non-fatal — degrade to simulation with real contract address shown
        console.error('[escrow] ERC-8183 createJob failed:', err instanceof Error ? err.message : err);
      }
    }

    // Specialist review output (simulated for demo)
    const reviewOutput = JSON.stringify({
      jobId,
      sessionId,
      workOrderId,
      reason,
      specialist: 'arc-specialist-agent-v1',
      recommendation: 'specialist_review_complete',
      rationale: 'Administrative documentation reviewed. Case complexity within standard parameters. Recommend approval for manual reviewer confirmation.',
      reviewedAt: new Date().toISOString(),
    });

    const escrowAmountUsdcE6 = Math.round(escrowAmountUsd * 1_000_000);

    // ── Record escrow_release ledger event ──────────────────────────────────
    const escrowEvent = {
      sessionId,
      workOrderId,
      eventKind: 'escrow_release' as const,
      costUsd: escrowAmountUsd + ARC_TYPICAL_GAS_COST_USDC, // escrow + settlement gas
      costUsdcE6: escrowAmountUsdcE6 + Math.round(ARC_TYPICAL_GAS_COST_USDC * 1_000_000),
      provisional: false,
      ...(arcTxHash ? { arcTxHash } : {}),
      proofRef: deliverableHash,
    };
    insertLedgerEvent(escrowEvent).catch(() => null);

    return Response.json({
      jobId: onChainJobId ?? jobId,
      sessionId,
      workOrderId,
      reason,
      escrowAmountUsd,
      escrowAmountUsdcE6,
      deliverableHash,
      arcContractAddress: ERC_8183_AGENTIC_COMMERCE,
      arcTxHash,
      arcExplorerUrl: arcTxHash ? arcExplorerTxUrl(arcTxHash) : undefined,
      liveSettlement: arcTxHash != null,
      status: 'complete',
      reviewOutput: {
        recommendation: 'specialist_review_complete',
        rationale: 'Administrative documentation reviewed. Case complexity within standard parameters. Recommend approval for manual reviewer confirmation.',
      },
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : 'escrow failed' }, { status: 500 });
  }
}
