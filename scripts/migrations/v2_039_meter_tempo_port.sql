-- v2_039_meter_tempo_port.sql
-- Adds settlement-neutral columns to nanopayment_events for Tempo mainnet port.
-- Arc columns (arc_tx_hash, arc_block, arc_batch_id) are kept nullable for rollback safety.
-- A follow-up migration will drop arc_* columns once Phase 1 is stable in production.

ALTER TABLE nanopayment_events
  ADD COLUMN IF NOT EXISTS settlement_tx_hash  TEXT,
  ADD COLUMN IF NOT EXISTS settlement_block     BIGINT,
  ADD COLUMN IF NOT EXISTS settlement_chain_id  INTEGER;

-- Index for lookups by settlement tx hash (proof verification).
CREATE INDEX IF NOT EXISTS idx_nanopayment_events_settlement_tx_hash
  ON nanopayment_events (settlement_tx_hash)
  WHERE settlement_tx_hash IS NOT NULL;
