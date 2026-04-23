import { NextRequest } from 'next/server';
import { generateEconomicAudit } from '@/lib/meter/work-order-parser';

export const dynamic = 'force-dynamic';

// POST /api/meter/audit
// Gemini Pro post-run economic audit, called once per session after stream completes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      sessionId: string;
      totalCostUsd: number;
      arcTxCount: number;
      aiTokenCostUsd: number;
      routingFeeUsd: number;
      escrowCostUsd?: number;
    };

    const { sessionId, totalCostUsd, arcTxCount, aiTokenCostUsd, routingFeeUsd, escrowCostUsd } = body;

    if (!sessionId) {
      return Response.json({ error: 'sessionId required' }, { status: 400 });
    }

    const audit = await generateEconomicAudit({
      sessionId,
      totalCostUsd,
      arcTxCount,
      aiTokenCostUsd,
      routingFeeUsd,
      escrowCostUsd,
    });

    return Response.json({ audit });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : 'audit failed' }, { status: 500 });
  }
}
