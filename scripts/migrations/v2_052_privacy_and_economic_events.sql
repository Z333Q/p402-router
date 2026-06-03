-- v2_052: Privacy modes + canonical ai_economic_events ledger.
--
-- Phase 2B of the Optimize roadmap. This migration is the foundation for
-- P402's commercial claim "P402 meters economics, not content." It ships
-- three new tables together because they are inseparable:
--
--   1. tenant_privacy_settings — tenant-level default privacy mode and
--      retention policy. Default mode is metadata_only; prompt and response
--      storage are opt-in.
--   2. privacy_scope_overrides — per-scope override (project, department,
--      employee, customer, workflow, feature, agent, api_key). Resolution
--      order: scope override -> tenant default -> system default.
--   3. ai_economic_events — the canonical economic event ledger. Every
--      AI action eventually becomes one row here. Includes the full V5 §8.1
--      field set PLUS the V5 §27.6 privacy columns from day one so the
--      privacy posture of each event is auditable.
--
-- Coexists with traffic_events during the 90-day dual-write window
-- (V5 §7.4.4). Reads will migrate from traffic_events to
-- ai_economic_events in a later slice once dual-write data has accrued.
--
-- Idempotent. Reversible via v2_052_down.sql (never auto-run).

BEGIN;

-- =============================================================================
-- 1. tenant_privacy_settings
-- =============================================================================
-- One row per tenant. UPSERT-style: create on first read, update on UI save.
-- All boolean flags default to the privacy-first posture (metadata_only,
-- no prompts, no responses stored, retention 30 days, redaction required).
CREATE TABLE IF NOT EXISTS tenant_privacy_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,

    default_privacy_mode TEXT NOT NULL DEFAULT 'metadata_only'
        CHECK (default_privacy_mode IN (
            'metadata_only', 'fingerprint_only', 'redacted_trace',
            'private_gateway', 'full_trace'
        )),
    store_prompts          BOOLEAN NOT NULL DEFAULT false,
    store_responses        BOOLEAN NOT NULL DEFAULT false,
    allow_fingerprints     BOOLEAN NOT NULL DEFAULT true,
    allow_redacted_traces  BOOLEAN NOT NULL DEFAULT false,
    retention_days         INTEGER NOT NULL DEFAULT 30
        CHECK (retention_days > 0 AND retention_days <= 3650),  -- 1 day .. 10 years
    require_redaction      BOOLEAN NOT NULL DEFAULT true,
    customer_managed_key   BOOLEAN NOT NULL DEFAULT false,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. privacy_scope_overrides
-- =============================================================================
-- Per-scope overrides to the tenant default. Allows e.g. a regulated
-- department to be metadata_only while engineering opts into full_trace.
-- Scope values are open TEXT to follow the same shape as v2_050's
-- api_keys.owner_type (tenant, department, employee, workflow, project,
-- agent, customer, feature, api_key).
CREATE TABLE IF NOT EXISTS privacy_scope_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scope TEXT NOT NULL CHECK (scope IN (
        'tenant', 'department', 'employee', 'workflow', 'project',
        'agent', 'customer', 'feature', 'api_key'
    )),
    scope_id TEXT NOT NULL,

    privacy_mode TEXT NOT NULL CHECK (privacy_mode IN (
        'metadata_only', 'fingerprint_only', 'redacted_trace',
        'private_gateway', 'full_trace'
    )),
    store_prompts    BOOLEAN,
    store_responses  BOOLEAN,
    retention_days   INTEGER CHECK (retention_days IS NULL OR (retention_days > 0 AND retention_days <= 3650)),

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, scope, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_privacy_overrides_tenant
    ON privacy_scope_overrides (tenant_id, scope);

