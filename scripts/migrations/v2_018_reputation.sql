-- Migration v2_018: Human-anchored reputation (Phase 2.1)
--
-- Reputation is indexed by human_id_hash (World ID ZK nullifier hash), NOT wallet address.
-- This means wallet rotations do not reset reputation. One human = one reputation score.
--
-- Score components (weighted):
--   settlement_score      (0.4) — successful payment settlements
--   session_score         (0.3) — session completion rate
--   dispute_score         (0.2) — inverse of dispute rate (starts neutral at 1.0)
--   sentinel_score        (0.1) — Sentinel quality scoring (no anomalies = good)
--
-- Overall score = weighted sum, clamped to [0.0, 1.0].
-- New humans start at 0.5000 (neutral).

CREATE TABLE IF NOT EXISTS agent_reputation (
    human_id_hash           TEXT PRIMARY KEY,
    -- Overall composite score [0.0, 1.0]
    score                   NUMERIC(6,4) NOT NULL DEFAULT 0.5000,
    -- Component scores [0.0, 1.0]
    settlement_score        NUMERIC(6,4) NOT NULL DEFAULT 0.5000,
    session_score           NUMERIC(6,4) NOT NULL DEFAULT 0.5000,
    dispute_score           NUMERIC(6,4) NOT NULL DEFAULT 1.0000,
    sentinel_score          NUMERIC(6,4) NOT NULL DEFAULT 1.0000,
    -- Raw counters (inputs for score calculation)
    settled_count           INTEGER NOT NULL DEFAULT 0,
    session_count           INTEGER NOT NULL DEFAULT 0,
    session_completed_count INTEGER NOT NULL DEFAULT 0,
    dispute_count           INTEGER NOT NULL DEFAULT 0,
    anomaly_count           INTEGER NOT NULL DEFAULT 0,
    -- Timestamps
    first_seen_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Weekly epoch snapshots for trend analysis
CREATE TABLE IF NOT EXISTS reputation_epochs (
    id              SERIAL PRIMARY KEY,
    human_id_hash   TEXT NOT NULL REFERENCES agent_reputation(human_id_hash) ON DELETE CASCADE,
    epoch_week      DATE NOT NULL,          -- Monday of the epoch week (YYYY-MM-DD)
    score           NUMERIC(6,4) NOT NULL,
    settled_count   INTEGER NOT NULL DEFAULT 0,
    session_count   INTEGER NOT NULL DEFAULT 0,
    dispute_count   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (human_id_hash, epoch_week)
);

CREATE INDEX IF NOT EXISTS idx_reputation_epochs_human ON reputation_epochs(human_id_hash);
CREATE INDEX IF NOT EXISTS idx_reputation_epochs_week ON reputation_epochs(epoch_week DESC);

-- Opt-in public reputation visibility (default: private)
ALTER TABLE agent_reputation ADD COLUMN IF NOT EXISTS public_profile BOOLEAN NOT NULL DEFAULT FALSE;
