-- =============================================================================
-- P402 OpenRouter Integration Migration
-- =============================================================================
-- Adds spend tracking and analytics tables for the billing guard system.
-- Run: psql $DATABASE_URL < scripts/migrations/002_openrouter_integration.sql
-- =============================================================================

-- Model Usage Logging
CREATE TABLE IF NOT EXISTS model_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    session_id TEXT,
    tenant_id TEXT DEFAULT 'default',
    model_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    
    -- Token usage
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    
    -- Cost tracking
    estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    actual_cost_usd NUMERIC(10, 6),
    
    -- Metadata
    request_id TEXT,
    routing_mode TEXT,
    cached BOOLEAN DEFAULT false,
    latency_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for queries
    CONSTRAINT model_usage_user_idx CHECK (user_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_model_usage_user_created 
    ON model_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_usage_model_created 
    ON model_usage(model_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_usage_tenant_created 
    ON model_usage(tenant_id, created_at DESC);

-- Daily Spend View
CREATE OR REPLACE VIEW v_daily_spend AS
SELECT 
    user_id,
    DATE(created_at) as spend_date,
    SUM(COALESCE(actual_cost_usd, estimated_cost_usd)) as total_spend_usd,
    COUNT(*) as request_count,
    SUM(total_tokens) as total_tokens,
    AVG(latency_ms) as avg_latency_ms
FROM model_usage
GROUP BY user_id, DATE(created_at)
ORDER BY spend_date DESC;

-- Model Popularity View
CREATE OR REPLACE VIEW v_model_usage AS
SELECT 
    model_id,
    provider,
    COUNT(*) as total_requests,
    SUM(total_tokens) as total_tokens,
    SUM(COALESCE(actual_cost_usd, estimated_cost_usd)) as total_cost_usd,
    AVG(latency_ms) as avg_latency_ms,
    COUNT(CASE WHEN cached THEN 1 END) as cached_hits,
    MAX(created_at) as last_used_at
FROM model_usage
GROUP BY model_id, provider
ORDER BY total_requests DESC;

-- Anomaly Log (for Z-score alerts)
CREATE TABLE IF NOT EXISTS billing_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    request_id TEXT,
    zscore NUMERIC(6, 3) NOT NULL,
    estimated_cost_usd NUMERIC(10, 6) NOT NULL,
    mean_cost_usd NUMERIC(10, 6),
    std_dev_usd NUMERIC(10, 6),
    flagged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_anomalies_user 
    ON billing_anomalies(user_id, flagged_at DESC);

-- Grant permissions if needed
-- GRANT SELECT, INSERT ON model_usage TO your_app_user;
-- GRANT SELECT ON v_daily_spend, v_model_usage TO your_app_user;
