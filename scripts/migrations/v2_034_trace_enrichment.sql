-- v2_034: Trace enrichment + savings baseline
-- Adds baseline_cost to execute_requests for savings analytics,
-- and provider_id/model_id to execute_trace_nodes for per-node attribution.

ALTER TABLE execute_requests
  ADD COLUMN IF NOT EXISTS baseline_cost NUMERIC(20,8);

ALTER TABLE execute_trace_nodes
  ADD COLUMN IF NOT EXISTS provider_id TEXT,
  ADD COLUMN IF NOT EXISTS model_id    TEXT;

-- Backfill index for savings queries (tenant + time range)
CREATE INDEX IF NOT EXISTS idx_execute_requests_tenant_created
  ON execute_requests (tenant_id, created_at DESC);

-- Index for provider analytics on trace nodes
CREATE INDEX IF NOT EXISTS idx_execute_trace_nodes_provider
  ON execute_trace_nodes (provider_id)
  WHERE provider_id IS NOT NULL;
