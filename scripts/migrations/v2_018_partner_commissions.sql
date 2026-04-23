-- v2_018_partner_commissions.sql
-- Partner Program: Commission Engine
-- ============================================================
-- Creates the commission lifecycle tables:
--   partner_offers, partner_commission_rules,
--   partner_commission_entries, partner_commission_reviews,
--   partner_payout_batches, partner_payout_entries, partner_reversals
--
-- Commission flow:
--   attribution event (Stripe webhook)
--     → find active attribution
--     → match offer + rule
--     → write commission_entry (status: pending → approved → in_payout → paid)
--     → batch → payout_entry
--
-- Idempotency: UNIQUE (source_event_id, commission_rule_id)
-- Hold periods: 30 days (subscription), 45 days (usage), configurable per rule.
--
-- Run AFTER v2_017_partner_attribution.sql.
-- Run with: psql $DATABASE_URL -f scripts/migrations/v2_018_partner_commissions.sql

BEGIN;

-- =============================================================================
-- PARTNER OFFERS
-- =============================================================================
-- Defines what a partner group earns. One offer per (group, plan, event_type).
-- Enables future per-plan or per-event segmentation.

CREATE TABLE IF NOT EXISTS partner_offers (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id          UUID        NOT NULL REFERENCES partner_programs(id),
    partner_group_id    UUID        REFERENCES partner_groups(id) ON DELETE SET NULL,
    name                VARCHAR(128) NOT NULL,
    description         TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('draft','active','archived')),
    applies_to_plans    TEXT[]      NOT NULL DEFAULT '{}',   -- [] = all plans
    applies_to_events   TEXT[]      NOT NULL DEFAULT '{}',   -- [] = all billing events
    max_months          INT,        -- NULL = unlimited (for recurring commissions)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_offers_group  ON partner_offers(partner_group_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_offers_prog   ON partner_offers(program_id, status);

-- =============================================================================
-- PARTNER COMMISSION RULES
-- =============================================================================
-- Calculation spec attached to an offer.
-- Multiple rules per offer allow tiered or event-split structures.

CREATE TABLE IF NOT EXISTS partner_commission_rules (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id        UUID        NOT NULL REFERENCES partner_offers(id) ON DELETE CASCADE,
    rule_type       VARCHAR(30) NOT NULL
                        CHECK (rule_type IN (
                            'percent_revenue',   -- pct of net invoice amount
                            'fixed_amount',      -- flat fee per event
                            'tiered_percent'     -- (reserved for Phase 4)
                        )),
    rate_percent    NUMERIC(6,4),    -- e.g. 20.0000 for 20%
    fixed_amount    NUMERIC(12,2),   -- USD, for fixed_amount type
    currency        VARCHAR(10) NOT NULL DEFAULT 'USD',
    hold_days       INT         NOT NULL DEFAULT 30,
    applies_to_event VARCHAR(64),    -- NULL = all events in offer scope
    max_amount      NUMERIC(12,2),   -- cap per entry, NULL = uncapped
    is_active       BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_rules_offer ON partner_commission_rules(offer_id, is_active);

-- =============================================================================
-- PARTNER COMMISSION ENTRIES
-- =============================================================================
-- One row per billable event per partner attribution.
-- source_event_id: the upstream billing event ID (Stripe invoice.id, etc.)
-- Idempotency: UNIQUE (source_event_id, commission_rule_id)

CREATE TABLE IF NOT EXISTS partner_commission_entries (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id          UUID        NOT NULL REFERENCES partners(id),
    attribution_id      UUID        NOT NULL REFERENCES partner_attributions(id),
    offer_id            UUID        NOT NULL REFERENCES partner_offers(id),
    commission_rule_id  UUID        NOT NULL REFERENCES partner_commission_rules(id),
    attributed_tenant_id UUID       NOT NULL REFERENCES tenants(id),
    source_event_type   VARCHAR(64) NOT NULL,   -- e.g. 'checkout.session.completed'
    source_event_id     VARCHAR(256) NOT NULL,  -- Stripe event/invoice ID
    invoice_amount_usd  NUMERIC(12,2),          -- gross invoice amount
    commission_amount   NUMERIC(12,2) NOT NULL,
    currency            VARCHAR(10) NOT NULL DEFAULT 'USD',
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN (
                                'pending',     -- newly created, in hold
                                'approved',    -- passed review / auto-approved
                                'declined',    -- rejected by reviewer
                                'in_payout',   -- included in a payout batch
                                'paid',        -- payout confirmed
                                'reversed'     -- clawback applied
                            )),
    hold_until          TIMESTAMPTZ NOT NULL,
    month_number        INT         NOT NULL DEFAULT 1,  -- recurring month counter
    payout_batch_id     UUID,       -- populated when batched (FK added below)
    review_notes        TEXT,
    metadata            JSONB       NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_event_id, commission_rule_id)
);

