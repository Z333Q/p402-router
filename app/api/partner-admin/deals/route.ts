import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePartnerAdminAccess, isAuthError } from '@/lib/partner/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const auth = await requirePartnerAdminAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { searchParams } = new URL(req.url)
    const stage = searchParams.get('stage') ?? 'all'
    const search = searchParams.get('q') ?? ''

    const res = await db.query(
        `SELECT pd.id, pd.company_name, pd.contact_name, pd.contact_email,
                pd.estimated_arr_usd, pd.expected_close_date, pd.description,
                pd.stage, pd.actual_arr_usd, pd.contract_signed_at,
                pd.rejection_reason, pd.expires_at, pd.created_at,
                p.display_name AS partner_name, p.referral_code,
                t.email AS partner_email
         FROM partner_deals pd
         JOIN partners p ON p.id = pd.partner_id
         JOIN tenants t ON t.id = p.primary_tenant_id
         WHERE ($1 = 'all' OR pd.stage = $1)
           AND ($2 = '' OR pd.company_name ILIKE '%' || $2 || '%'
                        OR pd.contact_email ILIKE '%' || $2 || '%')
         ORDER BY pd.created_at DESC
         LIMIT 200`,
        [stage, search]
    )

    return NextResponse.json({ deals: res.rows })
}

export async function PATCH(req: NextRequest) {
    const auth = await requirePartnerAdminAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    let body: {
        id: string
        stage: string
        review_notes?: string
        rejection_reason?: string
        actual_arr_usd?: number
    }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validStages = ['registered', 'accepted', 'negotiating', 'closed_won', 'closed_lost']
    if (!validStages.includes(body.stage)) {
        return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    const res = await db.query(
        `UPDATE partner_deals
         SET stage = $2,
             review_notes = COALESCE($3, review_notes),
             rejection_reason = COALESCE($4, rejection_reason),
             actual_arr_usd = COALESCE($5, actual_arr_usd),
             contract_signed_at = CASE WHEN $2 = 'closed_won' AND contract_signed_at IS NULL THEN NOW() ELSE contract_signed_at END,
             reviewed_by = $6,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, stage, company_name, contact_email, actual_arr_usd`,
        [
            body.id,
            body.stage,
            body.review_notes ?? null,
            body.rejection_reason ?? null,
            body.actual_arr_usd ?? null,
            auth.tenantId,
        ]
    )

    const deal = res.rows[0] as {
        id: string; stage: string; company_name: string; contact_email: string; actual_arr_usd: string | null
    } | undefined

    if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

    return NextResponse.json({ success: true, deal })
}
