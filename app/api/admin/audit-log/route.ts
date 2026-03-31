/**
 * GET /api/admin/audit-log?page=1&action=&resourceType=&adminEmail=
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess, AdminAuthError } from '@/lib/admin/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        await requireAdminAccess('audit.read');
    } catch (e) {
        if (e instanceof AdminAuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        throw e;
    }

    const { searchParams } = req.nextUrl;
    const page         = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize     = 50;
    const offset       = (page - 1) * pageSize;
    const action       = searchParams.get('action') ?? '';
    const resourceType = searchParams.get('resourceType') ?? '';
    const adminEmail   = searchParams.get('adminEmail') ?? '';

    const conditions: string[] = [];
    const params: unknown[]    = [pageSize, offset];

    if (action) { params.push(`%${action}%`); conditions.push(`action ILIKE $${params.length}`); }
    if (resourceType) { params.push(resourceType); conditions.push(`resource_type = $${params.length}`); }
    if (adminEmail) { params.push(`%${adminEmail}%`); conditions.push(`admin_email ILIKE $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows, countRes] = await Promise.all([
        db.query(
            `SELECT id, admin_user_id, admin_email, action, resource_type, resource_id,
                    before_state, after_state, ip_address, user_agent, created_at
             FROM admin_audit_log
             ${where}
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            params
        ),
        db.query(
            `SELECT COUNT(*) AS total FROM admin_audit_log ${where}`,
            params.slice(2)
        ),
    ]);

    return NextResponse.json({
        entries: rows.rows,
        total:   parseInt(countRes.rows[0]?.total ?? '0'),
        page,
        pageSize,
    });
}
