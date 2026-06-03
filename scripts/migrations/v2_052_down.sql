-- v2_052 rollback. NEVER auto-run. Document-only safety net.
-- Drops ai_economic_events, privacy_scope_overrides, tenant_privacy_settings
-- in dependency-safe order. Data loss is inevitable.

BEGIN;

DROP INDEX IF EXISTS idx_aiee_denials;
DROP INDEX IF EXISTS idx_aiee_retention_expiry;
DROP INDEX IF EXISTS idx_aiee_evidence;
DROP INDEX IF EXISTS idx_aiee_action;
DROP INDEX IF EXISTS idx_aiee_customer;
DROP INDEX IF EXISTS idx_aiee_employee;
DROP INDEX IF EXISTS idx_aiee_department;
DROP INDEX IF EXISTS idx_aiee_api_key;
DROP INDEX IF EXISTS idx_aiee_tenant_time;
DROP TABLE IF EXISTS ai_economic_events;

DROP INDEX IF EXISTS idx_privacy_overrides_tenant;
DROP TABLE IF EXISTS privacy_scope_overrides;

DROP TABLE IF EXISTS tenant_privacy_settings;

COMMIT;
