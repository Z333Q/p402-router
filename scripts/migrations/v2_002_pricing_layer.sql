-- P402 V2 Database Schema - Sprint 1: Pricing Layer & Subscriptions
-- =======================
-- Extends the existing v2 schema with the pricing spine.

-- =============================================================================
-- TENANT PLANS (Modifying existing table or creating if not exists)
-- =============================================================================

-- Add the explicit plan field to tenants. This acts as the source of truth for entitlements.
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS tenant_plan VARCHAR(32) NOT NULL DEFAULT 'free';

-- =============================================================================
-- BILLING SUBSCRIPTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS billing_subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Sub-Type 
    provider VARCHAR(32) NOT NULL DEFAULT 'onchain', -- e.g., 'onchain', 'stripe', 'coinbase'
    wallet_address VARCHAR(128) NOT NULL,            -- Web3 wallet backing this sub
    
    -- Plan snapshot at time of sub creation/modification
    plan_id VARCHAR(32) NOT NULL,
    monthly_fee_micros BIGINT NOT NULL DEFAULT 0,    -- Absolute cost in micros (e.g., 99000000 = $99)
    
    -- Status
    status VARCHAR(32) NOT NULL DEFAULT 'active',    -- 'active', 'past_due', 'canceled', 'trialing'
    
    -- Cycles
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cron sweeping due subscriptions
CREATE INDEX IF NOT EXISTS idx_billing_subs_period_end 
ON billing_subscriptions(status, provider, current_period_end);

-- =============================================================================
-- USAGE LEDGER TABLE
-- =============================================================================
-- Tracks granular unit usage against plan caps

CREATE TABLE IF NOT EXISTS billing_usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    session_id VARCHAR(64), -- Optional: Tie back to a specific orchestration session
    
    event_type VARCHAR(64) NOT NULL,                 -- e.g., 'model_inference', 'cache_hit'
    billing_period_start TIMESTAMPTZ NOT NULL,       -- Tie to current_period_start
    
    cost_usd_micros BIGINT NOT NULL,                 -- Fractional cost
    credits_deducted_micros BIGINT NOT NULL DEFAULT 0, -- If paid via prepaid credits
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for real-time aggregation by the `assertWithinCap` guard
CREATE INDEX IF NOT EXISTS idx_billing_usage_aggregation 
ON billing_usage_events(tenant_id, billing_period_start);
