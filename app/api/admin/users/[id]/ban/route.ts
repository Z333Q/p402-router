import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess, AdminAuthError } from '@/lib/admin/auth';
import { writeAuditLog, extractIP } from '@/lib/admin/audit';
import db from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    let ctx;
    try {
        ctx = await requireAdminAccess('users.ban');
    } catch (e) {
        if (e instanceof AdminAuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        throw e;
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason: string = body.reason ?? 'Banned by admin';

    // Read current state for audit trail
    const before = await db.query(
        `SELECT t.id, t.owner_email, tr.is_banned, tr.trust_score
         FROM tenants t LEFT JOIN tenant_reputation tr ON tr.tenant_id = t.id
         WHERE t.id = $1`,
        [id]
    );
    if (!before.rows[0]) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    // Upsert tenant_reputation with ban
    await db.query(
        `INSERT INTO tenant_reputation (tenant_id, is_banned, banned_reason, updated_at)
         VALUES ($1, TRUE, $2, NOW())
         ON CONFLICT (tenant_id) DO UPDATE
         SET is_banned = TRUE, banned_reason = $2, updated_at = NOW()`,
        [id, reason]
    );

    await writeAuditLog({
        adminUserId:  ctx.admin.id,
        adminEmail:   ctx.admin.email,
        action:       'tenant.ban',
        resourceType: 'tenant',
        resourceId:   id,
        beforeState:  before.rows[0],
        afterState:   { is_banned: true, banned_reason: reason },
        ipAddress:    extractIP(req),
        userAgent:    req.headers.get('user-agent'),
    });

    return NextResponse.json({ ok: true });
}
