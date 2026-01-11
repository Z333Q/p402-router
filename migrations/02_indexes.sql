-- migratons/02_indexes.sql
-- Optimizing for Top 1% performance

-- 1. Analytics & Decision Log Performance
-- Speed up history charts and tenant isolation checks
CREATE INDEX IF NOT EXISTS idx_router_decisions_tenant_timestamp ON router_decisions(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_router_decisions_route ON router_decisions(route_id);
CREATE INDEX IF NOT EXISTS idx_router_decisions_provider ON router_decisions(selected_provider_id);

-- 2. Ledger/Events Performance
-- Speed up de-duplication and historical audits
CREATE INDEX IF NOT EXISTS idx_events_tenant_outcome ON events(tenant_id, outcome);
CREATE INDEX IF NOT EXISTS idx_events_facilitator ON events(facilitator_id);

-- 3. Policy & Facilitator Lookups
CREATE INDEX IF NOT EXISTS idx_facilitators_tenant ON facilitators(tenant_id);
CREATE INDEX IF NOT EXISTS idx_policies_tenant ON policies(tenant_id);

-- 4. Bazaar Search Optimization
CREATE INDEX IF NOT EXISTS idx_bazaar_title_trgm ON bazaar_resources USING gin (title gin_trgm_ops); -- Only if pg_trgm is enabled
CREATE INDEX IF NOT EXISTS idx_bazaar_tags ON bazaar_resources USING gin (tags);

-- 5. Session Management
CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON agent_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON agent_sessions(status) WHERE status = 'active';
