-- v2_017_meter_healthcare.sql
-- P402 Meter healthcare payer-ops tables
-- Arc Hackathon, April 2026
-- Run after v2_015_cdp_wallets.sql (and v2_016 if present)

-- ============================================================================
-- meter_work_orders
-- Persists Gemini-extracted work orders for each prior-auth packet run
-- ============================================================================
CREATE TABLE IF NOT EXISTS meter_work_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  session_id    TEXT,
  request_id    TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  workflow_type TEXT NOT NULL DEFAULT 'prior_auth_review',
  packet_format TEXT NOT NULL DEFAULT 'text',  -- text | pdf | image
  packet_summary TEXT,
  policy_summary TEXT,
  budget_cap_usd NUMERIC(12, 6) NOT NULL DEFAULT 1.00,
  approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  deidentified  BOOLEAN NOT NULL DEFAULT TRUE,
  review_mode   TEXT NOT NULL DEFAULT 'live',  -- live | safe
  execution_mode TEXT NOT NULL DEFAULT 'live',  -- live | safe
  tool_trace         JSONB NOT NULL DEFAULT '[]',
  healthcare_extract JSONB,   -- HealthcareExtract: payer, provider, urgency, caseType, etc.
  status        TEXT NOT NULL DEFAULT 'created',
  -- created | parsing | session_open | executing | reconciling | proof_ready | approved | held
  gemini_model  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meter_work_orders_tenant    ON meter_work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_meter_work_orders_session   ON meter_work_orders(session_id);
CREATE INDEX IF NOT EXISTS idx_meter_work_orders_status    ON meter_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_meter_work_orders_created   ON meter_work_orders(created_at DESC);

-- ============================================================================
-- meter_packet_assets
-- Tracks the source document / pasted text for each work order
-- ============================================================================
CREATE TABLE IF NOT EXISTS meter_packet_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  session_id    TEXT,
  work_order_id UUID REFERENCES meter_work_orders(id) ON DELETE CASCADE,
  asset_type    TEXT NOT NULL DEFAULT 'text',  -- text | pdf | image | ocr
  storage_url   TEXT,  -- null for inline / demo mode
  inline_content TEXT,
  sha256        TEXT,
  source_label  TEXT NOT NULL DEFAULT 'demo-packet',
  deidentified  BOOLEAN NOT NULL DEFAULT TRUE,
  packet_type   TEXT NOT NULL DEFAULT 'prior_auth_packet',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meter_packet_assets_tenant     ON meter_packet_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_meter_packet_assets_work_order ON meter_packet_assets(work_order_id);

-- ============================================================================
-- nanopayment_events
-- One row per sub-cent economic event emitted during a metered session
-- ============================================================================
CREATE TABLE IF NOT EXISTS nanopayment_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    TEXT NOT NULL,
  work_order_id UUID REFERENCES meter_work_orders(id) ON DELETE CASCADE,
  tenant_id     TEXT NOT NULL,
  event_kind    TEXT NOT NULL,
  -- estimate | reconcile | routing_fee | cache_hit | release | arc_settlement
  chunk_index   INTEGER,
  tokens_estimate INTEGER,
  cost_usd      NUMERIC(18, 10) NOT NULL DEFAULT 0,
  cost_usdc_e6  BIGINT NOT NULL DEFAULT 0,
  provisional   BOOLEAN NOT NULL DEFAULT TRUE,
  arc_tx_hash   TEXT,
  arc_batch_id  TEXT,
  arc_block     BIGINT,
  proof_ref     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nanopayment_events_session    ON nanopayment_events(session_id);
CREATE INDEX IF NOT EXISTS idx_nanopayment_events_work_order ON nanopayment_events(work_order_id);
CREATE INDEX IF NOT EXISTS idx_nanopayment_events_kind       ON nanopayment_events(event_kind);
CREATE INDEX IF NOT EXISTS idx_nanopayment_events_created    ON nanopayment_events(created_at DESC);

-- ============================================================================
-- arc_agents
-- ERC-8004 agent records on Arc testnet
-- ============================================================================
CREATE TABLE IF NOT EXISTS arc_agents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  agent_did     TEXT UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  identity_tx   TEXT,
  reputation_tx TEXT,
  chain_id      BIGINT NOT NULL DEFAULT 5042002,
  registered_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- arc_jobs
-- ERC-8183 agentic commerce job records on Arc testnet (optional release path)
-- ============================================================================
CREATE TABLE IF NOT EXISTS arc_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  work_order_id UUID REFERENCES meter_work_orders(id) ON DELETE CASCADE,
  job_id        TEXT UNIQUE,  -- ERC-8183 on-chain job identifier
  status        TEXT NOT NULL DEFAULT 'pending',
  -- pending | funded | approved | released | failed
  escrow_tx     TEXT,
  approve_tx    TEXT,
  release_tx    TEXT,
  amount_usdc_e6 BIGINT NOT NULL DEFAULT 0,
  arc_explorer_url TEXT,
  chain_id      BIGINT NOT NULL DEFAULT 5042002,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arc_jobs_work_order ON arc_jobs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_arc_jobs_status     ON arc_jobs(status);