-- =============================================================================
-- 3. ai_economic_events (canonical ledger)
-- =============================================================================
-- Every metered AI action eventually becomes one row here.
--
-- Field groups follow V5 §8.1:
--   identity     — request_id, tenant_id, api_key_id, source, timestamp
--   ownership    — owner_type/id, department_id, employee_id, customer_id,
--                  project_id, feature_id, workflow_id
--   taxonomy     — task_type, action_type
--   routing      — provider, model_requested, model_used
--   usage        — input_tokens, output_tokens, total_tokens, cost_usd,
--                  direct_cost_usd, route_savings_usd, cache_savings_usd,
--                  retry_cost_usd, context_waste_usd, latency_ms, cache_hit,
--                  status_code, success
--   economics    — revenue_usd, gross_margin_pct
--   governance   — budget_id, policy_id, mandate_id, governance_decision,
--                  deny_code
--   evidence     — receipt_id, evidence_bundle_id
--   outcome      — output_status, quality_score, human_review_status
--   privacy      — privacy_mode, prompt_stored, response_stored,
--                  prompt_fingerprint, response_fingerprint,
--                  redaction_applied, retention_expires_at
--   metadata     — open JSONB
--
-- request_id is UNIQUE per tenant (a single AI action -> one row). Use
-- UPSERT on (tenant_id, request_id) when adding outcome/evidence later.
CREATE TABLE IF NOT EXISTS ai_economic_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- identity
    request_id TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    api_key_id UUID,
    source TEXT NOT NULL DEFAULT 'unknown',  -- 'chat_completions' | 'meter_only' | 'sdk' | 'mcp' | ...
    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- ownership
    owner_type TEXT CHECK (owner_type IS NULL OR owner_type IN (
        'tenant', 'department', 'employee', 'workflow', 'project',
        'agent', 'customer', 'feature', 'api_key'
    )),
    owner_id TEXT,
    department_id TEXT,
    employee_id TEXT,
    customer_id TEXT,
    project_id TEXT,
    feature_id TEXT,
    workflow_id TEXT,

    -- taxonomy
    task_type TEXT,
    action_type TEXT,

    -- routing
    provider TEXT,
    model_requested TEXT,
    model_used TEXT,

    -- usage
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd NUMERIC(18, 8) NOT NULL DEFAULT 0,
    direct_cost_usd NUMERIC(18, 8) NOT NULL DEFAULT 0,
    route_savings_usd NUMERIC(18, 8) NOT NULL DEFAULT 0,
    cache_savings_usd NUMERIC(18, 8) NOT NULL DEFAULT 0,
    retry_cost_usd NUMERIC(18, 8) NOT NULL DEFAULT 0,
    context_waste_usd NUMERIC(18, 8) NOT NULL DEFAULT 0,
    latency_ms INTEGER,
    cache_hit BOOLEAN NOT NULL DEFAULT false,
    status_code INTEGER,
    success BOOLEAN,

    -- economics
    revenue_usd NUMERIC(18, 8),
    gross_margin_pct NUMERIC(8, 6),

    -- governance
    budget_id TEXT,
    policy_id TEXT,
    mandate_id TEXT,
    governance_decision TEXT CHECK (governance_decision IS NULL OR governance_decision IN (
        'approved', 'denied', 'warned', 'requires_review',
        'settlement_required', 'settled', 'receipt_reused', 'cached', 'optimized'
    )),
    deny_code TEXT,

    -- evidence
    receipt_id TEXT,
    evidence_bundle_id TEXT,

    -- outcome
    output_status TEXT CHECK (output_status IS NULL OR output_status IN (
        'accepted', 'rejected', 'revised', 'escalated',
        'failed', 'pending_review', 'unknown'
    )),
    quality_score NUMERIC(8, 6) CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1)),
    human_review_status TEXT CHECK (human_review_status IS NULL OR human_review_status IN (
        'not_required', 'required', 'pending', 'approved', 'rejected', 'escalated', 'expired'
    )),

    -- privacy (from day one — V5 §27.6)
    privacy_mode TEXT NOT NULL DEFAULT 'metadata_only'
        CHECK (privacy_mode IN (
            'metadata_only', 'fingerprint_only', 'redacted_trace',
            'private_gateway', 'full_trace'
        )),
    prompt_stored BOOLEAN NOT NULL DEFAULT false,
    response_stored BOOLEAN NOT NULL DEFAULT false,
    prompt_fingerprint TEXT,
    response_fingerprint TEXT,
    redaction_applied BOOLEAN NOT NULL DEFAULT false,
    retention_expires_at TIMESTAMPTZ,

    -- open metadata
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, request_id)
);

-- Hot paths
CREATE INDEX IF NOT EXISTS idx_aiee_tenant_time
    ON ai_economic_events (tenant_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_aiee_api_key
    ON ai_economic_events (api_key_id, event_time DESC)
    WHERE api_key_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aiee_department
    ON ai_economic_events (tenant_id, department_id, event_time DESC)
    WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aiee_employee
    ON ai_economic_events (tenant_id, employee_id, event_time DESC)
    WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aiee_customer
    ON ai_economic_events (tenant_id, customer_id, event_time DESC)
    WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aiee_action
    ON ai_economic_events (tenant_id, action_type, event_time DESC)
    WHERE action_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aiee_evidence
    ON ai_economic_events (evidence_bundle_id)
    WHERE evidence_bundle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aiee_retention_expiry
    ON ai_economic_events (retention_expires_at)
    WHERE retention_expires_at IS NOT NULL;
-- Waste / quality slices for Optimize recommendations:
CREATE INDEX IF NOT EXISTS idx_aiee_denials
    ON ai_economic_events (tenant_id, governance_decision, event_time DESC)
    WHERE governance_decision IN ('denied', 'warned', 'requires_review');

COMMIT;
