-- v2_055 rollback. NEVER auto-run. Document-only safety net.
-- Drops the tenant_control_settings table. Data loss is inevitable.

BEGIN;

DROP TABLE IF EXISTS tenant_control_settings;

COMMIT;
