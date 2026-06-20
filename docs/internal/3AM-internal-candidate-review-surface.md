# 3AM: Internal Optimize Candidate Review Surface

**Status:** implementation. Internal-only review surface. No tenant exposure. No writes. No persistence.
**Predecessor:** 3AL (dc6e595) — Read-Only Production Adapter and Dry Run.
**Successor:** to be approved per the candidate-quality review.

## What shipped

```
app/admin/(protected)/optimize-candidates/page.tsx
app/api/admin/optimize/candidates/route.ts
lib/optimize/candidates/internal/fixtureData.ts
lib/optimize/candidates/internal/__tests__/fixtureData.test.ts
lib/optimize/candidates/__tests__/internal-surface.test.ts
docs/internal/3AM-internal-candidate-review-surface.md
```

## What did not ship

- No migration, no DDL, no SQL writes anywhere.
- No tenant-visible route. No `/api/v2/optimize/*`. No `/dashboard/optimize/internal-candidates`.
- No new recommendation types.
- No apply, rollback, savings, or auto-apply paths.
- No candidate persistence. The review surface is a live read; closing the tab discards everything.
- No sidebar entry. The admin sidebar (`app/admin/_components/AdminSidebar.tsx`) is unmodified. The page is reachable only by URL.

## Surface

- Route: `/admin/optimize-candidates` (mounted under `app/admin/(protected)/`, which gates on `requireAdminAccess()` via the protected layout).
- API: `GET /api/admin/optimize/candidates` (additionally gates on `requireAdminAccess('system.*')`).
- Query parameters:
  - `mode=fixture|production` (default `fixture`)
  - `tenant=<uuid>` (required when `mode=production`, UUID-validated)
  - `window_days=N` (default `14`, clamped to `[1, 90]`)
- Response: `{ mode, tenant, window, loaded: { events, outcomes, shadow_decisions, allowlist }, total, by_type, candidates }`.
- Page renders: input controls, summary tiles, by-type breakdown, candidate list with confidence + gate breakdown, empty state, and the standing disclaimer.

## Disclaimer (literal)

> Internal candidate review only. These are not recommendations. Nothing is applied. No savings are claimed.

## Empty state (literal)

> No internal candidates generated for this tenant/window. This usually means data is too thin or gates rejected noisy suggestions.

## Fixture demo

`buildDemoFixture()` returns a synthetic `GeneratorInput` that exercises the pipeline. It includes:

- One workflow with 500 events and 20% outcome coverage to drive `missing_outcome_coverage` (above its confidence threshold once shadow coverage is satisfied).
- Four workflows with comparable cost-per-accepted-outcome and a fifth at 5× to drive `high_cost_workflow_review`.
- An allowlist that lets `model_allowlist_cleanup` evaluate without spurious traffic.

The demo fixture is verified in `fixtureData.test.ts` to produce a non-empty candidate set including `high_cost_workflow_review`, and to contain no prompt/response content fields.

## Production mode

Production mode reuses `loadProductionInput()` from 3AL. SQL is unchanged: SELECT-only, parameterized, tenant-scoped on `tenant_id = $1`. Candidates are computed server-side and returned for inspection. They are never written to a tenant-visible table or surface.

If the pilot tenant returns zero candidates (as in 3AL), the empty state renders directly. This is the expected, defensible behavior for thin data.

## Tests added

- `internal-surface.test.ts` — 11 invariants:
  - API route exists and uses `requireAdminAccess('system.*')`.
  - API route exports only `GET`.
  - Page is mounted under `(protected)`.
  - Admin sidebar contains no `optimize-candidates` link.
  - No tenant-visible Optimize candidate route or dashboard exists.
  - Disclaimer text and `internal_candidate` status label are present.
  - No `INSERT`/`UPDATE`/`DELETE`/`UPSERT` in the route.
  - No Redis import in the route.
  - No migration tooling import in the route.
  - No `verified_savings`, `policy_auto_apply`, `applyRecommendation`, or `rollbackRecommendation` in the route.
  - No prompt/response content field names anywhere in the new files.
- `fixtureData.test.ts` — 3 invariants:
  - Demo fixture produces a non-empty candidate set including `high_cost_workflow_review`.
  - Every demo candidate carries `status='internal_candidate'`.
  - Demo fixture contains no prompt/response content fields.

All prior 3AK and 3AL tests continue to pass (51 → 66 total).

## Hard boundaries (unchanged)

- Runtime enforcement: blocked.
- Tenant-visible Optimize recommendations: blocked.
- Verified savings proof: blocked.
- Policy auto-apply: blocked.
- No candidate persistence.
- No prompt or response content read or stored.
