-- v2_059: tenants — onboarded-at column for the 3AZ-2 onboarding refresh.
--
-- Slice 3AZ-2-A. The onboarding redesign in
-- docs/internal/3AZ-2-onboarding-refresh-plan.md depends on a single
-- nullable timestamp that records when a tenant first completed the
-- new onboarding flow. The column is the gate that prevents returning
-- users from being re-looped through onboarding (current behavior
-- per audit finding F3: re-entry generates fresh API keys).
--
-- Column added:
--   onboarded_at TIMESTAMPTZ  — set exactly once by
--                               completeOnboardingAction on first
--                               success. NULL = never onboarded.
--
-- Set semantics (enforced in application code, not the schema):
--   - Set with NOW() the first time completeOnboardingAction succeeds.
--   - Never re-set on subsequent visits (idempotent via a NULL guard
--     in the UPDATE clause).
--   - May be backfilled by a separate operator-approved data migration
--     for tenants that pre-date the new flow (see plan §13 Q8).
--
-- Read paths (also enforced in app code):
--   - /dashboard/layout.tsx gate: NULL -> redirect to /onboarding/welcome.
--   - /onboarding/* routes: NOT NULL -> redirect to /dashboard.
--   - Read-path fails open: query failure -> serve dashboard (plan §10.3).
--
-- Privacy posture: metadata only. The column stores a timestamp, no
-- user content. The forbidden-key discipline elsewhere in the repo
-- continues to govern surrounding code.
--
-- This slice DOES NOT change tenants.plan or any billing state.
-- This slice DOES NOT enable Build checkout.
-- This slice DOES NOT introduce runtime enforcement.
-- This slice DOES NOT claim verified savings, auto-apply, or any
-- unsupported compliance posture.
--
-- The column is nullable with no default beyond NULL. Existing rows
-- continue to satisfy the schema with NULLs. No data backfill is
-- performed by this migration; no UPDATE or INSERT runs.
--
-- No CHECK constraints, indexes, or foreign keys are added.
-- An index on (onboarded_at IS NULL) is not warranted at current
-- tenant volumes.
--
-- Idempotent via ADD COLUMN IF NOT EXISTS. Reversible via
-- v2_059_tenants_onboarded_at_down.sql (never auto-run;
-- document-only safety net).

BEGIN;

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

COMMIT;