CREATE INDEX IF NOT EXISTS idx_comm_entries_partner  ON partner_commission_entries(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_comm_entries_attr     ON partner_commission_entries(attribution_id);
CREATE INDEX IF NOT EXISTS idx_comm_entries_tenant   ON partner_commission_entries(attributed_tenant_id);
CREATE INDEX IF NOT EXISTS idx_comm_entries_hold     ON partner_commission_entries(hold_until)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_comm_entries_source   ON partner_commission_entries(source_event_id);

-- =============================================================================
-- PARTNER COMMISSION REVIEWS
-- =============================================================================
-- Immutable audit trail for every status transition on an entry.

CREATE TABLE IF NOT EXISTS partner_commission_reviews (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id        UUID        NOT NULL REFERENCES partner_commission_entries(id) ON DELETE CASCADE,
    reviewer_id     UUID        REFERENCES tenants(id),
    from_status     VARCHAR(20) NOT NULL,
    to_status       VARCHAR(20) NOT NULL,
    notes           TEXT,
    reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_reviews_entry ON partner_commission_reviews(entry_id, reviewed_at DESC);

-- =============================================================================
-- PARTNER PAYOUT BATCHES
-- =============================================================================
-- Container for a payout run. One batch can contain entries for multiple partners.
-- Batches are assembled, reviewed, then released.

CREATE TABLE IF NOT EXISTS partner_payout_batches (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id          UUID        NOT NULL REFERENCES partner_programs(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'assembling'
                            CHECK (status IN (
                                'assembling',  -- being built
                                'pending',     -- ready for finance review
                                'approved',    -- finance signed off
                                'processing',  -- transfers initiated
                                'completed',   -- all transfers confirmed
                                'failed'       -- transfer failure
                            )),
    total_amount        NUMERIC(14,2) NOT NULL DEFAULT 0,
    currency            VARCHAR(10)   NOT NULL DEFAULT 'USD',
    created_by          UUID          REFERENCES tenants(id),
    approved_by         UUID          REFERENCES tenants(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_batches_status ON partner_payout_batches(status, created_at DESC);

-- Now add the FK from commission_entries to payout_batches
ALTER TABLE partner_commission_entries
    ADD CONSTRAINT fk_comm_entry_batch
    FOREIGN KEY (payout_batch_id)
    REFERENCES partner_payout_batches(id)
    ON DELETE SET NULL;

-- =============================================================================
-- PARTNER PAYOUT ENTRIES
-- =============================================================================
-- One row per partner per batch. Aggregates all approved commissions into
-- a single disbursement record.

CREATE TABLE IF NOT EXISTS partner_payout_entries (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id                UUID        NOT NULL REFERENCES partner_payout_batches(id) ON DELETE CASCADE,
    partner_id              UUID        NOT NULL REFERENCES partners(id),
    payout_method_id        UUID        REFERENCES partner_payout_methods(id),
    amount                  NUMERIC(12,2) NOT NULL,
    currency                VARCHAR(10) NOT NULL DEFAULT 'USD',
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','processing','sent','confirmed','failed')),
    provider_transfer_id    VARCHAR(256),  -- Stripe transfer ID, USDC tx hash, etc.
    provider_reference      TEXT,
    failure_reason          TEXT,
    sent_at                 TIMESTAMPTZ,
    confirmed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (batch_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_payout_entries_batch   ON partner_payout_entries(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_payout_entries_partner ON partner_payout_entries(partner_id, status);

-- =============================================================================
-- PARTNER REVERSALS
-- =============================================================================
-- Records clawbacks (refunds, chargebacks, fraudulent signups, etc.)
-- Links back to original commission entry and creates a negative adjustment.

CREATE TABLE IF NOT EXISTS partner_reversals (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    commission_entry_id     UUID        NOT NULL REFERENCES partner_commission_entries(id),
    partner_id              UUID        NOT NULL REFERENCES partners(id),
    reason                  VARCHAR(64) NOT NULL
                                CHECK (reason IN (
                                    'chargeback',
                                    'refund',
                                    'fraud',
                                    'policy_violation',
                                    'manual_override'
                                )),
    reversal_amount         NUMERIC(12,2) NOT NULL,
    currency                VARCHAR(10) NOT NULL DEFAULT 'USD',
    notes                   TEXT,
    created_by              UUID        REFERENCES tenants(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_reversals_entry   ON partner_reversals(commission_entry_id);
CREATE INDEX IF NOT EXISTS idx_partner_reversals_partner ON partner_reversals(partner_id, created_at DESC);

-- =============================================================================
-- SEED: Starter Offers + Commission Rules
-- =============================================================================
-- Track A — Developer Affiliates: 20% recurring, 12 months, 30-day hold
-- Track B — Integration Partners: 25% recurring (no cap months) + $500 workspace bounty
-- Track C — Enterprise Referrers: 7% year-one net revenue, manual review, 45-day hold

-- Offer: Track A
INSERT INTO partner_offers (id, program_id, partner_group_id, name, description,
                             applies_to_plans, applies_to_events, max_months)
VALUES (
    '00000000-0000-0001-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000001',  -- developer-affiliates
    'Developer Affiliate — 20% Recurring (12 mo)',
    '20% of net subscription revenue for 12 months per referred customer.',
    ARRAY['pro','enterprise'],
    ARRAY['checkout.session.completed','invoice.payment_succeeded'],
    12
) ON CONFLICT DO NOTHING;

INSERT INTO partner_commission_rules (id, offer_id, rule_type, rate_percent, hold_days, applies_to_event)
VALUES (
    '00000000-0000-0002-0000-000000000001',
    '00000000-0000-0001-0000-000000000001',
    'percent_revenue',
    20.0000,
    30,
    NULL   -- applies to all events in the offer
) ON CONFLICT DO NOTHING;

-- Offer: Track B — recurring commission
INSERT INTO partner_offers (id, program_id, partner_group_id, name, description,
                             applies_to_plans, applies_to_events, max_months)
VALUES (
    '00000000-0000-0001-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000002',  -- integration-partners
    'Integration Partner — 25% Recurring',
    '25% of net subscription revenue, unlimited months per referred customer.',
    ARRAY['pro','enterprise'],
    ARRAY['checkout.session.completed','invoice.payment_succeeded'],
    NULL  -- unlimited
) ON CONFLICT DO NOTHING;

INSERT INTO partner_commission_rules (id, offer_id, rule_type, rate_percent, hold_days, applies_to_event)
VALUES (
    '00000000-0000-0002-0000-000000000002',
    '00000000-0000-0001-0000-000000000002',
    'percent_revenue',
    25.0000,
    30,
    NULL
) ON CONFLICT DO NOTHING;

-- Offer: Track B — workspace launch bounty ($500 fixed per launched workspace)
INSERT INTO partner_offers (id, program_id, partner_group_id, name, description,
                             applies_to_plans, applies_to_events, max_months)
VALUES (
    '00000000-0000-0001-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000002',  -- integration-partners
    'Integration Partner — Workspace Launch Bounty',
    '$500 fixed bounty per launched workspace (enterprise plan activation).',
    ARRAY['enterprise'],
    ARRAY['checkout.session.completed'],
    1  -- one-time
) ON CONFLICT DO NOTHING;

INSERT INTO partner_commission_rules (id, offer_id, rule_type, fixed_amount, hold_days, applies_to_event)
VALUES (
    '00000000-0000-0002-0000-000000000003',
    '00000000-0000-0001-0000-000000000003',
    'fixed_amount',
    500.00,
    45,
    'checkout.session.completed'
) ON CONFLICT DO NOTHING;

-- Offer: Track C — Enterprise Referral (7% year-one, manual review required)
INSERT INTO partner_offers (id, program_id, partner_group_id, name, description,
                             applies_to_plans, applies_to_events, max_months)
VALUES (
    '00000000-0000-0001-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000003',  -- enterprise-referrers
    'Enterprise Referral — 7% Year-One Revenue',
    '7% of year-one net revenue for referred enterprise customers. Manual review required.',
    ARRAY['enterprise'],
    ARRAY['checkout.session.completed','invoice.payment_succeeded'],
    12
) ON CONFLICT DO NOTHING;

INSERT INTO partner_commission_rules (id, offer_id, rule_type, rate_percent, hold_days, applies_to_event)
VALUES (
    '00000000-0000-0002-0000-000000000004',
    '00000000-0000-0001-0000-000000000004',
    'percent_revenue',
    7.0000,
    45,
    NULL
) ON CONFLICT DO NOTHING;

COMMIT;
