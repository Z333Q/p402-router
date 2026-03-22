-- Migration v2_020: P402 Escrow (Phase 3.1)
--
-- Off-chain shadow of the P402Escrow.sol state machine.
-- Tracks escrow records, state transitions, and delivery proofs.
-- The contract is authoritative; this table is the indexed view for the API.

CREATE TABLE IF NOT EXISTS escrows (
    id                  TEXT PRIMARY KEY,               -- on-chain bytes32 as hex
    reference_id        TEXT NOT NULL UNIQUE,            -- P402 task/mandate ID
    payer               TEXT NOT NULL,                  -- payer wallet address
    provider            TEXT NOT NULL,                  -- provider wallet address
    payer_human_id      TEXT,                           -- World ID hash (nullable — pre-verification)
    provider_human_id   TEXT,                           -- World ID hash (nullable)
    token               TEXT NOT NULL,                  -- ERC-20 address (USDC)
    gross_amount        NUMERIC(20,6) NOT NULL,         -- payer deposits (net + fee)
    net_amount          NUMERIC(20,6) NOT NULL,         -- provider receives
    fee_amount          NUMERIC(20,6) NOT NULL,         -- P402 treasury receives
    state               TEXT NOT NULL DEFAULT 'CREATED'
                            CHECK (state IN ('CREATED','FUNDED','ACCEPTED','IN_PROGRESS',
                                             'DELIVERED','SETTLED','DISPUTED','RESOLVED',
                                             'EXPIRED','CANCELLED')),
    proof_hash          TEXT,                           -- SHA-256 of delivery artifact
    tx_create           TEXT,                           -- on-chain tx hash for creation
    tx_fund             TEXT,
    tx_settle           TEXT,
    dispute_window_sec  INTEGER NOT NULL DEFAULT 172800, -- 48 hours
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    funded_at           TIMESTAMPTZ,
    accepted_at         TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    settled_at          TIMESTAMPTZ,
    disputed_at         TIMESTAMPTZ,
    resolved_at         TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ                     -- 7 days after creation for pre-delivery
);

-- State transition audit log
CREATE TABLE IF NOT EXISTS escrow_events (
    id              SERIAL PRIMARY KEY,
    escrow_id       TEXT NOT NULL REFERENCES escrows(id) ON DELETE CASCADE,
    from_state      TEXT NOT NULL,
    to_state        TEXT NOT NULL,
    actor           TEXT,                               -- wallet address that triggered transition
    tx_hash         TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrows_payer ON escrows(payer);
CREATE INDEX IF NOT EXISTS idx_escrows_provider ON escrows(provider);
CREATE INDEX IF NOT EXISTS idx_escrows_state ON escrows(state);
CREATE INDEX IF NOT EXISTS idx_escrows_payer_human ON escrows(payer_human_id) WHERE payer_human_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escrows_provider_human ON escrows(provider_human_id) WHERE provider_human_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escrow_events_escrow ON escrow_events(escrow_id);
CREATE INDEX IF NOT EXISTS idx_escrow_events_created ON escrow_events(created_at DESC);
