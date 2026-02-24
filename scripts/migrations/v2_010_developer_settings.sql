BEGIN;

-- 1. API Keys (Hashed for security)
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL, -- e.g., 'p402_live_1234'
    key_hash TEXT UNIQUE NOT NULL, -- SHA-256 hash of the raw key
    status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id, status);

-- 2. Webhooks & Provider Fallbacks
CREATE TABLE IF NOT EXISTS tenant_settings (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    webhook_url TEXT,
    webhook_secret TEXT, -- Symmetric key used to sign outbound events
    provider_keys_encrypted JSONB DEFAULT '{}'::jsonb, -- AES encrypted AI provider keys
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
