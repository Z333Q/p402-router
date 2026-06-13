-- v2_055: tenant_control_settings — tenant-level Control defaults.
--
-- Slice 3S: Control Configuration Foundation. The first operator-writable
-- surface for the Control axes (monthly budget, allowed models, allowed
-- task types, max cost per request, human-review threshold). Mirrors
-- tenant_privacy_settings (v2_052) so the GET/PATCH admin pattern is
-- identical.
--
-- All scalar caps are NULLABLE. NULL means "not configured at this rung;
-- inherit from the next rung." Empty JSONB arrays mean "no allowlist
-- configured; all values allowed at this rung."
--
-- Resolution order (applied by the simulator and, in a later approved
-- slice, by the runtime):
--   api_key > employee > department > tenant default > system default
--
-- This slice DOES NOT wire saved values into runtime enforcement and DOES
-- NOT alter simulator behavior. See Slice 3S-Sim and a separate runtime
-- slice for those.
--
-- Idempotent. Reversible via v2_055_tenant_control_settings_down.sql
-- (never auto-run; document-only safety net).

BEGIN;

-- =============================================================================
-- tenant_control_settings
-- =============================================================================
-- One row per tenant. UPSERT-style: GET returns system default when the row
-- does not yet exist; PATCH creates the row if missing.
CREATE TABLE IF NOT EXISTS tenant_control_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,

    -- Scalar caps. NULL = unset at this rung.
    monthly_budget_usd         NUMERIC(18, 8) CHECK (monthly_budget_usd         IS NULL OR monthly_budget_usd         >= 0),
    max_cost_per_request_usd   NUMERIC(18, 8) CHECK (max_cost_per_request_usd   IS NULL OR max_cost_per_request_usd   >= 0),
    human_review_threshold_usd NUMERIC(18, 8) CHECK (human_review_threshold_usd IS NULL OR human_review_threshold_usd >= 0),

    -- Allowlists. Empty array = no allowlist configured (inherit).
    -- Schema-level guard: must be a JSON array of strings; further validation
    -- (non-empty entries, no duplicates, max 200) is enforced at the API
    -- boundary so error messages can be precise.
    allowed_models      JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(allowed_models)     = 'array'),
    allowed_task_types  JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(allowed_task_types) = 'array'),

    -- metadata.last_modified_by_email, metadata.last_modified_at — required
    -- audit fields written on every PATCH.
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tenant scan lookups go through the UNIQUE index on tenant_id already.
-- No additional indexes required for the single-row-per-tenant access pattern.

COMMIT;
