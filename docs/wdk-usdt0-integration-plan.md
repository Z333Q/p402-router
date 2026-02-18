# WDK + USDT0 Integration Plan for P402

This document captures a practical plan to make P402 USDT-compatible for agentic payments using Tether's Wallet Development Kit (WDK) and USDT0.

## 1) Product framing

### What changes for P402
- Today: P402's primary happy path is USDC + x402-style EIP-3009 settlement.
- Target: agents can hold USDT/USDT0 in a WDK wallet and pay x402 invoices without manual swaps.

### Why this is strategically aligned
- **WDK** gives us an embedded, self-custodial wallet primitive suitable for agent runtimes.
- **USDT0** gives us a cross-chain liquidity abstraction so payment UX can stay consistent across Base, Arbitrum, and Ethereum.
- **P402** can be the merchant gateway that translates invoice semantics into chain-specific settlement.

## 2) Proposed architecture

## A. Client / Agent side (WDK plugin)
Build a **P402 WDK Adapter** package:
- `@p402/wdk-adapter` for wallet binding and signing.
- Standard interface:
  - `getCapabilities()` (chains, tokens, signing methods)
  - `preparePaymentIntent(invoice)`
  - `signPaymentAuthorization(intent)`
  - `submitToFacilitator(payload)`

This keeps agent code simple while preserving self-custody.

## B. P402 settlement side
Extend facilitator settlement logic to support token-specific rails:
- Keep existing USDC/EIP-3009 path.
- Add USDT paths per chain:
  - EIP-3009-compatible flow if token/chain supports it.
  - Permit + transferFrom fallback where available.
  - Last-resort direct transfer proof flow.

Use a `TokenSettlementStrategy` abstraction:
- `buildAuthorization()`
- `verifyAuthorization()`
- `executeSettlement()`
- `buildReceipt()`

## C. Cross-chain routing (USDT0 awareness)
Add a **Liquidity Router** layer before execution:
- Input: invoice chain, agent wallet chain, available token balance.
- Output: optimal route (`same-chain settle` vs `bridge-first settle`).

Route policy should optimize for:
1. invoice SLA latency,
2. total fee (bridge + gas + facilitator margin),
3. execution reliability.

## 3) x402 compatibility model

Keep x402 invoice format stable; add optional token metadata fields:
- `acceptedTokens`: `[{ symbol, chainId, contract, standard }]`
- `preferredSettlement`: `{ symbol, chainId }`
- `maxSlippageBps` (for bridge/swap assisted routes)

This allows backward-compatible invoice handling while enabling USDT/USDT0-native payments.

## 4) Rollout phases

### Phase 1 — USDT on single chain (fastest path)
- Add Base USDT settlement support in facilitator.
- Add adapter methods for WDK signing.
- Add token selection in `app/_components/TokenSelector.tsx`.
- Success metric: WDK wallet can settle a Base invoice in USDT without manual custody handoff.

### Phase 2 — USDT0 cross-chain routing
- Add `LiquidityRouter` service.
- Add quote simulation endpoint (`/api/v1/liquidity/quote`).
- Add route receipts including hop metadata for observability.
- Success metric: agent with USDT0 on Arbitrum can settle Base invoice within target latency.

### Phase 3 — policy + treasury optimization
- Add policy rules for auto-route constraints (max fee, allowed bridges, chain allowlist).
- Add treasury netting and periodic rebalance jobs.
- Success metric: deterministic routing policy with auditable cost minimization.

## 5) Security and reliability requirements

- Replay protection across all authorization modes.
- Chain-specific nonce management with expiry windows.
- Strict domain separation in signatures.
- Bridge risk scoring in route selection.
- Deterministic idempotency keys for settlement retries.
- Full trace spans: quote -> sign -> verify -> settle -> receipt.

## 6) Suggested implementation map in this repo

- `lib/x402/`:
  - Add `token-strategies/` with USDC and USDT strategy modules.
- `lib/services/`:
  - Add `liquidity-router.ts` and `quote-service.ts`.
- `app/settle/route.ts`:
  - Accept token-aware settlement payloads.
- `sdk/src/`:
  - Expose adapter-friendly token and chain metadata.
- `docs/x402-integration.md`:
  - Add USDT/USDT0 integration section and examples.

## 7) Open design decisions

