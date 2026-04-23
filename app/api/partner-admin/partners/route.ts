import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePartnerAdminAccess, isAuthError } from '@/lib/partner/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const auth = await requirePartnerAdminAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? 'all'
    const search = searchParams.get('q') ?? ''
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500)

    const res = await db.query(
        `SELECT
             p.id, p.type, p.status, p.display_name, p.website_url,
             p.referral_code, p.created_at,
             t.email AS tenant_email,
             pg.name AS group_name,
             COALESCE(link_stats.total_clicks, 0) AS total_clicks,
             COALESCE(comm_stats.total_commissions, 0) AS total_commissions,
             COALESCE(comm_stats.total_earned, 0.00) AS total_earned
         FROM partners p
         JOIN tenants t ON t.id = p.primary_tenant_id
         LEFT JOIN partner_group_assignments pga ON pga.partner_id = p.id
         LEFT JOIN partner_groups pg ON pg.id = pga.partner_group_id
         LEFT JOIN (
             SELECT pl.partner_id, COUNT(plc.id) AS total_clicks
             FROM partner_links pl
             LEFT JOIN partner_link_clicks plc ON plc.partner_link_id = pl.id
             GROUP BY pl.partner_id
         ) link_stats ON link_stats.partner_id = p.id
         LEFT JOIN (
             SELECT partner_id,
                    COUNT(*) AS total_commissions,
                    COALESCE(SUM(commission_amount) FILTER (WHERE status NOT IN ('declined','reversed')), 0) AS total_earned
             FROM partner_commission_entries
             GROUP BY partner_id
         ) comm_stats ON comm_stats.partner_id = p.id
         WHERE ($1 = 'all' OR p.status = $1)
           AND ($2 = '' OR p.display_name ILIKE '%' || $2 || '%' OR t.email ILIKE '%' || $2 || '%')
         ORDER BY p.created_at DESC
         LIMIT $3`,
        [status, search, limit]
    )

    return NextResponse.json({ partners: res.rows })
}
