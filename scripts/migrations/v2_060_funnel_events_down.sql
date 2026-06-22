-- v2_060 rollback. NEVER auto-run. Document-only safety net.
--
-- Drops the funnel_events table and its indexes added by
-- v2_060_funnel_events.sql.
--
-- All previously recorded funnel events are lost. No tenant data is
-- affected; funnel_events is a telemetry table only with no foreign
-- keys pointing into it from operational tables.

BEGIN;

DROP INDEX IF EXISTS idx_funnel_events_event_time;
DROP INDEX IF EXISTS idx_funnel_events_tenant_event;
DROP TABLE IF EXISTS funnel_events;

COMMIT;
