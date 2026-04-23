-- v2_016_partner_core.sql
-- Partner Program: Core Identity, Membership, and Legal Tables
-- ============================================================
-- Creates the partner program foundation:
--   partner_programs, partner_groups, partner_group_assignments
--   partners (linked to existing tenants — no duplicate identity)
--   partner_memberships, partner_applications
--   partner_terms_acceptance, partner_tax_profiles, partner_payout_methods
--
-- Design decision: partners.primary_tenant_id references tenants(id).
-- One user, two contexts. Partner identity piggybacks on existing auth.
--
-- Run AFTER v2_015_cdp_wallets.sql.
-- Run with: psql $DATABASE_URL -f scripts/migrations/v2_016_partner_core.sql

BEGIN;

-- =============================================================================
-- PARTNER PROGRAMS
-- =============================================================================
-- Top-level container. Useful if P402 ever runs distinct programs.

CREATE TABLE IF NOT EXISTS partner_programs (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(128) NOT NULL,
    slug                    VARCHAR(64)  NOT NULL UNIQUE,
    status                  VARCHAR(20)  NOT NULL DEFAULT 'active'
                                CHECK (status IN ('draft','active','archived')),
    default_terms_version   VARCHAR(32)  NOT NULL DEFAULT 'v1.0',
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO partner_programs (id, name, slug, status) VALUES
    ('00000000-0000-0000-0000-000000000001', 'P402 Partner Program', 'p402-partner', 'active')
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- PARTNER GROUPS
-- =============================================================================
-- Offer segmentation buckets. Track A / B / C map to these.

CREATE TABLE IF NOT EXISTS partner_groups (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id  UUID        NOT NULL REFERENCES partner_programs(id) ON DELETE CASCADE,
    name        VARCHAR(128) NOT NULL,
    slug        VARCHAR(64)  NOT NULL,
    description TEXT,
    status      VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (program_id, slug)
);

INSERT INTO partner_groups (id, program_id, name, slug, description) VALUES
    ('00000000-0000-0000-0001-000000000001',
     '00000000-0000-0000-0000-000000000001',
     'Developer Affiliates', 'developer-affiliates',
     'Track A: AI builders, educators, SDK tutorial writers, technical content creators'),
    ('00000000-0000-0000-0001-000000000002',
     '00000000-0000-0000-0000-000000000001',
     'Integration Partners', 'integration-partners',
     'Track B: Agencies, consultant networks, AI automation firms, implementation shops'),
    ('00000000-0000-0000-0001-000000000003',
     '00000000-0000-0000-0000-000000000001',
     'Enterprise Referral Partners', 'enterprise-referrers',
     'Track C: Ecosystem connectors, investors, advisors, enterprise consultants')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PARTNERS
-- =============================================================================
-- Canonical partner entity. References existing tenants — no duplicate users.
-- referral_code is the short code embedded in referral links (e.g. "alice42").

CREATE TABLE IF NOT EXISTS partners (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id          UUID        NOT NULL REFERENCES partner_programs(id),
    primary_tenant_id   UUID        NOT NULL REFERENCES tenants(id),
    type                VARCHAR(30) NOT NULL
                            CHECK (type IN ('affiliate','agency','enterprise_referrer')),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending_review'
                            CHECK (status IN ('applied','pending_review','approved',
                                              'suspended','terminated','rejected')),
    display_name        VARCHAR(128) NOT NULL,
    legal_name          VARCHAR(256),
    website_url         TEXT,
    audience_description TEXT,
    country_code        VARCHAR(3),
    notes_internal      TEXT,
    referral_code       VARCHAR(32)  NOT NULL UNIQUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partners_tenant   ON partners(primary_tenant_id);
CREATE INDEX IF NOT EXISTS idx_partners_status   ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_code     ON partners(referral_code);

-- =============================================================================
-- PARTNER MEMBERSHIPS
-- =============================================================================
-- Maps a tenant (user) to a partner entity with a specific role.
-- One user can be a member of one partner entity (expand later if needed).
-- Role determines permission bundle — evaluated in lib/partner/permissions.ts.

CREATE TABLE IF NOT EXISTS partner_memberships (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id  UUID        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    tenant_id   UUID        NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
    role        VARCHAR(40) NOT NULL CHECK (role IN (
                    'partner_affiliate',
                    'partner_agency',
                    'partner_enterprise_referrer',
                    'partner_manager_internal',
                    'partner_finance_internal'
                )),
    status      VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','invited','revoked')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (partner_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_memberships_tenant  ON partner_memberships(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_memberships_partner ON partner_memberships(partner_id, status);

-- =============================================================================
-- PARTNER GROUP ASSIGNMENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS partner_group_assignments (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id              UUID        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    partner_group_id        UUID        NOT NULL REFERENCES partner_groups(id) ON DELETE CASCADE,
    assigned_by_tenant_id   UUID        REFERENCES tenants(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (partner_id, partner_group_id)
);

-- =============================================================================
-- PARTNER APPLICATIONS
-- =============================================================================
-- Inbound form submissions. No partner record exists yet — created after approval.

CREATE TABLE IF NOT EXISTS partner_applications (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email                       VARCHAR(256) NOT NULL,
    name                        VARCHAR(256) NOT NULL,
    website_url                 TEXT,
    channel_type                VARCHAR(64),  -- blog, youtube, newsletter, agency, consultant, other
    audience_size               VARCHAR(32),  -- <1k, 1k-10k, 10k-100k, 100k+
    audience_description        TEXT,
    partner_type_interest       VARCHAR(30)  NOT NULL DEFAULT 'affiliate'
                                    CHECK (partner_type_interest IN ('affiliate','agency','enterprise_referrer')),
    why_p402                    TEXT,
    promotion_plan              TEXT,
    status                      VARCHAR(20)  NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending','reviewing','approved','rejected')),
    reviewed_by_tenant_id       UUID         REFERENCES tenants(id),
    review_notes                TEXT,
    partner_id                  UUID         REFERENCES partners(id),
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_applications_email  ON partner_applications(email);
CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON partner_applications(status, created_at DESC);

-- =============================================================================
-- PARTNER TERMS ACCEPTANCE
-- =============================================================================
-- Immutable log. IP/UA stored as hashes only.

CREATE TABLE IF NOT EXISTS partner_terms_acceptance (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id      UUID        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    tenant_id       UUID        NOT NULL REFERENCES tenants(id),
    terms_version   VARCHAR(32) NOT NULL,
    accepted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address_hash VARCHAR(64),
    user_agent_hash VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_partner_terms_partner ON partner_terms_acceptance(partner_id);

-- =============================================================================
-- PARTNER TAX PROFILES
-- =============================================================================
-- No PII stored inline — tax_form_reference is an opaque reference identifier.

CREATE TABLE IF NOT EXISTS partner_tax_profiles (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id              UUID        NOT NULL REFERENCES partners(id) ON DELETE CASCADE UNIQUE,
    status                  VARCHAR(20) NOT NULL DEFAULT 'missing'
                                CHECK (status IN ('missing','submitted','approved','rejected')),
    country_code            VARCHAR(3),
    entity_type             VARCHAR(32),  -- individual, corporation, llc, partnership
    tax_form_reference      VARCHAR(128), -- W-9, W-8BEN, etc.
    reviewed_by_tenant_id   UUID         REFERENCES tenants(id),
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PARTNER PAYOUT METHODS
-- =============================================================================
-- destination_reference is an opaque token — never raw account numbers.

CREATE TABLE IF NOT EXISTS partner_payout_methods (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id              UUID        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    provider                VARCHAR(30) NOT NULL
                                CHECK (provider IN ('stripe_connect','paypal','wise','manual','crypto_usdc')),
    destination_reference   TEXT,
    status                  VARCHAR(20) NOT NULL DEFAULT 'active',
    is_default              BOOLEAN     NOT NULL DEFAULT false,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_payout_methods ON partner_payout_methods(partner_id, is_default);

COMMIT;
