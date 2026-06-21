# 3AU-1: Outcome Schema Extension Plan

**Status:** plan only. No code. No SQL execution. No migration applied.
**Predecessor:** 3AU (`3da70ea`) — Outcome Ingestion Foundation.
**Successor:** 3AU-2 (route migration to `recordOutcome`); implementation begins only after this plan is accepted and the migration is applied per `DEPLOYMENT.md` §1.

## 0. Hard boundaries (true throughout 3AU-1)

- Runtime enforcement: blocked.
- Tenant-visible Optimize recommendations: blocked.
- Verified savings proof: blocked.
- Policy auto-apply: blocked.
- Prompt content: not read, not stored, not introduced as a column.
- Response content: not read, not stored, not introduced as a column.
- No production SQL run by this plan. No Neon contact. No migration applied.

What this plan *does*: design the smallest, safest extension to `request_outcomes` that lets `lib/outcomes/service.ts` persist the three fields it already declares in TypeScript (`outcome_type`, `reported_by`, `occurred_at`). Nothing else.

## 1. Current schema inventory

From `scripts/migrations/v2_051_action_type_and_outcomes.sql` (mirror in `lib/db/schema-v2.sql`):

```
CREATE TABLE request_outcomes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    request_id      TEXT NOT NULL,
    status          TEXT NOT NULL CHECK (status IN (
                        'accepted', 'rejected', 'retried', 'escalated',
                        'human_reviewed', 'failed'
                    )),
    quality_score   NUMERIC(8, 6) CHECK (quality_score IS NULL
                        OR (quality_score >= 0 AND quality_score <= 1)),
    source          TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, request_id)
);
```

Indexes already in place: `(tenant_id, created_at DESC)` and a partial index on `(tenant_id, status, created_at DESC) WHERE status IN ('rejected','retried','failed')`.

Slice 3J (`v2_054_request_outcomes_status_superset.sql`) relaxed the `status` CHECK to a superset; reads in `lib/prove/outcome.ts` normalize back to canonical.

## 2. Proposed nullable columns

Three additive columns. All nullable. All defaultable. Zero backfill required for old rows.

| Column | Type | Default | Rationale |
|---|---|---|---|
| `outcome_type` | `TEXT` | `NULL` | Mirrors the `OutcomeType` union in `lib/outcomes/types.ts` (`request_completion | caller_action | human_review | instrumentation`). Stored as TEXT, not a PG ENUM, so we never need an `ALTER TYPE` to extend it later. |
| `reported_by` | `TEXT` | `NULL` | Carries the actor identifier (e.g. session id, API-key fingerprint, SDK client tag). Bounded to ≤ 128 chars by application validation; no DB length constraint to avoid an `ALTER COLUMN` if we shorten it later. |
| `occurred_at` | `TIMESTAMPTZ` | `NULL` | Caller-asserted time the outcome occurred. Distinct from `created_at` (DB insert time) and `updated_at` (DB last touch). NULL means "not asserted; treat `created_at` as the reference time on the read side." |

No column is `NOT NULL`. No column requires data backfill. Existing rows continue to satisfy the schema with NULLs in the new columns.

The `metadata` JSONB column is **not** widened. No new metadata keys. No prompt/response/messages/raw_trace/stored_content fields anywhere. The forbidden-field list in `lib/prove/outcome.ts` and `lib/outcomes/validation.ts` continues to govern.

## 3. CHECK constraints — defer to application

Recommendation: **do not add DB-level CHECK constraints for `outcome_type`** in this migration.

Reasons:

1. `outcome_type` is application semantics. The history of `status` (the v2_054 superset migration) shows that enum churn at the DB level is expensive: a CHECK relaxation needs its own migration, and tightening one needs another. We avoid that loop by validating in TypeScript.
2. `lib/outcomes/validation.ts` already enforces the `OUTCOME_TYPES` union before any insert reaches the DB.
3. Adding a CHECK now and revisiting it later costs two migrations to deliver the same protection that application validation gives in one place.

`reported_by` and `occurred_at` get no CHECKs either:

- `reported_by` is a free-text identifier; the only useful bound is length, and we enforce that at the boundary.
- `occurred_at` is a `TIMESTAMPTZ`; range bounds (no future dates, no Unix-epoch zeroes) belong in application validation, not in DB CHECKs that would silently reject correct edge cases (clock skew, NTP jumps).

If a future slice argues for DB-level CHECKs after the contract has stabilized, that is a separate decision with its own gate.

## 4. Index needs

None for 3AU-1. The existing indexes already cover the access patterns the Optimize loader and the dashboards use (`(tenant_id, created_at DESC)` and the partial status index). The new columns are not query predicates in any current code path.

