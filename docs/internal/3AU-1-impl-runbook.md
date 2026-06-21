# 3AU-1-Impl: Outcome Schema Extension — Operator Runbook

**Status:** migration **authored, not applied**. Pre-apply runbook for the operator who will run `npm run migrate:apply` per `DEPLOYMENT.md` §1.
**Predecessors:** 3AU (`3da70ea`) — Outcome Ingestion Foundation; 3AU-1 (`a2d743b`) — Outcome Schema Extension Plan.
**Successor:** 3AU-2 — route adoption of `recordOutcome`, planned but not authored.

## 0. Hard boundaries (true throughout 3AU-1-Impl)

- Runtime enforcement: blocked.
- Tenant-visible Optimize recommendations: blocked.
- Verified savings proof: blocked.
- Policy auto-apply: blocked.
- No prompt / response / messages / raw_trace / stored_content column introduced.
- **No `migrate:apply` was run in this slice.** No production SQL executed. No Neon contact. No PATCH. No provider call.

## 1. What this slice shipped

```
scripts/migrations/v2_057_request_outcomes_extension.sql        (up)
scripts/migrations/v2_057_request_outcomes_extension_down.sql   (down)
__tests__/migrations/v2_057-shape.test.ts                       (source-shape)
docs/internal/3AU-1-impl-runbook.md                             (this file)
```

No code in `lib/outcomes/*`, `lib/prove/*`, or `app/api/v2/outcomes/*` changed. No `lib/db/schema-v2.sql` change either — see §6.

## 2. What the up migration does

```sql
ALTER TABLE request_outcomes
    ADD COLUMN IF NOT EXISTS outcome_type TEXT,
    ADD COLUMN IF NOT EXISTS reported_by  TEXT,
    ADD COLUMN IF NOT EXISTS occurred_at  TIMESTAMPTZ;
```

Three additive, nullable columns. No defaults beyond `NULL`. No data backfill. No indexes. No CHECK constraints. Idempotent via `IF NOT EXISTS`. Wrapped in `BEGIN`/`COMMIT`.

## 3. What the down migration does

```sql
ALTER TABLE request_outcomes
    DROP COLUMN IF EXISTS occurred_at,
    DROP COLUMN IF EXISTS reported_by,
    DROP COLUMN IF EXISTS outcome_type;
```

Drops exactly the three columns added by the up migration. Idempotent. Wrapped in `BEGIN`/`COMMIT`.

## 4. Source-shape tests

`__tests__/migrations/v2_057-shape.test.ts` enforces every promise this migration makes:

- Up: file exists, BEGIN/COMMIT, only `ALTER TABLE request_outcomes`, exactly three `ADD COLUMN IF NOT EXISTS` (each typed as `TEXT` or `TIMESTAMPTZ`), no `NOT NULL`, no forbidden content columns, no CHECK / INDEX / FK, no CREATE TABLE / DROP TABLE, no UPDATE / INSERT / DELETE / TRUNCATE / GRANT / REVOKE, idempotent via `IF NOT EXISTS`.
- Down: file exists, BEGIN/COMMIT, only `ALTER TABLE request_outcomes`, three `DROP COLUMN IF EXISTS` matching the three columns, no DDL outside the column drops, no DML.

Run: `npx vitest run __tests__/migrations/v2_057-shape.test.ts`. Expected: green.

## 5. Apply order (operator only — do not run from this branch yet)

Per `DEPLOYMENT.md` §1 and 3AU-1 plan §8. Production apply is **not authorized** by this slice; only dev and staging are pre-approved.

```bash
# Dev
npm run migrate:apply -- --file v2_057_request_outcomes_extension.sql --target dev
psql "$DEV_DATABASE_URL" -c "\d request_outcomes" | grep -E "outcome_type|reported_by|occurred_at"

# Run vitest against dev to confirm no regression
npm run test:run

# Staging
npm run migrate:apply -- --file v2_057_request_outcomes_extension.sql --target staging

# Soak at least one business day. Re-run the 3AO production QA sweep against
# staging if available. No production data is affected by dev/staging applies.

# Production (REQUIRES SEPARATE EXPLICIT APPROVAL — NOT PART OF THIS SLICE)
# npm run migrate:apply -- --file v2_057_request_outcomes_extension.sql --target production
```

## 6. Schema mirror (`lib/db/schema-v2.sql`)

The mirror is selective. It currently tracks `semantic_cache`, `router_decisions`, `agent_sessions`, `provider_health`, `cost_alerts`, and `runtime_control_shadow_decisions`. **`request_outcomes` is not mirrored.** Adding the three new columns to the mirror would require mirroring the rest of the table first, which is out of scope for this slice. Recommendation: leave the mirror alone in 3AU-1-Impl; if a future slice begins mirroring `request_outcomes`, it includes the extension columns at that time.

## 7. Rollback plan

If `npm run migrate:apply` succeeds against dev or staging but a downstream code path misbehaves before 3AU-2 ships, run the down migration against the same target:

```bash
npm run migrate:apply -- --file v2_057_request_outcomes_extension_down.sql --target <env>
```

The schema returns to the pre-3AU-1 state. No row data outside the dropped columns is touched. Re-run vitest to confirm.

If the up migration itself fails (rare; `IF NOT EXISTS` on every ADD COLUMN), no rollback is needed because no schema change was committed.

## 8. What this slice does not unlock

- It does not let the route persist `outcome_type`, `reported_by`, or `occurred_at`. The existing route (`app/api/v2/outcomes/route.ts`) does not write to these columns. 3AU-2 (separate slice) implements route adoption.
- It does not change any tenant surface, dashboard, or API response shape.
- It does not enable any Optimize recommendation, savings claim, or auto-apply behavior.
- It does not modify shadow evidence or runtime enforcement posture.

## 9. Reaffirmed boundaries

- Runtime enforcement: blocked.
- Tenant-visible Optimize recommendations: blocked.
- Verified savings proof: blocked.
- Policy auto-apply: blocked.
- No `migrate:apply` was run in this slice.
- No prompt, response, messages, raw_trace, stored_content, completion_text, request_body, or response_body column was introduced.
