import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePartnerAdminAccess, isAuthError } from '@/lib/partner/auth'
import { notifyPartnerApproved, notifyAdminNewApplication } from '@/lib/partner/notifications'

export const dynamic = 'force-dynamic'

interface RouteParams { params: Promise<{ id: string }> }

// POST /api/partner-admin/applications/[id]
// Body: { action: 'approve' | 'reject', review_notes?: string, partner_type?: string, group_slug?: string }
export async function POST(req: NextRequest, { params }: RouteParams) {
    const auth = await requirePartnerAdminAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await params

    let body: { action: string; review_notes?: string; partner_type?: string; group_slug?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { action, review_notes, partner_type, group_slug } = body

    if (!['approve', 'reject'].includes(action)) {
        return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
    }

    // Fetch application
    const appRes = await db.query(
        `SELECT * FROM partner_applications WHERE id = $1`,
        [id]
    )
    const application = appRes.rows[0] as {
        id: string; email: string; name: string; website_url: string | null;
        partner_type_interest: string; status: string; partner_id: string | null;
    } | undefined

    if (!application) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }
    if (application.status !== 'pending' && application.status !== 'reviewing') {
        return NextResponse.json({ error: `Application is already ${application.status}` }, { status: 409 })
    }

    if (action === 'reject') {
        await db.query(
            `UPDATE partner_applications
             SET status = 'rejected', review_notes = $2, reviewed_by_tenant_id = $3, updated_at = NOW()
             WHERE id = $1`,
            [id, review_notes ?? null, auth.tenantId]
        )
        return NextResponse.json({ success: true, status: 'rejected' })
    }

    // --- APPROVE ---
    const partnerType = partner_type ?? application.partner_type_interest
    if (!['affiliate', 'agency', 'enterprise_referrer'].includes(partnerType)) {
        return NextResponse.json({ error: 'Invalid partner_type' }, { status: 400 })
    }

    // Determine group
    const targetGroupSlug = group_slug ?? (
        partnerType === 'affiliate' ? 'developer-affiliates'
        : partnerType === 'agency' ? 'integration-partners'
        : 'enterprise-referrers'
    )
    const groupRes = await db.query(
        `SELECT id FROM partner_groups WHERE slug = $1`,
        [targetGroupSlug]
    )
    const groupId = (groupRes.rows[0] as { id: string } | undefined)?.id
    if (!groupId) {
        return NextResponse.json({ error: `Group ${targetGroupSlug} not found` }, { status: 500 })
    }

    // Find or create tenant for this email
    const tenantRes = await db.query(
        `SELECT id FROM tenants WHERE email = $1 LIMIT 1`,
        [application.email]
    )
    const tenantId = (tenantRes.rows[0] as { id: string } | undefined)?.id
    if (!tenantId) {
        return NextResponse.json(
            { error: 'No tenant found for this email. User must sign up first.' },
            { status: 422 }
        )
    }

    // Check if tenant already has a partner record
    const existingPartnerRes = await db.query(
        `SELECT id FROM partners WHERE primary_tenant_id = $1`,
        [tenantId]
    )
    if ((existingPartnerRes.rows[0] as { id: string } | undefined)?.id) {
        return NextResponse.json(
            { error: 'This user already has a partner account.' },
            { status: 409 }
        )
    }

    // Generate referral code from display name
    const baseCode = application.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 10) || 'partner'
    const suffix = Math.random().toString(36).slice(2, 6)
    const referralCode = `${baseCode}-${suffix}`

    // Create partner record
    const partnerInsertRes = await db.query(
        `INSERT INTO partners (program_id, primary_tenant_id, type, status, display_name, website_url, referral_code)
         VALUES ('00000000-0000-0000-0000-000000000001', $1, $2, 'approved', $3, $4, $5)
         RETURNING id`,
        [tenantId, partnerType, application.name, application.website_url ?? null, referralCode]
    )
    const partnerId = (partnerInsertRes.rows[0] as { id: string } | undefined)?.id
    if (!partnerId) {
        return NextResponse.json({ error: 'Failed to create partner record' }, { status: 500 })
    }

    // Determine membership role
    const membershipRole =
        partnerType === 'affiliate' ? 'partner_affiliate'
        : partnerType === 'agency' ? 'partner_agency'
        : 'partner_enterprise_referrer'

    // Create partner membership
    await db.query(
        `INSERT INTO partner_memberships (partner_id, tenant_id, role, status)
         VALUES ($1, $2, $3, 'active')
         ON CONFLICT (partner_id, tenant_id) DO NOTHING`,
        [partnerId, tenantId, membershipRole]
    )

    // Assign to group
    await db.query(
        `INSERT INTO partner_group_assignments (partner_id, partner_group_id, assigned_by_tenant_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (partner_id, partner_group_id) DO NOTHING`,
        [partnerId, groupId, auth.tenantId]
    )

    // Create default referral link (code = referral_code)
    await db.query(
        `INSERT INTO partner_links (partner_id, code, destination_path, label, status)
         VALUES ($1, $2, '/', 'Default Link', 'active')
         ON CONFLICT (code) DO NOTHING`,
        [partnerId, referralCode]
    )

    // Update application status
    await db.query(
        `UPDATE partner_applications
         SET status = 'approved', partner_id = $2, reviewed_by_tenant_id = $3,
             review_notes = $4, updated_at = NOW()
         WHERE id = $1`,
        [id, partnerId, auth.tenantId, review_notes ?? null]
    )

    // Notify partner (non-blocking)
    notifyPartnerApproved({
        partnerEmail: application.email,
        partnerName: application.name,
        partnerType,
        referralCode,
    }).catch(() => {})

    return NextResponse.json({ success: true, partnerId, referralCode })
}
