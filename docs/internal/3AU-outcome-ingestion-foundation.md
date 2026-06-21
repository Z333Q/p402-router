# 3AU: Outcome Ingestion Foundation

**Status:** implementation. Library + tests only. No migration applied. No new tenant-visible route. Existing `POST /api/v2/outcomes` route is **unchanged**.
**Predecessor:** 3AT (`de59593`) — Outcome Instrumentation Plan.
**Successor:** to be decided. Phase 1 (route adoption of the new foundation) is **not** implemented in this slice.

## 0. Hard boundaries (true throughout 3AU)

- Runtime enforcement: blocked.
- Tenant-visible Optimize recommendations: blocked.
- Verified savings proof: blocked.
- Policy auto-apply: blocked.
- Prompt content: not read, not stored.
- Response content: not read, not stored.
- No production SQL run. No migration applied. No Neon write. No Redis touched. No PATCH issued. No provider call.

## 1. What 3AU did and did not ship

### Shipped (library only, no DB write executed)

- `lib/outcomes/types.ts` — `OutcomeStatus`, `OutcomeType`, `OutcomeSource`, allow-list, JSON byte/string bounds.
- `lib/outcomes/validation.ts` — `validateContext`, `validateOutcome`, `sanitizeMetadata`, `rejectClientTenantFields`, layered forbidden-key enforcement.
- `lib/outcomes/service.ts` — `recordOutcome(input, context, options)`. Tenant-scoped, parameterized SQL only. Two queries: `SQL_LOOKUP_EVENT` (SELECT) and `SQL_UPSERT_OUTCOME` (idempotent upsert on `(tenant_id, request_id)`: `INSERT … ON CONFLICT … DO UPDATE`). No standalone UPDATE. The only update behavior is the intentional `ON CONFLICT DO UPDATE` branch inside the tenant-scoped UPSERT. No DELETE/CREATE/DROP/TRUNCATE/ALTER/GRANT/REVOKE anywhere. No production SQL was run.
- `lib/outcomes/__tests__/validation.test.ts` — 24 tests covering accept/reject paths, allow-list invariants, and synonym pattern coverage.
- `lib/outcomes/__tests__/service.test.ts` — 10 tests covering accept, orphan handling, forbidden-metadata rejection, and SQL source-shape invariants.

### Not shipped

- **No migration.** The `request_outcomes` table already exists (created by `scripts/migrations/v2_051_action_type_and_outcomes.sql`). The 3AU directive permitted authoring a migration but not applying one; since no schema change is needed, no migration was authored.
- **No new API route.** `POST /api/v2/outcomes` already exists at `app/api/v2/outcomes/route.ts` (introduced in v2_051, hardened in slice 3J). It already enforces:
  - `requireTenantAccess` (server-side tenant resolution).
  - `scanForForbiddenFields` (rejects body+metadata content fields per `FORBIDDEN_CONTENT_FIELDS` in `lib/prove/outcome.ts`).
  - Idempotent upsert on `(tenant_id, request_id)`.
  - Quality-score range validation, source canonicalization with legacy tagging.

  The existing route is left untouched in this slice. Migrating it to the new `recordOutcome` foundation is a separate, follow-on slice (proposed phase below).
- **No production SQL executed.** `recordOutcome` is exercised exclusively against fake `Queryable` implementations in tests.

## 2. Relationship to the existing route

The new foundation in `lib/outcomes/*` is **strictly stricter** than the existing route's validation:

| Constraint | Existing route | New foundation |
|---|---|---|
| Tenant from session, not body | yes | yes (+ explicit `rejectClientTenantFields` helper) |
| Forbidden-field rejection | yes (canonical set) | yes (canonical set **plus** pattern synonyms like `prompt_text`, `user_prompt`, `response_json`, `completion_text`, `raw_messages`) |
| Metadata model | accept-anything-except-forbidden | **allow-list only** (3AT §5) |
| Metadata byte ceiling | none | `MAX_METADATA_JSON_BYTES = 2048` |
| String-length bound | none | `MAX_METADATA_STRING_LEN = 64` |
| Event linkage check | none | `SQL_LOOKUP_EVENT` confirms `(tenant_id, request_id)` matches an `ai_economic_events` row before insert; orphan handling explicit |
| `outcome_type` field | not stored | declared in TS, **not yet persisted** (covered in §4) |
| `reported_by` field | not stored | declared in TS, **not yet persisted** (covered in §4) |
| `occurred_at` field | not stored | declared in TS, **not yet persisted** (covered in §4) |

