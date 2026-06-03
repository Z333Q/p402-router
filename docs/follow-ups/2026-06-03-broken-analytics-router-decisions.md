# Follow-up: `/api/v2/analytics/spend` and `/analytics/recommendations` are broken in production

**Filed:** 2026-06-03
**Discovered during:** Slice 1 of the Optimize roadmap, while building `/api/v2/optimize/overview`
**Severity:** P2 — endpoints return 500 to every caller; no data loss; visible Optimize page does not depend on them (we built a clean substitute)
**Owner:** unassigned

## Summary

Two production endpoints query `router_decisions.created_at`. The production `router_decisions` table has a column named `timestamp`, not `created_at` (see `schema.sql` line ~160). Every call to these endpoints fails with `column "created_at" does not exist`.

This is **not** introduced by any of the v2_050, v2_051, or v2_052 work. It pre-dates the Optimize repositioning. The visible Optimize page (`/dashboard/optimize`) avoids the broken path by querying `traffic_events.created_at` and `execute_requests.created_at` instead.

## Affected files

- `app/api/v2/analytics/spend/route.ts`
  - line 35: `DATE_TRUNC($1, created_at) as period`
  - line 45: `AND created_at >= $3`
  - line 46: `GROUP BY DATE_TRUNC($1, created_at), selected_provider_id, task`
- `app/api/v2/analytics/recommendations/route.ts`
  - line 65: `AND created_at >= NOW() - INTERVAL '30 days'`
  - line 126: same
  - line 173: same

All five sites query `FROM router_decisions`.

## Reproduction

```bash
# Apply the full migration chain (per scripts/test-migrations-fullchain.sh)
# then:
curl -H "x-p402-tenant: <uuid>" 'http://localhost:3000/api/v2/analytics/spend?period=30d'
# -> 500, with server log: ERROR: column "created_at" does not exist
```

The same column-name mismatch caused a real bug in `v2_050_budget_owned_api_keys.sql` that was caught by the full-chain validator (`scripts/test-migrations-fullchain.sh`) and fixed in commit `56c065b`. The visible Optimize page also has a unit-test assertion that `/api/v2/optimize/overview` does NOT query `router_decisions` (see `app/api/v2/optimize/overview/route.test.ts` — "writes traffic_events queries against created_at, not router_decisions").

## Recommended fix

Two options:

**Option A — Use the existing column name.** Replace every `created_at` reference against `router_decisions` with `"timestamp"` (the column name is a reserved word, so it must be quoted). One-line change per occurrence. Lowest risk.

**Option B — Add `created_at` to `router_decisions`.** Run a migration that adds `created_at TIMESTAMPTZ DEFAULT NOW()`, backfills from `timestamp`, then drops or aliases `timestamp`. Higher risk (touches a hot table) and not aligned with the v2_052 work which writes to the new `ai_economic_events` ledger.

**Recommended: A.** It is mechanical, has no migration risk, and the endpoints continue to read from `router_decisions` until the dual-write to `ai_economic_events` completes (90-day window per V5 §7.4.4).

## Why the bug was masked

- No production caller of these endpoints surfaces failures loudly — both are dashboard-only read paths, and the calling UI silently shows empty state on error.
- The unit tests for these endpoints (if they exist) mock `pool.query` and never run the actual SQL.
- The original full-chain migration test only verified migrations apply cleanly, not that downstream application code queries valid columns.

## Acceptance criteria for the fix

1. `/api/v2/analytics/spend?period=30d` returns 200 with a non-error JSON envelope when called against a fresh full-chain DB.
2. `/api/v2/analytics/recommendations` returns 200 with a non-error JSON envelope.
3. Add unit tests for both routes that assert the bind values and SQL go to `router_decisions."timestamp"`, not `router_decisions.created_at`.
4. Add a regression test (or extend `scripts/test-migrations-fullchain.sh`) that runs each `/api/v2/analytics/*` route against the real chain and asserts 200.

## Notes

- The newer `/api/v2/optimize/overview` is the long-term home for these metrics once `ai_economic_events` becomes the read source. Fixing `/api/v2/analytics/*` is short-term hygiene, not a strategic surface.
- Do **not** mirror the bug into any new query against `router_decisions`. The column is `timestamp`, full stop. Quoted because `timestamp` is a reserved word.
