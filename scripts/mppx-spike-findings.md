# mppx SDK Spike Findings — Phase 2.0

**Date:** 2026-05-03  
**mppx version:** 0.6.14  
**Spike script:** `scripts/mppx-spike.ts`  
**Verdict:** mppx is ready for Phase 2.1 integration — no hard blockers, several design decisions clarified.

---

## Section 1: SDK Introspection

### Installed version

```
mppx@0.6.14
```

npm `dist-tags.latest` = `0.6.14`. The docs reference `mppx >= 0.3.15` as the minimum version. We are well above that.

### Top-level exports

| Sub-path | Key exports | Notes |
|---|---|---|
| `mppx` | `Method`, `Challenge`, `Credential`, `Receipt`, `Errors`, `Store`, `z` | Protocol primitives. **Does NOT export `Mppx`** |
| `mppx/server` | `Mppx`, `tempo`, `stripe`, `NodeListener`, `Transport`, `Store` | Server-side. `Mppx` lives here, not in main |
| `mppx/nextjs` | `Mppx`, `tempo`, `stripe`, `payment`, `discovery` | Next.js adapter wraps `mppx/server` |
| `mppx/client` | `Mppx`, `Fetch`, `tempo`, `stripe`, `session`, `Transport` | Client-side |
| `mppx/tempo` | `Methods`, `Proof`, `Session` | Tempo-specific primitives (not needed for basic usage) |

### Docs vs reality discrepancies

1. **`Mppx` location**: Docs show `import { Mppx } from 'mppx'` in some examples. Actual: `Mppx` is in `mppx/server` (not main). Main exports protocol types only.

2. **`tempo()` return type**: Docs show `tempo()` as returning a single method. Actual: returns an **array of two methods** — `[charge, session]`. Both intents are registered simultaneously. This is correct behavior but not explicitly documented.

3. **`secretKey` required**: Docs show minimal `Mppx.create({ methods: [tempo()] })`. Actual: throws if `secretKey` is not provided via config or `MPP_SECRET_KEY` env var.

4. **`account` required for `tempo()`**: Docs omit this sometimes. Actual: `tempo()` throws if called without `account` — it needs a signing account for session-close operations.

---

## Section 2: Charge Flow Trace

### Input

```typescript
const app = Mppx.create({
    methods: tempo({ currency: USDC_E, recipient: TREASURY, account }),
    secretKey: MPP_SECRET_KEY,
});
const handler = app.charge({ amount: '0.000001' }); // human-readable: $0.000001
```

### 402 Challenge (no credential)

**Status:** 402  
**Headers:**
```
Cache-Control: no-store
Content-Type: application/problem+json
WWW-Authenticate: Payment id="<base64url-id>",
    realm="<req.host>",
    method="tempo",
    intent="charge",
    request="<base64url-encoded-json>",
    expires="<ISO-8601, ~10min>"
```

**Body:**
```json
{
  "type": "https://paymentauth.org/problems/payment-required",
  "title": "Payment Required",
  "status": 402,
  "detail": "Payment is required.",
  "challengeId": "<same as id in WWW-Authenticate>"
}
```

### Decoded `request` parameter

For `charge({ amount: '0.000001' })` against Tempo mainnet with USDC.e:
```json
{
  "amount": "1",
  "currency": "0x20C000000000000000000000b9537d11c60E8b50",
  "methodDetails": { "chainId": 4217 },
  "recipient": "0xe00DD502FF571F3C721f22B3F9E525312d21D797"
}
```

**Amount encoding (critical):** mppx accepts human-readable decimal input (`'0.000001'` = $0.000001) and internally calls `parseUnits(amount, decimals).toString()`. The challenge always carries **raw atomic units** (`"1"` = 1 raw unit). Chain ID (4217) is auto-detected from the USDC.e contract address — no explicit config needed.

### Authorization header format (client sends back)

The client submits credentials as:
```
Authorization: Payment <base64url-encoded JSON>
```

The decoded JSON has the shape:
```json
{
  "challenge": {
    "id": "<challengeId>",
    "intent": "charge",
    "method": "tempo",
    "realm": "example.com",
    "opaque": "<base64url>",
    "request": "<base64url>"
  },
  "payload": {
    "type": "hash",
    "hash": "0x<txHash>"
  },
  "source": "eip155:4217:0x<payerAddress>"
}
```

The `source` field uses CAIP-10 format (`eip155:<chainId>:<address>`).

### Receipt (on success)

mppx adds a `Payment-Receipt` header to the 200 response:
```
Payment-Receipt: <base64url JSON>
```

Decoded:
```json
{
  "challengeId": "<id>",
  "method": "tempo",
  "reference": "0x<txHash>",
  "settlement": { "amount": "1", "currency": "0x20C..." },
  "status": "success",
  "timestamp": "<ISO-8601>"
}
```

### Token analytics

mppx does not emit token analytics fields. No `inputTokens`, `outputTokens`, `model`, etc. This is P402's differentiation layer (Phase 3.3) — mppx only handles the payment flow.

---

## Section 3: Comparison Table

