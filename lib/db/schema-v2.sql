-- P402 V2 Database Schema
-- =======================
-- This schema extends the existing P402 schema with V2 features.
-- Run this migration after the existing schema.

-- =============================================================================
-- SEMANTIC CACHE TABLE
-- =============================================================================
-- Stores cached AI responses with embeddings for semantic similarity search

CREATE TABLE IF NOT EXISTS semantic_cache (
    id VARCHAR(64) PRIMARY KEY,
    namespace VARCHAR(64) NOT NULL DEFAULT 'default',
    request_hash VARCHAR(64) NOT NULL,
    embedding TEXT NOT NULL,  -- JSON array of floats (use pgvector in production)
    response TEXT NOT NULL,   -- JSON serialized CompletionResponse
    hit_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Unique constraint for namespace + hash (exact match)
    UNIQUE(namespace, request_hash)
);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_semantic_cache_expires 
ON semantic_cache(expires_at);

-- Index for namespace queries
CREATE INDEX IF NOT EXISTS idx_semantic_cache_namespace 
ON semantic_cache(namespace, created_at DESC);

-- =============================================================================
-- ROUTER DECISIONS TABLE
-- =============================================================================
-- Tracks routing decisions for analytics and cost optimization

CREATE TABLE IF NOT EXISTS router_decisions (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'default',
    session_id VARCHAR(64),
    request_id VARCHAR(64) NOT NULL,
    
    -- Routing info
    selected_provider_id VARCHAR(32) NOT NULL,
    selected_model_id VARCHAR(128) NOT NULL,
    routing_mode VARCHAR(16) NOT NULL,  -- cost, quality, speed, balanced
    reason VARCHAR(64),                  -- cost_optimal, quality_optimal, etc.
    
    -- Cost tracking
    cost_usd DECIMAL(12, 8) NOT NULL DEFAULT 0,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    
    -- Performance
    latency_ms INTEGER NOT NULL DEFAULT 0,
    ttfb_ms INTEGER,  -- Time to first byte (streaming)
    
    -- Status
    success BOOLEAN NOT NULL DEFAULT true,
    error_code VARCHAR(32),
    error_message TEXT,
    
    -- Request metadata
    task VARCHAR(32),  -- chat, code, reasoning, etc.
    cached BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_router_decisions_tenant 
ON router_decisions(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_router_decisions_provider 
ON router_decisions(selected_provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_router_decisions_session 
ON router_decisions(session_id) WHERE session_id IS NOT NULL;

-- =============================================================================
-- AGENT SESSIONS TABLE
-- =============================================================================
-- Manages agent sessions with budgets and policies

CREATE TABLE IF NOT EXISTS agent_sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'default',
    agent_identifier VARCHAR(128),
    
    -- Budget management
    budget_total DECIMAL(12, 6) NOT NULL DEFAULT 10.00,
    budget_used DECIMAL(12, 6) NOT NULL DEFAULT 0,
    
    -- Policy
    policy_snapshot JSONB NOT NULL DEFAULT '{}',
    
    -- Status
    status VARCHAR(16) NOT NULL DEFAULT 'active',  -- active, expired, ended, suspended
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_sessions_tenant 
ON agent_sessions(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_expires 
ON agent_sessions(expires_at) WHERE status = 'active';

-- =============================================================================
-- PROVIDER HEALTH TABLE
-- =============================================================================
-- Tracks provider health status over time

CREATE TABLE IF NOT EXISTS provider_health (
    id SERIAL PRIMARY KEY,
    provider_id VARCHAR(32) NOT NULL,
    
    -- Health metrics
    status VARCHAR(16) NOT NULL,  -- healthy, degraded, down
    latency_p50_ms INTEGER NOT NULL DEFAULT 0,
    latency_p95_ms INTEGER NOT NULL DEFAULT 0,
    latency_p99_ms INTEGER,
    success_rate DECIMAL(5, 4) NOT NULL DEFAULT 1.0,
    error_rate DECIMAL(5, 4) NOT NULL DEFAULT 0,
    
    -- Rate limits
    rate_limit_remaining INTEGER,
    rate_limit_reset_at TIMESTAMP WITH TIME ZONE,
    
    -- Error tracking
    last_error_code VARCHAR(32),
    last_error_message TEXT,
    last_error_at TIMESTAMP WITH TIME ZONE,
    
    checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for latest health per provider
CREATE INDEX IF NOT EXISTS idx_provider_health_latest 
ON provider_health(provider_id, checked_at DESC);

-- =============================================================================
-- COST ALERTS TABLE
-- =============================================================================
-- Configurable alerts for cost thresholds

CREATE TABLE IF NOT EXISTS cost_alerts (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    
    -- Alert configuration
    alert_type VARCHAR(32) NOT NULL,  -- daily_spend, session_spend, request_cost
    threshold_usd DECIMAL(12, 6) NOT NULL,
    
    -- Notification
    webhook_url TEXT,
    email VARCHAR(256),
    
    -- Status
    enabled BOOLEAN NOT NULL DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_alerts_tenant 
ON cost_alerts(tenant_id, enabled);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Daily spend summary by tenant
CREATE OR REPLACE VIEW v_daily_spend AS
SELECT 
    tenant_id,
    DATE(created_at) as date,
    selected_provider_id as provider,
    COUNT(*) as request_count,
    SUM(cost_usd) as total_cost_usd,
    AVG(cost_usd) as avg_cost_usd,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens,
    AVG(latency_ms) as avg_latency_ms,
    SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as success_rate
FROM router_decisions
GROUP BY tenant_id, DATE(created_at), selected_provider_id;

-- Active sessions summary
CREATE OR REPLACE VIEW v_active_sessions AS
SELECT 
    s.tenant_id,
    s.session_id,
    s.agent_identifier,
    s.budget_total,
    s.budget_used,
    s.budget_total - s.budget_used as budget_remaining,
    s.status,
    s.created_at,
    s.expires_at,
    EXTRACT(EPOCH FROM (s.expires_at - NOW())) as seconds_remaining,
    COUNT(r.id) as request_count,
    MAX(r.created_at) as last_request_at
FROM agent_sessions s
LEFT JOIN router_decisions r ON s.session_id = r.session_id
WHERE s.status = 'active'
GROUP BY s.session_id;

-- Cache effectiveness
CREATE OR REPLACE VIEW v_cache_stats AS
SELECT 
    namespace,
    COUNT(*) as total_entries,
    SUM(hit_count) as total_hits,
    AVG(hit_count) as avg_hits_per_entry,
    MIN(created_at) as oldest_entry,
    MAX(created_at) as newest_entry,
    COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_entries
FROM semantic_cache
GROUP BY namespace;

-- =============================================================================
-- CLEANUP FUNCTION
-- =============================================================================

-- Function to clean up expired data
CREATE OR REPLACE FUNCTION cleanup_expired_data() RETURNS void AS $$
BEGIN
    -- Clean expired cache entries
    DELETE FROM semantic_cache WHERE expires_at < NOW();
    
    -- Update expired sessions
    UPDATE agent_sessions 
    SET status = 'expired' 
    WHERE status = 'active' AND expires_at < NOW();
    
    -- Clean old router decisions (keep 90 days)
    DELETE FROM router_decisions 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Clean old health records (keep 7 days)
    DELETE FROM provider_health 
    WHERE checked_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run this manually or via cron/pg_cron)
-- SELECT cleanup_expired_data();
