-- v2_031: Tool Definitions and Execution Audit Log
-- Intelligence Layer Phase 3 — Tool Registry
-- Built-in tools are rows with tenant_id IS NULL.
-- Tenant-custom tools reference a specific tenant.

CREATE TABLE IF NOT EXISTS tool_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- NULL = globally available built-in; set = tenant-scoped custom tool
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    -- JSON Schema for the tool's input parameters
    input_schema JSONB NOT NULL DEFAULT '{}',
    is_builtin BOOLEAN NOT NULL DEFAULT false,
    enabled BOOLEAN NOT NULL DEFAULT true,
    -- Extra config (e.g. API endpoint, timeout, rate limits)
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Built-in tools: unique by name globally (tenant_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tool_definitions_builtin_name
    ON tool_definitions(name)
    WHERE tenant_id IS NULL;

-- Tenant tools: unique by name within a tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_tool_definitions_tenant_name
    ON tool_definitions(tenant_id, name)
    WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tool_definitions_tenant_enabled
    ON tool_definitions(tenant_id, enabled);

-- ── Tool Executions ───────────────────────────────────────────────────────────
-- Append-only audit log of every tool call.

CREATE TABLE IF NOT EXISTS tool_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    request_id UUID REFERENCES execute_requests(id),
    trace_node_id UUID,  -- references execute_trace_nodes(id) — set post-insert
    tool_name TEXT NOT NULL,
    tool_definition_id UUID REFERENCES tool_definitions(id),
    input_args JSONB NOT NULL DEFAULT '{}',
    output JSONB,
    status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'completed', 'failed', 'timeout')),
    latency_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tool_executions_tenant_created
    ON tool_executions(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_executions_request
    ON tool_executions(request_id)
    WHERE request_id IS NOT NULL;

-- Seed built-in tools
INSERT INTO tool_definitions (name, description, input_schema, is_builtin, config)
VALUES
    (
        'web_search',
        'Search the web for current information on a topic. Returns a summary with sources.',
        '{"type":"object","properties":{"query":{"type":"string","description":"The search query"}},"required":["query"]}',
        true,
        '{"model":"perplexity/sonar","max_tokens":1024}'
    ),
    (
        'http_fetch',
        'Fetch the content of a URL and return the text. Strips HTML and limits to 50KB.',
        '{"type":"object","properties":{"url":{"type":"string","description":"The URL to fetch"},"timeout_ms":{"type":"integer","default":10000}},"required":["url"]}',
        true,
        '{"max_bytes":51200,"timeout_ms":10000}'
    )
ON CONFLICT DO NOTHING;
