/**
 * Admin audit log writer.
 * Every destructive admin action must call writeAuditLog() inside a transaction.
 */
import db from '@/lib/db';

export interface AuditLogEntry {
    adminUserId?: string | null;
    adminEmail: string;
    action: string;          // e.g. 'tenant.ban', 'admin.invite', 'session.login'
    resourceType?: string;   // e.g. 'tenant', 'admin_user'
    resourceId?: string;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
        await db.query(
            `INSERT INTO admin_audit_log
                (admin_user_id, admin_email, action, resource_type, resource_id,
                 before_state, after_state, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8::inet, $9)`,
            [
                entry.adminUserId ?? null,
                entry.adminEmail,
                entry.action,
                entry.resourceType ?? null,
                entry.resourceId ?? null,
                entry.beforeState ? JSON.stringify(entry.beforeState) : null,
                entry.afterState  ? JSON.stringify(entry.afterState)  : null,
                entry.ipAddress ?? null,
                entry.userAgent ?? null,
            ]
        );
    } catch (err) {
        // Audit log writes must never crash the main request — log and continue
        console.error('[admin-audit] Failed to write audit log:', err, entry);
    }
}

// Convenience: extract IP from Next.js request headers
export function extractIP(req: { headers: { get: (k: string) => string | null } }): string | null {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? req.headers.get('x-real-ip')
        ?? null;
}