1. Canonical receipt currency: invoice token vs normalized USD units.
2. Whether to bridge before settlement or allow merchant-side chain abstraction.
3. Which bridge providers are acceptable for production risk policy.
4. Whether to require pre-funded facilitator liquidity pools per chain.

## 8) Recommended next sprint

1. Implement `TokenSettlementStrategy` interface and wire existing USDC logic into it.
2. Add Base USDT strategy and a minimal WDK adapter shim.
3. Add invoice token metadata extension in a backward-compatible way.
4. Ship one end-to-end integration test: WDK-signed USDT payment -> P402 verify -> settlement receipt.

## 9) Concrete integration points in the current repo

This section maps the design to the exact places in the existing codebase where WDK/USDT0 work can be integrated with minimal churn.

### A. API boundary (where WDK clients submit payment intents)

1. **`app/api/v1/router/settle/route.ts`**
   - Current role: canonical settlement API with `scheme`-based dispatch (`exact`, `onchain`, `receipt`).
   - WDK integration point: add a new `payment.client` metadata envelope (e.g., `client: "wdk"`, wallet capabilities, signature type) and token-aware validation.
   - Why here: this route already normalizes settlement modes before calling `SettlementService`.

2. **`app/api/v1/facilitator/settle/route.ts`**
   - Current role: lower-level facilitator entrypoint accepting `txHash` or authorization.
   - WDK integration point: support multi-token payloads and pass `network + asset + authType` through without coercing to USDC defaults.
   - Why here: this is the path external agents may hit directly.

3. **`app/settle/route.ts`**
   - Current role: x402 payload adapter that currently parses signatures and hardcodes USDC/base assumptions.
   - WDK integration point: remove USDC-specific amount normalization and derive decimals + domain params from `asset` + `network`.
   - Why here: this route is the key shim for x402-style payload compatibility.

### B. Settlement orchestration (token strategy insertion point)

1. **`lib/services/settlement-service.ts`**
   - Current role: central settlement orchestrator with `settle`, `settleWithAuthorization`, and replay protections.
   - WDK integration point: introduce `TokenSettlementStrategy` dispatch at the top of `settleWithAuthorization`.
   - Concrete refactor:
     - Move USDC/EIP-3009 verification + execution into `strategies/usdc-eip3009.ts`.
     - Add `strategies/usdt-*.ts` variants for supported chains/auth methods.
     - Keep replay/event logging in `SettlementService` so observability remains centralized.

2. **`lib/blockchain/eip3009.ts`**
   - Current role: EIP-3009 verification/execution flow tightly coupled to USDC assumptions.
   - WDK integration point: parameterize verifier construction by token config (`verifyingContract`, domain name/version, decimals).
   - Why here: WDK-signed typed data should map to per-token domain rules.

3. **`lib/tokens.ts`**
   - Current role: token registry used by verification/settlement and UI selection.
   - WDK integration point: add USDT and USDT0 entries with explicit capabilities (`supportsEIP3009`, permit support, chain metadata).
   - Why here: this is the single source of truth for token behavior.

### C. Verification and protocol compatibility

1. **`lib/x402/verify.ts`**
   - Current role: x402 payment header parsing/verification with chain token maps.
   - WDK integration point: expand token resolution for USDT0 representations and support token canonicalization (USDT0 -> chain-local settlement asset).
   - Why here: maintains x402 compatibility while introducing omnichain liquidity semantics.

2. **`lib/blockchain.ts`**
   - Current role: on-chain tx log verification for ERC-20/native transfers.
   - WDK integration point: add token-aware verification rules and optional settlement-contract log decoding for USDT routes.
   - Why here: final on-chain truth source before receipt issuance.

### D. Routing and facilitator selection (USDT0 pathing)

1. **`lib/router-engine.ts`** + **`lib/facilitator-adapters/*`**
   - Current role: selects facilitators by support/health/reputation/cross-chain hints.
   - WDK integration point:
     - add `asset + authType + bridgeSupport` capability checks in `supports(...)`.
     - surface USDT0 route candidates (bridge-first vs same-chain) in candidate scoring.
   - Why here: this engine already contains cross-chain scoring hooks.

2. **New service: `lib/services/liquidity-router.ts`**
   - Responsibility: resolve USDT0 source chain -> invoice destination chain route and expected settlement asset.
   - Called from: `SettlementService` before strategy execution, or from `router/settle` preflight.

