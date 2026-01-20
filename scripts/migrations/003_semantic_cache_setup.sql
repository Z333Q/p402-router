-- =============================================================================
-- P402 Semantic Cache Setup
-- =============================================================================
-- Aligns the database schema with the semantic-cache.ts implementation.
-- Note: We drop the previous table definition from v2_001 if it exists
-- because the column structure (namespace vs tenant_id, vector vs json) changed.
-- =============================================================================

DROP TABLE IF EXISTS semantic_cache;

CREATE TABLE semantic_cache (
    id TEXT PRIMARY KEY,
    namespace TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    embedding TEXT NOT NULL, -- Storing as JSON string for JS-based cosine similarity
    response TEXT NOT NULL, -- Storing as JSON string
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Index for exact match lookup
CREATE INDEX idx_semantic_cache_lookup 
    ON semantic_cache(namespace, request_hash);

-- Index for cleanup
CREATE INDEX idx_semantic_cache_expires 
    ON semantic_cache(expires_at);

-- Index for retrieving recent entries for similarity comparison
-- (We fetch latest 100 to compare in memory)
CREATE INDEX idx_semantic_cache_created 
    ON semantic_cache(namespace, created_at DESC);
