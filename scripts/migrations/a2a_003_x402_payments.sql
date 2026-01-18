-- =============================================================================
-- P402 A2A x402 Extension Database Migration
-- =============================================================================
-- Implements the x402_payments table for A2A x402 Extension payment flow
-- Reference: https://github.com/google-agentic-commerce/a2a-x402
-- =============================================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- X402 PAYMENTS TABLE
-- =============================================================================
-- Stores the 3-message payment flow:
-- 1. payment-required (status: pending)
-- 2. payment-submitted (status: processing)
-- 3. payment-completed (status: completed)
-- =============================================================================

CREATE TABLE IF NOT EXISTS x402_payments (
    -- Primary key
    payment_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    
    -- Payment status
    status VARCHAR(32) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
    
    -- Amount info
    amount_usd DECIMAL(12, 6) NOT NULL,
    amount_raw VARCHAR(78), -- Raw token amount (uint256)
    currency VARCHAR(10) DEFAULT 'USDC',
    
    -- Payment details (full payment-required message)
    payment_details JSONB NOT NULL,
    
    -- Service info
    service_description TEXT,
    service_endpoint TEXT,
    
    -- Settlement info (populated on payment-completed)
    tx_hash VARCHAR(66),
    block_number BIGINT,
    settled_amount VARCHAR(78),
    network_fee VARCHAR(78),
    settled_at TIMESTAMP WITH TIME ZONE,
    
    -- Receipt (populated on payment-completed)
    receipt_id VARCHAR(64),
    receipt_signature TEXT,
    receipt_valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Payment scheme used
    scheme VARCHAR(32), -- 'exact', 'onchain', 'receipt'
    
    -- Error handling
    error_message TEXT,
    error_code VARCHAR(64),
    
    -- Associated task (optional)
    task_id VARCHAR(64),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_x402_payments_tenant ON x402_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_x402_payments_status ON x402_payments(status);
CREATE INDEX IF NOT EXISTS idx_x402_payments_receipt ON x402_payments(receipt_id) WHERE receipt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_x402_payments_tx_hash ON x402_payments(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_x402_payments_created ON x402_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_x402_payments_task ON x402_payments(task_id) WHERE task_id IS NOT NULL;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_x402_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_x402_payments_updated_at ON x402_payments;
CREATE TRIGGER update_x402_payments_updated_at
    BEFORE UPDATE ON x402_payments
    FOR EACH ROW EXECUTE FUNCTION update_x402_payments_updated_at();

-- =============================================================================
-- X402 RECEIPTS TABLE (for receipt validation and reuse)
-- =============================================================================

CREATE TABLE IF NOT EXISTS x402_receipts (
    receipt_id VARCHAR(64) PRIMARY KEY,
    payment_id VARCHAR(64) NOT NULL REFERENCES x402_payments(payment_id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL,
    
    -- Receipt data
    signature TEXT NOT NULL,
    receipt_data JSONB NOT NULL,
    
    -- Validity
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Usage tracking
    use_count INTEGER DEFAULT 0,
    max_uses INTEGER, -- NULL = unlimited
    
    -- Status
    status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_x402_receipts_payment ON x402_receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_x402_receipts_tenant ON x402_receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_x402_receipts_status ON x402_receipts(status);
CREATE INDEX IF NOT EXISTS idx_x402_receipts_valid_until ON x402_receipts(valid_until) 
    WHERE status = 'active';

-- =============================================================================
-- X402 PAYMENT EVENTS TABLE (audit log)
-- =============================================================================

CREATE TABLE IF NOT EXISTS x402_payment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id VARCHAR(64) NOT NULL REFERENCES x402_payments(payment_id) ON DELETE CASCADE,
    
    -- Event info
    event_type VARCHAR(64) NOT NULL,
    event_data JSONB,
    
    -- Actor
    actor_type VARCHAR(32), -- 'client', 'merchant', 'system'
    actor_id VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_x402_events_payment ON x402_payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_x402_events_type ON x402_payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_x402_events_created ON x402_payment_events(created_at DESC);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to check if a payment is expired
CREATE OR REPLACE FUNCTION is_x402_payment_expired(p_payment_id VARCHAR(64))
RETURNS BOOLEAN AS $$
DECLARE
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_status VARCHAR(32);
BEGIN
    SELECT expires_at, status INTO v_expires_at, v_status
    FROM x402_payments
    WHERE payment_id = p_payment_id;
    
    IF v_status = 'completed' THEN
        RETURN FALSE;
    END IF;
    
    IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
        -- Auto-expire the payment
        UPDATE x402_payments 
        SET status = 'expired' 
        WHERE payment_id = p_payment_id AND status = 'pending';
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to validate receipt
CREATE OR REPLACE FUNCTION validate_x402_receipt(p_receipt_id VARCHAR(64))
RETURNS BOOLEAN AS $$
DECLARE
    v_receipt RECORD;
BEGIN
    SELECT * INTO v_receipt
    FROM x402_receipts
    WHERE receipt_id = p_receipt_id AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check validity period
    IF v_receipt.valid_until IS NOT NULL AND v_receipt.valid_until < NOW() THEN
        UPDATE x402_receipts SET status = 'expired' WHERE receipt_id = p_receipt_id;
        RETURN FALSE;
    END IF;
    
    -- Check max uses
    IF v_receipt.max_uses IS NOT NULL AND v_receipt.use_count >= v_receipt.max_uses THEN
        RETURN FALSE;
    END IF;
    
    -- Increment use count
    UPDATE x402_receipts 
    SET use_count = use_count + 1 
    WHERE receipt_id = p_receipt_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Payment summary view
CREATE OR REPLACE VIEW v_x402_payment_summary AS
SELECT 
    tenant_id,
    DATE(created_at) as date,
    COUNT(*) as total_payments,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_payments,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_payments,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_payments,
    SUM(amount_usd) FILTER (WHERE status = 'completed') as total_settled_usd,
    AVG(EXTRACT(EPOCH FROM (settled_at - created_at))) FILTER (WHERE status = 'completed') as avg_settlement_seconds
FROM x402_payments
GROUP BY tenant_id, DATE(created_at);

-- Active receipts view
CREATE OR REPLACE VIEW v_x402_active_receipts AS
SELECT 
    r.*,
    p.amount_usd,
    p.currency,
    p.service_description
FROM x402_receipts r
JOIN x402_payments p ON r.payment_id = p.payment_id
WHERE r.status = 'active'
  AND (r.valid_until IS NULL OR r.valid_until > NOW())
  AND (r.max_uses IS NULL OR r.use_count < r.max_uses);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE x402_payments IS 'A2A x402 Extension payment records for the 3-message flow';
COMMENT ON TABLE x402_receipts IS 'Payment receipts for x402 receipt scheme reuse';
COMMENT ON TABLE x402_payment_events IS 'Audit log for x402 payment lifecycle events';

COMMENT ON COLUMN x402_payments.payment_id IS 'Unique payment ID (pay_xxx format)';
COMMENT ON COLUMN x402_payments.status IS 'pending=payment-required sent, processing=payment-submitted received, completed=payment-completed sent';
COMMENT ON COLUMN x402_payments.scheme IS 'Payment scheme used: exact (EIP-3009), onchain (tx verification), receipt (prior payment)';
COMMENT ON COLUMN x402_payments.payment_details IS 'Full payment-required message content as JSONB';
