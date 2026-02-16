-- =============================================================================
-- Migration: ERC-8004 Trustless Agents
-- Adds on-chain identity, reputation, and validation support
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend facilitators table with ERC-8004 identity columns
-- ---------------------------------------------------------------------------

ALTER TABLE facilitators ADD COLUMN IF NOT EXISTS erc8004_agent_id VARCHAR(66);
ALTER TABLE facilitators ADD COLUMN IF NOT EXISTS erc8004_wallet VARCHAR(42);
ALTER TABLE facilitators ADD COLUMN IF NOT EXISTS erc8004_agent_uri TEXT;
ALTER TABLE facilitators ADD COLUMN IF NOT EXISTS erc8004_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE facilitators ADD COLUMN IF NOT EXISTS erc8004_reputation_cached NUMERIC(10, 4);
ALTER TABLE facilitators ADD COLUMN IF NOT EXISTS erc8004_reputation_fetched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_facilitators_erc8004_agent
  ON facilitators(erc8004_agent_id)
  WHERE erc8004_agent_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Reputation Feedback Log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS erc8004_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_event_id VARCHAR(50),
    facilitator_id VARCHAR(50),
    agent_id VARCHAR(66) NOT NULL,
    tx_hash VARCHAR(66),
    value INTEGER NOT NULL CHECK (value >= 0 AND value <= 100),
    tag1 VARCHAR(50) NOT NULL,
    tag2 VARCHAR(50),
    feedback_uri TEXT,
    feedback_hash VARCHAR(66),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'submitted', 'confirmed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_erc8004_feedback_agent
  ON erc8004_feedback(agent_id);

CREATE INDEX IF NOT EXISTS idx_erc8004_feedback_status
  ON erc8004_feedback(status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_erc8004_feedback_facilitator
  ON erc8004_feedback(facilitator_id)
  WHERE facilitator_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Validation Requests
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS erc8004_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_hash VARCHAR(66) UNIQUE NOT NULL,
    agent_id VARCHAR(66) NOT NULL,
    validator_address VARCHAR(42),
    request_uri TEXT,
    response BOOLEAN,
    response_uri TEXT,
    response_hash VARCHAR(66),
    tag VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'requested'
      CHECK (status IN ('requested', 'validated', 'rejected', 'expired')),
    tx_hash VARCHAR(66),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_erc8004_validations_status
  ON erc8004_validations(status)
  WHERE status = 'requested';

CREATE INDEX IF NOT EXISTS idx_erc8004_validations_agent
  ON erc8004_validations(agent_id);
