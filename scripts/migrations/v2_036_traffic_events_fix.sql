-- v2_036_traffic_events_fix.sql
-- Fix column name mismatches in traffic_events and add missing columns.
-- The original 004_traffic_events.sql used 'timestamp' and 'duration_ms';
-- admin queries (overview, analytics, users) expect 'created_at', 'latency_ms', 'cache_hit'.
-- Also adds event_type + metadata for A2A orchestration compatibility.
-- Run with: psql $DATABASE_URL -f scripts/migrations/v2_036_traffic_events_fix.sql

BEGIN;

DO $$
BEGIN
    -- Rename 'timestamp' -> 'created_at' if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'traffic_events' AND column_name = 'timestamp'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'traffic_events' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE traffic_events RENAME COLUMN "timestamp" TO created_at;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'traffic_events' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE traffic_events ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;

    -- Add latency_ms (admin overview + analytics use this for percentile queries)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'traffic_events' AND column_name = 'latency_ms'
    ) THEN
        ALTER TABLE traffic_events ADD COLUMN latency_ms INTEGER;
    END IF;

    -- Rename duration_ms -> latency_ms backfill (if old column still exists)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'traffic_events' AND column_name = 'duration_ms'
    ) THEN
        UPDATE traffic_events SET latency_ms = duration_ms WHERE latency_ms IS NULL AND duration_ms IS NOT NULL;
    END IF;

    -- Add cache_hit (used in routing intelligence cache hit % queries)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'traffic_events' AND column_name = 'cache_hit'
    ) THEN
        ALTER TABLE traffic_events ADD COLUMN cache_hit BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    -- Add event_type (A2A orchestration logs use this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'traffic_events' AND column_name = 'event_type'
    ) THEN
        ALTER TABLE traffic_events ADD COLUMN event_type TEXT;
    END IF;

    -- Add metadata (A2A orchestration logs use this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'traffic_events' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE traffic_events ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- Make path/method/status_code nullable so non-HTTP internal events can omit them
ALTER TABLE traffic_events
    ALTER COLUMN path        DROP NOT NULL,
    ALTER COLUMN method      DROP NOT NULL,
    ALTER COLUMN status_code DROP NOT NULL;

-- Recreate indexes with correct column name
DROP INDEX IF EXISTS idx_traffic_timestamp;
DROP INDEX IF EXISTS idx_traffic_tenant_time;
DROP INDEX IF EXISTS idx_traffic_path_time;

CREATE INDEX IF NOT EXISTS idx_traffic_events_created_at  ON traffic_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_events_tenant_time ON traffic_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_events_path_time   ON traffic_events(path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_events_cache_hit   ON traffic_events(cache_hit, created_at DESC) WHERE cache_hit = TRUE;

COMMIT;
