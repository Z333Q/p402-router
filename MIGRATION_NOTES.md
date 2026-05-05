# MIGRATION_NOTES.md — Meter Arc to Tempo Port (Phase 1)

Written before any production code changes. Documents the four architectural decisions
required by the Phase 1 brief, plus blockers and follow-ups.

---

## Decision (a): Settlement abstraction

**Decision: Use the router's facilitator abstraction (`lib/facilitator-adapters/tempo.ts`) via a
new `lib/meter/tempo-settler.ts`, NOT `@p402/mpp-method` directly.**

Rationale:

`@p402/mpp-method` implements the mppx payment gate: an external client presents an
`Authorization: Payment` header, the server verifies the credential and calls back
`onSettle`. That model requires a paying client. The Meter has no such client — the
Meter is a server-side demo workflow where the server wallet settles on behalf of
the workflow run.

The existing `lib/meter/arc-settler.ts` already follows the correct pattern: a
module-level server wallet signs and submits a TIP-20 `transfer()` directly. The port
replaces the Arc RPC and USDC predeploy with the Tempo equivalents already in
`lib/facilitator-adapters/tempo.ts` and `lib/constants/tempo.ts`.

`@p402/mpp-method` is NOT modified from inside the Meter repo. The new
`lib/meter/tempo-settler.ts` calls into the router's shared Tempo primitives only.

If the router's Tempo adapter is missing a primitive the settler needs, it is noted
in the Blockers section below.

---

## Decision (b): Session and fund routes

**Decision: Keep `/api/meter/sessions`. Replace `/api/meter/fund` with
`/api/meter/wallet` (wallet health and balance check). Eliminate Circle DCW creation.**

Rationale:

`/api/meter/sessions` creates a Meter-specific workflow session record
(`meter_work_orders` linkage, budget cap). It is not the same as the router's
`/api/v2/sessions` (those are for external API consumers with AP2 mandate wiring).
Merging them would add Meter concerns to the router's session primitive. Keep separate.

`/api/meter/fund` is entirely Circle DCW + Arc nanopayment channel logic. On Tempo, the
settler wallet (`TEMPO_TREASURY_PRIVATE_KEY`) is pre-funded externally — no in-demo
funding ceremony is needed or meaningful. The UI's "funding" step becomes a wallet
check: confirm the signer address and USDC.e balance are ready, then proceed. The
route is renamed to `/api/meter/wallet` and returns `{ signerAddress, usdcBalance,
chainId: 4217, currency: 'USDC.e', ready: boolean }`.

This removes the Circle dependency entirely without touching any shared router code.

---

## Decision (c): Tempo block explorer URL pattern

**Pattern: `https://explore.tempo.xyz`**

Source of truth: `lib/constants/tempo.ts`, `TEMPO_EXPLORER_URL` constant.

URL construction:
- Transaction: `${TEMPO_EXPLORER_URL}/tx/${txHash}`
- Address:     `${TEMPO_EXPLORER_URL}/address/${address}`
- Block:       `${TEMPO_EXPLORER_URL}/block/${blockNumber}`

All explorer links in the Meter frontend must use these patterns. The
`ArcScan`/`arcscan.app` domain disappears entirely.

---

## Decision (d): Settlement granularity

**Decision: Per-session-close settlement (one Tempo tx at stream end), matching the
existing Arc pattern. Not per-event.**

Rationale:

The router's mppx gate settles per-request (each `POST /api/v2/chat/completions`
triggers one charge). However, the Meter's streaming architecture is:

  55+ provisional ledger events emitted during the Gemini stream
  → one reconciliation tx at stream close covering the total session cost

The mppx per-request model does not fit because:
1. The Meter stream is a single server-to-server workflow, not an API call from
   a paying external client with mppx credentials.
2. There is no natural place to interpose per-chunk mppx charges inside an
   in-flight SSE stream.
3. The Arc port did one tx at the end; the Tempo port does one tx at the end.

The reconciliation event (`event_kind = 'reconciliation'`) records the single real
Tempo tx hash in `settlement_tx_hash`. The 55 provisional events remain as
accounting records with `provisional = true` until reconciliation.

This is consistent with the router's Tempo facilitator test (`scripts/tempo-settle-dryrun.ts`),
which also demonstrates a single transfer call pattern.

---

## Env vars required for Tempo Live mode

```
# Already validated in lib/env.ts:
TEMPO_TREASURY_PRIVATE_KEY=0x...     # Meter settler wallet (signs Tempo transfers)
TEMPO_TREASURY_ADDRESS=0x...         # Receiving address for settlements (EIP-55)
TEMPO_RPC_URL=https://rpc.tempo.xyz  # Optional; defaults to public endpoint

# Google AI (unchanged from Arc mode):
GOOGLE_API_KEY=...
```

`ARC_PRIVATE_KEY` and `ARC_RPC_URL` are removed from `.env.example`. Circle env vars
(`CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET`) are removed from the Meter section.
They may remain for other uses elsewhere in the router.

The Meter's `/api/meter/wallet` (formerly `/api/meter/fund`) returns `ready: false`
if `TEMPO_TREASURY_PRIVATE_KEY` is unset, which triggers Proof Replay mode in the UI
exactly as the missing `ARC_PRIVATE_KEY` did before.

---

## Blockers (nothing to patch from inside the Meter repo)

None identified. The router's existing `lib/facilitator-adapters/tempo.ts` provides
the viem client and chain config. `lib/constants/tempo.ts` provides `TEMPO_EXPLORER_URL`,
`USDC_E_ADDRESS`, and `TEMPO_CHAIN_ID`. `lib/env.ts` already validates
`TEMPO_TREASURY_PRIVATE_KEY`. No gaps in `@p402/mpp-method` affect the Meter because
the Meter does not use that package.

---

## Follow-ups (not in scope for Phase 1)

**Specialist escrow panel:** `SpecialistEscrowCard` and `OptionalReleaseStrip` are removed
from the UI in Phase 1. The ERC-8183 contract (`0x0747EEf0...`) is Arc-specific and has no
Tempo equivalent in the current router. The panel will be reinstated in Phase 3 (legal demo)
or Phase 4 (real estate demo) when the A2A specialist delegation workflow is implemented
against a chain-agnostic escrow primitive. Do not ship a fake escrow story.

**`arc_agents` and `arc_jobs` tables:** Left in place for rollback safety. A follow-up
migration drops them after Phase 1 is stable in production.

**`CircleInfraStrip` component:** The Circle DCW and gateway infrastructure strip is removed.
A replacement "Tempo Infrastructure" strip is added showing: Tempo Mainnet, USDC.e (TIP-20),
FeeAMM gas model, and the `explore.tempo.xyz` explorer. This is a Phase 1 UI task.

**Replay fixture:** session_106e6747 (Arc) is replaced by a hand-crafted Tempo replay fixture.
Real Tempo tx hashes are obtained from a single live test run using `scripts/tempo-settle-dryrun.ts`
(with `TEMPO_LIVE_SETTLE=true`) prior to finalising the fixture. The Arc fixture file is deleted.

**`/meter/healthcare` URL migration:** Out of scope for Phase 1 per the brief. The Meter stays
at `/meter`. URL migration happens in Phase 2 alongside the About page split.

**ERC-8004 trust panel:** Kept intact. ERC-8004 registries are deployed on Base (cross-chain
agent identity); they are not Arc-specific. Only the ERC-8183 escrow row is removed.
