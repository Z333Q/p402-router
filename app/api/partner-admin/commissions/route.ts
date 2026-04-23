import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePartnerAdminAccess, isAuthError } from '@/lib/partner/auth'

export const dynamic = 'force-dynamic'

// GET /api/partner-admin/commissions — list entries ready for review
export async function GET(req: NextRequest) {
    const auth = await requirePartnerAdminAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? 'pending'
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500)

    const res = await db.query(
        `SELECT
             ce.id, ce.partner_id, ce.source_event_type, ce.source_event_id,
             ce.invoice_amount_usd, ce.commission_amount, ce.currency,
             ce.status, ce.hold_until, ce.month_number, ce.review_notes, ce.created_at,
             p.display_name AS partner_name, p.referral_code,
             po.name AS offer_name,
             t.email AS attributed_tenant_email
         FROM partner_commission_entries ce
         JOIN partners p ON p.id = ce.partner_id
         JOIN partner_offers po ON po.id = ce.offer_id
         JOIN tenants t ON t.id = ce.attributed_tenant_id
         WHERE ($1 = 'all' OR ce.status = $1)
         ORDER BY
             -- pending past hold date first, then newest
             CASE WHEN ce.status = 'pending' AND ce.hold_until <= NOW() THEN 0 ELSE 1 END,
             ce.created_at DESC
         LIMIT $2`,
        [status, limit]
    )

    return NextResponse.json({ entries: res.rows })
}