| Aspect | mppx `tempo` hash mode | P402 onchain scheme |
|---|---|---|
| 402 response shape | `WWW-Authenticate: Payment` + RFC 9457 body | `X-PAYMENT-REQUIRED` header (x402 format) |
| Amount input | Human-readable decimal (`'0.000001'` = $0.000001) | Raw atomic string (`'1'` = 1 raw unit) |
| Amount in challenge | Raw atomic `"1"` (parseUnits applied internally) | `maxAmountRequired: "1"` (already raw) |
| Credential header | `Authorization: Payment <base64url JSON>` | `X-PAYMENT: <base64 JSON>` |
| Credential format | `{ challenge, payload: { hash, type: 'hash' }, source }` | `{ paymentPayload: { scheme: 'onchain', payload: { txHash } } }` |
| **Tx memo constraint** | **challengeId-bound memo REQUIRED** (keccak256 nonce in bytes 25–31) | **No memo required** — plain ERC-20 `transfer(to, amount)` |
| Verification | mppx reads receipt from Tempo RPC directly | P402 `/api/v1/facilitator/verify` endpoint |
| Settlement | mppx confirms from receipt (push mode) | P402 `/api/v1/facilitator/settle` endpoint |
| Receipt format | `Payment-Receipt` header (base64url JSON) | JSON body `{ success, transaction, network, payer }` |
| Replay protection | mppx `Store` (in-memory default) | DB `processed_tx_hashes` + `claimTxHash()` |
| Multi-instance safety | **NO** (in-memory store resets on restart) | **YES** (DB-backed, atomic claim) |
| Custom billing policies | Not supported | Phase 3.1 Billing Guard |
| Token-level analytics | Not supported | Phase 3.3 analytics hooks |

---

## Section 4: Identified Gotchas

### G1 — The memo binding problem (most impactful)

**What the docs say:** Client sends a txHash; mppx verifies the Transfer event.  
**What actually happens:** mppx's `hash` mode (`type: 'hash'`) requires the Tempo transaction to carry a challenge-bound memo. The memo format encodes a 7-byte nonce derived from `keccak256(challengeId)[0..6]` at bytes 25–31 of a 32-byte memo. A plain `USDC.e.transfer(to, amount)` — like what P402's Phase 1 test submitted — would fail mppx verification because it has no memo.

The exception: if the server sets an explicit `memo` param (e.g. `tempo({ memo: '0x...' })`), mppx matches that memo literally and skips challenge binding. But then ALL transactions must carry that static memo — not scalable.

**Impact on Phase 2.1:** Clients wanting to use mppx's native `tempo` method must use the mppx CLI or mppx client SDK (which auto-generates the challenge-bound memo when submitting). They cannot send ad-hoc transfers and submit the hash.

**Phase 2 design implication:** The `p402` custom method (Phase 2.2) does not use `hash` mode at all — it uses P402's own credential format (opaque session token + signature). This sidesteps the memo problem entirely. The `base` method (Phase 2.3) uses EIP-3009 `transaction` mode (signed authorization submitted by client) which doesn't need a memo.

### G2 — In-memory store is NOT multi-instance safe

mppx's default replay store (`Store.memory()`) is in-memory. On Vercel (where P402 runs), each serverless invocation is a fresh process. The store resets on every cold start. This means mppx's built-in replay protection is effectively disabled on Vercel.

**Impact on Phase 2.1:** We MUST pass a custom `store` implementation backed by Redis or our existing DB replay protection. The `Store` interface is simple — it needs `get(key)`, `set(key, value)`, `delete(key)` semantics.

**Mitigation available:** mppx's `store` param accepts any `Store.AtomicStore`. We can wrap our existing `ReplayProtection.claimTxHash()` as a mppx Store.

### G3 — `tempo()` requires `account` (viem Account, not address string)

Error message: `"tempo.session() requires an account (viem Account, e.g. privateKeyToAccount('0x...'))"`

This is needed for session channel close/settle operations. For pure `charge` intent, the account signs fee-payer transactions and session-close calls. In P402's case, this is the facilitator hot wallet (`P402_FACILITATOR_PRIVATE_KEY`).

### G4 — Amount units mismatch with P402 API

P402's `/api/v1/facilitator/verify` and `/settle` use raw atomic amounts (`maxAmountRequired: '1'` = 1 raw unit). mppx's `charge({ amount })` takes human-readable decimals (`amount: '0.000001'` = 1 raw unit). These are inverses of each other.

The bridge: in Phase 2.1's `p402` method, the server will call `formatUnits(rawAmount, 6)` before calling mppx (or define the mppx method using raw amounts natively via the `request` schema transform).

### G5 — `Mppx` is not in `mppx` main package

Common mistake: `import { Mppx } from 'mppx'` — this fails. Correct: `import { Mppx } from 'mppx/server'` (server) or `import { Mppx } from 'mppx/nextjs'` (Next.js routes).

### G6 — `payment()` from `mppx/nextjs` has cleaner ergonomics than `Mppx.create`

