-- v2_024_escrow_toggle.sql
-- Adds per-tenant escrow opt-in/opt-out control.
-- Default TRUE = current behavior preserved (auto-escrow for Bazaar tasks >= $1.00).
-- When FALSE: Bazaar tasks fall through to direct x402 settlement (1% fee instead of 2%).

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS escrow_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN tenant_settings.escrow_enabled IS
  'When true, Bazaar tasks >= $1.00 are auto-escrowed (2% fee). When false, all tasks use direct x402 settlement (plan-rate fee). Contract setFeeBasisPoints(200) must be called separately before the 2% rate is enforced on-chain.';
