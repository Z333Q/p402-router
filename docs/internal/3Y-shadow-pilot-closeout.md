# 3Y — Tenant control shadow production pilot, closeout

**Pilot date:** 2026-06-15
**Live deploy at pilot time:** `dpl_8TAoYwyEG6shP1xbkJyyj87UWz2P`
**Pilot tenant:** `4f689ea1-7340-476a-878e-9f0b930e5fd4`
**Activation key:** `p402:tcs:shadow:tenant:{pilot_tenant_uuid}` set to `1` with `EX 600`
**Global shadow:** never set
**Enforcement keys (`p402:tcs:enforce:*`):** never present
**Outcome:** shadow contract validated in production

---

## Validated contract

Two `tcs_shadow_decision` events were emitted by the live runtime during the
pilot, both at `2026-06-15T18:20:30.551Z`, attached to a single
`request_id`:

```jsonc
{
  "event":             "tcs_shadow_decision",
  "tenant_id":         "<pilot_tenant_uuid>",
  "request_id":        "<request_uuid>",
  "axis":              "allowed_models",
  "code":              "MODEL_NOT_ALLOWED",
  "source":            "tenant_default",
  "scope":             "tenant",
  "field":             "allowed_models",
  "configured_value":  ["<saved_allowlist_id>"],
  "observed_value":    "<request_model_id>",
  "would_have_denied": true,
  "enforcement_mode":  "shadow",
  "provider_called":   true,
  "timestamp":         "<iso>"
}
```

```jsonc
{
  "event":             "tcs_shadow_decision",
  "axis":              "max_cost_per_request_usd",
  "code":              "MAX_COST_PER_REQUEST_EXCEEDED",
  "source":            "tenant_default",
  "scope":             "tenant",
  "field":             "max_cost_per_request_usd",
  "configured_value":  1e-7,
  "observed_value":    "<estimator output, finite > cap>",
  "would_have_denied": true,
  "enforcement_mode":  "shadow",
  "provider_called":   true
  // (other fields elided; identical shape)
}
```

Field-by-field check against the contract pinned by
`lib/runtime-control/__tests__/shadow.test.ts`:

| Field | Expected | Observed |
|---|---|---|
| `event` | `tcs_shadow_decision` | ✅ |
| `source` | `tenant_default` | ✅ |
| `scope` | `tenant` | ✅ |
| `axis` | one of three approved | ✅ both `allowed_models` and `max_cost_per_request_usd` |
| `field` | matches axis | ✅ |
| `configured_value` | matches saved `tenant_control_settings` row | ✅ |
| `observed_value` | matches request input (model) or estimator output (cost) | ✅ |
| `would_have_denied` | `true` | ✅ |
| `enforcement_mode` | `shadow` | ✅ |
| `provider_called` | `true` | ✅ |
| `timestamp` | ISO-8601 | ✅ |

No `tcs_shadow_failed` event appeared. No `Redis unavailable` log line
appeared in the pilot window. The kill-switch read, the tenant config
cache load, and the estimator all succeeded.

---

## Provider 400 does NOT invalidate shadow success

The chat request returned `HTTP 400` with a structured
`{ error: { type: 'provider_error', code: 'API_ERROR', ... } }` envelope
because OpenRouter's live catalog rejected the chosen model id. This is
a separate, downstream condition from the shadow path.

Three independent contracts held simultaneously:

1. **Shadow contract.** Two events emitted with the correct shape, before
   any provider call was attempted. The runtime correctly reported
   `provider_called: true` — the runtime attempted the provider call
   regardless of the shadow's `would_have_denied` directive, which is
   the exact intended semantic of shadow mode.
2. **Error-envelope contract (slice 3Y-Pilot-Diagnostics).** The
   provider rejection arrived at the client as a structured JSON body
   with `statusCode: 400`, NOT an empty 500. The `return await` fix from
   commit `acfe538` is working in production.
3. **Runtime-isolation contract (slice 3X-Shadow).** The shadow code
   path did not touch a reservation, did not mutate any Redis counter,
   did not write to `ai_economic_events`, and did not return a
   billing-guard error derived from `tenant_control_settings`. The
   provider 400 came from the OpenRouter HTTP response, not from the
   shadow path.

