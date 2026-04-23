import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePartnerAdminAccess, isAuthError } from '@/lib/partner/auth'

export const dynamic = 'force-dynamic'

interface RouteParams { params: Promise<{ id: string }> }

// PATCH /api/partner-admin/partners/[id] — update partner status
export async function PATCH(req: NextRequest, { params }: RouteParams) {
    const auth = await requirePartnerAdminAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await params

    let body: { status: string; notes_internal?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validStatuses = ['applied', 'pending_review', 'approved', 'suspended', 'terminated', 'rejected']
    if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const res = await db.query(
        `UPDATE partners
         SET status = $2,
             notes_internal = COALESCE($3, notes_internal),
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, status`,
        [id, body.status, body.notes_internal ?? null]
    )

    if (!res.rows[0]) {
        return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, partner: res.rows[0] })
}
