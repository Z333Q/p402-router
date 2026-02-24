-- Migration: v2_007_kpi_rollups
-- Description: Creates incremental rollup tables for the Admin KPI Console (Sprint 5).
-- Uses INSERT ... ON CONFLICT pattern instead of MATERIALIZED VIEWS to avoid
-- expensive REFRESH locks that would block live routing queries.

BEGIN;

-- 1. Daily Revenue Rollup
CREATE TABLE IF NOT EXISTS kpi_daily_revenue (
    date DATE NOT NULL,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_tier TEXT NOT NULL DEFAULT 'free',
    total_x402_volume_micros BIGINT NOT NULL DEFAULT 0,
    total_platform_fees_micros BIGINT NOT NULL DEFAULT 0,
    subscription_revenue_micros BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (date, tenant_id)
);

-- Fast time-series queries for the dashboard
CREATE INDEX IF NOT EXISTS idx_kpi_revenue_date ON kpi_daily_revenue(date DESC);

-- 2. Daily Adoption & Safety Rollup
CREATE TABLE IF NOT EXISTS kpi_daily_adoption (
    date DATE NOT NULL,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    total_a2a_tasks INT NOT NULL DEFAULT 0,
    cache_hits INT NOT NULL DEFAULT 0,
    safety_blocks INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (date, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_kpi_adoption_date ON kpi_daily_adoption(date DESC);

-- 3. Global admin summary view (non-materialized — always fresh)
CREATE OR REPLACE VIEW kpi_global_summary AS
SELECT
    date,
    SUM(total_x402_volume_micros) AS total_volume_micros,
    SUM(total_platform_fees_micros) AS total_fees_micros,
    SUM(subscription_revenue_micros) AS total_subscriptions_micros,
    COUNT(DISTINCT tenant_id) AS active_tenants
FROM kpi_daily_revenue
GROUP BY date
ORDER BY date DESC;

COMMIT;