The new foundation imports the canonical `FORBIDDEN_CONTENT_FIELD_SET` from `lib/prove/outcome.ts` so the two paths cannot drift on forbidden-key membership.

## 3. SQL shapes (locked in code, asserted by tests)

```
SQL_LOOKUP_EVENT  : SELECT id FROM ai_economic_events
                    WHERE tenant_id = $1 AND request_id = $2
                    LIMIT 1

SQL_UPSERT_OUTCOME: INSERT INTO request_outcomes
                    ( tenant_id, request_id, status, quality_score, source, metadata )
                    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
                    ON CONFLICT (tenant_id, request_id) DO UPDATE
                      SET status=EXCLUDED.status, quality_score=EXCLUDED.quality_score,
                          source=EXCLUDED.source, metadata=EXCLUDED.metadata, updated_at=NOW()
                    RETURNING …
```

Both queries are parameterized, tenant-scoped on `$1`, and select no content fields. The only update behavior on the write side is the `ON CONFLICT DO UPDATE` branch of `SQL_UPSERT_OUTCOME`; there is no standalone UPDATE query. Source-shape tests enforce this contract.

## 4. Fields declared in TS but not yet persisted

The directive authorized fields beyond what `request_outcomes` currently stores:

- `outcome_type` (declared, not in DB column)
- `reported_by` (declared, not in DB column)
- `occurred_at` (declared, not in DB column)

In this slice they live in TS only. Persisting them requires a migration. Adding three nullable columns is straightforward, but the migration is **deferred** to a follow-on slice with its own approval gate, per the "do not apply migrations" boundary. The foundation returns them in the `OutcomeRecord` shape so callers can already plan around the contract.

## 5. Tests added (34 total)

- **`validation.test.ts` (24)** — context validation, outcome validation, sanitize metadata, allow-list / forbidden invariants, rejectClientTenantFields.
- **`service.test.ts` (10)** — accept path (with linked event), missing tenant, missing event linkage, orphan allowance, forbidden-key rejection, synonym rejection (`prompt_text`, `response_body`, `message_content`, `raw_trace`), SQL source-shape (no write verbs, parameterization, tenant-scoping, no content field selection), library source-shape (no `verified_savings` / `policy_auto_apply` / `applyRecommendation` / `rollbackRecommendation` / `tenant_visible_recommendation`).

Run: `npx vitest run lib/outcomes`.

## 6. Phased rollout (each phase independently approvable)

| Phase | Name | Output |
|---|---|---|
| **3AU-0** | This slice | Library + tests. No migration. No route change. |
| **3AU-1** | Schema extension | Add nullable `outcome_type`, `reported_by`, `occurred_at` columns to `request_outcomes`. Migration authored + applied per `DEPLOYMENT.md` §1. |
| **3AU-2** | Route migration | `POST /api/v2/outcomes` adopts `recordOutcome`. Existing route tests stay green; new shape coexists. |
| **3AU-3** | SDK helper | `p402.outcomes.report(...)` ships in the SDK with default-off posture. |
| **3AU-4** | Pilot tenant turn-on | One tenant flips ingest on. Internal observation only. |
| **3AU-5** | Soak + widening | 14-day soak; if clean, additional tenants opt in. |

Apply, savings, and tenant-visible recommendations are not in this phase list.

## 7. Go / no-go for next phase (3AU-1)

- 3AU library is merged.
- Migration draft reviewed; columns are nullable; no data backfill required.
- Migration applied via `npm run migrate:apply` per `DEPLOYMENT.md` §1 (not by `npx tsx scripts/migrate.ts`).
- Roll-back script authored alongside (3AU-1 down-migration).

## 8. Reaffirmed boundaries

- No candidate became a recommendation.
- No tenant saw any output of this slice.
- No tenant policy, allowlist, budget, or routing preference changed.
- No savings number, estimate, or range is involved.
- No "Apply" path was exercised.
- No prompt or response content was read or stored.
- No write was issued against any tenant table.