---

## Follow-ups (not approved as slices yet)

### A. Reconcile OpenRouter static catalog with the live OpenRouter catalog

`lib/ai-providers/openrouter.ts` carries a hand-maintained `MODELS` list.
The pilot exposed at least one id (`google/gemini-3-flash`) that is in
the static list but is **not** in OpenRouter's live catalog as of the
pilot date. The static list may have other drift in either direction
(stale ids, missing recent additions).

Proposal: a future slice fetches the OpenRouter `/api/v1/models`
catalog at build time (or via a maintenance script) and reconciles
against the static list. Out of scope for 3Y-Shadow-Pilot-Closeout. No
code change here.

### B. Choose a live OpenRouter id before any future provider-success pilot

The next pilot that wants `HTTP 200` on the provider call should pick a
model id that OpenRouter's live catalog returns. Verify externally
(e.g., OpenRouter dashboard). Cheap, currently-stable candidates worth
trying:

  - `deepseek/deepseek-chat` (budget tier)
  - `mistralai/mistral-small` (mid tier)
  - The current OpenRouter alias for Gemini Flash, if it differs from
    the static `google/gemini-3-flash`

The shadow signal is already validated; the next pilot's purpose is
provider-success validation, not shadow validation.

### C. Floating-point cosmetic on `observed_value`

The cost estimator emits values like `0.0000013000000000000003` (IEEE
754 noise). Shadow logic is correct on the raw float; the noise is
purely cosmetic on the log line. A small follow-up could round to 10
significant digits before emission. Not a correctness issue.

---

## Boundaries that remain in force after this pilot

- **3Y-Enforce remains blocked.** No enforcement key exists, no
  enforcement code path runs. `BillingGuard.preCheck` still contains
  the shadow hook but is still never called from the chat route
  (the chat route uses the direct `emitChatShadow` bridge from
  `d3f216e`).
- **Global shadow remains dormant.** `p402:tcs:shadow:enabled` was never
  set during the pilot and remains unset. Activation continues to
  require an explicit per-tenant Redis SET against the production
  Upstash.
- **Runtime enforcement of `tenant_control_settings` remains blocked.**
  No tenant default deny code can be returned by `billing-guard.ts`. The
  shadow path is structurally void-returning.
- **No production PATCH, SQL, Neon, migration, or `migrate:apply` was
  performed in this slice.**

---

## Pilot success criteria, recorded

| Criterion | Result |
|---|---|
| Shadow signal observable in production logs | ✅ two events emitted |
| Correct contract shape on every field | ✅ verified against test suite |
| No `tcs_shadow_failed` during the pilot | ✅ none |
| No runtime denial caused by `tenant_control_settings` | ✅ the runtime allowed; the upstream provider returned 400 on its own merits |
| No global shadow set | ✅ never set |
| No enforcement key created | ✅ none |
| Tenant key disabled / deleted post-pilot | ✅ operator DEL'd after the test |
| Production deploy includes `acfe538` + `d3f216e` | ✅ `dpl_8TAoYwyEG6shP1xbkJyyj87UWz2P` |

---

## Sequence shipped to reach this state

```
3S       tenant_control_settings table + API + UI
3W       wire tenant_control_settings into the Control simulator
3X-Shadow runtime shadow module + kill-switch + cache + chat-shadow bridge
3Y-Plan / 3Y-Pilot-Prep / 3Y-Pilot-Write-Config / 3Y-Shadow-Pilot (1st attempt)
3Y-Pilot-Diagnostics (await fix → acfe538)
3Y-Shadow-Wireup (chat-route bridge → d3f216e)
3X-Shadow-Wireup-Smoke-Off (passed)
3Y-Shadow-Pilot-Retry (provider 400, shadow signal confirmed)
3Y-Pilot-500-Diagnostics / 3Y-Pilot-500-Log-Diagnostics (deploy + env triage)
3Y-Shadow-No-Log-Diagnostics (confirmed shadow had emitted; "no log" was a search miss)
3Y-Shadow-Pilot-Closeout (this document)
```

Runtime enforcement (`3Y-Enforce`) is not approved and not planned for
implementation until a separate, explicitly approved future slice.
