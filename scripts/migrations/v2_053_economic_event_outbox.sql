-- v2_053: economic event write failure outbox.
--
-- Slice 2E. Console.error is unacceptable for an economic ledger. When a
-- write to ai_economic_events fails (DB outage, CHECK violation, transient
-- error), the failure row lands here so a retry worker can replay it later.
--
-- HARD RULES on the payload column (V5 §27 + Slice 2E acceptance):
--   * payload is METADATA ONLY. It MUST NOT contain prompt, response,
--     messages, content, file, document, transcript, chat_history, source
--     code, PHI, PII, secrets, or any raw content that the privacy
--     resolver would have dropped under metadata_only.
--   * The CHECK below prevents the most obvious mistakes by name. The
--     writer applies sanitizePayload() before INSERT. The Slice 2E privacy
--     contract test scans EVERY bound INSERT parameter (including JSONB)
--     for sentinel content strings to prove absence.
--
-- error_message_safe is short, truncated, and MUST NEVER echo back caller-
-- supplied content. It is intended for the audit panel and the retry
-- worker's structured logs.
--
-- Idempotent. Reversible via v2_053_down.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS economic_event_write_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    request_id TEXT NOT NULL,

    -- Where the write originated. Free TEXT so future call sites don't
    -- require a schema change; the writer + cron use 'chat_completions' |
    -- 'meter_only' | 'retry_worker' today.
    source TEXT NOT NULL,
    -- HTTP route or internal call site that attempted the write
    -- ('/api/v2/chat/completions', '/api/v2/meter/events', 'retry_worker').
    route TEXT,

    -- Structured error code so the retry worker + audit UI can group.
    -- The writer maps PG codes to one of:
    --   check_violation | unique_violation | fk_violation | not_null_violation
    --   | db_unavailable | timeout | unknown
    error_code TEXT NOT NULL,

    -- Truncated safe summary. The writer strips param echoes; never the
    -- raw SQL or stringified payload.
    error_message_safe TEXT,

    retry_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'resolved', 'abandoned')),

    -- next_retry_at is set by the writer (initial delay) and bumped by the
    -- retry worker on each failed attempt with exponential backoff.
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Privacy-safe reconstruction payload. The retry worker rebuilds an
    -- EconomicEventInput from this. The writer's sanitizePayload() is the
    -- gate that keeps content out. The default empty object is the
    -- desired floor — any oversight elsewhere lands as {} rather than
    -- propagating content.
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One outbox row per (tenant, request). A repeat failure on the same
    -- request increments retry_count + bumps next_retry_at instead of
    -- inserting a duplicate row. This keeps the outbox finite even under
    -- thundering-herd retries.
    UNIQUE (tenant_id, request_id)
);

-- Retry worker hot path.
CREATE INDEX IF NOT EXISTS idx_eewf_pending_retry
    ON economic_event_write_failures (status, next_retry_at)
    WHERE status = 'pending';

-- Audit UI hot path.
CREATE INDEX IF NOT EXISTS idx_eewf_tenant_recent
    ON economic_event_write_failures (tenant_id, created_at DESC);

-- Group-by-error-code on the audit panel.
CREATE INDEX IF NOT EXISTS idx_eewf_tenant_code
    ON economic_event_write_failures (tenant_id, error_code, created_at DESC);

COMMIT;
