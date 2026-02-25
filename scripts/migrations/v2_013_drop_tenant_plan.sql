-- v2_013_drop_tenant_plan.sql
-- Remove the orphaned `tenant_plan` column from tenants.
-- The entire codebase reads/writes `plan` exclusively.
-- `tenant_plan` was added in v2_002 but never used by any application code.
-- 0 rows drift confirmed before dropping.

ALTER TABLE tenants DROP COLUMN IF EXISTS tenant_plan;
