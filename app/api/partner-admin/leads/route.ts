import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePartnerAdminAccess, isAuthError } from '@/lib/partner/auth'
import { notifyLeadStageUpdate } from '@/lib/partner/notifications'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const auth = await requirePartnerAdminAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { searchParams } = new URL(req.url)
    const stage = searchParams.get('stage') ?? 'all'
    const search = searchParams.get('q') ?? ''

    const res = await db.query(
        `SELECT pl.id, pl.company_name, pl.contact_name, pl.contact_email,
                pl.estimated_seats, pl.notes, pl.stage, pl.rejection_reason,
                pl.expires_at, pl.created_at,
                p.display_name AS partner_name, p.referral_code,
                t.email AS partner_email
         FROM partner_leads pl
         JOIN partners p ON p.id = pl.partner_id
         JOIN tenants t ON t.id = p.primary_tenant_id
         WHERE ($1 = 'all' OR pl.stage = $1)
           AND ($2 = '' OR pl.company_name ILIKE '%' || $2 || '%'
                        OR pl.contact_email ILIKE '%' || $2 || '%')
         ORDER BY pl.created_at DESC
         LIMIT 200`,
        [stage, search]
    )

    return NextResponse.json({ leads: res.rows })
}

export async function PATCH(req: NextRequest) {
    const auth = await requirePartnerAdminAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    let body: { id: string; stage: string; review_notes?: string; rejection_reason?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validStages = ['submitted', 'accepted', 'in_progress', 'converted', 'rejected']
    if (!validStages.includes(body.stage)) {
        return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    const res = await db.query(
        `UPDATE partner_leads
         SET stage = $2,
             review_notes = COALESCE($3, review_notes),
             rejection_reason = COALESCE($4, rejection_reason),
             reviewed_by = $5,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, stage, company_name, contact_email, partner_id`,
        [body.id, body.stage, body.review_notes ?? null, body.rejection_reason ?? null, auth.tenantId]
    )

    const lead = res.rows[0] as {
        id: string; stage: string; company_name: string; contact_email: string; partner_id: string
    } | undefined

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    // Notify partner (non-blocking)
    if (body.stage === 'accepted' || body.stage === 'rejected') {
        db.query(
            `SELECT t.email FROM partners p JOIN tenants t ON t.id = p.primary_tenant_id WHERE p.id = $1`,
            [lead.partner_id]
        ).then(r => {
            const row = r.rows[0] as { email: string } | undefined
            if (!row) return
            notifyLeadStageUpdate({
                partnerEmail: row.email,
                companyName: lead.company_name,
                stage: body.stage,
                notes: body.review_notes,
            }).catch(() => {})
        }).catch(() => {})
    }

    return NextResponse.json({ success: true, lead })
}
