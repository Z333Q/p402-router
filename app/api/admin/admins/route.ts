/**
 * GET  /api/admin/admins   — list admin users (super_admin only)
 * POST /api/admin/admins   — create/invite admin
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess, AdminAuthError } from '@/lib/admin/auth';
import { writeAuditLog, extractIP } from '@/lib/admin/audit';
import { hashPassword } from '@/lib/admin/crypto';
import { ADMIN_ROLES, hasPermission, type AdminRole } from '@/lib/admin/permissions';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

    const rows = await db.query(
        `SELECT id, email, name, role, is_active, totp_enabled, last_login_at, created_at,
                cb.email AS created_by_email
         FROM admin_users u
         LEFT JOIN admin_users cb ON cb.id = u.created_by
         ORDER BY created_at DESC`
    );

    return NextResponse.json({ admins: rows.rows });
}

export async function POST(req: NextRequest) {
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

    const body = await req.json().catch(() => null);
    const { email, name, role, password } = body ?? {};

    if (!email || !role) return NextResponse.json({ error: 'email and role required' }, { status: 400 });
    if (!(ADMIN_ROLES as readonly string[]).includes(role)) {
        return NextResponse.json({ error: `Invalid role. Must be one of: ${ADMIN_ROLES.join(', ')}` }, { status: 400 });
    }

    const passwordHash = password ? await hashPassword(password) : null;

    const result = await db.query(
        `INSERT INTO admin_users (email, name, role, password_hash, is_active, created_by)
         VALUES ($1, $2, $3, $4, TRUE, $5)
         ON CONFLICT (email) DO NOTHING
         RETURNING id, email, name, role`,
        [email.toLowerCase().trim(), name ?? null, role as AdminRole, passwordHash, ctx.admin.id]
    );

    if (!result.rows[0]) {
        return NextResponse.json({ error: 'An admin with that email already exists' }, { status: 409 });
    }

    await writeAuditLog({
        adminUserId:  ctx.admin.id,
        adminEmail:   ctx.admin.email,
        action:       'admin.create',
        resourceType: 'admin_user',
        resourceId:   result.rows[0].id,
        afterState:   { email, role },
        ipAddress:    extractIP(req),
        userAgent:    req.headers.get('user-agent'),
    });

    return NextResponse.json({ admin: result.rows[0] }, { status: 201 });
}
