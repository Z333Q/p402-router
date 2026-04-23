import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePartnerAdminAccess, isAuthError } from '@/lib/partner/auth'

export const dynamic = 'force-dynamic'

// GET /api/partner-admin/applications — list all applications with optional status filter
export async function GET(req: NextRequest) {
    const auth = await requirePartnerAdminAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? 'pending'
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)

    const res = await db.query(
        `SELECT id, email, name, website_url, channel_type, audience_size,
                audience_description, partner_type_interest, why_p402, promotion_plan,
                status, review_notes, partner_id, created_at, updated_at
         FROM partner_applications
         WHERE ($1 = 'all' OR status = $1)
         ORDER BY created_at DESC
         LIMIT $2`,
        [status, limit]
    )

    return NextResponse.json({ applications: res.rows })
}
