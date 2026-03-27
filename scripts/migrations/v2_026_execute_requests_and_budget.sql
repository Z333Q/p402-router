-- v2_026: Execute Requests and Budget Reservation Tables
-- Intelligence Layer Phase 0 — Foundation
-- These tables are prefixed with `execute_` to avoid collision with
-- any existing `requests` table.

-- ── Execute Requests ──────────────────────────────────────────────────────────
-- Canonical record for every /v1/execute call.

CREATE TABLE IF NOT EXISTS execute_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    session_id UUID,  -- references agent_sessions(id) when provided
    request_type TEXT NOT NULL DEFAULT 'execute',
    task TEXT NOT NULL,
    input_payload JSONB NOT NULL DEFAULT '{}',
    constraints JSONB NOT NULL DEFAULT '{}',
    mode_requested TEXT NOT NULL DEFAULT 'auto'
        CHECK (mode_requested IN ('auto', 'direct', 'planned')),
    mode_resolved TEXT
        CHECK (mode_resolved IN ('direct', 'planned')),
    mode_gate_score INTEGER,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    budget_cap NUMERIC(20,8),
    estimated_cost NUMERIC(20,8),
    actual_cost NUMERIC(20,8),
    result_payload JSONB,
    error_payload JSONB,
    trace_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_execute_requests_tenant_created
    ON execute_requests(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_execute_requests_status
    ON execute_requests(status)
    WHERE status IN ('pending', 'running');

CREATE INDEX IF NOT EXISTS idx_execute_requests_session
    ON execute_requests(session_id)
    WHERE session_id IS NOT NULL;

-- ── Budget Reservations ───────────────────────────────────────────────────────
-- Reserve budget before execution; release or consume after.

CREATE TABLE IF NOT EXISTS budget_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    request_id UUID NOT NULL REFERENCES execute_requests(id),
    node_id UUID,  -- NULL for request-level reservations
    reserved_amount NUMERIC(20,8) NOT NULL,
    consumed_amount NUMERIC(20,8) NOT NULL DEFAULT 0,
    released_amount NUMERIC(20,8) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'reserved'
        CHECK (status IN ('reserved', 'consumed', 'released', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_reservations_request
    ON budget_reservations(request_id);

CREATE INDEX IF NOT EXISTS idx_budget_reservations_tenant_status
    ON budget_reservations(tenant_id, status)
    WHERE status = 'reserved';

-- ── Budget Events ─────────────────────────────────────────────────────────────
-- Append-only ledger of budget movements.

CREATE TABLE IF NOT EXISTS budget_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    request_id UUID NOT NULL REFERENCES execute_requests(id),
    reservation_id UUID REFERENCES budget_reservations(id),
    event_type TEXT NOT NULL
        CHECK (event_type IN ('reserved', 'consumed', 'released', 'overrun', 'refunded')),
    amount NUMERIC(20,8) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDC',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_events_tenant_created
    ON budget_events(tenant_id, created_at DESC);

-- ── Idempotency Store ─────────────────────────────────────────────────────────
-- Stores completed execute responses keyed by idempotency key + tenant.

CREATE TABLE IF NOT EXISTS execute_idempotency (
    idempotency_key TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    request_id UUID NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (idempotency_key, tenant_id)
);

-- Auto-expire idempotency records after 24 hours (advisory; enforce in app)
CREATE INDEX IF NOT EXISTS idx_execute_idempotency_created
    ON execute_idempotency(created_at);
