import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePartnerAccess, isAuthError } from '@/lib/partner/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const auth = await requirePartnerAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const res = await db.query(
        `SELECT id, company_name, contact_name, contact_email, estimated_seats,
                notes, stage, rejection_reason, expires_at, created_at, updated_at
         FROM partner_leads
         WHERE partner_id = $1
         ORDER BY created_at DESC`,
        [auth.partnerId]
    )

    return NextResponse.json({ leads: res.rows })
}

export async function POST(req: NextRequest) {
    const auth = await requirePartnerAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    let body: {
        company_name: string
        contact_name: string
        contact_email: string
        estimated_seats?: number
        notes?: string
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
            `INSERT INTO partner_leads
                 (partner_id, company_name, contact_name, contact_email, estimated_seats, notes)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
                auth.partnerId,
                company_name.trim(),
                contact_name.trim(),
                contact_email.trim().toLowerCase(),
                body.estimated_seats ?? null,
                body.notes?.trim() ?? null,
            ]
        )
        const leadId = (res.rows[0] as { id: string } | undefined)?.id
        return NextResponse.json({ success: true, leadId }, { status: 201 })
    } catch (err: unknown) {
        // Unique index violation: duplicate email for this partner
        if (err instanceof Error && err.message.includes('uq_partner_leads_email_partner')) {
            return NextResponse.json(
                { error: 'A lead with this email is already registered.' },
                { status: 409 }
            )
        }
        console.error('[partner/leads] insert error:', err)
        return NextResponse.json({ error: 'Failed to register lead' }, { status: 500 })
    }
}
