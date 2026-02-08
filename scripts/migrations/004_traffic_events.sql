-- File: scripts/migrations/004_traffic_events.sql
-- Purpose: Store real API traffic events for analytics dashboard

BEGIN;

CREATE TABLE IF NOT EXISTS traffic_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Request Details
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    path TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    
    -- Performance
    duration_ms INTEGER,
    
    -- Identity
    ip_hash VARCHAR(64), -- Anonymized
    user_agent TEXT,
    tenant_id UUID,
    
    -- AI Context (if applicable)
    model TEXT,
    provider TEXT,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    cost_usd NUMERIC(10, 6) DEFAULT 0,
    
    -- Metadata
    request_id TEXT,
    error_code TEXT
);

-- Time-series optimization (partition/index by time)
CREATE INDEX IF NOT EXISTS idx_traffic_timestamp 
    ON traffic_events(timestamp DESC);

-- Analytics queries often filter by tenant
CREATE INDEX IF NOT EXISTS idx_traffic_tenant_time 
    ON traffic_events(tenant_id, timestamp DESC);

-- Aggregate queries by path
CREATE INDEX IF NOT EXISTS idx_traffic_path_time 
    ON traffic_events(path, timestamp DESC);

-- Documentation
COMMENT ON TABLE traffic_events IS 'Stores individual API request logs for analytics';

COMMIT;
