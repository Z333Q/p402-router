-- v2_030: Knowledge Sources, Documents, Chunks, Embeddings, Retrieval
-- Intelligence Layer Phase 1 — Retrieval Service
-- Uses pgvector (already enabled for semantic_cache). (ADR-002)
-- Embedding model: openai/text-embedding-3-small via OpenRouter, 512 dimensions.
-- Matches existing semantic cache embedding model.

-- Ensure pgvector is available (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Knowledge Sources ─────────────────────────────────────────────────────────
-- A "source" is a collection of documents (e.g. a product wiki, a policy repo).
-- All sources are tenant-scoped. All API keys within a tenant share sources.

CREATE TABLE IF NOT EXISTS knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    source_type TEXT NOT NULL
        CHECK (source_type IN ('manual', 'url', 'upload', 'api', 'sync')),
    name TEXT NOT NULL,
    uri TEXT,
    trust_level TEXT NOT NULL DEFAULT 'standard'
        CHECK (trust_level IN ('standard', 'verified', 'internal')),
    confidentiality TEXT NOT NULL DEFAULT 'private'
        CHECK (confidentiality IN ('private', 'tenant', 'public')),
    jurisdiction TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'paused', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_tenant
    ON knowledge_sources(tenant_id, status);

-- ── Knowledge Documents ───────────────────────────────────────────────────────
-- One row per ingested document. Content stored in object storage (R2);
-- only the content hash + metadata here.

CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    external_id TEXT,  -- caller-provided dedup key
    title TEXT,
    mime_type TEXT NOT NULL DEFAULT 'text/plain',
    content_hash TEXT NOT NULL,  -- SHA-256 of raw content; used for dedup
    storage_uri TEXT,  -- Cloudflare R2 URI for raw content
    token_count INTEGER,
    chunk_count INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'chunking', 'embedding', 'ready', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_documents_hash
    ON knowledge_documents(tenant_id, content_hash);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source
    ON knowledge_documents(source_id, status);

-- ── Knowledge Chunks ──────────────────────────────────────────────────────────
-- Each document is split into ~512-token chunks.

CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL,
    char_start INTEGER,  -- byte offset in source document
    char_end INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document
    ON knowledge_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_tenant
    ON knowledge_chunks(tenant_id);

-- ── Knowledge Embeddings ──────────────────────────────────────────────────────
-- Vector embeddings for each chunk. 512-dim to match semantic cache.
-- HNSW index for approximate nearest-neighbor search (<150ms p95).

CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    chunk_id UUID PRIMARY KEY REFERENCES knowledge_chunks(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    embedding vector(512) NOT NULL,
    model_name TEXT NOT NULL DEFAULT 'openai/text-embedding-3-small',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index: fast ANN search. m=16, ef_construction=64 are standard defaults.
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_hnsw
    ON knowledge_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Filtered search by tenant (important for isolation)
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_tenant
    ON knowledge_embeddings(tenant_id);

-- ── Retrieval Queries ─────────────────────────────────────────────────────────
-- Log every retrieval call for observability and eval.

CREATE TABLE IF NOT EXISTS retrieval_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    request_id UUID REFERENCES execute_requests(id),
    session_id UUID,
    query_text TEXT NOT NULL,
    query_embedding vector(512),
    filters JSONB NOT NULL DEFAULT '{}',
    top_k INTEGER NOT NULL DEFAULT 5,
    token_budget INTEGER,
    result_count INTEGER,
    latency_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retrieval_queries_tenant_created
    ON retrieval_queries(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_retrieval_queries_request
    ON retrieval_queries(request_id)
    WHERE request_id IS NOT NULL;

-- ── Retrieval Results ─────────────────────────────────────────────────────────
-- Which chunks were returned and which were selected for context.

CREATE TABLE IF NOT EXISTS retrieval_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retrieval_query_id UUID NOT NULL REFERENCES retrieval_queries(id) ON DELETE CASCADE,
    chunk_id UUID NOT NULL REFERENCES knowledge_chunks(id),
    rank INTEGER NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    selected_for_context BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retrieval_results_query
    ON retrieval_results(retrieval_query_id, rank);
