-- V2 Initial Schema Migration
-- Adds support for Agent Sessions, Semantic Caching, and High-Fidelity Router Logging

-- 1. Agent Sessions
-- Ephemeral identities for AI Agents with specific budget constraints
CREATE TABLE IF NOT EXISTS agent_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token VARCHAR(255) UNIQUE NOT NULL, -- sk_sess_...
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(255),
    
    -- Constraints
    budget_total_usd DECIMAL(10, 4), -- e.g. 50.00
    budget_used_usd DECIMAL(10, 4) DEFAULT 0.00,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Scopes
    allowed_providers TEXT[], -- ['anthropic', 'openai'] or NULL (all)
    allowed_models TEXT[],
    
    status VARCHAR(50) DEFAULT 'active', -- active, exhausted, expired, revoked
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON agent_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON agent_sessions(tenant_id);

-- 2. router_decisions
-- High-fidelity log of the routing logic (distinct from semantic 'events' ledger)
-- Optimized for "Why did this happen?" debugging and Cost Intelligence
CREATE TABLE IF NOT EXISTS router_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trace_id VARCHAR(50) UNIQUE NOT NULL, -- Correlates with 'events.trace_id'
    tenant_id UUID REFERENCES tenants(id),
    session_id UUID REFERENCES agent_sessions(id), -- Link to agent session if applicable
    
    -- Request Context
    model_requested VARCHAR(100),
    task_tags TEXT[], -- ['coding', 'creative']
    
    -- The Decision
    selected_provider_id VARCHAR(50),
    selected_model VARCHAR(100),
    routing_mode VARCHAR(50), -- 'cost', 'performance', 'balanced'
    
    -- Metrics
    estimated_cost_usd DECIMAL(10, 6),
    latency_ms INTEGER,
    
    -- Policy Traces (Which rules triggered?)
    policy_trace JSONB, -- [{ "policy_id": "...", "outcome": "allow" }]
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_router_decisions_created_at ON router_decisions(created_at);
CREATE INDEX IF NOT EXISTS idx_router_decisions_session ON router_decisions(session_id);

-- 3. semantic_cache
-- Stores response payloads for similarity matching
CREATE TABLE IF NOT EXISTS semantic_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    
    -- The Key
    query_text TEXT NOT NULL,
    query_embedding vector(1536), -- Requires pgvector extension. If not available, we fall back to hash or disable.
    
    -- The Value
    response_payload JSONB NOT NULL,
    
    -- Metadata
    model VARCHAR(100),
    provider VARCHAR(50),
    cost_saved_usd DECIMAL(10, 6),
    latency_saved_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_count INTEGER DEFAULT 1
);

-- Note regarding pgvector: 
-- We assume the extension might be managed by the platform (Neon/Supabase). 
-- If 'vector' type fails, we will catch it in logic or use a separate migration to enable extension.
-- CREATE EXTENSION IF NOT EXISTS vector; 
