import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess, AdminAuthError } from '@/lib/admin/auth';
import { writeAuditLog, extractIP } from '@/lib/admin/audit';
import db from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    let ctx;
    try {
        ctx = await requireAdminAccess('users.unban');
    } catch (e) {
        if (e instanceof AdminAuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        throw e;
    }

    const { id } = await params;

    const before = await db.query(
        `SELECT is_banned, banned_reason FROM tenant_reputation WHERE tenant_id = $1`, [id]
    );

    await db.query(
        `UPDATE tenant_reputation SET is_banned = FALSE, banned_reason = NULL, updated_at = NOW()
         WHERE tenant_id = $1`,
        [id]
    );

    await writeAuditLog({
        adminUserId:  ctx.admin.id,
        adminEmail:   ctx.admin.email,
        action:       'tenant.unban',
        resourceType: 'tenant',
        resourceId:   id,
        beforeState:  before.rows[0] ?? null,
        afterState:   { is_banned: false },
        ipAddress:    extractIP(req),
        userAgent:    req.headers.get('user-agent'),
    });

    return NextResponse.json({ ok: true });
}
