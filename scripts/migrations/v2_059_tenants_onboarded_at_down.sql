-- v2_059 rollback. NEVER auto-run. Document-only safety net.
--
-- Drops the onboarded_at column added by
-- v2_059_tenants_onboarded_at.sql.
--
-- Existing rows in tenants lose any value stored in onboarded_at.
-- Other columns and rows are not touched. No billing state is
-- affected; this is an onboarding lifecycle column only.

BEGIN;

ALTER TABLE tenants
    DROP COLUMN IF EXISTS onboarded_at;

COMMIT;
