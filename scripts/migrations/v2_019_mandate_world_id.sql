-- Migration v2_019: AP2 Mandate to World ID Bridge (Phase 2.2)
--
-- Links AP2 mandates to World ID nullifier hashes so violations can be
-- logged against human_id_hash in agent_reputation.
-- Column is nullable — existing mandates have no World ID association.

ALTER TABLE ap2_mandates ADD COLUMN IF NOT EXISTS human_id_hash TEXT;

-- Index for looking up mandates by grantor identity
CREATE INDEX IF NOT EXISTS idx_ap2_mandates_human_id_hash ON ap2_mandates(human_id_hash)
    WHERE human_id_hash IS NOT NULL;
