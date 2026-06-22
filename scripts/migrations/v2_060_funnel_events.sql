-- v2_060: funnel_events — first-party onboarding/conversion telemetry.
--
-- Slice 3AZ-2-A. Per docs/internal/3AZ-2-onboarding-refresh-plan.md
-- §7.2 and §8, the onboarding redesign requires typed funnel events
-- recorded next to operational data in Neon. No third-party analytics
-- (PostHog / Segment) is wired in. The event vocabulary lives in
-- application code (lib/analytics/funnel.ts); this table only provides
-- storage.
--
-- Columns:
--   id              UUID PRIMARY KEY
--   occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
--   tenant_id       UUID NULL REFERENCES tenants(id)
--                       Nullable so we can record events that happen
--                       before a NextAuth session exists (e.g., a
--                       funnel.login_view).
--   anonymous_id    TEXT NULL
--                       Browser-scoped opaque id from a long-lived
--                       cookie. Used for pre-session attribution.
--   session_id      TEXT NULL
--                       Application session id (NextAuth) when present.
--   event_name      TEXT NOT NULL
--                       Stable enum maintained in lib/analytics/funnel.ts.
--   properties      JSONB NOT NULL DEFAULT '{}'::jsonb
--                       Metadata only. Forbidden-key scan in
--                       lib/analytics/funnel.ts strips any key matching
--                       the deny-list before write. No content fields,
--                       no PII, no email, no tokens.
--   user_agent_hash TEXT NULL
--                       Salted SHA-256 of the UA string, NOT the raw UA.
--   ip_class        TEXT NULL  -- 'ipv4' | 'ipv6' | NULL
--                       Address family only. Raw IP is never stored.
--
-- Privacy posture: metadata only. The forbidden-key scan and the
-- ip_class / user_agent_hash conventions are enforced in application
-- code. This table holds no content fields and no row-level PII
-- beyond the optional tenant_id reference and the opaque anonymous_id
-- cookie value.
--
-- This slice DOES NOT add behavior to the funnel; it only provides
-- storage. The event emit helpers (lib/analytics/funnel.ts) and the
-- client emit endpoint (app/api/v1/funnel/event/route.ts) ship in the
-- same code change set.
--
-- This slice DOES NOT change tenants.plan or any billing state.
-- This slice DOES NOT enable Build checkout.
-- This slice DOES NOT introduce runtime enforcement.
-- This slice DOES NOT claim verified savings, auto-apply, or any
-- unsupported compliance posture.
--
-- Indexes:
--   - (tenant_id, event_name, occurred_at DESC) -- per-tenant funnels.
--   - (event_name, occurred_at DESC)            -- cross-tenant rollups.
-- No CHECK constraints. The event vocabulary is enforced in app code.
--
-- Idempotent via IF NOT EXISTS on table and indexes. Reversible via
-- v2_060_funnel_events_down.sql (never auto-run; document-only safety
-- net).

BEGIN;

CREATE TABLE IF NOT EXISTS funnel_events (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id       UUID        NULL REFERENCES tenants(id),
    anonymous_id    TEXT        NULL,
    session_id      TEXT        NULL,
    event_name      TEXT        NOT NULL,
    properties      JSONB       NOT NULL DEFAULT '{}'::jsonb,
    user_agent_hash TEXT        NULL,
    ip_class        TEXT        NULL
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_tenant_event
    ON funnel_events (tenant_id, event_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_funnel_events_event_time
    ON funnel_events (event_name, occurred_at DESC);

COMMIT;
