-- 006_safety_quarantine.sql
-- Safety Pack: Quarantine table for bazaar resource scanning
-- All changes are additive — no column removals or type changes.

-- Quarantine holding table for resources that fail safety checks
CREATE TABLE IF NOT EXISTS bazaar_quarantine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id TEXT NOT NULL,
    source_facilitator_id TEXT REFERENCES facilitators(facilitator_id),
    canonical_route_id TEXT NOT NULL,
    resource_data JSONB NOT NULL,
    scan_result JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'quarantined',  -- quarantined, approved, rejected
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quarantine_status ON bazaar_quarantine(status);
CREATE INDEX IF NOT EXISTS idx_quarantine_facilitator ON bazaar_quarantine(source_facilitator_id);

-- Add safety columns to bazaar_resources (additive only)
ALTER TABLE bazaar_resources ADD COLUMN IF NOT EXISTS safety_score INTEGER;
ALTER TABLE bazaar_resources ADD COLUMN IF NOT EXISTS safety_scanned_at TIMESTAMPTZ;
ALTER TABLE bazaar_resources ADD COLUMN IF NOT EXISTS safety_flags TEXT[];
