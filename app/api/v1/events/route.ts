import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import pool from '@/lib/db'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const tenantId = (session?.user as any)?.tenantId

    if (!tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
        const offset = parseInt(searchParams.get('offset') || '0')
        const routeId = searchParams.get('routeId')

        // Enhanced query to include model usage and settlement data
        let query = `
            SELECT
                e.*,
                mu.model,
                mu.provider,
                mu.input_tokens,
                mu.output_tokens,
                mu.cost_usd as usage_cost,
                mu.latency_ms,
                s.session_id,
                pth.tx_hash,
                pth.settlement_type
            FROM events e
            LEFT JOIN sessions s ON e.trace_id = s.id
            LEFT JOIN model_usage mu ON s.id = mu.session_id
            LEFT JOIN processed_tx_hashes pth ON e.trace_id = pth.request_id
            WHERE e.tenant_id = $1
        `
        const values: any[] = [tenantId]

        if (routeId) {
            query += ` AND e.route_id = $${values.length + 1}`
            values.push(routeId)
        }

        query += ` ORDER BY e.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`
        values.push(limit, offset)

        const result = await pool.query(query, values)

        const events = result.rows.map(row => ({
            eventId: row.event_id,
            at: row.created_at,
            routeId: row.route_id,
            outcome: row.outcome,
            network: row.network,
            scheme: row.scheme,
            amount: row.amount,
            headers: (row.headers_meta || {}), // expose header presence for inspector
            denyCode: (row.raw_payload || {}).denyCode || (row.steps || []).find((s: any) => s.meta?.denyCode)?.meta?.denyCode,
            // Enhanced data for traffic dashboard
            model: row.model,
            provider: row.provider,
            input_tokens: row.input_tokens,
            output_tokens: row.output_tokens,
            cost_usd: row.usage_cost,
            latency_ms: row.latency_ms,
            session_id: row.session_id,
            tx_hash: row.tx_hash,
            settlement_type: row.settlement_type,
            // Return full DecisionTrace for inspector UI
            steps: row.steps || [],
            raw: row.raw_payload // Return raw for admin inspector view
        }))

        return NextResponse.json({ events })
    } catch (error: any) {
        console.error('Events API Error', error)
        return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
    }
}
