-- P402 V2 Database Schema - Sprint 2: Hybrid Subscriptions
-- ==========================================================
-- Extends the `billing_subscriptions` table to hold Stripe/Coinbase 
-- references alongside the on-chain metadata.

ALTER TABLE billing_subscriptions
    -- The ID of the subscription object in the provider's system 
    -- (e.g., 'sub_1Mz...' for Stripe)
    ADD COLUMN IF NOT EXISTS provider_subscription_id VARCHAR(128),
    
    -- The ID of the customer object in the provider's system 
    -- (e.g., 'cus_9s6...' for Stripe)
    ADD COLUMN IF NOT EXISTS provider_customer_id VARCHAR(128),
    
    -- Used to track if a subscription is set to downgrade/cancel at the end of the term.
    -- Ethers v6 on-chain cancelations will revoke the allowance and set this to true.
    ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

-- Add indexes for Webhook lookups
-- When a webhook arrives for `sub_1Mz...`, we need to rapidly find the tenant.
CREATE INDEX IF NOT EXISTS idx_billing_subs_provider_sub_id 
ON billing_subscriptions(provider_subscription_id) 
WHERE provider_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_subs_provider_cus_id 
ON billing_subscriptions(provider_customer_id) 
WHERE provider_customer_id IS NOT NULL;
