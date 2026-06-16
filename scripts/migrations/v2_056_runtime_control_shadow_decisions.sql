-- v2_056: runtime_control_shadow_decisions — persistent shadow evidence.
--
-- Slice 3AA-Impl. Durable record of tenant-control shadow decisions
-- emitted by lib/runtime-control/shadow.ts. Mirrors the structured log
-- event shape 1:1. Decisions are "what would have been denied" — the
-- runtime never blocks the request based on this row, and runtime
-- enforcement remains explicitly out of scope.
--
-- This slice DOES NOT introduce runtime enforcement.
-- This slice DOES NOT mutate tenant_control_settings.
-- This slice DOES NOT introduce, read, or reference any
--   p402:tcs:enforce:* Redis keys.
--
-- Privacy posture: metadata only. No prompt, response, messages,
-- tool_calls, or raw_trace content is persisted by this table. The
-- writer's signature only accepts the structured shadow record.
--
-- Tenant scoping is enforced at every read site (WHERE tenant_id = $1)
-- and at the FK level here.
--
-- Idempotent. Reversible via v2_056_runtime_control_shadow_decisions_down.sql
-- (never auto-run; document-only safety net).

BEGIN;

-- =============================================================================
-- runtime_control_shadow_decisions
-- =============================================================================
-- One row per (request, axis) shadow decision. Multiple rows per request
-- are possible when more than one axis would have denied.
CREATE TABLE IF NOT EXISTS runtime_control_shadow_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Correlates to x-request-id; nullable so writer never blocks on a
    -- missing id.
    request_id TEXT,

    emitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 3X-Shadow contract values. CHECKs pin the contract at the DB
    -- layer; future enforcement modes get a new value via migration.
    axis              TEXT NOT NULL CHECK (axis IN (
        'monthly_budget_usd',
        'max_cost_per_request_usd',
        'allowed_models'
    )),
    code              TEXT NOT NULL CHECK (code IN (
        'TENANT_BUDGET_EXCEEDED',
        'MAX_COST_PER_REQUEST_EXCEEDED',
        'MODEL_NOT_ALLOWED'
    )),
    source            TEXT NOT NULL CHECK (source = 'tenant_default'),
    scope             TEXT NOT NULL CHECK (scope = 'tenant'),
    enforcement_mode  TEXT NOT NULL CHECK (enforcement_mode = 'shadow'),

    field             TEXT NOT NULL,

    -- JSONB mirrors the log payload exactly. Writer must JSON-stringify
    -- only scalars/arrays from the structured shadow record; never any
    -- request body field.
    configured_value  JSONB NOT NULL,
    observed_value    JSONB NOT NULL,

    would_have_denied BOOLEAN NOT NULL DEFAULT TRUE,
    provider_called   BOOLEAN NOT NULL DEFAULT TRUE,

    -- Denormalized for dashboard ergonomics. Borderline privacy: this
    -- value is already present in the structured log and visible to the
    -- tenant in their own surface. Nullable so a future tightening can
    -- NULL it out without rebuilding the table.
    model_requested   TEXT,

    schema_version    SMALLINT NOT NULL DEFAULT 1
);

-- Primary dashboard scan: tenant + recency.
CREATE INDEX IF NOT EXISTS idx_rcsd_tenant_emitted
    ON runtime_control_shadow_decisions (tenant_id, emitted_at DESC);

-- Per-axis breakdown scan.
CREATE INDEX IF NOT EXISTS idx_rcsd_tenant_axis_emitted
    ON runtime_control_shadow_decisions (tenant_id, axis, emitted_at DESC);

-- Correlation lookups by request_id (partial — most queries don't need
-- this column).
CREATE INDEX IF NOT EXISTS idx_rcsd_request_id
    ON runtime_control_shadow_decisions (request_id)
    WHERE request_id IS NOT NULL;

COMMIT;
