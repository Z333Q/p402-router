-- Migration v2_021: Credit System (Phase 4.1)
--
-- Credits are indexed by human_id_hash (World ID nullifier), NOT by wallet or
-- tenant. One human = one credit pool across all surfaces (p402.io, mini app,
-- World mini app, p402.shop, SDK, CLI, MCP).
--
-- 1 credit = $0.01 USD. Credits never expire.
-- Free trial: 500 credits ($5.00) granted on first World ID verification.
-- Volume discounts applied at purchase time (stored in credit_transactions).

CREATE TABLE IF NOT EXISTS credit_accounts (
    -- Primary key: World ID nullifier hash. For unverified users, falls back
    -- to tenant_id prefixed with 'tenant:' so they can still purchase credits.
    account_key         TEXT PRIMARY KEY,
    human_id_hash       TEXT,                    -- NULL for non-verified users
    tenant_id           TEXT,                    -- NULL for anonymous/SDK callers
    balance             INTEGER NOT NULL DEFAULT 0,  -- current balance (credits)
    lifetime_purchased  INTEGER NOT NULL DEFAULT 0,  -- total ever purchased
    lifetime_spent      INTEGER NOT NULL DEFAULT 0,  -- total ever consumed
    free_trial_granted  BOOLEAN NOT NULL DEFAULT FALSE,
    free_trial_granted_at TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT positive_balance CHECK (balance >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_accounts_human_id ON credit_accounts(human_id_hash)
    WHERE human_id_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_accounts_tenant ON credit_accounts(tenant_id)
    WHERE tenant_id IS NOT NULL;

-- Full ledger of all credit movements
CREATE TABLE IF NOT EXISTS credit_transactions (
    id              BIGSERIAL PRIMARY KEY,
    account_key     TEXT NOT NULL REFERENCES credit_accounts(account_key) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK (type IN (
                        'purchase',       -- bought with USDC
                        'free_trial',     -- World ID free trial grant
                        'spend',          -- consumed by an AI request
                        'refund',         -- request failed, credits returned
                        'admin_grant',    -- manual grant by P402 admin
                        'admin_deduct'    -- manual deduction by P402 admin
                    )),
    amount          INTEGER NOT NULL,        -- positive = credit, negative = debit
    balance_after   INTEGER NOT NULL,
    usd_equivalent  NUMERIC(10,4),           -- for purchase/spend records
    discount_pct    NUMERIC(4,2) DEFAULT 0,  -- volume discount applied (0–100)
    reference_id    TEXT,                    -- request_id, tx_hash, escrow_id, etc.
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_txn_account ON credit_transactions(account_key);
CREATE INDEX IF NOT EXISTS idx_credit_txn_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_txn_created ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_txn_reference ON credit_transactions(reference_id)
    WHERE reference_id IS NOT NULL;
