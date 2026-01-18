-- P402 Router Schema (Active + EIP-8004 Specs)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants: Multi-tenancy root
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255), 
    owner_wallet VARCHAR(42), 
    treasury_address VARCHAR(42),
    
    -- EIP-8004 Future Proofing
    -- Link local tenant to their on-chain Agent Identity Token (ERC-721)
    eip8004_agent_id VARCHAR(66),
    
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policies: Routing and Spending rules
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id VARCHAR(50) UNIQUE NOT NULL,
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(255),
    rules JSONB DEFAULT '{}', 
    status VARCHAR(50) DEFAULT 'active',
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Routes: Registered endpoints for the router to manage
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id VARCHAR(50) UNIQUE NOT NULL,
    tenant_id UUID REFERENCES tenants(id),
    method VARCHAR(10) NOT NULL,
    path_pattern VARCHAR(255) NOT NULL,
    bazaar_metadata JSONB DEFAULT '{}', 
    accepts_config JSONB DEFAULT '[]', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Facilitators: Upstream payment processors
CREATE TABLE IF NOT EXISTS facilitators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facilitator_id VARCHAR(50) UNIQUE NOT NULL, 
    tenant_id UUID REFERENCES tenants(id), 
    name VARCHAR(255),
    endpoint VARCHAR(255),
    auth_config JSONB, 
    networks TEXT[],
    status VARCHAR(50) DEFAULT 'active',
    type VARCHAR(50),
    capabilities JSONB DEFAULT '{}', -- Task-specific capabilities (code_gen, summarization, etc.)
    
    -- EIP-8004 Future Proofing
    -- Store reputation score locally to check against upstream registry later
    reputation_score INTEGER DEFAULT 100,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration: Ensure capabilities column exists for task-based routing
ALTER TABLE facilitators ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{}';