### E. Frontend + SDK client integration for WDK

1. **`lib/hooks/usePayment.ts`**
   - Current role: wallet signing helper hardcoded to USDC EIP-3009 domain.
   - WDK integration point: abstract signer provider so wagmi and WDK can share the same payment intent builder.
   - Concrete shape:
     - `signer: 'wagmi' | 'wdk'`
     - `buildAuthorization(tokenConfig, intent)`
     - `submitSettlement(payload)`

2. **`app/_components/TokenSelector.tsx`**
   - Current role: token picker backed by `SUPPORTED_TOKENS`.
   - WDK integration point: expose USDT/USDT0 options and show chain-aware balance source (local chain vs bridged route).

3. **`sdk/src/index.ts` + `sdk/src/types.ts`**
   - Current role: checkout/session SDK for P402 APIs.
   - WDK integration point: add WDK signer adapter interface and token-aware checkout request schema.
   - Suggested additions:
     - `wdkAdapter?: { signTypedData(...); getAddress(); getChainId(); }`
     - `assetPreferences?: string[]`
     - `acceptedNetworks?: string[]`

### F. Config + docs + capability discovery

1. **`lib/constants.ts`**
   - Current role: hardcoded USDC/Base defaults.
   - WDK integration point: move from singular token constants to per-network token config references.

2. **`app/api/v1/facilitator/supported/route.ts`**
   - Current role: returns facilitator capabilities but currently reports only `assets: ["USDC"]`.
   - WDK integration point: return dynamic supported assets/auth schemes (`USDC`, `USDT`, `USDT0`, `exact`, `permit`, etc.).

3. **`docs/x402-integration.md`**
   - Current role: USDC-only execution guide.
   - WDK integration point: add WDK signing flow examples and token-specific domain requirements.

## 10) Recommended implementation order (repo-aware)

1. **Token registry + capability plumbing first**
   - Update `lib/tokens.ts`, `facilitator/supported`, and request schema types.
2. **Settlement strategy extraction second**
   - Refactor `SettlementService` and `blockchain/eip3009` for strategy-based execution.
3. **WDK signer adapter third**
   - Introduce SDK + `usePayment` signer abstraction without changing external API shape.
4. **USDT0 routing fourth**
   - Add `LiquidityRouter` and cross-chain quote/route metadata.
5. **Docs + e2e coverage fifth**
   - Add docs and one end-to-end test path (WDK sign -> router settle -> receipt).


## 11) Full-repo audit companion

For a direct-vs-indirect file checklist across the entire repository, see `docs/wdk-usdt0-full-repo-audit.md`.


## 12) UX/UI + SDK + API product design for WDK integration

This section focuses on how integration should *feel* for developers and end users, not only how settlement works internally.

### A. UX principles

1. **Default-to-success token path**
   - If the agent holds USDT0, P402 should auto-propose the cheapest viable settlement route.
   - Avoid exposing bridge/swap complexity unless a route fails or policy requires explicit approval.

2. **One intent, many rails**
   - UX model: user/agent approves a single payment intent (`Pay $X for resource Y`).
   - P402 handles rail choice (same-chain USDT, bridged USDT0, or fallback token) behind the scenes.

3. **Deterministic trust states**
   - Every payment UI should expose consistent lifecycle states:
     - `Quote` -> `Ready to Sign` -> `Signed` -> `Settling` -> `Settled` -> `Receipt Issued`.
   - Errors should map to actionable categories (`insufficient balance`, `expired quote`, `signature invalid`, `route unavailable`).

### B. UI surface recommendations in current app

1. **Token + route chooser (`app/_components/TokenSelector.tsx`)**
   - Upgrade from token-only to token+route card model:
     - token symbol
     - source chain
     - destination settlement chain
     - estimated fee + ETA
   - Add badges: `Best Price`, `Fastest`, `No Bridge`, `Policy Preferred`.

2. **Payment demo experience (`app/demo/payment-flow/page.tsx`)**
   - Add a mode toggle:
     - `Wallet Mode: EOA (wagmi)`
     - `Wallet Mode: WDK Agent`
   - Add route timeline panel showing cross-chain hops when USDT0 is used.

3. **Settlement confirmation UI**
   - Include a machine-readable receipt summary block:
     - `invoiceId`, `assetPaid`, `sourceChain`, `settlementChain`, `routeId`, `facilitatorId`.
   - This helps developers debug and gives end users confidence about where funds moved.

