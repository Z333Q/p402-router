-- v2_033: Memory System
-- Intelligence Layer Phase 5 — Persistent Agent Memory
-- Reuses pgvector (already enabled). Same 512-dim model as knowledge embeddings.
-- session_id = NULL means the memory persists across all sessions for the tenant.

CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    -- NULL = tenant-wide long-term memory; set = session-scoped short-term
    session_id UUID,
    source_request_id UUID REFERENCES execute_requests(id),
    memory_type TEXT NOT NULL
        CHECK (memory_type IN ('fact', 'preference', 'entity', 'instruction', 'summary')),
    content TEXT NOT NULL,
    -- 512-dim embedding of content (same model as knowledge_embeddings)
    embedding vector(512),
    -- 0.0 (ephemeral) – 1.0 (critical) — set by the extractor
    importance DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    -- NULL = permanent; set = auto-expire (e.g. session memories expire on session end)
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ANN search on memory embeddings
CREATE INDEX IF NOT EXISTS idx_memories_hnsw
    ON memories
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
    WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memories_tenant_type
    ON memories(tenant_id, memory_type);

CREATE INDEX IF NOT EXISTS idx_memories_tenant_session
    ON memories(tenant_id, session_id)
    WHERE session_id IS NOT NULL;

-- Used by the expiry cleanup cron
CREATE INDEX IF NOT EXISTS idx_memories_expires
    ON memories(expires_at)
    WHERE expires_at IS NOT NULL;
