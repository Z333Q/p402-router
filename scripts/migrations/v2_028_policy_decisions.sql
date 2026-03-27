-- v2_028: Policy Decisions Table
-- Intelligence Layer Phase 0 — Foundation
-- Structured allow/deny/fallback decisions per request and per node.
-- Extends (does not replace) existing ap2_mandates mandate enforcement.

CREATE TABLE IF NOT EXISTS execute_policy_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    request_id UUID NOT NULL REFERENCES execute_requests(id),
    node_id UUID,  -- NULL = request-level decision; set = node-level decision
    mandate_id UUID,  -- references ap2_mandates(id) when a mandate was checked
    decision TEXT NOT NULL
        CHECK (decision IN ('allow', 'deny', 'fallback')),
    reasons JSONB NOT NULL DEFAULT '[]',
    -- SHA-256 hash of (tenant_id || request_id || node_id || decision || reasons)
    -- for tamper-evidence; computed in application layer
    decision_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_execute_policy_decisions_request
    ON execute_policy_decisions(request_id);

CREATE INDEX IF NOT EXISTS idx_execute_policy_decisions_tenant_created
    ON execute_policy_decisions(tenant_id, created_at DESC)
    WHERE decision = 'deny';