### C. SDK design (developer ergonomics)

#### 1) Adapter-first client API

In `sdk/src/types.ts` and `sdk/src/index.ts`, expose a signer-agnostic interface:

```ts
interface P402SignerAdapter {
  kind: 'wagmi' | 'wdk' | 'custom';
  getAddress(): Promise<`0x${string}`>;
  getNetwork(): Promise<string>; // e.g. eip155:8453
  signTypedData(input: {
    domain: Record<string, unknown>;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  }): Promise<`0x${string}`>;
}
```

Why: this keeps checkout API stable while enabling WDK-specific wallet plumbing.

#### 2) Recommended SDK flow

- `quotePayment({ invoice, preferredAsset })`
- `prepareIntent({ quoteId, signer })`
- `signIntent(intent)`
- `submitIntent(signedIntent)`
- `waitForReceipt(settlementId)`

This gives developers explicit checkpoints and makes retry logic easier.

#### 3) Opinionated fallback behavior

- If `preferredAsset = USDT0` fails route policy, SDK can automatically retry with next acceptable token when `autoFallback=true`.
- SDK should always emit structured events (`quote_failed`, `signature_rejected`, `settlement_succeeded`) for app telemetry.

### D. API design (incremental, backward-compatible)

#### 1) New quote endpoint (preflight UX)

- `POST /api/v1/liquidity/quote`
- Input:
  - `invoiceId` or invoice payload
  - `walletAddress`
  - `sourceAssets[]`
  - optional policy constraints (`maxFeeBps`, `maxLatencyMs`, `allowedBridges`)
- Output:
  - ranked route options with fee, ETA, required signature type, expiry.

This is the core endpoint that powers a clean UX before signing.

#### 2) Settle endpoint extensions

`/api/v1/router/settle` should accept optional fields:
- `quoteId`
- `routeId`
- `client`: `{ type: 'wdk' | 'wagmi', version?: string }`
- `authType`: `'eip3009' | 'permit' | 'transfer'`

Keep old payloads valid by making these additive.

#### 3) Receipt schema extension

Include route metadata in receipt payloads:
- `sourceAsset`, `sourceChain`, `destinationChain`, `bridgeProvider`, `totalFee`, `routeClass`.

This improves auditability and lets UIs explain outcomes clearly.

### E. Suggested UX error taxonomy (for API + SDK consistency)

- `P402_QUOTE_EXPIRED`
- `P402_ROUTE_UNAVAILABLE`
- `P402_POLICY_BLOCKED_ROUTE`
- `P402_SIGNATURE_REJECTED`
- `P402_AUTH_INVALID`
- `P402_INSUFFICIENT_BALANCE`
- `P402_SETTLEMENT_TIMEOUT`
- `P402_RECEIPT_UNAVAILABLE`

Use these stable codes across backend responses and SDK exceptions.

### F. Practical rollout (UX-first)

1. **Phase UX-1**: keep backend mostly unchanged, add quote endpoint + richer client states.
2. **Phase UX-2**: add WDK adapter in SDK and enable wallet mode toggle in demo UI.
3. **Phase UX-3**: ship route-aware receipts + analytics dashboards for route quality and failures.
4. **Phase UX-4**: default smart auto-routing for USDT0 with transparent explainability.


## 13) Upstream source-validation checklist (Tether docs + WDK repo)

Before GA messaging, run and record a source-validation pass against:
- `https://github.com/tetherto/wdk`
- `https://docs.wallet.tether.io/start-building/build-with-ai`

Checklist:
1. Confirm adapter method names and signing payload shapes against upstream examples.
2. Confirm supported chains/tokens and note any gaps as `Not Yet Supported`.
3. Confirm AI-agent runtime wording and avoid claims not explicitly supported by upstream docs.
4. Publish a compatibility matrix (`WDK version -> P402 SDK version -> auth modes`).
5. Stamp docs with `validated_at` and `validated_by` metadata for maintenance.


## 14) Documentation surface mapping (app/docs linkage)

To keep implementation and public docs aligned, track the following documentation surfaces as explicit deliverables:

1. **`app/docs/page.tsx` (discoverability gateway)**
   - Must include and maintain the `/docs/wdk` entry card.
   - Copy should reflect current rollout stage (e.g., beta vs GA wording).

