-- v2_053 rollback. NEVER auto-run. Document-only safety net.
-- Drops the outbox table; pending rows (if any) are lost.

BEGIN;

DROP INDEX IF EXISTS idx_eewf_tenant_code;
DROP INDEX IF EXISTS idx_eewf_tenant_recent;
DROP INDEX IF EXISTS idx_eewf_pending_retry;
DROP TABLE IF EXISTS economic_event_write_failures;

COMMIT;
