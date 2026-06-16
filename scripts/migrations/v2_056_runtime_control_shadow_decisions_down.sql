-- v2_056 rollback. NEVER auto-run. Document-only safety net.
-- Drops the runtime_control_shadow_decisions table. Data loss is
-- inevitable; shadow decisions exist nowhere else durable.

BEGIN;

DROP TABLE IF EXISTS runtime_control_shadow_decisions;

COMMIT;
