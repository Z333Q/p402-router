-- v2_054 — Outcome status transitional superset.
--
-- Slice 3J of the Optimize unlock track. The v2_051 migration installed
-- a 6-value CHECK on request_outcomes.status:
--   ('accepted', 'rejected', 'retried', 'escalated', 'human_reviewed', 'failed')
--
-- The V5 §8.3 canonical vocabulary is:
--   ('accepted', 'rejected', 'revised', 'escalated', 'failed',
--    'pending_review', 'unknown')
--
-- These two lists overlap but are not identical. A hard cut to V5 would
-- break existing rows that were written under v2_051 with `retried` or
-- `human_reviewed`, AND would break SDK clients that still emit those
-- statuses. To stay backward-compatible while unblocking Optimize-ready
-- reads, this migration installs a TRANSITIONAL SUPERSET that physically
-- accepts both vocabularies:
--
--   accepted, rejected, revised, retried,
--   escalated, human_reviewed, failed,
--   pending_review, unknown
--
-- Reads normalize legacy values in lib/prove/outcome.ts:
--   retried        -> revised   (legacy_status: 'retried')
--   human_reviewed -> accepted  (legacy_status: 'human_reviewed')
--
-- Pure CHECK relaxation. No row rewrite. Reversible via v2_054_down.sql
-- which restores the v2_051 6-value list (only safe to run if no row in
-- the table carries one of the new statuses — the down migration leaves
-- that responsibility to the operator).

BEGIN;

ALTER TABLE request_outcomes
    DROP CONSTRAINT IF EXISTS request_outcomes_status_check;

ALTER TABLE request_outcomes
    ADD CONSTRAINT request_outcomes_status_check
    CHECK (status IN (
        'accepted',
        'rejected',
        'revised',
        'retried',
        'escalated',
        'human_reviewed',
        'failed',
        'pending_review',
        'unknown'
    ));

COMMIT;
