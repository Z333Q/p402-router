/**
 * GET /api/admin/users?page=1&search=&banned=
 * Paginated tenant list with activity + reputation data.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess, AdminAuthError } from '@/lib/admin/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        await requireAdminAccess('users.read');
    } catch (e) {
        if (e instanceof AdminAuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        throw e;
    }

    const { searchParams } = req.nextUrl;
    const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize = 50;
    const offset   = (page - 1) * pageSize;
    const search   = searchParams.get('search') ?? '';
    const bannedFilter = searchParams.get('banned'); // 'true' | 'false' | null

    const params: unknown[] = [pageSize, offset];
    const conditions: string[] = [];

    if (search) {
        params.push(`%${search}%`);
        conditions.push(`(t.owner_email ILIKE $${params.length} OR t.name ILIKE $${params.length})`);
    }
    if (bannedFilter === 'true') {
        conditions.push(`tr.is_banned = TRUE`);
    } else if (bannedFilter === 'false') {
        conditions.push(`(tr.is_banned IS NULL OR tr.is_banned = FALSE)`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows, countRes] = await Promise.all([
        db.query(`
            SELECT
                t.id, t.name, t.owner_email, t.status, t.created_at,
                tr.trust_score, tr.is_banned, tr.banned_reason,
                COALESCE(ev.request_count, 0) AS request_count_30d,
                ev.last_active_at
            FROM tenants t
            LEFT JOIN tenant_reputation tr ON tr.tenant_id = t.id
            LEFT JOIN (
                SELECT tenant_id,
                    COUNT(*) AS request_count,
                    MAX(created_at) AS last_active_at
                FROM traffic_events
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY tenant_id
            ) ev ON ev.tenant_id = t.id
            ${where}
            ORDER BY t.created_at DESC
            LIMIT $1 OFFSET $2
        `, params),

        db.query(`
            SELECT COUNT(*) AS total
            FROM tenants t
            LEFT JOIN tenant_reputation tr ON tr.tenant_id = t.id
            ${where}
        `, params.slice(2)), // skip LIMIT and OFFSET for count
    ]);

    return NextResponse.json({
        users: rows.rows,
        total: parseInt(countRes.rows[0]?.total ?? '0'),
        page,
        pageSize,
    });
}
