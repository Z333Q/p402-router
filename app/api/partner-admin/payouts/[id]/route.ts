import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePartnerAdminAccess, isAuthError } from '@/lib/partner/auth'
import { executeUsdcPayouts } from '@/lib/partner/payout-executor'

export const dynamic = 'force-dynamic'

interface RouteParams { params: Promise<{ id: string }> }

/**
 * PATCH /api/partner-admin/payouts/[id]
 * Body: { action: 'approve' | 'execute_usdc' | 'mark_completed' | 'mark_failed' }
 *
 * approve        — finance sign-off: pending → approved
 * execute_usdc   — send USDC transfers for all entries in the batch (approved → processing/completed)
 * mark_completed — manually mark completed (for non-USDC providers)
 * mark_failed    — mark batch as failed with optional notes
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
    const auth = await requirePartnerAdminAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id: batchId } = await params

    let body: { action: string; notes?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Verify batch exists
    const batchRes = await db.query(
        `SELECT id, status FROM partner_payout_batches WHERE id = $1`,
        [batchId]
    )
    const batch = batchRes.rows[0] as { id: string; status: string } | undefined
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

    const { action, notes } = body

    if (action === 'approve') {
        if (batch.status !== 'pending') {
            return NextResponse.json({ error: `Batch is ${batch.status}, not pending` }, { status: 409 })
        }
        await db.query(
            `UPDATE partner_payout_batches
             SET status = 'approved', approved_by = $2, updated_at = NOW()
             WHERE id = $1`,
            [batchId, auth.tenantId]
        )
        return NextResponse.json({ success: true, status: 'approved' })
    }

    if (action === 'execute_usdc') {
        if (!['approved', 'processing'].includes(batch.status)) {
            return NextResponse.json(
                { error: `Batch must be in approved or processing state (currently: ${batch.status})` },
                { status: 409 }
            )
        }

        try {
            const result = await executeUsdcPayouts(batchId)
            return NextResponse.json({
                success: true,
                batchId,
                totalSent: result.totalSent,
                entryCount: result.results.length,
                failureCount: result.failureCount,
                results: result.results,
            })
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Payout execution failed'
            return NextResponse.json({ error: message }, { status: 500 })
        }
    }

    if (action === 'mark_completed') {
        await db.query(
            `UPDATE partner_payout_batches SET status = 'completed', updated_at = NOW() WHERE id = $1`,
            [batchId]
        )
        // Mark all in_payout commissions in this batch as paid
        await db.query(
            `UPDATE partner_commission_entries
             SET status = 'paid', updated_at = NOW()
             WHERE payout_batch_id = $1 AND status = 'in_payout'`,
            [batchId]
        )
        return NextResponse.json({ success: true, status: 'completed' })
    }

    if (action === 'mark_failed') {
        await db.query(
            `UPDATE partner_payout_batches
             SET status = 'failed', notes = COALESCE($2, notes), updated_at = NOW()
             WHERE id = $1`,
            [batchId, notes ?? null]
        )
        return NextResponse.json({ success: true, status: 'failed' })
    }

    return NextResponse.json(
        { error: 'action must be approve, execute_usdc, mark_completed, or mark_failed' },
        { status: 400 }
    )
}

// GET /api/partner-admin/payouts/[id] — batch detail with all entries
export async function GET(req: NextRequest, { params }: RouteParams) {
    const auth = await requirePartnerAdminAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id: batchId } = await params

    const [batchRes, entriesRes] = await Promise.all([
        db.query(
            `SELECT pb.*, t_c.email AS created_by_email, t_a.email AS approved_by_email
             FROM partner_payout_batches pb
             LEFT JOIN tenants t_c ON t_c.id = pb.created_by
             LEFT JOIN tenants t_a ON t_a.id = pb.approved_by
             WHERE pb.id = $1`,
            [batchId]
        ),
        db.query(
            `SELECT pe.*, p.display_name AS partner_name, p.referral_code,
                    t.email AS partner_email,
                    pm.provider AS payout_method_provider,
                    pm.destination_reference
             FROM partner_payout_entries pe
             JOIN partners p ON p.id = pe.partner_id
             JOIN tenants t ON t.id = p.primary_tenant_id
             LEFT JOIN partner_payout_methods pm ON pm.id = pe.payout_method_id
             WHERE pe.batch_id = $1
             ORDER BY pe.amount DESC`,
            [batchId]
        ),
    ])

    if (!batchRes.rows[0]) {
        return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    return NextResponse.json({ batch: batchRes.rows[0], entries: entriesRes.rows })
}
