# 3AL: Optimize Phase 1 Read-Only Production Dry Run

**Status:** implementation. Read-only production adapter + one internal dry run.
**Predecessor:** 3AK (a26e0cd) — Phase 1 candidate generator core.
**Successor:** 3AM — Internal Optimize Candidate Review Surface (planned, not implemented here).

## What shipped

```
lib/optimize/candidates/data/
  readOnlyLoader.ts
  __tests__/readOnlyLoader.test.ts
lib/optimize/candidates/__tests__/cli-safety.test.ts
scripts/optimize/generate-candidates.ts        (extended)
docs/internal/3AL-optimize-phase-1-production-dry-run.md
```

## What did not ship

- No migration. No DDL. No SQL written to any table.
- No tenant-visible route. No `/api/v2/optimize/*`. No `/dashboard/optimize` surface.
- No candidate persistence. Dry run prints summaries to stdout and discards them.
- No new recommendation types. Phase 1 still ships exactly:
  `missing_outcome_coverage`, `high_cost_workflow_review`, `model_allowlist_cleanup`.
- No apply, rollback, savings, or auto-apply paths.

## Read-only loader

`lib/optimize/candidates/data/readOnlyLoader.ts` exposes four SELECT-only, parameterized queries and a single `loadProductionInput()` function that maps DB rows into the existing `GeneratorInput` shape.

Queries:

- `SQL_EVENTS` — `ai_economic_events`, tenant- and window-scoped, projects `id, request_id, tenant_id, workflow_id, model_used, provider, cost_usd, event_time`.
- `SQL_OUTCOMES` — `request_outcomes` joined to `ai_economic_events` on `(tenant_id, request_id)`; projects status and a derived `event_id`.
- `SQL_SHADOW` — `runtime_control_shadow_decisions` left-joined to `ai_economic_events`; projects a derived `event_id`.
- `SQL_ALLOWLIST` — `tenant_control_settings.allowed_models`, single row per tenant, unpacks the JSONB array.

Invariants verified by `readOnlyLoader.test.ts`:

- Every query starts with `SELECT`.
- No query contains `INSERT`, `UPDATE`, `DELETE`, `UPSERT`, `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `GRANT`, or `REVOKE`.
- No query selects any prompt-, request-body-, or response-content field name.
- Every query is parameterized with positional bind variables.
- Every query is tenant-scoped via `tenant_id = $1`.

Mapping rules:

- `cost_usd` is coerced to `float8` at the DB and to `Number` in JS at the boundary.
- `workflow_id`, `model_used`, `provider` are coalesced to `'unknown'` rather than null.
- Outcome status is mapped to `accepted` / `rejected` / `unknown` (everything else collapses to `unknown`).
- Outcome and shadow rows with no matched `event_id` are dropped.
- Allowlist `added_at` is sourced from `tenant_control_settings.created_at` (no per-model add timestamp exists today; the safety guard against recently added models therefore relies on the single tenant-level timestamp).

## CLI changes

`scripts/optimize/generate-candidates.ts` keeps the fixture path and adds an explicit production read-only mode. Production reads require both flags:

```
tsx scripts/optimize/generate-candidates.ts --read-production --tenant <uuid> [--window-days N]
```

Refusal cases:

- `--allow-production` (the prior placeholder flag) is rejected.
- `--read-production` without `--tenant` is rejected.
- `--tenant` value that does not match a UUID is rejected.
- `DATABASE_URL` not set is rejected.

The CLI imports `lib/db` dynamically inside the production branch, so fixture mode never opens a DB connection. Output is JSON: `{ total, by_type, candidates: [redacted summary] }`. Redacted summaries contain candidate id, type, tenant id, slice, confidence score, window, and event/outcome/shadow counts. No prompt or response content is touched at any stage.

## Production dry run

One internal dry run executed against the pilot tenant.

```
Tenant:        4f689ea1-7340-476a-878e-9f0b930e5fd4
Window:        2026-06-06T06:16:22Z .. 2026-06-20T06:16:22Z  (14 days)
Loaded:        events=4, outcomes=0, shadow_decisions=2, allowlist=1
Candidates:    total=0, by_type={}
Writes:        none (SELECT-only, no persistence)
```

Interpretation: with only 4 events and 0 outcomes in the window, every Phase 1 generator correctly drops on gate or confidence:

- `missing_outcome_coverage`: passes the `coverage < 0.40` gate but cannot reach `CONFIDENCE_MIN=0.70` because `n_sample` saturates at `min(4/500, 1) = 0.008`.
- `high_cost_workflow_review`: needs at least four workflows with ≥50 accepted outcomes each and ≥30 accepted on the slice. None of those preconditions are met.
- `model_allowlist_cleanup`: tenant-wide accepted-outcome count is well below `ACCEPTED_OUTCOME_MIN=50`, so cleanup recommendations are correctly suppressed.

Zero candidates on a low-traffic pilot tenant is the right answer. The engine refused to surface noise. This is the result we wanted from a dry run: the gates hold against real, small data.

## Go / no-go for next slice (3AM)

3AM is a separate, approved slice. Preconditions before it begins:

- 3AL merged and tests green.
- An internal reviewer accepts the dry-run output as defensible.
- A higher-traffic tenant or longer window is selected for the next dry run, so candidate generation can be observed on data that should actually produce candidates.
- Any internal review surface for 3AM remains gated behind existing internal auth and is never linked from tenant-facing navigation.

## Hard boundaries (unchanged)

- Runtime enforcement: blocked.
- Tenant-visible Optimize recommendations: blocked.
- Verified savings proof: blocked.
- Policy auto-apply: blocked.
- No candidate persistence in Phase 1.
- No prompt or response content read or stored.
