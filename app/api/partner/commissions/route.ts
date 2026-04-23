import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePartnerAccess, isAuthError } from '@/lib/partner/auth'
import { getPartnerCommissionSummary } from '@/lib/partner/commissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const auth = await requirePartnerAccess(req)
    if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? 'all'
    const format = searchParams.get('format') ?? 'json'
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '500', 10), 1000)

    const [summaryResult, entriesResult] = await Promise.all([
        getPartnerCommissionSummary(auth.partnerId),
        db.query(
            `SELECT
                 ce.id, ce.source_event_type, ce.source_event_id,
                 ce.invoice_amount_usd, ce.commission_amount, ce.currency,
                 ce.status, ce.hold_until, ce.month_number, ce.created_at,
                 po.name AS offer_name
             FROM partner_commission_entries ce
             JOIN partner_offers po ON po.id = ce.offer_id
             WHERE ce.partner_id = $1
               AND ($2 = 'all' OR ce.status = $2)
             ORDER BY ce.created_at DESC
             LIMIT $3`,
            [auth.partnerId, status, limit]
        ),
    ])

    if (format === 'csv') {
        const rows = entriesResult.rows as Record<string, unknown>[]
        const headers = [
            'Date', 'Offer', 'Event Type', 'Event ID',
            'Invoice Amount USD', 'Commission Amount', 'Currency',
            'Status', 'Month', 'Hold Until',
        ]
        const csvRows = rows.map(r => [
            new Date(r.created_at as string).toISOString().slice(0, 10),
            `"${String(r.offer_name ?? '').replace(/"/g, '""')}"`,
            r.source_event_type,
            r.source_event_id,
            r.invoice_amount_usd,
            r.commission_amount,
            r.currency,
            r.status,
            r.month_number,
            new Date(r.hold_until as string).toISOString().slice(0, 10),
        ].join(','))

        const csv = [headers.join(','), ...csvRows].join('\n')
        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="commissions-${new Date().toISOString().slice(0,10)}.csv"`,
            },
        })
    }

    return NextResponse.json({
        summary: summaryResult,
        entries: entriesResult.rows,
    })
}
