# WDK + USDT0 Full-Repo Audit Checklist (P402)

This is a full-repo audit pass for implementation planning (not code changes) that classifies direct vs indirect impact for integrating Tether WDK + USDT0 into P402.

## Audit method

1. Enumerate repository domains (app, lib, sdk, cloudflare-facilitator, docs, scripts, tests).
2. Identify payment-critical files via keyword scan and route tracing.
3. Trace execution path from client signing -> API ingress -> settlement service -> blockchain verification -> capability discovery -> docs/SDK.
4. Classify files as:
   - **Direct**: must change for working WDK/USDT0 support.
   - **Indirect**: should change for compatibility, UX, tests, observability, and rollout safety.
   - **Out of scope** (current phase): no changes required for Phase 1/2 integration.

## 1) Direct impact files (must-change)

### A. Settlement API ingress + normalization

| File | Change Required |
|------|----------------|
| `app/api/v1/router/settle/route.ts` | Add token/auth-type aware schema (beyond USDC-only assumptions). Accept WDK-origin metadata for signer type and capability hints. |
| `app/api/v1/facilitator/settle/route.ts` | Preserve asset/network/authType end-to-end (remove implicit USDC defaults). |
| `app/settle/route.ts` | Remove hardcoded USDC decimal conversion. Resolve decimals/domain from token registry by (asset, chainId/network). |

### B. Core settlement orchestration + strategy dispatch

| File | Change Required |
|------|----------------|
| `lib/services/settlement-service.ts` | Introduce TokenSettlementStrategy dispatch in authorization path. Keep replay protection/event logging centralized. |
| `lib/blockchain/eip3009.ts` | Parameterize EIP-712 domain and verifier contract per token. Avoid fixed USDC token semantics in verification output. |
| `lib/blockchain.ts` | Ensure tx verification handles USDT/USDT0 settlement forms and token-specific constraints. |

### C. Token/network source-of-truth

| File | Change Required |
|------|----------------|
| `lib/tokens.ts` | Add USDT + USDT0 entries by chain. Add capability flags (supportsEIP3009, permit support, canonical mapping metadata). |
| `lib/constants.ts` | Move from singular token constants toward network/token map lookups. |

### D. Protocol verification + capabilities

| File | Change Required |
|------|----------------|
| `lib/x402/verify.ts` | Add USDT0 canonicalization logic (symbol/address mapping per chain). |
| `app/api/v1/facilitator/supported/route.ts` | Return dynamic assets/schemes based on enabled strategies. |

### E. Client signing + SDK integration

| File | Change Required |
|------|----------------|
| `lib/hooks/usePayment.ts` | Abstract signer backend (wagmi vs wdk) and token-domain selection. |
| `sdk/src/types.ts` | Add WDK adapter interfaces and token-aware payment request types. |
| `sdk/src/index.ts` | Add WDK adapter wiring in checkout/settlement flows. |

## 2) Indirect impact files (strongly recommended)

### A. Routing and facilitator scoring

| File | Change |
|------|--------|
| `lib/router-engine.ts` | Include asset/authType/bridge support in candidate support + scoring. |
| `lib/facilitator-adapters/index.ts` | Extend adapter capability surfaces to model USDT/USDT0 and auth methods. |
| `lib/facilitator-adapters/generic.ts` | Extend adapter capability surfaces. |
| `lib/facilitator-adapters/cdp.ts` | Extend adapter capability surfaces. |

### B. Frontend UX

| File | Change |
|------|--------|
| `app/_components/TokenSelector.tsx` | Expose USDT/USDT0 and show route-aware token display. |
| `app/demo/payment-flow/page.tsx` | Add token-agnostic demo mode for WDK + USDT flow. |

### C. Documentation and integration references

| File | Change |
|------|--------|
| `docs/x402-integration.md` | Add WDK signing examples and USDT/USDT0 settlement examples. |
| `docs/wdk-usdt0-integration-plan.md` | Keep plan synced with final architecture and API contracts. |

### D. Test coverage

| File | Change |
|------|--------|
| `app/api/v1/router/settle/route.test.ts` | Add WDK signer path and multi-token regression tests. |
| `lib/services/__tests__/settlement-service.test.ts` | Add token strategy dispatch tests. |
| `lib/blockchain/__tests__/*` | Add USDT-specific verification tests. |
| `sdk/src/index.test.ts` | Add WDK adapter tests. |

### E. Facilitator worker parity (if Cloudflare path is production-critical)

| File | Change |
|------|--------|
| `cloudflare-facilitator/src/config.ts` | Mirror token config. |
| `cloudflare-facilitator/src/eip3009.ts` | Token-parameterized domain. |
| `cloudflare-facilitator/src/verification.ts` | Multi-token verification. |
| `cloudflare-facilitator/src/index.ts` | Route dispatch for USDT. |

## 3) Out-of-scope for first implementation slice

These repo areas were reviewed at a domain level and are not required for Phase 1/2 WDK settlement enablement unless product scope expands:

- Most AI provider routing internals (`lib/ai-providers/*`, `/api/v2/chat/*`)
- Governance/intelligence dashboards not tied to settlement execution
- ERC-8004 trust/reputation internals (except optional scoring hooks)
- Non-payment marketing pages and static assets
- SQL migrations unrelated to settlement/token metadata

## 4) End-to-end integration path (validated against current code layout)

1. Client signs payment intent (WDK or wagmi) with token-aware domain.
2. Router settle API validates and forwards normalized request.
3. SettlementService selects token/auth strategy and executes verification + settlement.
4. Blockchain verifier confirms transfer semantics for selected token/chain.
5. Receipt + capability APIs report dynamic token support and proof metadata.
6. SDK/docs/tests reflect the new token/signer matrix.

## 5) Direct vs indirect implementation checklist for PR execution

### Direct checklist (blockers)

- [ ] `lib/tokens.ts` supports USDT + USDT0 chain metadata.
- [ ] `lib/services/settlement-service.ts` strategy dispatch added.
- [ ] `lib/blockchain/eip3009.ts` token-parameterized domain support.
- [ ] `app/api/v1/router/settle/route.ts` token/auth schema expanded.
- [ ] `app/api/v1/facilitator/settle/route.ts` no USDC hardcoding.
- [ ] `app/settle/route.ts` decimal/domain lookup from registry.
- [ ] `lib/x402/verify.ts` USDT0 canonical mapping support.
- [ ] `app/api/v1/facilitator/supported/route.ts` dynamic capabilities.
- [ ] `lib/hooks/usePayment.ts` WDK signer abstraction.
- [ ] `sdk/src/types.ts` and `sdk/src/index.ts` WDK adapter support.

### Indirect checklist (quality/completeness)

- [ ] Router/adapters scored with token/authType/bridge support.
- [ ] TokenSelector + payment demo updated for token-agnostic UX.
- [ ] Cloudflare facilitator parity updated (if used in prod path).
- [ ] Docs updated (`docs/x402-integration.md`, plan docs).
- [ ] Tests updated across API/service/SDK layers.

## 6) Notes on current constraints discovered

- Current happy path is deeply USDC-centric across API defaults, constants, and signing domains.
- Settlement orchestration is centralized and suitable for strategy extraction with limited surface churn.
- Capability discovery currently under-reports assets/schemes and must be made dynamic to avoid client mismatch.
