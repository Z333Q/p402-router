import { NextRequest, NextResponse } from 'next/server';
import type { TrustSummary } from '@/lib/meter/types';

export const dynamic = 'force-dynamic';

// GET /api/meter/trust
// Returns an inherited trust summary from the P402 ERC-8004 stack

export async function GET(_req: NextRequest) {
  // Feature-flag check — if ERC-8004 validation is disabled, return safe fallback
  const erc8004Enabled = process.env.ERC8004_ENABLE_VALIDATION === 'true';
  const erc8004AgentId = process.env.ERC8004_AGENT_ID ?? '';

  if (!erc8004Enabled || !erc8004AgentId) {
    // Return a static inherited trust summary with known P402 stack depth
    const summary: TrustSummary = {
      hasIdentity: true,
      hasReputation: true,
      hasBudgetControls: true,
      hasEvidenceBundle: true,
      agentDid: erc8004AgentId || 'did:p402:agent:meter-demo',
      identityTx: undefined,
      reputationScore: undefined,
    };
    return NextResponse.json({ trust: summary, source: 'static' });
  }

  // Live read from ERC-8004 module
  try {
    const { getReputationScore } = await import('@/lib/identity/reputation');
    const reputationScore = await getReputationScore(erc8004AgentId).catch(() => null);

    const summary: TrustSummary = {
      hasIdentity: true,
      hasReputation: reputationScore != null,
      hasBudgetControls: true,
      hasEvidenceBundle: true,
      agentDid: erc8004AgentId,
      reputationScore: reputationScore ?? undefined,
    };
    return NextResponse.json({ trust: summary, source: 'live' });
  } catch {
    const summary: TrustSummary = {
      hasIdentity: true,
      hasReputation: true,
      hasBudgetControls: true,
      hasEvidenceBundle: true,
      agentDid: erc8004AgentId,
    };
    return NextResponse.json({ trust: summary, source: 'fallback' });
  }
}