-- Facilitator Health History
CREATE TABLE IF NOT EXISTS facilitator_health (
    facilitator_id TEXT PRIMARY KEY,
    tenant_id UUID, -- Optional: link back to tenant
    status TEXT NOT NULL CHECK (status IN ('healthy','degraded','down')),
    p95_verify_ms INTEGER,
    p95_settle_ms INTEGER,
    success_rate DOUBLE PRECISION,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT,
    raw JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Bazaar Resources (Service Discovery)
CREATE TABLE IF NOT EXISTS bazaar_resources (
    resource_id TEXT PRIMARY KEY,
    source_facilitator_id TEXT REFERENCES facilitators(facilitator_id),
    canonical_route_id TEXT NOT NULL,
    provider_base_url TEXT NOT NULL,
    route_path TEXT NOT NULL,
    methods TEXT[] NOT NULL,
    title TEXT,
    description TEXT,
    tags TEXT[],
    pricing JSONB,
    accepts JSONB,
    input_schema JSONB,
    output_schema JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_crawled_at TIMESTAMPTZ,
    rank_score DOUBLE PRECISION DEFAULT 0.0,
    UNIQUE(source_facilitator_id, canonical_route_id)
);

CREATE INDEX IF NOT EXISTS idx_bazaar_rank ON bazaar_resources(rank_score DESC);
CREATE INDEX IF NOT EXISTS idx_bazaar_canonical_route ON bazaar_resources(canonical_route_id);


-- Events: Ledger (Validation Registry Source)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(50) UNIQUE NOT NULL,
    tenant_id UUID REFERENCES tenants(id),
    route_id VARCHAR(50),
    trace_id VARCHAR(50),
    outcome VARCHAR(20) NOT NULL, 
    network VARCHAR(50),
    amount VARCHAR(50),
    asset VARCHAR(50),
    facilitator_id VARCHAR(50),
    steps JSONB DEFAULT '[]', 
    headers_meta JSONB DEFAULT '{}',
    raw_payload JSONB,
    
    -- EIP-8004 Future Proofing
    -- If we post this validation on-chain, store the TX hash here
    eip8004_attestation_tx VARCHAR(66),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_route_id ON events(route_id);

-- Performance Index for Replay Protection
CREATE INDEX IF NOT EXISTS idx_events_tx_hash ON events ((raw_payload->>'txHash'));

-- Job Cursors for Polling
CREATE TABLE IF NOT EXISTS job_cursors (
    job_name TEXT PRIMARY KEY,
    cursor JSONB NOT NULL DEFAULT '{}'::jsonB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- EIP-8004 Future Proofing
-- Link local tenant to their on-chain Agent Identity Token (ERC-721)
-- eip8004_agent_id VARCHAR(66),
    
-- Enable vector extension for semantic cache
CREATE EXTENSION IF NOT EXISTS vector;

-- Router Decisions: Log of all routing attempts
DROP TABLE IF EXISTS router_decisions;
CREATE TABLE IF NOT EXISTS router_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id VARCHAR(50) NOT NULL,
    tenant_id UUID REFERENCES tenants(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Input Context
    task TEXT,
    model_requested VARCHAR(100),
    input_tokens INTEGER,
    requested_mode VARCHAR(20), -- 'cost', 'quality', 'speed', 'balanced'
    
    -- Decision
    selected_provider_id VARCHAR(50), -- Link to facilitators conceptually, but loose binding ok
    selected_model VARCHAR(100),
    reason VARCHAR(50), -- 'cost_optimal', 'failover', 'rate_limit_avoid'
    
    -- Analysis
    alternatives JSONB, -- Array of other candidates considered
    
    -- Outcome
    success BOOLEAN,
    latency_ms INTEGER,
    cost_usd NUMERIC(18, 8),
    error_code VARCHAR(50),
    route_id VARCHAR(100) -- Link to canonical_route_id for Bazaar metrics
);

CREATE INDEX IF NOT EXISTS idx_router_decisions_tenant ON router_decisions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_router_decisions_timestamp ON router_decisions(timestamp);
CREATE INDEX IF NOT EXISTS idx_router_decisions_route_id ON router_decisions(route_id);


-- Agent Sessions: Time-bounded, budget-capped access keys
DROP TABLE IF EXISTS agent_sessions;
CREATE TABLE IF NOT EXISTS agent_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token VARCHAR(100) UNIQUE NOT NULL, -- The bearer token used by the agent
    tenant_id UUID REFERENCES tenants(id),
    agent_id VARCHAR(100), -- Internal ID for the agent
    wallet_address VARCHAR(42),
    
    -- Constraints
    budget_total_usd NUMERIC(10, 2) NOT NULL,
    budget_spent_usd NUMERIC(10, 2) DEFAULT 0.00,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Policy Links
    policies JSONB DEFAULT '[]', -- Array of policy overrides or IDs
    
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'exhausted', 'expired', 'revoked'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON agent_sessions(session_token);


-- Semantic Cache: Request embeddings and responses
DROP TABLE IF EXISTS semantic_cache;
CREATE TABLE IF NOT EXISTS semantic_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    
    -- Search Vector
    request_embedding vector(1536), -- Standard OpenAI dimension, adjustable
    request_hash VARCHAR(64), -- Fast exact match check
    
    -- Content
    prompt TEXT,
    response JSONB,
    
    -- Metadata
    model VARCHAR(100),
    usage_count INTEGER DEFAULT 1,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(request_hash, tenant_id)
);

-- Index for HNSW semantic search
-- Note: Requires pgvector. If failing, comment out the index.
CREATE INDEX IF NOT EXISTS idx_cache_embedding ON semantic_cache USING hnsw (request_embedding vector_cosine_ops);


-- Access Requests: Beta signup form
CREATE TABLE IF NOT EXISTS access_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    role VARCHAR(50),
    rpd VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Session Transactions: Track funding events for sessions
CREATE TABLE IF NOT EXISTS session_transactions (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    tx_hash VARCHAR(66) UNIQUE,
    amount DECIMAL(18, 6) NOT NULL,
    source VARCHAR(50), -- 'base_pay', 'direct', 'test'
    network VARCHAR(20), -- 'base', 'base_sepolia'
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_transactions_session ON session_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_session_transactions_tx_hash ON session_transactions(tx_hash);

-- A2A Contexts: Grouping of tasks
CREATE TABLE IF NOT EXISTS a2a_contexts (
    id VARCHAR(100) PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A2A Tasks: Units of work
CREATE TABLE IF NOT EXISTS a2a_tasks (
    id VARCHAR(100) PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    context_id VARCHAR(100) REFERENCES a2a_contexts(id),
    mandate_id VARCHAR(100), -- Link to optional payment mandate
    request_message JSONB NOT NULL,
    result_message JSONB,
    configuration JSONB DEFAULT '{}',
    state VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
    error_message TEXT,
    cost_usd NUMERIC(18, 8) DEFAULT 0.0,
    latency_ms INTEGER,
    provider_id VARCHAR(100),
    model_id VARCHAR(100),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A2A Task States: Detailed state transition history
CREATE TABLE IF NOT EXISTS a2a_task_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id VARCHAR(100) REFERENCES a2a_tasks(id),
    state VARCHAR(20) NOT NULL,
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AP2 Mandates: Pre-authorized payment limits
CREATE TABLE IF NOT EXISTS ap2_mandates (
    id VARCHAR(100) PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    type VARCHAR(20) NOT NULL, -- 'intent', 'cart', 'payment'
    user_did VARCHAR(255) NOT NULL,
    agent_did VARCHAR(255) NOT NULL,
    constraints JSONB NOT NULL,
    amount_spent_usd NUMERIC(18, 8) DEFAULT 0.0,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'exhausted', 'expired', 'revoked'
    signature TEXT,
    public_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A2A Push Configurations: Webhook subscriptions
CREATE TABLE IF NOT EXISTS a2a_push_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    webhook_url TEXT NOT NULL,
    auth_type VARCHAR(20) DEFAULT 'none', -- 'bearer', 'basic', 'api_key', 'none'
    auth_token TEXT,
    event_types TEXT[] NOT NULL, -- e.g. {'task.completed', 'mandate.used'}
    context_filter VARCHAR(100), -- Optional: only for a specific context
    max_retries INTEGER DEFAULT 3,
    retry_delay_ms INTEGER DEFAULT 1000,
    consecutive_failures INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    last_delivery_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_configs_tenant ON a2a_push_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_push_configs_enabled ON a2a_push_configs(enabled) WHERE enabled = true;
