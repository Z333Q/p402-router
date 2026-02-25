-- Migration: v2_009_trust_packaging
-- Description: Creates the erc8004_agents table to map on-chain DIDs to local bazaar resources,
-- and adds indices to safety_incidents for the Enterprise Incident Queue.

BEGIN;

-- 1. Map On-Chain DIDs to Bazaar Listings
CREATE TABLE IF NOT EXISTS erc8004_agents (
    agent_did VARCHAR(128) PRIMARY KEY,
    resource_id TEXT NOT NULL REFERENCES bazaar_resources(resource_id) ON DELETE CASCADE,
    reputation_score NUMERIC(10, 4) DEFAULT 100,
    is_verified BOOLEAN DEFAULT FALSE,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_erc8004_agents_resource 
ON erc8004_agents(resource_id);

CREATE INDEX IF NOT EXISTS idx_erc8004_agents_reputation 
ON erc8004_agents(reputation_score DESC);

-- 2. Performance Indices for the Enterprise Trust Dashboard
CREATE INDEX IF NOT EXISTS idx_safety_incidents_severity 
ON safety_incidents(severity);

CREATE INDEX IF NOT EXISTS idx_safety_incidents_tenant_status 
ON safety_incidents(tenant_id, status);

COMMIT;
