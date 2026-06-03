-- v2_051: action_type + task_type columns + request_outcomes table.
--
-- Phase 2A of the Optimize roadmap. Two changes:
--   1. Add action_type and task_type to traffic_events + router_decisions
--      (both nullable; SDK clients populate them via body.p402.task or
--      a future body.p402.action_type).
--   2. Create request_outcomes — the persistence target for
--      POST /api/v2/outcomes. One row per (tenant_id, request_id);
--      ON CONFLICT updates allow callers to re-record (e.g. pending → accepted).
--
-- Status values are constrained to the 6 documented in the slice plan:
--   accepted, rejected, retried, escalated, human_reviewed, failed
-- The V5 source-of-truth §8.3 lists a 7-value output_status enum
-- (accepted, rejected, revised, escalated, failed, pending_review, unknown)
-- that overlaps but is not identical. This migration follows the slice plan;
-- doc reconciliation tracked separately. Adding values later is non-breaking
-- via DROP+ADD CHECK if both lists need to merge.
--
-- Idempotent. Reversible via v2_051_down.sql (never auto-run).

BEGIN;

-- =============================================================================
-- 1. action_type + task_type on traffic_events
-- =============================================================================
ALTER TABLE traffic_events
    ADD COLUMN IF NOT EXISTS action_type TEXT,
    ADD COLUMN IF NOT EXISTS task_type   TEXT;

-- Partial index — tiny while most rows are NULL during the rollout window.
CREATE INDEX IF NOT EXISTS idx_traffic_events_action_type
    ON traffic_events (tenant_id, action_type, created_at DESC)
    WHERE action_type IS NOT NULL;

-- =============================================================================
-- 2. action_type + task_type on router_decisions
-- =============================================================================
ALTER TABLE router_decisions
    ADD COLUMN IF NOT EXISTS action_type TEXT,
    ADD COLUMN IF NOT EXISTS task_type   TEXT;

-- router_decisions uses `timestamp` (not `created_at`) per schema.sql.
CREATE INDEX IF NOT EXISTS idx_router_decisions_action_type
    ON router_decisions (tenant_id, action_type, "timestamp" DESC)
    WHERE action_type IS NOT NULL;

-- =============================================================================
-- 3. request_outcomes
-- =============================================================================
-- Holds the result of /api/v2/outcomes calls. One row per
-- (tenant_id, request_id). request_id is TEXT to match traffic_events.request_id;
-- there is no FK because outcomes may be recorded for requests served by
-- meter-only mode (no traffic_events row).
CREATE TABLE IF NOT EXISTS request_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    request_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN (
        'accepted', 'rejected', 'retried', 'escalated', 'human_reviewed', 'failed'
    )),
    quality_score NUMERIC(8, 6) CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1)),
    source TEXT,                                   -- 'api' | 'sdk' | 'mcp' | 'cli' | 'webhook' | ...
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_request_outcomes_tenant_time
    ON request_outcomes (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_request_outcomes_status
    ON request_outcomes (tenant_id, status, created_at DESC)
    WHERE status IN ('rejected', 'retried', 'failed');  -- waste/quality slice

COMMIT;
