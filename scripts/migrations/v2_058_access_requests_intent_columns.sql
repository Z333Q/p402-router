-- v2_058: access_requests — pricing-intent persistence columns.
--
-- Slice 3AY-8R-3. /get-access (3AY-4) already emits `intent` on submission,
-- but app/api/v1/access-request/route.ts currently drops it. Before Build
-- self-serve checkout ships (3AY-8R-4), the operator needs to query leads
-- by canonical V5 intent, plan id, and bridge-offer id.
--
-- Columns added:
--   intent           TEXT  — raw, sanitized value the buyer landed on
--                            (may be a legacy intent such as `developer`,
--                            `business`, or `proof-sprint`).
--   resolved_intent  TEXT  — canonical V5 intent id after the legacy map
--                            (see lib/pricing/intent.ts::resolveIntent).
--                            NULL for unknown / missing intents.
--   plan_id          TEXT  — V5 plan id derived server-side from
--                            INTENT_COPY when the intent maps to a plan.
--                            NULL otherwise. Always derived; never trusted
--                            from the client request body.
--   offer_id         TEXT  — V5 bridge offer id derived server-side from
--                            INTENT_COPY when the intent maps to a bridge
--                            offer. NULL otherwise. Always derived.
--
-- Privacy posture: metadata only. NO prompt, response, messages, raw_trace,
-- stored_content, completion_text, request_body, or response_body column
-- is added by this migration. The forbidden-key discipline at the route
-- handler continues to govern submitted payloads.
--
-- This slice DOES NOT change tenants.plan or any billing state.
-- This slice DOES NOT enable Build checkout.
-- This slice DOES NOT introduce runtime enforcement.
-- This slice DOES NOT claim verified savings, auto-apply, or any
-- unsupported compliance posture.
--
-- All four columns are nullable with no default beyond NULL. Existing
-- rows continue to satisfy the schema with NULLs. No data backfill is
-- performed by this migration; no UPDATE or INSERT runs.
--
-- No CHECK constraints are added. The intent vocabulary is validated in
-- application code (lib/pricing/intent.ts) to avoid the migration churn
-- pattern flagged in v2_054 / 3AU-1 §3.
--
-- No new indexes are added. The expected operator query path is
--   SELECT ... FROM access_requests WHERE resolved_intent = $1
-- at the current lead volume; an index can be added in a later slice
-- once volume warrants it.
--
-- Idempotent via ADD COLUMN IF NOT EXISTS. Reversible via
-- v2_058_access_requests_intent_columns_down.sql (never auto-run;
-- document-only safety net).

BEGIN;

ALTER TABLE access_requests
    ADD COLUMN IF NOT EXISTS intent          TEXT,
    ADD COLUMN IF NOT EXISTS resolved_intent TEXT,
    ADD COLUMN IF NOT EXISTS plan_id         TEXT,
    ADD COLUMN IF NOT EXISTS offer_id        TEXT;

COMMIT;
