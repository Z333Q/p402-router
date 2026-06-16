# 3AA-Impl Runbook

Operator runbook for rolling out persistent shadow decisions
(`runtime_control_shadow_decisions`) safely.

## Order

1. Deploy the code. Persistence is **default off**; the migration is
   **not** yet applied. Dashboard renders the migration-pending state.
   Runtime path is unaffected.
2. Apply the migration on production via the gated runner:

   ```
   npm run migrate:apply -- --file v2_056_runtime_control_shadow_decisions.sql --target production
   ```

   Never `npx tsx scripts/migrate.ts`.
3. Smoke read: `GET /api/v2/control/shadow-decisions` while
   authenticated as the pilot tenant. Expected:
   `migration_pending=false`, all arrays empty.
4. Enable persistence for the pilot window:

   ```
   redis-cli SET p402:tcs:shadow_persist:enabled 1 EX 14400
   ```

   This is **not** the shadow kill-switch and **not** an enforcement
   key. It controls only whether the writer attempts an INSERT.
5. Open a tenant-scoped shadow observation window per 3Z-G runbook
   (separate key, separate scope). Normal tenant traffic flows.
6. At window close:

   ```
   redis-cli SET p402:tcs:shadow_persist:enabled 0 EX 600
   redis-cli DEL p402:tcs:shadow_persist:enabled
   ```

7. Read the dashboard panel. Persisted rows now back the read.

## Stop conditions

End early and `DEL p402:tcs:shadow_persist:enabled` if any of:

- `tcs_shadow_persist_failed` rate > a few per minute, sustained.
- `tcs_shadow_failed` rate moves above baseline.
- HTTP 2xx rate on `/api/v2/chat/completions` for the tenant
  regresses.
- p95 chat latency for the tenant drifts > 10%.
- Any `p402:tcs:enforce:*` key appears.
- Global shadow key `p402:tcs:shadow:enabled` becomes set.

## Rollback

- **Writer**: `DEL p402:tcs:shadow_persist:enabled`. INSERTs stop
  immediately; reads degrade to whatever already exists.
- **Schema** (last resort, data loss): apply
  `v2_056_runtime_control_shadow_decisions_down.sql` via the gated
  runner. Document-only; never auto-run.

## Invariants

- Persistence is best-effort. Writer failures never affect the
  request.
- Persistence is independent of enforcement; this slice does not
  introduce enforcement.
- The dashboard tolerates a missing table and renders
  migration-pending cleanly.
- The persistence flag namespace
  (`p402:tcs:shadow_persist:enabled`) is separate from the shadow
  namespace (`p402:tcs:shadow:enabled`, `p402:tcs:shadow:tenant:*`)
  and from any future enforcement namespace.
