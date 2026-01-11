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
