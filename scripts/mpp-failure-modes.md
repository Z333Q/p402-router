# mppx Integration — Failure Mode Design (Phase 2.1.5)

**Date:** 2026-05-03  
**Scope:** `/api/v2/chat/completions` dual-protocol payment gate (`USE_MPP_METHOD=true`)  
**Status:** Design doc — implementation hardening in Phase 2.4/3.3.5

---

## Failure taxonomy

| Layer | Failure | Severity | Current behaviour | Target behaviour |
|---|---|---|---|---|
| Init | `MPP_SECRET_KEY` / `P402_FACILITATOR_PRIVATE_KEY` missing | Fatal | `getMppx()` → null → route falls through to tenant auth | Alert + healthcheck fail |
| Init | `Mppx.create` throws (bad key format) | Fatal | `getMppx()` → null | Alert |
| Store | `REDIS_URL` unset in production | High | Memory store fallback + `console.warn` | Metric alert; multi-instance unsafety |
| Store | Redis `get` / `set` throws | Medium | `get` returns null (challenge not found → 401); `put`/`del` throw → mppx internal error | Wrap all Store ops in try/catch; on put failure log + proceed (challenge won't be replayable) |
| Store | `update` race condition | Low | Non-atomic get+set; concurrent requests may double-claim | **Phase 2.4.5 resolved**: WATCH/MULTI/EXEC rejected — blockchain nonce is the real guard; revisit at Phase 3.3 per-token pricing |
| Tempo RPC | RPC timeout during `tempo()` verify | Medium | mppx returns 402 (can't confirm tx) | mppx handles via its own error → 402 with retry; client retries |
| Tempo RPC | Wrong chainId / stale RPC URL | High | `TEMPO_RPC_URL` override prevents this; `rpc.tempo.xyz` is now default in viem 2.48.8 | No action needed |
| mppx challenge | Challenge generation fails (secretKey too short) | Fatal | `Mppx.create` throws at init time | Caught in `getMppx()` try/catch |
| mppx verify | Credential HMAC invalid (wrong `MPP_SECRET_KEY`) | Medium | mppx returns 401 | Client must re-fetch challenge with current secret |
| mppx verify | Challenge expired (~10 min window) | Low | mppx returns 402 with fresh challenge | Client retries |
| mppx verify | Tx hash not found on-chain | Medium | mppx returns 402 (payment not confirmed) | Client waits for finality, retries |
| mppx verify | Tx to wrong recipient | Medium | mppx returns 402 (`payment invalid`) | Client must re-submit correct tx |
| mppx verify | Tx amount < required | Medium | mppx returns 402 | Client re-submits |
| Dual 402 | mppx challenge generation itself throws | High | Unhandled exception → 500 | Wrap in try/catch → return plain 402 with just `X-PAYMENT-REQUIRED` |
| AI call | Provider error after payment verified | High | AI call fails, client loses payment but gets error | Phase 3: idempotent retry key on `Payment-Receipt.challengeId` |
| AI call | Billing guard throws after mppx verified | N/A | mppx path bypasses billing guard (by design) | Confirm in code review |

---

## Failure boundaries

```
Request
  │
  ├─ getMppx() returns null → [tenant auth fallback — existing behaviour unchanged]
  │
  └─ getMppx() ok
       │
       ├─ "Authorization: Payment" present
       │     │
       │     ├─ mppx.charge(...)(handler)(req) throws
       │     │     → 500 (unhandled) — NEEDS: top-level catch in POST handler ✓ (exists)
       │     │
       │     ├─ mppx returns 402 (bad credential / expired / tx not found)
       │     │     → 402 challenge returned to client — client retries with new credential
       │     │
       │     └─ mppx returns 200 → handler called → AI call
       │           │
       │           └─ AI call fails → 500/provider error — client lost payment
       │                 MITIGATION (Phase 3): store challengeId → requestId mapping;
       │                 client can retry with same credential for idempotent replay
       │
       └─ No "Authorization: Payment"
             │
             ├─ requireTenantAccess ok → billing guard path [unchanged]
             │
             └─ requireTenantAccess fails → build dual 402
                   │
                   └─ mppx 402 generation throws
                         NEEDS: try/catch → fallback plain 402 with X-PAYMENT-REQUIRED only
```

---

## Required hardening (pre-Phase 3 ship)

### H1 — Dual 402 generation try/catch (P0 before production)

`buildDual402` in the route calls `mppx.charge(...)(noop)(req)` to get the mppx challenge. If
this throws (e.g. Tempo RPC issue at challenge build time), the error propagates to the top-level
catch → 500. This should return a graceful 402 with just `X-PAYMENT-REQUIRED`.

**Fix location:** `app/api/v2/chat/completions/route.ts` dual 402 block  
**Fix:** wrap `mppx.charge(...)(...)(req)` in try/catch; on catch return `X-PAYMENT-REQUIRED` only 402  
**Phase:** 2.4 (security review) or immediately before USE_MPP_METHOD=true in production

### H2 — Store `put` failure doesn't surface to client (P1)

If Redis `set` fails during challenge write, mppx's internal store operation throws. This propagates
out through the mppx middleware → 500. The challenge was already generated; the tx hash just won't
be replay-protected.

**Fix location:** `lib/mpp/store.ts` — wrap `redis.set` in try/catch; on failure log the error and
return without throwing (challenge is still functional; replay protection is degraded but not broken)

### H3 — AI-call-after-payment idempotency (P1, Phase 3)

If the AI call fails after mppx confirms payment, the client is charged but gets an error. For
Phase 2.1 this is acceptable (low risk: mppx payments are off by default). Phase 3 fix: store
`challengeId → p402RequestId` in Redis on mppx payment success; allow credential replay within the
same challenge window to return a cached or retried response.

### H4 — Missing env var healthcheck (P2)

`USE_MPP_METHOD=true` with missing `MPP_SECRET_KEY` silently falls back to tenant auth (getMppx returns
null). Add a startup check to `/api/admin/health` that emits `mpp_misconfigured: true` when
`USE_MPP_METHOD=true` but keys are absent.

---

## Store durability matrix

| State | Redis available | Multi-instance safe | Replay protection |
|---|---|---|---|
| `REDIS_URL` set, Redis healthy | ✓ | ✓ (non-atomic) | ✓ (TTL 900s) |
| `REDIS_URL` set, Redis flapping | Partial | ✗ (some ops miss) | Degraded |
| `REDIS_URL` unset (dev) | ✗ | ✗ | In-process only |
| `REDIS_URL` unset (production) | ✗ + warning | ✗ | NONE — block deploy |

**Rule:** `USE_MPP_METHOD=true` must require `REDIS_URL` in production.  
Enforcement point: add to `lib/env.ts` conditional validation in Phase 2.4 security review.

---

## x402 backwards-compat failure modes

The `X-PAYMENT-REQUIRED` header emitted in the dual 402 is informational (Phase 2.1 — no
x402 verification on this endpoint yet). x402 clients that respond with `X-PAYMENT:` will
fall through to `requireTenantAccess` → 401. This is correct; they need to either:
1. Get a P402 API key (existing path)
2. Upgrade to mppx `Authorization: Payment` (new path)
3. Wait for Phase 2.3 `base` method which wires x402 verify on this endpoint

**Policy:** Document in `X-PAYMENT-REQUIRED` body response or `Link:` header that x402 verify
on `/api/v2/chat/completions` is available from Phase 2.3 onward.

---

## Open questions (resolve before Phase 3 ship)

| # | Question | Decision needed by |
|---|---|---|
| OQ1 | Should a failed AI call after mppx payment return partial data or error? | Phase 3.0 |
| OQ2 | Should mppx path log to `traffic_events` with a synthetic tenant ID? | Phase 3.3 |
| OQ3 | Rate limiting on mppx path (per payer address)? | Phase 3.1 |
| OQ4 | What is the minimum MPP_CHARGE_AMOUNT_USD that makes economic sense? | Phase 2.5 (pre-publish) |