If a future surface needs to filter by `outcome_type` or `reported_by`, that surface's slice authors its own index migration with measured selectivity. Speculative indexes here would just be future-proofing for needs that may not materialize.

## 5. Backfill — none

All three columns are nullable with no default beyond `NULL`. Existing rows pass `IS NULL` semantics for all three. Reads continue to work: code that selects the new columns sees `NULL`, code that doesn't select them is unaffected.

No `UPDATE ... SET outcome_type = ...` over the existing row set. No DB write outside the `ALTER TABLE` itself. No reason to touch metering or analytics.

## 6. Migration file name proposal

```
scripts/migrations/v2_057_request_outcomes_extension.sql
scripts/migrations/v2_057_request_outcomes_extension_down.sql
```

Numbering continues the existing sequence (`v2_055`, `v2_056` are the current heads). The `_down.sql` file is mandatory by the project's `_down` convention; see §7 for content.

## 7. Down migration strategy

Down migration drops the three new columns:

```
ALTER TABLE request_outcomes
    DROP COLUMN IF EXISTS occurred_at,
    DROP COLUMN IF EXISTS reported_by,
    DROP COLUMN IF EXISTS outcome_type;
```

Reasons:

- All three columns are nullable and additive; `DROP COLUMN` is safe because no other object depends on them.
- No data loss concerns for the **rollback** direction unless rows have been written using the new columns. If rollback happens after writes, those values are lost. This is acceptable because the application path continues to work with NULL semantics by design (3AU explicitly returns `outcome_type | reported_by | occurred_at` from the foundation but does not yet require them on read).
- Down migration is idempotent (`IF EXISTS`).

Note: this is **not** a transactional rollback of an in-flight write. It is a schema rollback for the migration itself, to be used only if the up migration is determined to be wrong post-apply and the migration is rolled back before any meaningful production write has used the new columns.

## 8. Rollout sequence

```
Phase A — author
    1. Write v2_057_request_outcomes_extension.sql      (nullable ALTERs)
    2. Write v2_057_request_outcomes_extension_down.sql (DROP COLUMNs)
    3. Update lib/db/schema-v2.sql to mirror the new columns
       (per CLAUDE.md "schema mirror" rule).

Phase B — review
    4. Verify each ALTER is additive and nullable.
    5. Verify the down script is idempotent and column-targeted only.
    6. Confirm no SELECT * dependents would be surprised by the new columns
       (a fast grep across lib/* and app/api/* for `SELECT * FROM request_outcomes`
       — there must be zero such queries in code; if any exist, fix them first).
    7. Run the project's vitest suite locally; nothing should depend on the
       columns being absent.

Phase C — apply in dev
    8. npm run migrate:apply -- --file v2_057_request_outcomes_extension.sql \
                                   --target dev
       (per DEPLOYMENT.md §1; do not use the deprecated npx tsx scripts/migrate.ts).
    9. \d request_outcomes  → confirm new columns visible, all nullable.

Phase D — verify
   10. Re-run vitest in dev environment to confirm nothing regressed.
   11. Manually insert one row with all three new columns set, via the
       existing route's payload (or a dev-only debug script), and confirm
       SELECT round-trips the values.
   12. Manually insert one row with the new columns absent (legacy shape),
       and confirm SELECT returns NULLs.

Phase E — staging
   13. npm run migrate:apply -- --file v2_057_request_outcomes_extension.sql \
                                   --target staging
   14. Soak for at least one business day. No production data is affected.

Phase F — production (gated by explicit approval)
   15. Operator-approved single command:
       npm run migrate:apply -- --file v2_057_request_outcomes_extension.sql \
                                   --target production
   16. Re-run the production QA sweep (3AO) to confirm green.
   17. Confirm `\d request_outcomes` on production shows three new nullable
       columns and nothing else changed.

Phase F is NOT authorized by this plan. It is gated on a separate, explicit
approval after Phase E soak.
```

## 9. Compatibility with `app/api/v2/outcomes/route.ts`

The existing route is **unaffected** by the migration:

- It does not `SELECT *`; it only references the columns it knows about.
- Its `INSERT ... ON CONFLICT DO UPDATE` lists explicit column names; the new nullable columns get their default (`NULL`), which is fine.
- Its forbidden-field scan (`scanForForbiddenFields` from `lib/prove/outcome.ts`) is unchanged. No new keys are added to the body or the metadata bag.

After the migration applies, the route continues to work identically. A follow-on 3AU-2 slice (separately approved) migrates the route to call `recordOutcome` from `lib/outcomes/service.ts`, which then writes the new columns.

