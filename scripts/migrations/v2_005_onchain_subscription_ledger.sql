-- Create the ledger for on-chain subscription events
CREATE TABLE onchain_subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    subscription_id TEXT NOT NULL REFERENCES billing_subscriptions(id),
    billing_period_start TIMESTAMPTZ NOT NULL,
    amount_usd_micros BIGINT NOT NULL,
    tx_hash TEXT UNIQUE NOT NULL, -- Web3 guarantee against duplicate execution
    status TEXT NOT NULL CHECK (status IN ('pending', 'settled', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- ★ The Idempotency Guard: A tenant can only be charged once per specific billing cycle
    CONSTRAINT idx_unique_tenant_billing_period UNIQUE (tenant_id, subscription_id, billing_period_start)
);
