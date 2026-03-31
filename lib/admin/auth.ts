/**
 * Admin session management.
 * Completely separate from NextAuth / tenant sessions.
 *
 * Flow:
 *  1. POST /api/admin/auth/login  → verifyAdminCredentials() → createAdminSession() → httpOnly cookie
 *  2. Every admin route/layout    → requireAdminAccess()     → validates DB session
 *  3. POST /api/admin/auth/logout → revokeAdminSession()     → clears cookie
 *
 * Session token: raw 96-hex-char token returned once to client.
 * DB stores SHA-256 hash only — raw token is never persisted.
 */
import { cookies } from 'next/headers';
import db from '@/lib/db';
import { generateSessionToken, hashSessionToken, verifyPassword } from './crypto';
import { writeAuditLog } from './audit';
import type { AdminRole } from './permissions';

export const ADMIN_SESSION_COOKIE = 'p402-admin-session';
export const SESSION_DURATION_MS  = 2 * 60 * 60 * 1000; // 2 hours

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminUser {
    id: string;
    email: string;
    name: string | null;
    role: AdminRole;
    totp_enabled: boolean;
    last_login_at: string | null;
    created_at: string;
}

export interface AdminSession {
    id: string;
    admin_user_id: string;
    expires_at: string;
}

export interface AdminContext {
    admin: AdminUser;
    session: AdminSession;
}

// ---------------------------------------------------------------------------
// Session creation
// ---------------------------------------------------------------------------

export async function createAdminSession(
    adminUserId: string,
    ip: string | null,
    userAgent: string | null
): Promise<string> {
    const rawToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawToken);

    await db.query(
        `INSERT INTO admin_sessions (admin_user_id, session_token, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3::inet, $4, NOW() + INTERVAL '2 hours')`,
        [adminUserId, tokenHash, ip, userAgent]
    );

    await db.query(
        `UPDATE admin_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [adminUserId]
    );

    return rawToken;
}

// ---------------------------------------------------------------------------
// Session validation — called on every admin request
// ---------------------------------------------------------------------------

export async function validateAdminSession(rawToken: string): Promise<AdminContext | null> {
    if (!rawToken || rawToken.length < 64) return null;

    const tokenHash = hashSessionToken(rawToken);

    const result = await db.query(
        `SELECT
            u.id, u.email, u.name, u.role, u.totp_enabled, u.last_login_at, u.created_at,
            s.id as session_id, s.admin_user_id, s.expires_at
         FROM admin_sessions s
         JOIN admin_users u ON u.id = s.admin_user_id
         WHERE s.session_token = $1
           AND s.expires_at > NOW()
           AND s.revoked_at IS NULL
           AND u.is_active = TRUE`,
        [tokenHash]
    );

    const row = result.rows[0];
    if (!row) return null;

    // Bump last_active_at (non-blocking)
    db.query(
        `UPDATE admin_sessions SET last_active_at = NOW() WHERE id = $1`,
        [row.session_id]
    ).catch(() => {/* ignore */});

    return {
        admin: {
            id: row.id,
            email: row.email,
            name: row.name,
            role: row.role as AdminRole,
            totp_enabled: row.totp_enabled,
            last_login_at: row.last_login_at,
            created_at: row.created_at,
        },
        session: {
            id: row.session_id,
            admin_user_id: row.admin_user_id,
            expires_at: row.expires_at,
        },
    };
}

// ---------------------------------------------------------------------------
// Session revocation (logout)
// ---------------------------------------------------------------------------

export async function revokeAdminSession(rawToken: string): Promise<void> {
    const tokenHash = hashSessionToken(rawToken);
    await db.query(
        `UPDATE admin_sessions SET revoked_at = NOW() WHERE session_token = $1`,
        [tokenHash]
    );
}

// ---------------------------------------------------------------------------
// requireAdminAccess — call from Server Components and API route handlers
// Throws (redirects to /admin/login) on failure.
// ---------------------------------------------------------------------------

export async function requireAdminAccess(requiredPermission?: string): Promise<AdminContext> {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

    if (!rawToken) {
        throw new AdminAuthError('No admin session');
    }

    const ctx = await validateAdminSession(rawToken);
    if (!ctx) {
        throw new AdminAuthError('Invalid or expired admin session');
    }

    if (requiredPermission) {
        const { hasPermission } = await import('./permissions');
        if (!hasPermission(ctx.admin.role, requiredPermission)) {
            throw new AdminAuthError(`Insufficient permissions: ${requiredPermission} required`);
        }
    }

    return ctx;
}

// ---------------------------------------------------------------------------
// Credential verification (login flow)
// ---------------------------------------------------------------------------

export async function verifyAdminCredentials(
    email: string,
    password: string
): Promise<{ user: AdminUser; requiresTOTP: boolean } | null> {
    const result = await db.query(
        `SELECT id, email, name, role, totp_enabled, last_login_at, created_at, password_hash
         FROM admin_users
         WHERE email = $1 AND is_active = TRUE AND password_hash IS NOT NULL`,
        [email.toLowerCase().trim()]
    );

    const user = result.rows[0];
    if (!user || !user.password_hash) return null;

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return null;

    return {
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as AdminRole,
            totp_enabled: user.totp_enabled,
            last_login_at: user.last_login_at,
            created_at: user.created_at,
        },
        requiresTOTP: user.totp_enabled,
    };
}

// ---------------------------------------------------------------------------
// Super-admin bootstrap: upsert env-listed admins into admin_users as super_admin
// Called once on startup / first login. Idempotent.
// ---------------------------------------------------------------------------

export async function bootstrapSuperAdmins(): Promise<void> {
    const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);

    for (const email of adminEmails) {
        await db.query(
            `INSERT INTO admin_users (email, role, is_active)
             VALUES ($1, 'super_admin', TRUE)
             ON CONFLICT (email) DO UPDATE
             SET role = 'super_admin', is_active = TRUE, updated_at = NOW()
             WHERE admin_users.role != 'super_admin'`,
            [email]
        );
    }
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class AdminAuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AdminAuthError';
    }
}
