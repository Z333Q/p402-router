-- v2_058 rollback. NEVER auto-run. Document-only safety net.
--
-- Drops the four pricing-intent columns added by
-- v2_058_access_requests_intent_columns.sql:
--   intent
--   resolved_intent
--   plan_id
--   offer_id
--
-- Existing rows in access_requests lose any values stored in these
-- columns. Other columns and rows are not touched. No billing state
-- is affected; access_requests is a lead-capture table only.

BEGIN;

ALTER TABLE access_requests
    DROP COLUMN IF EXISTS offer_id,
    DROP COLUMN IF EXISTS plan_id,
    DROP COLUMN IF EXISTS resolved_intent,
    DROP COLUMN IF EXISTS intent;

COMMIT;
