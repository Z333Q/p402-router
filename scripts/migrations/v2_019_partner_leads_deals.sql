-- v2_019_partner_leads_deals.sql
-- Partner Program: Leads and Deals Pipeline
-- ============================================================
-- Creates the sales pipeline tables:
--   partner_leads  — pre-attribution prospect registrations (all tracks)
--   partner_deals  — enterprise deal registration (Track C only)
--
-- Attribution precedence (enforced in lib/partner/attribution.ts):
--   deal_registration > registered_lead > cookie_last_touch
--
-- Both tables use an opaque UUID as the external-facing reference.
-- Email of the prospect is stored to enable dedup and cross-reference
-- to partner_attributions once the prospect signs up.
--
-- Run AFTER v2_018_partner_commissions.sql.
-- Run with: psql $DATABASE_URL -f scripts/migrations/v2_019_partner_leads_deals.sql
-- Or paste into Neon SQL Editor directly (self-contained BEGIN/COMMIT).

BEGIN;

-- =============================================================================
-- PARTNER LEADS
-- =============================================================================
-- A lead is a named prospect registered by a partner before signup.
-- When the prospect's email matches a signed-up tenant, attribution is
-- upgraded from cookie_last_touch to registered_lead.

CREATE TABLE IF NOT EXISTS partner_leads (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id          UUID        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    company_name        VARCHAR(256) NOT NULL,
    contact_name        VARCHAR(256) NOT NULL,
    contact_email       VARCHAR(256) NOT NULL,
    estimated_seats     INT,
    notes               TEXT,
    stage               VARCHAR(30) NOT NULL DEFAULT 'submitted'
                            CHECK (stage IN (
                                'submitted',    -- logged, P402 review pending
                                'accepted',     -- P402 confirmed lead is qualified
                                'in_progress',  -- active conversation with P402 sales
                                'converted',    -- lead became a paid customer
                                'rejected'      -- not qualified or duplicate
                            )),
    rejection_reason    TEXT,
    attribution_id      UUID        REFERENCES partner_attributions(id) ON DELETE SET NULL,
    reviewed_by         UUID        REFERENCES tenants(id),
    review_notes        TEXT,
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_leads_partner ON partner_leads(partner_id, stage);
CREATE INDEX IF NOT EXISTS idx_partner_leads_email   ON partner_leads(contact_email);
CREATE INDEX IF NOT EXISTS idx_partner_leads_stage   ON partner_leads(stage, created_at DESC);
-- Prevent duplicate lead registrations for the same email across all partners
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_leads_email_partner
    ON partner_leads(partner_id, contact_email)
    WHERE stage NOT IN ('rejected');

-- =============================================================================
-- PARTNER DEALS
-- =============================================================================
-- Enterprise deal registration (Track C only — partner_enterprise_referrer).
-- Higher attribution value than a lead. Commission is based on closed ARR.
-- Duplicate protection: first partner to register wins.

CREATE TABLE IF NOT EXISTS partner_deals (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id          UUID        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    company_name        VARCHAR(256) NOT NULL,
    contact_name        VARCHAR(256) NOT NULL,
    contact_email       VARCHAR(256) NOT NULL,
    estimated_arr_usd   NUMERIC(12,2),
    expected_close_date DATE,
    description         TEXT,
    stage               VARCHAR(30) NOT NULL DEFAULT 'registered'
                            CHECK (stage IN (
                                'registered',   -- submitted, P402 review pending
                                'accepted',     -- P402 confirmed scope
                                'negotiating',  -- active commercial discussion
                                'closed_won',   -- contract signed
                                'closed_lost'   -- deal did not close
                            )),
    actual_arr_usd      NUMERIC(12,2),   -- populated at closed_won
    contract_signed_at  TIMESTAMPTZ,
    rejection_reason    TEXT,
    attribution_id      UUID        REFERENCES partner_attributions(id) ON DELETE SET NULL,
    reviewed_by         UUID        REFERENCES tenants(id),
    review_notes        TEXT,
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_deals_partner ON partner_deals(partner_id, stage);
CREATE INDEX IF NOT EXISTS idx_partner_deals_email   ON partner_deals(contact_email);
CREATE INDEX IF NOT EXISTS idx_partner_deals_stage   ON partner_deals(stage, created_at DESC);
-- First-partner-wins: unique deal per contact email (across all partners, non-lost)
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_deals_email_global
    ON partner_deals(contact_email)
    WHERE stage NOT IN ('closed_lost');

COMMIT;