## 10. Compatibility with `lib/outcomes/service.ts`

The foundation's SQL is already aware of the contract:

- `SQL_LOOKUP_EVENT` does not touch `request_outcomes`; unchanged.
- `SQL_UPSERT_OUTCOME` today inserts into `(tenant_id, request_id, status, quality_score, source, metadata)`. After the migration, the upsert can be extended in 3AU-2 to also write `(outcome_type, reported_by, occurred_at)`. The current shape of `SQL_UPSERT_OUTCOME` keeps working before 3AU-2 lands because the new columns are nullable.
- `OutcomeRecord` already declares `outcome_type`, `reported_by`, and `occurred_at`. In 3AU-2 the service stops manufacturing them from the input and starts round-tripping them via the RETURNING clause.

No change to validation, types, or service in 3AU-1. The migration is additive at the DB layer only.

## 11. Required tests for the eventual 3AU-2 implementation

When 3AU-2 implements route adoption + column write-through, it must add:

- **Round-trip test:** insert with `outcome_type='request_completion'`, `reported_by='session_x'`, `occurred_at='2026-06-21T12:00:00Z'`; SELECT returns the same values; the existing fields (`status`, `quality_score`, `source`, `metadata`) are unaffected.
- **Legacy compatibility test:** insert with no `outcome_type`, no `reported_by`, no `occurred_at`; SELECT returns three NULLs; the existing fields work as before.
- **Upsert idempotency test:** second upsert on the same `(tenant_id, request_id)` updates the three new columns and the existing columns under one transaction; the unique constraint is unviolated.
- **Forbidden-field regression:** every existing forbidden-field assertion in `app/api/v2/outcomes/route.test.ts` and `lib/outcomes/__tests__/*.test.ts` keeps passing; no `prompt`, `response`, `messages`, `raw_trace`, `stored_content` field reaches metadata.
- **Source-shape regression:** the `OUTCOME_SQL` source-shape assertions in `lib/outcomes/__tests__/service.test.ts` continue to pass (SELECT + INSERT/UPSERT, no standalone UPDATE, parameterized, tenant-scoped, no content field names).
- **Backfill nullability:** a SELECT against a row created before the migration returns NULL in the three new columns and does not throw on the read side.
- **No tenant surface created:** source-shape tests forbid any new `/dashboard/outcomes/*` writeable route, any new `applyRecommendation` / `rollbackRecommendation` / `verified_savings` / `policy_auto_apply` strings.

These are tests **planned** for 3AU-2; they are not authored in 3AU-1.

## 12. Failure and rollback plan

| Failure | Detection | Action |
|---|---|---|
| `ALTER TABLE` fails at apply time | `npm run migrate:apply` exits non-zero, no `request_outcomes` change | No production state change; investigate locally before retrying. Down script not needed because the up never succeeded. |
| Apply succeeds but a downstream code path panics on the new columns | Production smoke (3AO sweep) returns 500 on `/api/v2/outcomes` or the read paths in `lib/prove/outcome.ts` | Apply the down migration: `npm run migrate:apply -- --file v2_057_request_outcomes_extension_down.sql --target production`. Re-run 3AO. |
| Apply succeeds and is healthy, but 3AU-2 ships a bad write contract | Logged validation failures, blocked outcomes ingest | Roll back the 3AU-2 *code* (route reversion), not the schema. The schema is harmless when unused. |
| Apply succeeds and a tenant tries to write the new columns before 3AU-2 ships | Cannot happen; the existing route does not accept the new fields | No action. |

The migration is reversible in seconds because all three columns are nullable and have no dependents. The risk surface is narrow.

## 13. No content columns

Confirmation, restated for the record:

- No `prompt` column.
- No `response` column.
- No `messages` column.
- No `raw_trace` column.
- No `stored_content` column.
- No `completion_text` / `request_body` / `response_body` / `message_content` columns.
- No new JSONB bag whose contract would weaken the existing forbidden-field discipline.

The three new columns are scalar TEXT and TIMESTAMPTZ. None of them carry content.

## 14. Reaffirmed boundaries

- Runtime enforcement: blocked.
- Tenant-visible Optimize recommendations: blocked.
- Verified savings proof: blocked.
- Policy auto-apply: blocked.
- No production SQL executed by this plan.
- No Neon contact.
- No Redis touched.
- No migration applied.
- No PATCH issued.
- No provider call.

3AU-1 is a plan. Its only artifact is this document. Apply gates live on `DEPLOYMENT.md` §1 and on a separate explicit approval, which this plan does not grant.
