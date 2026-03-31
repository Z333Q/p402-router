/**
 * DELETE /api/admin/admins/[id] — deactivate an admin (super_admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess, AdminAuthError } from '@/lib/admin/auth';
import { writeAuditLog, extractIP } from '@/lib/admin/audit';
import { hasPermission } from '@/lib/admin/permissions';
import db from '@/lib/db';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    let ctx;
    try {
        ctx = await requireAdminAccess('*');
    } catch (e) {
        if (e instanceof AdminAuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        throw e;
    }

    if (!hasPermission(ctx.admin.role, '*')) {
        return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
    }

    const { id } = await params;

    if (id === ctx.admin.id) {
        return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
    }

    const before = await db.query(
        `SELECT id, email, role FROM admin_users WHERE id = $1`, [id]
    );
    if (!before.rows[0]) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    if (before.rows[0].role === 'super_admin') {
        return NextResponse.json({ error: 'Cannot deactivate a super admin via UI' }, { status: 403 });
    }

    await db.query(
        `UPDATE admin_users SET is_active = FALSE, updated_at = NOW() WHERE id = $1`, [id]
    );

    // Revoke all active sessions
    await db.query(
        `UPDATE admin_sessions SET revoked_at = NOW()
         WHERE admin_user_id = $1 AND revoked_at IS NULL`, [id]
    );

    await writeAuditLog({
        adminUserId:  ctx.admin.id,
        adminEmail:   ctx.admin.email,
        action:       'admin.deactivate',
        resourceType: 'admin_user',
        resourceId:   id,
        beforeState:  before.rows[0],
        afterState:   { is_active: false },
        ipAddress:    extractIP(req),
        userAgent:    req.headers.get('user-agent'),
    });

    return NextResponse.json({ ok: true });
}
