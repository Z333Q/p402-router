-- v2_054 — DOWN
--
-- Reverts request_outcomes.status CHECK to the v2_051 six-value list.
-- The operator MUST confirm before running that no row in the table
-- carries one of the v2_054-only statuses ('revised', 'pending_review',
-- 'unknown'); otherwise the ADD CONSTRAINT will fail.
--
--   sanity check:
--     SELECT status, COUNT(*) FROM request_outcomes
--     WHERE status IN ('revised','pending_review','unknown') GROUP BY 1;

BEGIN;

ALTER TABLE request_outcomes
    DROP CONSTRAINT IF EXISTS request_outcomes_status_check;

ALTER TABLE request_outcomes
    ADD CONSTRAINT request_outcomes_status_check
    CHECK (status IN (
        'accepted',
        'rejected',
        'retried',
        'escalated',
        'human_reviewed',
        'failed'
    ));

COMMIT;
