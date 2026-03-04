-- v2_015_cdp_wallets.sql
-- CDP Wallet Registry + Session Wallet Source
-- ============================================================
-- Adds CDP-specific columns to agent_sessions and creates a
-- wallet registry table for audit and observability.
--
-- Replaces the standalone 007_cdp_wallets.sql (now deprecated).
-- Run AFTER v2_014_access_requests.sql.
--
-- All new columns are additive with safe defaults — no existing
-- rows or queries are broken. Safe to run on DBs where 007_cdp_wallets.sql
-- was already applied (IF NOT EXISTS / IF NOT EXISTS guards throughout).
--
-- Run with:
--   psql $DATABASE_URL -f scripts/migrations/v2_015_cdp_wallets.sql

BEGIN;

-- ─── agent_sessions additions ──────────────────────────────────────────────

ALTER TABLE agent_sessions
    ADD COLUMN IF NOT EXISTS wallet_source   VARCHAR(20)  NOT NULL DEFAULT 'eoa',
    ADD COLUMN IF NOT EXISTS cdp_wallet_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS cdp_policy_id   VARCHAR(255);

COMMENT ON COLUMN agent_sessions.wallet_source   IS 'cdp | eoa — how the session wallet was provisioned';
COMMENT ON COLUMN agent_sessions.cdp_wallet_name IS 'CDP Server Wallet name (idempotent key in CDP platform)';
COMMENT ON COLUMN agent_sessions.cdp_policy_id   IS 'CDP spending policy ID scoped to this wallet (chain-level budget cap)';

-- ─── cdp_wallet_registry ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cdp_wallet_registry (
    id               VARCHAR(255) PRIMARY KEY,
    cdp_wallet_name  VARCHAR(255) NOT NULL UNIQUE,
    wallet_address   VARCHAR(42)  NOT NULL,
    purpose          VARCHAR(50)  NOT NULL,  -- 'facilitator' | 'agent-session'
    -- session_token FK: references the unique session_token on agent_sessions
    -- (session_token is VARCHAR(255) UNIQUE in v2_001_initial_schema.sql)
    session_token    VARCHAR(255) REFERENCES agent_sessions (session_token) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cdp_wallet_address
    ON cdp_wallet_registry (wallet_address);

CREATE INDEX IF NOT EXISTS idx_cdp_wallet_purpose
    ON cdp_wallet_registry (purpose);

COMMENT ON TABLE cdp_wallet_registry IS
    'Audit log of CDP-managed wallets provisioned by P402. '
    'Keys are never stored here — they live in CDP''s AWS Nitro Enclave.';

COMMIT;
