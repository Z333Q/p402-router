
CREATE TABLE IF NOT EXISTS facilitator_health (
    tenant_id UUID NOT NULL,
    facilitator_id TEXT NOT NULL, -- Changed to TEXT to match facilitators table
    status TEXT NOT NULL CHECK (status IN ('healthy','degraded','down')),
    p95_verify_ms INTEGER,
    p95_settle_ms INTEGER,
    success_rate DOUBLE PRECISION,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT,
    raw JSONB,
    PRIMARY KEY (tenant_id, facilitator_id)
);
