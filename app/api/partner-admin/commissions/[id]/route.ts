import { NextRequest, NextResponse } from 'next/server'
import { requirePartnerAdminAccess, isAuthError } from '@/lib/partner/auth'
import {
    approveCommission,
    declineCommission,
    reverseCommission,
} from '@/lib/partner/commissions'

export const dynamic = 'force-dynamic'

interface RouteParams { params: Promise<{ id: string }> }

// POST /api/partner-admin/commissions/[id]
// Body: { action: 'approve' | 'decline' | 'reverse', notes?: string, reason?: string }
export async function POST(req: NextRequest, { params }: RouteParams) {
    const auth = await requirePartnerAdminAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await params

    let body: { action: string; notes?: string; reason?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { action, notes, reason } = body

    if (action === 'approve') {
        await approveCommission(id, auth.tenantId, notes)
        return NextResponse.json({ success: true, status: 'approved' })
    }

    if (action === 'decline') {
        if (!notes) return NextResponse.json({ error: 'notes required for decline' }, { status: 400 })
        await declineCommission(id, auth.tenantId, notes)
        return NextResponse.json({ success: true, status: 'declined' })
    }

    if (action === 'reverse') {
        const validReasons = ['chargeback', 'refund', 'fraud', 'policy_violation', 'manual_override']
        if (!reason || !validReasons.includes(reason)) {
            return NextResponse.json({ error: `reason must be one of: ${validReasons.join(', ')}` }, { status: 400 })
        }
        await reverseCommission(
            id,
            auth.tenantId,
            reason as 'chargeback' | 'refund' | 'fraud' | 'policy_violation' | 'manual_override',
            notes
        )
        return NextResponse.json({ success: true, status: 'reversed' })
    }

    return NextResponse.json({ error: 'action must be approve, decline, or reverse' }, { status: 400 })
}
