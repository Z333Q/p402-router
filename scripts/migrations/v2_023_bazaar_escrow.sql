-- v2_023_bazaar_escrow.sql
-- Add provider_wallet_address to bazaar_resources so the escrow flow has a recipient address.
-- Populated from the x402 PaymentRequirements.payTo field during ingest.

ALTER TABLE bazaar_resources
    ADD COLUMN IF NOT EXISTS provider_wallet_address VARCHAR(42);

COMMENT ON COLUMN bazaar_resources.provider_wallet_address
    IS 'EVM wallet address (payTo) from the x402 PaymentRequirements manifest. Used as escrow provider recipient.';

CREATE INDEX IF NOT EXISTS idx_bazaar_resources_provider_wallet
    ON bazaar_resources (provider_wallet_address)
    WHERE provider_wallet_address IS NOT NULL;
