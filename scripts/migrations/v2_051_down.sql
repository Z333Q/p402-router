-- v2_051 rollback. NEVER auto-run. Document-only safety net.
-- Drops request_outcomes table and the action_type/task_type columns.
-- Data loss is inevitable (all recorded outcomes + action_type values).

BEGIN;

DROP INDEX IF EXISTS idx_request_outcomes_status;
DROP INDEX IF EXISTS idx_request_outcomes_tenant_time;
DROP TABLE IF EXISTS request_outcomes;

DROP INDEX IF EXISTS idx_router_decisions_action_type;
ALTER TABLE router_decisions
    DROP COLUMN IF EXISTS task_type,
    DROP COLUMN IF EXISTS action_type;

DROP INDEX IF EXISTS idx_traffic_events_action_type;
ALTER TABLE traffic_events
    DROP COLUMN IF EXISTS task_type,
    DROP COLUMN IF EXISTS action_type;

COMMIT;
