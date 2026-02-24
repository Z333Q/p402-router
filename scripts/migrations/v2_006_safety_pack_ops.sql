-- Migration: v2_006_safety_pack_ops
-- Description: Creates the incident and tenant_reputation tables for Sprint 4.

BEGIN;

-- 1. Reputation Rollup
CREATE TABLE IF NOT EXISTS tenant_reputation (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    trust_score INT DEFAULT 100 CHECK (trust_score BETWEEN 0 AND 100),
    is_banned BOOLEAN DEFAULT false,
    banned_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Note: In a real system you'd want a trigger to inject every active tenant here,
-- or handle dynamic creation on 'requireTenantAccess' when it's null. We'll handle
-- it gracefully in code (null = score 100).

-- 2. Incident Ledger
CREATE TABLE IF NOT EXISTS safety_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    category VARCHAR(50) NOT NULL, -- e.g., 'malicious_payload', 'tos_violation', 'abuse'
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(100), -- admin tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for admin queue queries
CREATE INDEX IF NOT EXISTS idx_safety_incidents_tenant ON safety_incidents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_status ON safety_incidents(status);

-- 3. Auto-ban Trigger on Critical Incidents
-- Strictly enforces that any insert of a 'critical' incident locks the tenant route-wide.
CREATE OR REPLACE FUNCTION sp_auto_ban_on_critical()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.severity = 'critical' THEN
        INSERT INTO tenant_reputation (tenant_id, trust_score, is_banned, banned_reason)
        VALUES (NEW.tenant_id, 0, true, 'Auto-banned via incident: ' || NEW.id)
        ON CONFLICT (tenant_id) 
        DO UPDATE SET 
            trust_score = 0, 
            is_banned = true, 
            banned_reason = 'Auto-banned via incident: ' || NEW.id,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_ban_on_critical_incident ON safety_incidents;

CREATE TRIGGER trg_auto_ban_on_critical_incident
AFTER INSERT ON safety_incidents
FOR EACH ROW
EXECUTE FUNCTION sp_auto_ban_on_critical();

COMMIT;
