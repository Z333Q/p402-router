-- Migration: Add Stripe metadata to tenants
-- =========================================

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free';

-- Index for fast lookup by Stripe IDs (important for webhooks)
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_cus ON tenants(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_sub ON tenants(stripe_subscription_id);
