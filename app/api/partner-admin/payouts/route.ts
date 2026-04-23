import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePartnerAdminAccess, isAuthError } from '@/lib/partner/auth'

export const dynamic = 'force-dynamic'

// GET /api/partner-admin/payouts — list payout batches
export async function GET(req: NextRequest) {
    const auth = await requirePartnerAdminAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const res = await db.query(
        `SELECT pb.id, pb.status, pb.total_amount, pb.currency, pb.notes,
                pb.created_at, pb.updated_at,
                t_created.email AS created_by_email,
                t_approved.email AS approved_by_email,
                COUNT(pe.id) AS entry_count
         FROM partner_payout_batches pb
         LEFT JOIN tenants t_created ON t_created.id = pb.created_by
         LEFT JOIN tenants t_approved ON t_approved.id = pb.approved_by
         LEFT JOIN partner_payout_entries pe ON pe.batch_id = pb.id
         GROUP BY pb.id, t_created.email, t_approved.email
         ORDER BY pb.created_at DESC
         LIMIT 100`,
        []
    )

    return NextResponse.json({ batches: res.rows })
}

// POST /api/partner-admin/payouts — assemble a new payout batch from approved commissions
export async function POST(req: NextRequest) {
    const auth = await requirePartnerAdminAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    let body: { notes?: string } = {}
    try {
        body = await req.json()
    } catch {
        // notes optional
    }

    // Find all approved commissions not yet in a batch
    const approvedRes = await db.query(
        `SELECT ce.id, ce.partner_id, ce.commission_amount, ce.currency
         FROM partner_commission_entries ce
         WHERE ce.status = 'approved'
           AND ce.payout_batch_id IS NULL`,
        []
    )
    const approved = approvedRes.rows as {
        id: string; partner_id: string; commission_amount: string; currency: string
    }[]

    if (approved.length === 0) {
        return NextResponse.json({ error: 'No approved commissions to batch' }, { status: 422 })
    }

    // Aggregate by partner
    const partnerTotals = new Map<string, number>()
    for (const row of approved) {
        const current = partnerTotals.get(row.partner_id) ?? 0
        partnerTotals.set(row.partner_id, current + parseFloat(row.commission_amount))
    }

    const batchTotal = Array.from(partnerTotals.values()).reduce((a, b) => a + b, 0)

    // Create batch
    const batchRes = await db.query(
        `INSERT INTO partner_payout_batches (program_id, status, total_amount, currency, created_by, notes)
         VALUES ('00000000-0000-0000-0000-000000000001', 'assembling', $1, 'USD', $2, $3)
         RETURNING id`,
        [batchTotal.toFixed(2), auth.tenantId, body.notes ?? null]
    )
    const batchId = (batchRes.rows[0] as { id: string } | undefined)?.id
    if (!batchId) {
        return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 })
    }

    // Link entries to batch
    const entryIds = approved.map(r => r.id)
    await db.query(
        `UPDATE partner_commission_entries
         SET payout_batch_id = $1, status = 'in_payout', updated_at = NOW()
         WHERE id = ANY($2::uuid[])`,
        [batchId, entryIds]
    )

    // Create payout entries (one per partner)
    for (const [partnerId, amount] of partnerTotals) {
        // Find default payout method
        const methodRes = await db.query(
            `SELECT id FROM partner_payout_methods WHERE partner_id = $1 AND is_default = true LIMIT 1`,
            [partnerId]
        )
        const methodId = (methodRes.rows[0] as { id: string } | undefined)?.id ?? null

        await db.query(
            `INSERT INTO partner_payout_entries (batch_id, partner_id, payout_method_id, amount, currency, status)
             VALUES ($1, $2, $3, $4, 'USD', 'pending')
             ON CONFLICT (batch_id, partner_id) DO NOTHING`,
            [batchId, partnerId, methodId, amount.toFixed(2)]
        )
    }

    // Advance batch to 'pending' (ready for finance review)
    await db.query(
        `UPDATE partner_payout_batches SET status = 'pending', updated_at = NOW() WHERE id = $1`,
        [batchId]
    )

    return NextResponse.json({
        success: true,
        batchId,
        entryCount: entryIds.length,
        partnerCount: partnerTotals.size,
        totalAmount: batchTotal.toFixed(2),
    })
}
