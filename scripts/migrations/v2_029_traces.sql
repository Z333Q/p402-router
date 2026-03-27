-- v2_029: Execution Traces and Trace Nodes
-- Intelligence Layer Phase 0 — Foundation
-- Every request produces a trace. Every node appends to it. (ADR-004)
-- Prefixed `execute_` to avoid collision with any existing trace infrastructure.

-- ── Traces ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS execute_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    request_id UUID NOT NULL REFERENCES execute_requests(id),
    plan_id UUID,  -- references execute_plans(id); NULL for direct-path traces
    status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'completed', 'failed', 'partial')),
    -- Aggregated summary written at finalization
    summary JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_execute_traces_request
    ON execute_traces(request_id);

CREATE INDEX IF NOT EXISTS idx_execute_traces_tenant_created
    ON execute_traces(tenant_id, created_at DESC);

-- ── Trace Nodes ───────────────────────────────────────────────────────────────
-- One row per execution step. Written before execution (status=pending),
-- updated on completion (status=completed|failed).

CREATE TABLE IF NOT EXISTS execute_trace_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id UUID NOT NULL REFERENCES execute_traces(id) ON DELETE CASCADE,
    -- plan node ID; NULL for synthetic single-node (direct path)
    node_id UUID,
    node_type TEXT NOT NULL
        CHECK (node_type IN ('model', 'tool', 'retrieval', 'verify', 'settle', 'cache')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    -- Foreign keys to supporting audit tables (populated as available)
    route_decision_id UUID,
    policy_decision_id UUID REFERENCES execute_policy_decisions(id),
    payment_event_id UUID,
    tool_execution_id UUID,
    -- Response fingerprint (non-sensitive hash of provider response ID)
    provider_response_hash TEXT,
    -- Result of any verification step
    verification_result JSONB,
    -- Economics
    cost NUMERIC(20,8),
    latency_ms INTEGER,
    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    -- Error detail on failure
    error TEXT
);

CREATE INDEX IF NOT EXISTS idx_execute_trace_nodes_trace
    ON execute_trace_nodes(trace_id);

-- ── Trace Artifacts ───────────────────────────────────────────────────────────
-- Large blobs (raw responses, eval outputs) stored in object storage;
-- only the URI + hash is persisted here.

CREATE TABLE IF NOT EXISTS execute_trace_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id UUID NOT NULL REFERENCES execute_traces(id),
    artifact_type TEXT NOT NULL
        CHECK (artifact_type IN ('input', 'output', 'plan', 'eval', 'raw_response')),
    storage_uri TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_execute_trace_artifacts_trace
    ON execute_trace_artifacts(trace_id);
