-- v2_035_admin_system.sql
-- Admin RBAC system: users, sessions, audit log
-- Run after v2_034. Apply with: psql $DATABASE_URL -f scripts/migrations/v2_035_admin_system.sql

BEGIN;

-- Admin users — separate from tenants, never auto-provisioned
CREATE TABLE IF NOT EXISTS admin_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255),
    role            VARCHAR(30) NOT NULL DEFAULT 'analytics'
                    CHECK (role IN ('super_admin', 'ops_admin', 'analytics', 'safety', 'finance')),
    -- password_hash uses scrypt; NULL = Google-only (super admins from ADMIN_EMAILS env)
    password_hash   TEXT,
    -- totp_secret is AES-256-GCM encrypted via ADMIN_ENCRYPTION_KEY env var
    totp_secret     TEXT,
    totp_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    -- who invited this admin (NULL = self-provisioned super admin)
    created_by      UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email  ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role   ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active) WHERE is_active = TRUE;

-- Short-lived admin sessions (2h default), separate from NextAuth JWT sessions
-- session_token stores the SHA-256 hash of the raw token (raw is returned once to client)
CREATE TABLE IF NOT EXISTS admin_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id   UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    session_token   TEXT UNIQUE NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '2 hours',
    revoked_at      TIMESTAMPTZ,
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token   ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user    ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at)
    WHERE revoked_at IS NULL;

-- Immutable audit trail — every admin action recorded with before/after state
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id   UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    -- denormalized for log durability (readable even if admin account deleted)
    admin_email     VARCHAR(255),
    action          VARCHAR(100) NOT NULL,   -- e.g. 'tenant.ban', 'admin.invite', 'session.login'
    resource_type   VARCHAR(50),             -- e.g. 'tenant', 'admin_user', 'facilitator'
    resource_id     TEXT,                    -- UUID or string ID of the affected resource
    before_state    JSONB,
    after_state     JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin    ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action   ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON admin_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created  ON admin_audit_log(created_at DESC);

-- Pending admin invites (stored in Redis with 48h TTL, but record in DB for audit)
CREATE TABLE IF NOT EXISTS admin_invites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL,
    role            VARCHAR(30) NOT NULL,
    invited_by      UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    token_hash      TEXT UNIQUE NOT NULL,    -- SHA-256 of invite token
    accepted_at     TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '48 hours',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_invites_token  ON admin_invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_invites_email  ON admin_invites(email);

COMMIT;
