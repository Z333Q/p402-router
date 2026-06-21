-- v2_057 rollback. NEVER auto-run. Document-only safety net.
--
-- Drops the three extension columns added by
-- v2_057_request_outcomes_extension.sql:
--   outcome_type
--   reported_by
--   occurred_at
--
-- Existing rows in request_outcomes lose any values stored in these
-- columns. Other columns and rows are not touched.

BEGIN;

ALTER TABLE request_outcomes
    DROP COLUMN IF EXISTS occurred_at,
    DROP COLUMN IF EXISTS reported_by,
    DROP COLUMN IF EXISTS outcome_type;

COMMIT;
