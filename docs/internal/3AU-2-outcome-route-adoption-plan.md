# 3AU-2: Outcome Route Adoption Plan

**Status:** plan only. No code. No API change. No deploy.
**Predecessors:** 3AU (`3da70ea`), 3AU-1-Impl (`5577ab7`), 3AU-1-Prod-Apply (production migration completed).
**Successor:** to be decided per §13. Implementation begins only after this plan is accepted in writing.

## 0. Hard boundaries (true throughout 3AU-2)

- Runtime enforcement: blocked.
- Tenant-visible Optimize recommendations: blocked.
- Verified savings proof: blocked.
- Policy auto-apply: blocked.
- No prompt / response / messages / raw_trace / stored_content fields read or stored.
- No Redis touched. No provider call. No PATCH issued.
- **No additional migration in 3AU-2.** The required column extension was shipped in 3AU-1-Impl and applied in 3AU-1-Prod-Apply.
- **No production smoke request issued from the QA harness or any operator path until a separately approved gate.** Existing route tests stay green; new tests use a fake DB.

## 1. Current route behavior inventory

`app/api/v2/outcomes/route.ts` (commit history: v2_051 introduction, slice 3J hardening).

| Concern | Today |
|---|---|
| Auth | `await requireTenantAccess(req)` resolves the tenant server-side. |
| Body fields accepted | `request_id` (string, ≤128), `status` (legacy + canonical superset), `quality_score` (`[0, 1]`), `source` (free text up to 64), `metadata` (JSONB, content-field scanned). |
| Body fields rejected | Forbidden content keys at top level and inside `metadata` via `scanForForbiddenFields` (`lib/prove/outcome.ts`). |
| Source handling | Free-text accepted. If non-canonical, tagged into `metadata.legacy_source` (decision 4, slice 3J). |
| Persistence | `INSERT INTO request_outcomes (tenant_id, request_id, status, quality_score, source, metadata) … ON CONFLICT (tenant_id, request_id) DO UPDATE` (idempotent upsert). |
| Event linkage | Not checked. Outcomes can be posted for unknown `request_id`s (silent orphans). |
| Three new columns | **Not written.** `outcome_type`, `reported_by`, `occurred_at` remain `NULL` for every row. |
| Response shape | `{ ok: true, outcome_id, request_id, status, quality_score, recorded_at }`, HTTP 200, header `X-P402-Request-ID`. |
| Error handling | `ApiError` thrown → `toApiErrorResponse(err, requestId)` with codes (`INVALID_INPUT`, `OUTCOME_REQUEST_ID_REQUIRED`, `INVALID_OUTCOME_STATUS`, `INVALID_QUALITY_SCORE`). |

The route does not call into `lib/outcomes/*`. The foundation library shipped in 3AU is currently unused by production traffic.

## 2. Exact code changes needed

Single file changed: `app/api/v2/outcomes/route.ts`. No new files. No type changes. No SDK changes.

Sequence inside `POST`:

