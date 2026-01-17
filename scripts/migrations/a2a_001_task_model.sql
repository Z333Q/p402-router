-- A2A Protocol & AP2 Mandates Support

-- A2A Contexts: Multi-turn conversation grouping
CREATE TABLE IF NOT EXISTS a2a_contexts (
    id VARCHAR(50) PRIMARY KEY, -- ctx_...
    tenant_id UUID REFERENCES tenants(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A2A Tasks: Units of work
CREATE TABLE IF NOT EXISTS a2a_tasks (
    id VARCHAR(50) PRIMARY KEY, -- task_...
    tenant_id UUID REFERENCES tenants(id),
    context_id VARCHAR(50) REFERENCES a2a_contexts(id),
    
    -- Request details
    request_message JSONB NOT NULL, -- The initial user message
    configuration JSONB DEFAULT '{}', -- mode, etc.
    
    -- Current Status
    state VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
    result_message JSONB, -- The final agent response
    artifacts JSONB DEFAULT '[]', -- List of produced artifacts
    
    -- Performance & Cost
    cost_usd NUMERIC(18, 8) DEFAULT 0,
    latency_ms INTEGER,
    
    mandate_id VARCHAR(50), -- Link to AP2 mandate used
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_a2a_tasks_tenant_state ON a2a_tasks(tenant_id, state);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_context ON a2a_tasks(context_id);

-- A2A Task States: History of transitions
CREATE TABLE IF NOT EXISTS a2a_task_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id VARCHAR(50) REFERENCES a2a_tasks(id) ON DELETE CASCADE,
    state VARCHAR(20) NOT NULL,
    reason VARCHAR(255),
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_a2a_task_states_task ON a2a_task_states(task_id);

-- A2A Push Configs: Webhooks for async updates
CREATE TABLE IF NOT EXISTS a2a_push_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    url VARCHAR(255) NOT NULL,
    events VARCHAR(50)[], -- ['task.completed', 'task.failed']
    secret VARCHAR(100), -- For signing payload
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AP2 Mandates: Spending authorization
CREATE TABLE IF NOT EXISTS ap2_mandates (
    id VARCHAR(50) PRIMARY KEY, -- mnd_...
    tenant_id UUID REFERENCES tenants(id),
    
    type VARCHAR(20) NOT NULL, -- 'intent', 'payment'
    
    -- Identities
    user_did VARCHAR(100) NOT NULL,
    agent_did VARCHAR(100) NOT NULL,
    
    -- Constraints
    constraints JSONB NOT NULL, -- max_amount_usd, valid_until, allowed_categories
    
    -- State
    amount_spent_usd NUMERIC(18, 8) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, exhausted, expired, revoked
    
    -- Crypto
    signature VARCHAR(255),
    public_key VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ap2_mandates_user ON ap2_mandates(user_did);
CREATE INDEX IF NOT EXISTS idx_ap2_mandates_agent ON ap2_mandates(agent_did);
