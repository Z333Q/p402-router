BEGIN;

-- ==========================================
-- 1. AUDIT RUNS (Job Tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('tenant', 'route', 'endpoint', 'listing', 'publisher', 'policy_set')),
    scope_id TEXT NOT NULL,
    domains TEXT[] NOT NULL,
    trigger_source TEXT NOT NULL CHECK (trigger_source IN ('user_click', 'schedule', 'system_event')),
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'success', 'failed')),
    plan_tier_snapshot TEXT NOT NULL,
    error_code TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_audit_runs_tenant_started ON audit_runs(tenant_id, started_at DESC);

-- ==========================================
-- 2. AUDIT SCORES (Time-Series Metrics)
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_run_id UUID REFERENCES audit_runs(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL,
    scope_id TEXT NOT NULL,
    overall_score INT NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    integration_score INT NOT NULL DEFAULT 0,
    runtime_score INT NOT NULL DEFAULT 0,
    trust_score INT NOT NULL DEFAULT 0,
    governance_score INT NOT NULL DEFAULT 0,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_scores_tenant_computed ON audit_scores(tenant_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_scores_scope ON audit_scores(scope_type, scope_id, computed_at DESC);

-- ==========================================
-- 3. AUDIT FINDINGS (The Core Issues)
-- Idempotency constraint: one active row per unique (tenant, scope, code).
-- Background workers use INSERT ... ON CONFLICT DO UPDATE.
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL,
    scope_id TEXT NOT NULL,
    code TEXT NOT NULL,
    domain TEXT NOT NULL CHECK (domain IN ('integration', 'runtime', 'trust', 'governance')),
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    status TEXT NOT NULL CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'ignored')),

    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    user_impact TEXT NOT NULL,
    technical_detail TEXT NOT NULL,
    recommendation TEXT NOT NULL,

    impact_estimate_json JSONB DEFAULT '{}'::jsonb,
    plan_visibility_json JSONB DEFAULT '{"visible": true, "detail_level": "full"}'::jsonb,
    docs_slug TEXT,

    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    occurrence_count_24h INT NOT NULL DEFAULT 1,
    occurrence_count_7d INT NOT NULL DEFAULT 1,

    -- The Idempotency Guard
    CONSTRAINT idx_unique_finding_per_scope UNIQUE (tenant_id, scope_type, scope_id, code)
);

CREATE INDEX IF NOT EXISTS idx_audit_findings_filters ON audit_findings(tenant_id, scope_type, scope_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_audit_findings_last_seen ON audit_findings(tenant_id, last_seen_at DESC);

-- ==========================================
-- 4. AUDIT FINDING EVIDENCE (Append-Only)
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_finding_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id UUID NOT NULL REFERENCES audit_findings(id) ON DELETE CASCADE,
    evidence_type TEXT NOT NULL CHECK (evidence_type IN ('tx_hash', 'receipt_id', 'route_id', 'listing_id', 'policy_id', 'incident_id', 'webhook_event_id', 'trace_id')),
    evidence_value TEXT NOT NULL,
    evidence_label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_evidence_finding ON audit_finding_evidence(finding_id, created_at DESC);

-- ==========================================
-- 5. AUDIT FIX ACTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_finding_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id UUID NOT NULL REFERENCES audit_findings(id) ON DELETE CASCADE,
    action_id TEXT NOT NULL,
    label TEXT NOT NULL,
    route TEXT NOT NULL,
    api_hint TEXT,
    requires_plan TEXT NOT NULL CHECK (requires_plan IN ('free', 'pro', 'enterprise')),
    auto_fix_supported BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_audit_actions_finding ON audit_finding_actions(finding_id);

-- ==========================================
-- 6. AUDIT SCHEDULES (Cron Configs — Pro/Enterprise only)
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL,
    scope_id TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('hourly', 'daily', 'weekly')),
    domains TEXT[] NOT NULL,
    thresholds_json JSONB DEFAULT '{}'::jsonb,
    enabled BOOLEAN NOT NULL DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_schedules_due ON audit_schedules(tenant_id, enabled, next_run_at);

-- ==========================================
-- 7. AUDIT EXPORTS (Enterprise Feature)
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    requested_by TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('csv', 'json', 'ndjson', 'signed_bundle')),
    from_ts TIMESTAMPTZ NOT NULL,
    to_ts TIMESTAMPTZ NOT NULL,
    domains TEXT[] NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('processing', 'ready', 'failed', 'expired')),
    artifact_uri TEXT,
    signed_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_audit_exports_tenant_created ON audit_exports(tenant_id, created_at DESC);

COMMIT;
