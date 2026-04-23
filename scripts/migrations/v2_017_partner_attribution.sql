-- v2_017_partner_attribution.sql
-- Partner Program: Links, Clicks, and Attribution
-- ============================================================
-- Creates the attribution layer:
--   partner_campaigns, partner_links, partner_link_clicks, partner_attributions
--
-- Privacy design:
--   - IP addresses stored as SHA-256 hashes only
--   - User agents stored as SHA-256 hashes only
--   - anonymous_session_id is a client-generated opaque ID, not tied to PII
--
-- Attribution precedence (enforced in lib/partner/attribution.ts):
--   deal_registration > registered_lead > cookie_last_touch
--
-- Run AFTER v2_016_partner_core.sql.
-- Run with: psql $DATABASE_URL -f scripts/migrations/v2_017_partner_attribution.sql

BEGIN;

-- =============================================================================
-- PARTNER CAMPAIGNS
-- =============================================================================

CREATE TABLE IF NOT EXISTS partner_campaigns (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id      UUID        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    name            VARCHAR(128) NOT NULL,
    slug            VARCHAR(64),
    destination_url TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_campaigns_partner ON partner_campaigns(partner_id);

-- =============================================================================
-- PARTNER LINKS
-- =============================================================================
-- code is the unique slug embedded in the referral URL: p402.io/r/{code}

CREATE TABLE IF NOT EXISTS partner_links (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id      UUID        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    campaign_id     UUID        REFERENCES partner_campaigns(id) ON DELETE SET NULL,
    code            VARCHAR(64) NOT NULL UNIQUE,
    destination_path TEXT       NOT NULL DEFAULT '/',
    label           VARCHAR(128),
    utm_source      VARCHAR(128),
    utm_medium      VARCHAR(64),
    utm_campaign    VARCHAR(128),
    default_subid   VARCHAR(128),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','paused','expired')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_links_partner ON partner_links(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_links_code    ON partner_links(code);

-- =============================================================================
-- PARTNER LINK CLICKS
-- =============================================================================
-- Raw click events. High volume — prune after attribution window expires.

CREATE TABLE IF NOT EXISTS partner_link_clicks (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_link_id     UUID        NOT NULL REFERENCES partner_links(id) ON DELETE CASCADE,
    partner_id          UUID        NOT NULL REFERENCES partners(id),
    clicked_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    landing_path        TEXT,
    referrer_domain     VARCHAR(256),
    ip_hash             VARCHAR(64),     -- SHA-256(IP) — never raw
    user_agent_hash     VARCHAR(64),     -- SHA-256(UA) — never raw
    subid               VARCHAR(128),
    anonymous_session_id VARCHAR(128),   -- client-generated opaque session ID
    first_touch         BOOLEAN         NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_partner_clicks_link    ON partner_link_clicks(partner_link_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_clicks_partner ON partner_link_clicks(partner_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_clicks_anon    ON partner_link_clicks(anonymous_session_id)
    WHERE anonymous_session_id IS NOT NULL;

-- =============================================================================
-- PARTNER ATTRIBUTIONS
-- =============================================================================
-- Source of truth for attribution after a signup or deal registration.
-- One active attribution per attributed_tenant_id at a time.
-- Superseded records are preserved for audit.

CREATE TABLE IF NOT EXISTS partner_attributions (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id              UUID        NOT NULL REFERENCES partners(id),
    attributed_tenant_id    UUID        REFERENCES tenants(id),
    partner_link_id         UUID        REFERENCES partner_links(id),
    attribution_type        VARCHAR(30) NOT NULL DEFAULT 'cookie_last_touch'
                                CHECK (attribution_type IN (
                                    'cookie_last_touch',
                                    'registered_lead',
                                    'deal_registration',
                                    'manual_override'
                                )),
    first_click_at          TIMESTAMPTZ,
    last_click_at           TIMESTAMPTZ,
    attributed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    window_expires_at       TIMESTAMPTZ,
    status                  VARCHAR(20) NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','expired','superseded','rejected')),
    override_reason         TEXT,
    created_by_tenant_id    UUID        REFERENCES tenants(id),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_attr_tenant  ON partner_attributions(attributed_tenant_id)
    WHERE attributed_tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partner_attr_partner ON partner_attributions(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_attr_status  ON partner_attributions(status, window_expires_at)
    WHERE status = 'active';

COMMIT;
