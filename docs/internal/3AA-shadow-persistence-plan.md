# 3AA — Shadow Decision Persistence Plan

Design doc. No code, no migration, no SQL execution, no Neon contact,
no Redis commands, no runtime changes.

## Status

- Drafted in parallel with the 3Z-G tenant-scoped shadow observation
  window.
- Implementation gated on 3Z-G report and the go/no-go list at the
  bottom of this doc.

## Recommendation

**Option A — dedicated `runtime_control_shadow_decisions` table**,
written best-effort from the same fire-and-forget path that already
emits the structured shadow log.

Rejected alternatives:

- **B. `traffic_events.shadow_decisions` JSONB column** — couples the
  shadow signal to traffic-event lifecycle and adds writes to a hot
  table whose retention is longer than we want for shadow.
- **C. Log-ingestion export only** — externalizes evidence to a vendor
  whose retention and access model we do not control, and forces the
  dashboard to round-trip through a non-Postgres surface.

## Schema (sketch — not authored in this slice)

```
runtime_control_shadow_decisions
─────────────────────────────────
id                  UUID PK DEFAULT gen_random_uuid()
tenant_id           UUID NOT NULL  REFERENCES tenants(id)
request_id          TEXT NULL
emitted_at          TIMESTAMPTZ NOT NULL DEFAULT now()
axis                TEXT NOT NULL
code                TEXT NOT NULL
source              TEXT NOT NULL
scope               TEXT NOT NULL
field               TEXT NOT NULL
configured_value    JSONB NOT NULL
observed_value      JSONB NOT NULL
would_have_denied   BOOLEAN NOT NULL DEFAULT true
provider_called     BOOLEAN NOT NULL DEFAULT true
enforcement_mode    TEXT NOT NULL
model_requested     TEXT NULL
schema_version      SMALLINT NOT NULL DEFAULT 1

CHECK (axis IN ('monthly_budget_usd','max_cost_per_request_usd','allowed_models'))
CHECK (code IN ('TENANT_BUDGET_EXCEEDED','MAX_COST_PER_REQUEST_EXCEEDED','MODEL_NOT_ALLOWED'))
CHECK (source = 'tenant_default')
CHECK (scope  = 'tenant')
CHECK (enforcement_mode = 'shadow')

Indexes:
  (tenant_id, emitted_at DESC)
  (tenant_id, axis, emitted_at DESC)
  (request_id) WHERE request_id IS NOT NULL
```

Strict CHECK constraints anchor the 3X-Shadow contract at the DB
layer. Future enforcement modes get a new value via migration, not a
silent widening.

### Not stored

Prompt or response content; message arrays or character counts;
provider raw response bodies; reasoning traces; tool-call payloads;
IP; user-agent.

`model_requested` is borderline. Recommended to keep (already in the
log; useful for the allowed_models dashboard breakdown). If the
operator wants tighter privacy, drop it.

## Write contract

- **Location:** same `computeAndEmitShadow` path that already emits
  `tcs_shadow_decision`. After the log emit, fire a non-blocking
  insert.
- **Concurrency:** fire-and-forget. The chat route already does not
  await `emitChatShadow`; persistence piggybacks on the same Promise
  tree.
- **Failure posture:** fail-open. DB errors are caught and surface as
  a new `tcs_shadow_persist_failed` event at error severity, kept
  distinct from `tcs_shadow_failed` so dashboards can separate
  "shadow could not decide" from "shadow could not persist."
- **Backpressure:** best-effort. No transaction, no retry queue, no
  outbox. Live log remains the canonical record during outages.
- **Idempotency:** not required at v1. Fresh UUID per row; dashboard
  group-bys tolerate occasional duplicates.
- **Hot-path risk:** zero new awaits in the request path.
- **Signature:** writer accepts the structured shadow record only;
  must not import request body / messages types.

## Read / dashboard contract

- Tenant-only by default. Every query carries
  `WHERE tenant_id = $1` at the data-access layer and again at the
  route handler.
- Surface: read-only Server Action on the Control dashboard. Provides:
  - Decision count by axis × hour for the last N hours.
  - Decision count by code for the same window.
  - Top configured-vs-observed gap by axis (e.g., highest
    `observed_value / configured_value` ratio for
    `max_cost_per_request_usd` — useful for sizing real caps).
  - Recent decisions table (last 100) with `emitted_at`, `axis`,
    `code`, `configured_value`, `observed_value`, `model_requested`,
    `request_id`.
- Caching: short server-side cache (≤30s) keyed by tenant + window.
- Export: deferred. v1 is read-only.

## Retention

| Window     | Policy                                                     |
| ---------- | ---------------------------------------------------------- |
| 0–7 days   | Hot retention; full row, indexed.                          |
| 7–30 days  | Same row.                                                  |
| > 30 days  | Daily aggregated counts only; raw rows pruned by cron.     |

Cron route prunes `emitted_at < now() - '30 days'` in bounded batches.
Daily aggregate rollup deferred to v1.1; v1 ships the hot table only.

## Privacy posture

- No content fields stored.
- `request_id` is server-generated opaque.
- `model_requested` is already in the log and visible to the tenant.
- Tenant scoping enforced at the data-access layer.
- No PII fields. No IP, no user-agent, no API key prefix.

## Test plan

Unit:

- Writer never throws; simulated DB failure emits
  `tcs_shadow_persist_failed` and resolves.
- Writer signature rejects unknown axis / code at type level;
  source-shape regression pins it.

Integration (no production DB):

- Insert + select round-trip preserves all columns.
- Tenant scoping: row written for tenant A invisible to tenant B's
  read.

Source-shape regressions:

- Shadow path reads no message body / prompt / response fields.
- Writer module imports nothing from chat body types.

Dashboard:

- Read action requires authenticated tenant context; unauthenticated
  → 401.
- Aggregations match a hand-computed fixture.

Migration:

- Forward-only.
- Rollback path: follow-up migration drops the table.

## Migration risk

- Add-only. No changes to `traffic_events`, shadow log shape, or
  billing-guard.
- No cross-table FK other than `tenant_id`.
- Indexes additive.
- **Kill switch for the writer:** Redis flag
  `p402:tcs:shadow_persist:enabled` (separate from the shadow kill
  switch; must not be conflated with any enforcement key). Disabling
  it stops writes; reads degrade to empty.

## Go / no-go criteria for implementation (3AA-Impl)

Move forward only if **all** hold:

1. 3Z-G observation window closes with a clean report: decisions
   appear; no `tcs_shadow_failed` spike; no `provider_called=false`;
   no `p402:tcs:enforce:*` leakage; latency drift ≤ 10%.
2. Operator agrees the shadow signal is worth preserving as durable
   evidence — i.e., observation informed a real cap-sizing or
   allowlist decision.
3. Operator confirms Neon capacity headroom for the additional write
   volume.
4. Slice scope locked to: schema migration + writer + read action +
   dashboard panel. **No enforcement, no Optimize, no savings, no
   policy auto-apply** ride along.
5. 3AA-Impl has its own stop-before-push gate and runs against a
   fresh tenant-scoped observation window in shadow.

## Out of scope (explicit)

- Runtime enforcement (`p402:tcs:enforce:*`).
- Optimize recommendations.
- Savings proof.
- Policy auto-apply.
- Cross-tenant analytics.
- Persisting prompt / response / messages / tool-call content.
- Exporting decisions to a log provider (Option C). Postgres is the
  canonical store.
