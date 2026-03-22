-- =============================================================================
-- Migration v2_016: Settlement Receipts for EIP-3009 Receipt Scheme
--
-- Creates settlement_receipts for session-based receipt reuse.
-- A single EIP-3009 settlement creates one receipt; subsequent API calls
-- consume from the remaining balance without a new user signature.
--
-- Applied after: v2_015_cdp_wallets.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS settlement_receipts (
    receipt_id          TEXT PRIMARY KEY,
    payer_address       TEXT NOT NULL,

    -- Balance tracking (USDC atomic units, 6 decimals)
    original_amount_atomic  BIGINT NOT NULL,
    consumed_amount_atomic  BIGINT NOT NULL DEFAULT 0,

    -- Cryptographic integrity
    -- HMAC-SHA256 of "receipt_id:tx_hash:original_amount_atomic:payer_address"
    -- keyed with P402_RECEIPT_SECRET (or NEXTAUTH_SECRET as fallback).
    facilitator_signature   TEXT NOT NULL,

    -- Provenance
    tx_hash             TEXT NOT NULL,      -- original on-chain settlement hash
    asset               TEXT NOT NULL DEFAULT 'USDC',
    network             TEXT NOT NULL DEFAULT 'eip155:8453',

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ NOT NULL,

    -- Invariant: consumed ≤ original (enforced by DB + application atomics)
    CONSTRAINT chk_settlement_receipt_consumed_le_original
        CHECK (consumed_amount_atomic <= original_amount_atomic)
);

CREATE INDEX IF NOT EXISTS idx_settlement_receipts_payer
    ON settlement_receipts (payer_address);

CREATE INDEX IF NOT EXISTS idx_settlement_receipts_expires
    ON settlement_receipts (expires_at)
    WHERE expires_at > NOW();

COMMENT ON TABLE settlement_receipts IS
    'Reusable payment receipts for the x402 EIP-3009 receipt scheme. '
    'One receipt per on-chain settlement; partial consumption tracked '
    'atomically via consumed_amount_atomic.';

COMMENT ON COLUMN settlement_receipts.original_amount_atomic IS
    'USDC amount in atomic units (6 decimals) from the original EIP-3009 authorization.';

COMMENT ON COLUMN settlement_receipts.consumed_amount_atomic IS
    'Running total consumed by receipt-scheme reuse. Atomically incremented.';

COMMENT ON COLUMN settlement_receipts.facilitator_signature IS
    'HMAC-SHA256 of "receipt_id:tx_hash:original_amount_atomic:payer_address" '
    'keyed with P402_RECEIPT_SECRET. Prevents forged receipts.';
