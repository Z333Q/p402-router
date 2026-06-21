-- v2_057: request_outcomes — extension columns for the tenant-scoped
--         outcome ingestion foundation.
--
-- Slice 3AU-1-Impl. Adds three additive, nullable columns to the
-- existing request_outcomes table so that lib/outcomes/service.ts
-- (shipped in 3AU at commit 3da70ea) can persist the contract it
-- already declares in TypeScript.
--
-- The columns are:
--   outcome_type  TEXT          — mirrors the OutcomeType union in
--                                 lib/outcomes/types.ts.
--   reported_by   TEXT          — actor identifier supplied by the
--                                 route handler (session id or SDK tag).
--   occurred_at   TIMESTAMPTZ   — caller-asserted time the outcome
--                                 occurred (distinct from created_at).
--
-- Privacy posture: metadata only. NO prompt, response, messages,
-- raw_trace, stored_content, completion_text, request_body, or
-- response_body column is added by this migration. The forbidden-key
-- discipline in lib/prove/outcome.ts and lib/outcomes/validation.ts
-- continues to govern the existing metadata JSONB column.
--
-- This slice DOES NOT introduce runtime enforcement.
-- This slice DOES NOT introduce tenant-visible Optimize recommendations.
-- This slice DOES NOT claim verified savings.
-- This slice DOES NOT introduce policy auto-apply.
--
-- All three columns are nullable with no default beyond NULL. Existing
-- rows continue to satisfy the schema with NULLs. No data backfill is
-- performed by this migration; no UPDATE or INSERT runs.
--
-- No CHECK constraints are added. The OutcomeType union is enforced in
-- application validation (lib/outcomes/validation.ts) per 3AU-1 §3 to
-- avoid the migration churn pattern observed in v2_054.
--
-- No new indexes are added. The existing
--   (tenant_id, created_at DESC)
--   (tenant_id, status, created_at DESC) WHERE status IN (...)
-- indexes already cover current access patterns per 3AU-1 §4.
--
-- Idempotent via ADD COLUMN IF NOT EXISTS. Reversible via
-- v2_057_request_outcomes_extension_down.sql (never auto-run;
-- document-only safety net).

BEGIN;

ALTER TABLE request_outcomes
    ADD COLUMN IF NOT EXISTS outcome_type TEXT,
    ADD COLUMN IF NOT EXISTS reported_by  TEXT,
    ADD COLUMN IF NOT EXISTS occurred_at  TIMESTAMPTZ;

COMMIT;
