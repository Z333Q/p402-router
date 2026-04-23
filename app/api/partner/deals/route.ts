import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePartnerAccess, isAuthError } from '@/lib/partner/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const auth = await requirePartnerAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const res = await db.query(
        `SELECT id, company_name, contact_name, contact_email, estimated_arr_usd,
                expected_close_date, description, stage, actual_arr_usd,
                contract_signed_at, rejection_reason, expires_at, created_at, updated_at
         FROM partner_deals
         WHERE partner_id = $1
         ORDER BY created_at DESC`,
        [auth.partnerId]
    )

    return NextResponse.json({ deals: res.rows })
}

export async function POST(req: NextRequest) {
    const auth = await requirePartnerAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    let body: {
        company_name: string
        contact_name: string
        contact_email: string
        estimated_arr_usd?: number
        expected_close_date?: string
        description?: string
    }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { company_name, contact_name, contact_email } = body
    if (!company_name?.trim() || !contact_name?.trim() || !contact_email?.trim()) {
        return NextResponse.json(
            { error: 'company_name, contact_name, and contact_email are required' },
            { status: 400 }
        )
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(contact_email.trim())) {
        return NextResponse.json({ error: 'Invalid contact_email' }, { status: 400 })
    }

    try {
        const res = await db.query(
            `INSERT INTO partner_deals
                 (partner_id, company_name, contact_name, contact_email,
                  estimated_arr_usd, expected_close_date, description)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [
                auth.partnerId,
                company_name.trim(),
                contact_name.trim(),
                contact_email.trim().toLowerCase(),
                body.estimated_arr_usd ?? null,
                body.expected_close_date ?? null,
                body.description?.trim() ?? null,
            ]
        )
        const dealId = (res.rows[0] as { id: string } | undefined)?.id
        return NextResponse.json({ success: true, dealId }, { status: 201 })
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('uq_partner_deals_email_global')) {
            return NextResponse.json(
                { error: 'A deal for this contact email is already registered by another partner.' },
                { status: 409 }
            )
        }
        console.error('[partner/deals] insert error:', err)
        return NextResponse.json({ error: 'Failed to register deal' }, { status: 500 })
    }
}