2. **`app/docs/wdk/page.tsx` (WDK docs landing)**
   - Must remain the canonical index for Quickstart, API reference, errors, and migration pages.
   - Should include links only to pages that are actively maintained.

3. **`app/docs/wdk/quickstart/page.tsx`**
   - Canonical first-run integration path (`quote -> sign -> settle -> receipt`).
   - Must include upstream-validation and production-readiness notes.

4. **`app/docs/wdk/api-reference/page.tsx`**
   - Canonical contract skeleton for quote/settle/capability endpoints.
   - Must stay synchronized with real API payload schemas and versioning notes.

5. **`app/docs/wdk/errors/page.tsx`**
   - Canonical error code reference for backend/SDK/UI parity.
   - Must be updated alongside any new error code introduction.

6. **`app/docs/wdk/migration/page.tsx`**
   - Canonical migration path from USDC-only to WDK + USDT0 flows.
   - Must track deprecation windows and compatibility guarantees.

7. **`app/docs/wdk/security/page.tsx`**
   - Canonical public baseline for WDK privacy/security operations and release gates.
   - Must remain aligned with upstream security guidance and internal conformance checklists.

8. **`docs/wdk-usdt0-integration-plan.md` and `docs/wdk-usdt0-full-repo-audit.md` (internal planning)**
   - Internal source of truth for architecture decisions and direct/indirect implementation scope.
   - Public docs changes should link back to these when making non-trivial behavior changes.


## 15) API v2 alignment plan (avoid duplicate surface area)

To avoid fragmenting payment surfaces, WDK + USDT0 work should align with existing `/api/v2` patterns where practical and keep `/api/v1` as backward-compatibility path during migration.

### A. Current v2 endpoints relevant to WDK

- `app/api/v2/sessions/route.ts` and `app/api/v2/sessions/[id]/route.ts`
  - Session lifecycle and tenant-bound context already exist in v2.
- `app/api/v2/sessions/fund/route.ts`
  - Existing funding path should become the canonical post-settlement crediting mechanism for WDK flows.
- `app/api/v2/chat/completions/route.ts`
  - Can consume funded sessions and should remain payment-method agnostic.
- `app/api/v2/governance/mandates/route.ts`
  - Policy/mandate controls can be extended for route constraints (fees, chain allowlists, bridge policy).

### B. Proposed v2 additions/extensions

1. **Quote endpoint (v2-native)**
   - Add `POST /api/v2/payments/quote` as v2 canonical preflight route endpoint.
   - Keep `POST /api/v1/liquidity/quote` as compatibility alias until migration window closes.

2. **Settlement endpoint (v2-native)**
   - Add `POST /api/v2/payments/settle` for signed intent settlement with `quoteId`, `routeId`, `client`, and `authType` metadata.
   - Keep `/api/v1/router/settle` for legacy clients.

3. **Receipt/status endpoint**
   - Add `GET /api/v2/payments/{settlementId}` and/or `GET /api/v2/receipts/{receiptId}`
   - Include route metadata (`sourceAsset`, `sourceChain`, `destinationChain`, `routeClass`, `totalFeeBps`).

4. **Capabilities endpoint alignment**
   - Expose dynamic payment capabilities in a v2 endpoint (or preserve `/api/v1/facilitator/supported` and document as source of truth).

### C. Migration contract between v1 and v2

- v1 remains stable while v2 endpoints are introduced.
- v2 docs become primary once parity is reached.
- Responses should expose common error codes (see error taxonomy) so SDK logic is shared across versions.
- Add explicit deprecation milestones for v1 payment endpoints only after v2 GA readiness.

### D. Documentation updates required for v2 alignment

- `app/docs/wdk/api-reference/page.tsx`
  - Add side-by-side v1 compatibility vs v2 canonical endpoint mapping.
- `app/docs/wdk/quickstart/page.tsx`
  - Default examples to v2 once implemented; keep v1 fallback note.
- `app/docs/wdk/migration/page.tsx`
  - Add “v1 -> v2 endpoint map” checklist.

### E. SDK implications

- SDK should prefer v2 endpoints when feature-detected.
- SDK should auto-fallback to v1 if v2 payment endpoints are unavailable.
- Maintain one unified SDK error surface independent of API version.


