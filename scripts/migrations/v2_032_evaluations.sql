-- v2_032: Evaluation Results
-- Intelligence Layer Phase 4 — Evaluation System
-- One row per verify node execution. Stores per-dimension scores
-- and the overall pass/fail verdict.

CREATE TABLE IF NOT EXISTS execute_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    request_id UUID NOT NULL REFERENCES execute_requests(id),
    -- trace node that triggered this evaluation (the verify node)
    trace_node_id UUID,
    task TEXT NOT NULL,
    response_text TEXT NOT NULL,
    -- context that was available to the model (for groundedness scoring)
    context_text TEXT,
    -- per-dimension scores 0.0–1.0
    scores JSONB NOT NULL DEFAULT '{}',
    -- weighted average of all dimension scores
    overall_score DOUBLE PRECISION NOT NULL,
    -- true if overall_score >= pass_threshold
    passed BOOLEAN NOT NULL,
    pass_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.70,
    evaluator_model TEXT NOT NULL,
    latency_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_execute_evaluations_request
    ON execute_evaluations(request_id);

CREATE INDEX IF NOT EXISTS idx_execute_evaluations_tenant_created
    ON execute_evaluations(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_execute_evaluations_passed
    ON execute_evaluations(tenant_id, passed)
    WHERE passed = false;