For Next.js route handlers, `payment()` is the recommended API:
```typescript
// app/api/v1/premium/route.ts
import { payment, tempo } from 'mppx/nextjs';
const mppx = Mppx.create({ methods: tempo(config), secretKey: process.env.MPP_SECRET_KEY });

export const GET = payment(mppx.charge, { amount: '0.000001' }, () =>
  Response.json({ data: 'paid content' }),
);
```

This is cleaner than `mppx.charge({ amount: '...' })(() => handler)` and aligns with Next.js route export patterns.

### G7 — No `--inspect` in mppx CLI 0.6.14

The Phase 2.0 prompt suggested `npx mppx --inspect <url>` to inspect payment requirements. This flag does not exist in 0.6.14. The CLI makes an actual payment when pointed at a URL. This is fine for Phase 2.1 testing but skip for spike.

---

## Section 5: Recommendations for Phase 2.1

### Where to add mppx middleware

Add the mppx middleware as a **Next.js route handler wrapper** in `app/api/v2/chat/completions/route.ts` (the OpenAI-compatible endpoint). This is the highest-value route and the intended Phase 2.1 target.

Use `payment()` from `mppx/nextjs`:
```typescript
import { Mppx, payment, tempo } from 'mppx/nextjs';

const mppx = Mppx.create({
    methods: tempo({
        currency: process.env.TEMPO_USDC_E_ADDRESS!,
        recipient: process.env.P402_TREASURY_ADDRESS!,
        account: privateKeyToAccount(process.env.P402_FACILITATOR_PRIVATE_KEY as `0x${string}`),
        store: p402MppxStore, // custom store backed by Redis/DB — see G2
    }),
    secretKey: process.env.MPP_SECRET_KEY!,
});
```

### Content negotiation between x402 and mppx

On the retry request:
- **MPP client**: sends `Authorization: Payment <base64url>` header
- **x402 client**: sends `X-PAYMENT: <base64>` header

In the route handler:
```typescript
const authHeader = req.headers.get('authorization');
const xPayment = req.headers.get('x-payment');

if (authHeader?.startsWith('Payment ')) {
    // mppx path
    return payment(mppx.charge, { amount }, handler)(req);
} else if (xPayment) {
    // existing x402 path (unchanged)
    return handleX402Settle(req, xPayment);
} else {
    // No payment — dual 402: emit both headers
    return new Response(null, {
        status: 402,
        headers: {
            'WWW-Authenticate': mppxChallenge,
            'X-PAYMENT-REQUIRED': x402Challenge,
        }
    });
}
```

### Feature flags needed

Already planned: `USE_MPP_METHOD=true|false`. Add: `MPP_SECRET_KEY` (required when MPP enabled).

### Conflicts with existing replay protection

mppx's in-memory store (G2) must be replaced. Implement a `Store.AtomicStore` backed by `ReplayProtection.claimTxHash()`. This is straightforward — `store.set(hash, true)` maps to `claimTxHash({ txHash: hash, ... })`.

### Amount unit bridge

Define a wrapper that converts P402's raw-atomic amounts to mppx's human-readable format:
```typescript
import { formatUnits } from 'viem';
const mppxAmount = formatUnits(BigInt(rawAtomicAmount), 6); // '0.000001'
```

---

## Section 6: Blockers

**No hard blockers for Phase 2.1.**

Conditional items that need resolution before or during Phase 2.1:

| # | Issue | Severity | Resolution |
|---|---|---|---|
| B1 | In-memory store not multi-instance safe | High | Implement custom Store backed by Redis/DB before deploying to Vercel |
| B2 | Memo binding prevents ad-hoc tx submission | Medium | Not a blocker for `p402` method; relevant only if offering raw `tempo` method to clients |
| B3 | `MPP_SECRET_KEY` must be added to Vercel env | Low | Add before deploying Phase 2.1 |
| B4 | viem peer dep is 2.47.5; P402 has 2.46.3 | Low | mppx works with 2.46.3 at runtime; upgrade viem before npm publish |

---

## Appendix: mppx Next.js integration pattern (canonical)

```typescript
// app/api/v1/resource/route.ts
import { Mppx, payment, tempo } from 'mppx/nextjs';
import { privateKeyToAccount } from 'viem/accounts';

const mppx = Mppx.create({
    methods: tempo({
        currency: '0x20C000000000000000000000b9537d11c60E8b50',
        recipient: '0xe00DD502FF571F3C721f22B3F9E525312d21D797',
        account: privateKeyToAccount(process.env.P402_FACILITATOR_PRIVATE_KEY as `0x${string}`),
    }),
    secretKey: process.env.MPP_SECRET_KEY!,
});

// Charge 1 raw USDC.e ($0.000001) — matches Phase 1 settlement test
export const GET = payment(mppx.charge, { amount: '0.000001' }, () =>
    Response.json({ message: 'Paid access granted' }),
);
```

**Key facts:**
- `tempo()` auto-detects chainId from the USDC.e contract address → Tempo mainnet (4217)
- `amount` is human-readable; the challenge encodes raw atomic units
- Next.js route receives the 402 challenge as a `Response` object directly
- `Payment-Receipt` header is automatically added to 200 responses