## 16) WDK conformance plan (exact API names/types + runtime/security alignment)

This section is the release-gating plan to ensure P402 uses **exact** upstream WDK API surfaces and documented runtime/security patterns.

### A. Exact API surface conformance (names + types)

Before implementation PR merge, produce and maintain a mapping table with exact upstream names/types:

| Upstream surface | Upstream type signature | P402 wrapper surface | Status | Notes |
|---|---|---|---|---|
| `<upstream method>` | `<exact type>` | `<adapter method>` | `planned/implemented/verified` | `<link + rationale>` |

Rules:
1. No inferred/renamed adapter methods without explicit mapping rationale.
2. Every adapter method in `sdk/src/types.ts` must reference upstream method/type source.
3. CI check: fail docs PR if mapping table is missing required fields.

### B. Build-with-AI runtime pattern alignment

For agent runtime behavior, explicitly document conformance against official Build-with-AI guidance:
- Agent runtime model assumptions (long-lived vs ephemeral agents).
- Recommended wallet lifecycle (init, session scope, rotation, teardown).
- Device/agent key handling boundaries (where keys live, who signs, who delegates).

Release gate:
- Add a conformance checklist item proving each runtime assumption has an upstream citation and an implementation owner.

### C. Canonical terminology and claims policy

To avoid ecosystem conflicts, enforce terminology guardrails:
- Avoid superlatives like `first`, `native`, or `official` unless source-verifiable.
- Prefer neutral language: `supported`, `compatible`, `integrated`, `beta`.
- Maintain a claims ledger for public docs/deck copy with source link + reviewer signoff.

Release gate:
- Public docs + deck copy require claim review against upstream docs before publish.

### D. Security guidance ingestion (from upstream docs)

Capture and enforce upstream security recommendations in one checklist:
- Key custody modes and threat boundaries.
- Signing delegation boundaries and approval scope.
- Nonce/expiry/replay protections for delegated signing.
- Threat model assumptions for agent/device wallets.

Release gate:
- Security checklist must be attached to settlement strategy PRs and signed by implementation + security reviewers.

### E. Version pinning matrix for developer docs

Publish and maintain a version compatibility matrix:

| WDK version | P402 SDK version | Chains supported | Auth modes | Known constraints | Last validated |
|---|---|---|---|---|---|
| `<wdk version>` | `<sdk version>` | `<chain list>` | `<eip3009/permit/...>` | `<limits>` | `<date>` |

Rules:
1. Quickstart must reference the same version matrix.
2. API examples must include version context where behavior differs.
3. Any breaking upstream change requires matrix update before release.

### F. Operational ownership and cadence

- Owner: Integration Engineering + Docs owner + Security owner.
- Cadence: validate upstream monthly (or per upstream WDK release), whichever comes first.
- Metadata fields to include in docs: `validated_at`, `validated_by`, `upstream_refs`.


## 17) Token rail constraints: legacy USDT vs USDT0 (x402 EVM implications)

### A. Core constraint

On EVM, treat x402-style exact settlement as **EIP-3009 gated** at token-contract level.
- If token exposes `transferWithAuthorization/receiveWithAuthorization`, use EIP-3009 rail.
- If token does not expose EIP-3009 surface, do not route through EIP-3009 path.

### B. Operational policy for P402 routing

1. **USDT0 (where deployed with required surface)**
   - Prefer `authType = eip3009` for x402 exact flow.
   - Validate per-chain contract interface before enabling by default.

2. **Legacy USDT**
   - Do **not** assume EIP-3009 support.
   - Route via:
     - `permit + transferFrom` (if supported), or
     - direct transfer verification path, or
     - bridge-to-USDT0 then settle with EIP-3009.

3. **USDC baseline**
   - Keep existing EIP-3009 path as known-safe reference behavior.

### C. API behavior requirements

- Quote response should return token-specific `authType` recommendations (`eip3009`, `permit`, `transfer`).
- Settle should reject incompatible token/auth combinations with deterministic error code (e.g., `P402_AUTH_INVALID` / `P402_ROUTE_UNAVAILABLE`).
- Capability endpoints should report auth support per asset+network pair, not globally.

### D. Docs behavior requirements

- Quickstart must explicitly warn that legacy USDT may not support EIP-3009.
- API docs must include asset/auth capability matrix.
- Version matrix must include per-asset auth support notes by chain.
