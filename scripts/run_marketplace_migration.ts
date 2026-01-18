
import { query } from '../lib/db';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SQL = `
-- Phase 6: A2A Orchestration Marketplace (Bazaar)

-- 1. Bazaar Listings: Publicly discoverable agent/service profiles
CREATE TABLE IF NOT EXISTS a2a_bazaar_listings (
    id VARCHAR(50) PRIMARY KEY, -- lst_...
    type VARCHAR(20) NOT NULL, -- 'agent', 'service', 'skill', 'workflow'
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    short_description VARCHAR(255),
    
    -- Provider Identity (References tenants table)
    provider_id UUID REFERENCES tenants(id),
    provider_name VARCHAR(255),
    provider_verified BOOLEAN DEFAULT false,
    
    -- Agent Discovery
    agent_card_url VARCHAR(255),
    agent_card JSONB, -- Stored copy of the .well-known/agent.json
    
    -- Search & Discovery Meta
    capabilities TEXT[], -- ['ai-completion', 'image-gen']
    skills TEXT[],
    tags TEXT[],
    
    -- Pricing Structure
    pricing JSONB NOT NULL, -- { model: 'per_request', amount: 0.05, currency: 'USD' }
    
    -- Payment Support
    accepted_payments VARCHAR(50)[] DEFAULT '{x402}',
    wallet_address VARCHAR(255),
    
    -- Analytics & Reputation (Denormalized for performance)
    stats JSONB DEFAULT '{ "totalCalls": 0, "totalRevenue": 0, "rating": 0, "reviewCount": 0 }',
    
    -- Lifecycle
    status VARCHAR(20) DEFAULT 'pending', -- draft, pending, active, suspended, archived
    featured BOOLEAN DEFAULT false,
    
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for Marketplace Search
CREATE INDEX IF NOT EXISTS idx_bazaar_type_status ON a2a_bazaar_listings(type, status);
CREATE INDEX IF NOT EXISTS idx_bazaar_tags ON a2a_bazaar_listings USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_bazaar_capabilities ON a2a_bazaar_listings USING GIN (capabilities);
CREATE INDEX IF NOT EXISTS idx_bazaar_provider ON a2a_bazaar_listings(provider_id);
`;

async function main() {
    console.log('Running Marketplace Migration (direct string)...');
    try {
        await query(SQL);
        console.log('✅ Marketplace Migration applied successfully.');
    } catch (e) {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    }
    process.exit(0);
}

main();