1. Keep `requireTenantAccess(req)` exactly as is.
2. Keep `req.json()` parsing and the `INVALID_INPUT` thrown on parse failure.
3. **Call `rejectClientTenantFields(body)`** from `lib/outcomes/validation.ts` to fail-fast if a caller put `tenant_id` or `tenantId` in the body. This is a defense-in-depth check that does not exist today.
4. Keep `scanForForbiddenFields(body)` as the canonical content-field gate. Do **not** replace it with `sanitizeMetadata` alone, because `scanForForbiddenFields` already throws on the top-level body and `metadata` first-level. Keeping it preserves the current contract.
5. Translate the legacy body shape to the foundation's `OutcomeInput` shape:
   - `request_id` → `request_id` (same).
   - `status` (legacy or canonical) → `outcome_status` after mapping (§6 describes the default and the mapping).
   - Accept optional `outcome_type` (string union, validated by `validateOutcome` in the library).
   - Accept optional `occurred_at` ISO string (validated to ISO).
   - Apply the existing `legacy_source` tagging **before** invoking `recordOutcome` (so the foundation's strict source-enum still receives a canonical value while the route preserves the legacy source string in metadata).
6. Derive `reported_by` server-side from the resolved session context. See §5.
7. Invoke `recordOutcome(input, { tenant_id, reported_by }, { db, allowOrphan: true, nowFn })`.
   - `allowOrphan: true` preserves current behavior: outcomes can arrive before the metered event row. See §10.
   - The fake-DB unit tests already cover this exact contract.
8. Map the foundation's `RecordOutcomeResult` back to the legacy response shape (§3).
9. Existing `catch` block: continue to use `toApiErrorResponse`. Map `OutcomeValidationError` to `ApiError({ code, status: 400, message, details: { field } })` so the API error contract does not regress.

The route does not change its HTTP status codes, header names, or top-level error shape.

## 3. Response shape — preserve, then additively extend

Today (legacy):

```
{
  "ok": true,
  "outcome_id": "…",
  "request_id": "…",
  "status": "accepted",
  "quality_score": 0.9,
  "recorded_at": "2026-06-21T…"
}
```

After 3AU-2:

```
{
  "ok": true,
  "outcome_id": "…",
  "request_id": "…",
  "status": "accepted",
  "quality_score": 0.9,
  "recorded_at": "2026-06-21T…",
  "outcome_type": null | "request_completion" | "caller_action" | "human_review" | "instrumentation",
  "reported_by": "tenant-session" | "tenant-api-key:<sha>",
  "occurred_at": null | "ISO",
  "economic_event_id": null | "uuid",
  "orphan": true | false
}
```

The first six fields are **byte-for-byte identical** to today. The remainder are additive. Existing SDK clients that ignore unknown keys are unaffected. The `X-P402-Request-ID` header is preserved.

## 4. Tenant resolution — server-side only

- Tenant resolution stays `await requireTenantAccess(req)`. No change.
- Step 3 above (`rejectClientTenantFields`) is the new explicit guard: any caller that puts `tenant_id`/`tenantId` in the JSON body gets `400 { code: TENANT_FROM_BODY_FORBIDDEN }`. Today the route silently ignores body `tenant_id`; the explicit guard makes the contract auditable.

## 5. `reported_by` derivation

Order of precedence (first match wins, bounded to 128 chars):

1. `X-P402-Reported-By` request header, if present. Bounded to 128 chars by the route.
2. Otherwise, an internal-derived value:
   - For a session-authenticated request: literal string `'tenant-session'`.
   - For an API-key authenticated request: the literal `tenant-api-key:<first-12-hex-of-sha256>` of the resolved API key's hash. This identifies the key without exposing it.
3. Final fallback: literal `'tenant-session'`.

`reported_by` is **never** taken from the JSON body. Source-shape tests assert this.

## 6. `outcome_type` acceptance and default

- Accepted values: `'request_completion'`, `'caller_action'`, `'human_review'`, `'instrumentation'` (the `OUTCOME_TYPES` union in `lib/outcomes/types.ts`).
- If the body omits `outcome_type`, the route sends `'request_completion'` to the foundation. This is the most common case and preserves the legacy contract (existing clients have no concept of outcome type).
- If the body includes a value not in the union, the route returns `400 INVALID_OUTCOME_TYPE`.

The DB column is nullable; the route nevertheless writes the defaulted value so rows are queryable by type from day one. A row with no client-supplied `outcome_type` is still semantically classified.

## 7. `occurred_at` acceptance

- Accepted: ISO 8601 string parseable by `Date.parse`. Validated by `validateOutcome` in the library.
- If absent or `null`, the route lets the library default to the server's `now()` ISO.
- Future-date rejection is deferred to a later slice; today, the legacy route accepts whatever client wall-clock said, and we do not change that without a separate copy review.

## 8. Legacy client compatibility

Compatibility goals, in priority order:

1. **Existing SDK calls keep working.** Any payload that worked yesterday continues to work today. No required field added.
2. **Existing legacy status values keep working.** The slice 3J superset CHECK (`v2_054`) is unchanged. The legacy SDK that emits `'retried'` or `'human_reviewed'` continues to be accepted at the DB.
3. **Existing legacy source strings keep working.** The route maps non-canonical sources to `'sdk'` (the safe default for the foundation's strict source enum) and writes the original string into `metadata.legacy_source` exactly as today.
4. **Existing response keys keep their meaning.** No key renamed, no key removed.

Compatibility breaks **not introduced** by 3AU-2:

- We do not start rejecting legacy statuses.
- We do not start rejecting legacy sources.
- We do not change `quality_score` range or precision.
- We do not change the upsert key.

## 9. Forbidden-field enforcement

Two layers, both retained:

- **Route layer (current).** `scanForForbiddenFields` from `lib/prove/outcome.ts` is called before any library work. It already rejects the canonical content list at the top level of the body and inside `metadata`. Existing route tests assert this.
- **Library layer (added by 3AU-2).** Inside the library's `sanitizeMetadata`, the canonical forbidden set is supplemented by regex synonyms (`prompt_text`, `user_prompt`, `response_json`, `completion_text`, `raw_messages`, `message_content`). This is defense in depth; if the route ever loses its scan, the library still refuses.

Both layers are tested. Removing either is a merge-block change.

## 10. Orphan outcomes

The legacy route silently accepts outcomes for unknown `request_id`s. The foundation's `recordOutcome` makes orphan handling explicit:

- 3AU-2 invokes `recordOutcome` with `allowOrphan: true`. This preserves current behavior: writes succeed even if no `ai_economic_events` row matches `(tenant_id, request_id)` yet.
- The response includes a new `orphan: boolean` field and `economic_event_id: string | null`.
- An internal counter (incremented inside `recordOutcome` or at the route boundary, logged at info severity) records orphan rate. The counter is **not** tenant-visible. The threshold above which an alert would fire is deferred.
- Eventually a future slice may switch `allowOrphan` to `false` once orphan rate is observably near zero on production; that switch is a separate gate.

## 11. Test plan

### 11.1 Existing tests must stay green

`app/api/v2/outcomes/route.test.ts` (17 tests) must continue to pass with **zero** edits. The legacy code paths exercised there represent the production SDK contract.

### 11.2 New tests (added in `app/api/v2/outcomes/route.test.ts` or a sibling file)

- **Persists new columns through fake DB.** Provide a `request_outcomes` UPSERT mock that captures the parameter array; assert `outcome_type`, `reported_by`, and `occurred_at` are present in the parameter list with the expected values.
- **Defaults `outcome_type` to `request_completion`** when omitted from the body.
- **Rejects `tenant_id` from body** with `400 TENANT_FROM_BODY_FORBIDDEN`. Existing route did not have this check; the new assertion locks it.
- **Rejects forbidden top-level fields** (`prompt`, `response`, `messages`, etc.) — already covered by existing tests; preserve them.
- **Rejects forbidden synonyms in `metadata`** (`prompt_text`, `user_prompt`, `response_json`, `completion_text`, `raw_messages`, `message_content`) — new assertions added by 3AU-2.
- **Legacy payload (no `outcome_type`, no `occurred_at`, no `X-P402-Reported-By`) still returns 200** with `reported_by: 'tenant-session'`, `outcome_type: 'request_completion'`, `occurred_at`: server-set ISO.
- **Idempotent upsert still works.** Two POSTs with same `(tenant_id, request_id)` resolve to one row; the second POST observes `recorded_at` updated.
- **`reported_by` from `X-P402-Reported-By` header** is preserved when present (bounded to 128 chars).
- **API-key authenticated request** derives `reported_by` as `tenant-api-key:<12hex>` (no key bytes leaked).
- **Source canonicalization.** Non-canonical source string passed through still lands in `metadata.legacy_source`; foundation receives `'sdk'` as the strict source value.
- **Orphan path returns 202** (or whatever the agreed code is) with `orphan: true`, `economic_event_id: null`, when no matching `ai_economic_events` row exists.
- **Non-orphan path returns 200** with `orphan: false`, `economic_event_id: <uuid>`.

### 11.3 Source-shape regression

- No new `verified_savings`, `policy_auto_apply`, `applyRecommendation`, `rollbackRecommendation`, `tenant_visible_recommendation` strings appear in the route or its tests.
- The library's existing source-shape tests in `lib/outcomes/__tests__/service.test.ts` continue to pass.

### 11.4 What does **not** need a test

- The DB-level migration is already covered by `__tests__/migrations/v2_057-shape.test.ts` and was applied to production successfully (3AU-1-Prod-Apply).
- The library's validation paths are already covered by `lib/outcomes/__tests__/validation.test.ts` and `lib/outcomes/__tests__/service.test.ts`. 3AU-2 does not duplicate them.

## 12. Deployment and rollback plan

### Deployment

1. **Local.** Implement, run `npx vitest run app/api/v2/outcomes/ lib/outcomes`, `npx tsc --noEmit`. All green.
2. **Pre-merge review.** Inspect the diff line-by-line for forbidden phrases (`savings`, `auto[-_]apply`, `apply_recommendation`) and for tenant-from-body acceptance.
3. **Merge to `master`.** Push.
4. **Deploy to Vercel.** Production deploy via Vercel dashboard (the apex/canonical posture from the SEO slice is unchanged). The build is gated by `next build`; `tsc` + tests run in CI.
5. **Soak.** Watch the audit log and the orphan counter for at least one business day. If orphan rate is materially above expectations, investigate before scaling out.

### Rollback

The smallest-blast-radius rollback is a code revert. The migration **does not** roll back as part of route rollback — the new columns are nullable and harmless when ignored.

1. `git revert <3au-2-merge-sha>` → opens a revert PR.
2. Merge revert.
3. Deploy.
4. The columns added in 3AU-1 remain in place; the legacy route ignores them. Production reads/writes resume the pre-3AU-2 contract.

If a deeper rollback is required, the `v2_057_request_outcomes_extension_down.sql` migration can drop the three columns (separate, explicit operator approval required; the columns are harmless when present and unused).

## 13. Explicit stop gates before production deploy

This plan does **not** authorize implementation. Implementation begins only when:

1. This document is accepted in writing.
2. The §11 test plan is implemented and green locally.
3. `tsc --noEmit` is clean.
4. `npm run build` succeeds locally (top-level imports change because the route imports from `lib/outcomes/*`).
5. An independent reviewer reads the route diff aloud without uttering "savings."
6. A separate Vercel-deploy approval step is requested by the operator before the production deploy.

Production smoke (calling `POST /api/v2/outcomes` against `https://p402.io`) is **out of scope** for 3AU-2 except as a post-deploy verification step that the operator chooses to run after the deploy is live. This plan does not authorize any production POST during implementation.

## 14. Reaffirmed boundaries

- Runtime enforcement: blocked.
- Tenant-visible Optimize recommendations: blocked.
- Verified savings proof: blocked.
- Policy auto-apply: blocked.
- No prompt / response / messages / raw_trace / stored_content stored.
- No Redis. No PATCH. No provider call. No additional migration.

3AU-2 is the bridge from "the library exists" to "the API uses it." It is not the bridge to recommendations, savings, or apply behavior. Those tracks are separate and remain gated.
