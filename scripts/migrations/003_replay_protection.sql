-- File: scripts/migrations/003_replay_protection.sql
-- Purpose: Prevent double-spending via transaction hash tracking

BEGIN;

-- Create processed transactions table
CREATE TABLE IF NOT EXISTS processed_tx_hashes (
    -- Primary key is the tx hash itself (prevents duplicates)
    tx_hash VARCHAR(66) PRIMARY KEY,
    
    -- When this tx was processed
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Request that processed it (for debugging)
    request_id TEXT NOT NULL,
    
    -- Tenant that owns this transaction
    tenant_id UUID NOT NULL,
    
    -- Payment details (for analytics)
    amount_usd NUMERIC(10, 6),
    asset TEXT DEFAULT 'USDC',
    network TEXT DEFAULT 'base',
    settlement_type TEXT CHECK (settlement_type IN ('onchain', 'exact', 'receipt')),
    
    -- Validation
    CONSTRAINT valid_tx_hash_format CHECK (tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
    CONSTRAINT valid_amount CHECK (amount_usd IS NULL OR amount_usd >= 0)
);

-- Index for cleanup job (prune old records)
CREATE INDEX IF NOT EXISTS idx_processed_tx_processed_at 
    ON processed_tx_hashes(processed_at);

-- Index for tenant queries
CREATE INDEX IF NOT EXISTS idx_processed_tx_tenant 
    ON processed_tx_hashes(tenant_id, processed_at DESC);



-- Documentation
COMMENT ON TABLE processed_tx_hashes IS 
    'Tracks processed blockchain transactions to prevent replay attacks. '
    'Records older than 30 days can be safely pruned via cleanup job.';

COMMENT ON COLUMN processed_tx_hashes.tx_hash IS 
    'The blockchain transaction hash (0x-prefixed, 66 chars total)';

COMMENT ON COLUMN processed_tx_hashes.settlement_type IS 
    'onchain = direct tx verification, exact = EIP-3009 gasless, receipt = reuse prior payment';

COMMIT;
