-- v2_027: Plans and Execution Graph Tables
-- Intelligence Layer Phase 0 — Foundation
-- Bounded DAG execution. Max 5 nodes. No cycles. (ADR-003)

-- ── Plans ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS execute_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    request_id UUID NOT NULL REFERENCES execute_requests(id),
    session_id UUID,
    goal TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    budget_cap NUMERIC(20,8),
    confidence DOUBLE PRECISION,
    max_nodes INTEGER NOT NULL DEFAULT 5 CHECK (max_nodes BETWEEN 1 AND 20),
    planner_version TEXT NOT NULL DEFAULT 'v0.1',
    plan_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_execute_plans_request
    ON execute_plans(request_id);

CREATE INDEX IF NOT EXISTS idx_execute_plans_tenant_created
    ON execute_plans(tenant_id, created_at DESC);

-- ── Plan Nodes ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS execute_plan_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES execute_plans(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    node_type TEXT NOT NULL
        CHECK (node_type IN ('model', 'tool', 'retrieval', 'verify', 'settle')),
    label TEXT NOT NULL,
    sequence_index INTEGER NOT NULL,
    input_refs JSONB NOT NULL DEFAULT '[]',
    provider_or_tool_id UUID,
    estimated_cost NUMERIC(20,8),
    estimated_latency_ms INTEGER,
    policy_requirements JSONB NOT NULL DEFAULT '{}',
    retry_policy JSONB NOT NULL DEFAULT '{"max_retries": 1, "backoff_ms": 1000}',
    verification_rule JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_execute_plan_nodes_plan
    ON execute_plan_nodes(plan_id, sequence_index);

-- ── Plan Edges ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS execute_plan_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES execute_plans(id) ON DELETE CASCADE,
    from_node_id UUID NOT NULL REFERENCES execute_plan_nodes(id),
    to_node_id UUID NOT NULL REFERENCES execute_plan_nodes(id),
    edge_type TEXT NOT NULL DEFAULT 'depends_on'
        CHECK (edge_type IN ('depends_on', 'fallback', 'conditional')),
    condition_json JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_execute_plan_edges_plan
    ON execute_plan_edges(plan_id);
