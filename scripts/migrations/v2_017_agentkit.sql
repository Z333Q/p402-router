-- Migration v2_017: World AgentKit integration tables
-- Tracks per-human, per-endpoint usage for free-trial access grants.
-- Stores SIWE challenge nonces to prevent replay attacks.

CREATE TABLE IF NOT EXISTS agentkit_usage (
    endpoint    TEXT    NOT NULL,
    human_id    TEXT    NOT NULL,
    use_count   INTEGER NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (endpoint, human_id)
);

CREATE TABLE IF NOT EXISTS agentkit_nonces (
    nonce       TEXT PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enables efficient cleanup of expired nonces (cron job: delete where created_at < NOW() - INTERVAL '1 hour')
CREATE INDEX IF NOT EXISTS idx_agentkit_nonces_created ON agentkit_nonces(created_at);
