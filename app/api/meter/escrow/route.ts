export const dynamic = 'force-dynamic';

// POST /api/meter/escrow
// ERC-8183 specialist escrow — not available on Tempo mainnet (Phase 1).
// The ERC-8183 contract was Arc-specific. Specialist delegation will be reinstated
// in Phase 3 (legal demo) when a chain-agnostic escrow primitive is ready.
export async function POST() {
  return Response.json(
    {
      error: 'specialist_escrow_unavailable',
      message: 'ERC-8183 specialist escrow is not available on Tempo mainnet. Coming in Phase 3.',
    },
    { status: 503 }
  );
}
