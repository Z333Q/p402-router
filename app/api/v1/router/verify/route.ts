import { NextRequest, NextResponse } from 'next/server'
import { RoutingEngine } from '@/lib/router-engine'
import { PolicyEngine } from '@/lib/policy-engine'
import pool from '@/lib/db'
import { P402Analytics } from '@/lib/analytics'

export async function POST(req: NextRequest) {
    const start = Date.now()
    let body: any = {}
    try {
        body = await req.json()
    } catch (e) {
        return NextResponse.json({ code: 'INVALID_JSON', message: 'Invalid JSON body' }, { status: 400 })
    }

    const { tenantId, decisionId, paymentSignature, paymentRequired, amount, asset, scheme } = body
    const eventId = crypto.randomUUID()

    // 1. Re-validate Policy (optional, but good for enforcement)
    // For verify, we mostly check if the Payment Signature valid & Facilitator is healthy

    // 2. Route Selection (or retrieval of existing plan)
    const routeLogic = await RoutingEngine.plan(
        { routeId: body.route?.path || 'unknown', method: 'POST', path: body.route?.path || '/' },
        {
            network: 'eip155:8453',
            scheme: scheme || 'eip3009',
            amount: amount || '0',
            asset: asset || 'USDC'
        }
    )

    const facilitatorId = routeLogic.selectedId

    // 3. Call Facilitator (Mocking the call here)
    // In prod: await fetch(`${facilitatorUrl}/verify`, ...)
    const verificationResult = {
        status: 'valid',
        verificationId: crypto.randomUUID(),
        upstream: { name: 'Coinbase CDP', endpoint: 'https://api.cdp.coinbase.com' }
    }

    // 4. Record Event in DB
    try {
        await pool.query(
            `INSERT INTO events (
            event_id, tenant_id, route_id, outcome, facilitator_id, steps, raw_payload, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
                eventId,
                tenantId || 'default_tenant',
                body.route?.path || 'unknown_route',
                verificationResult.status === 'valid' ? 'allow' : 'deny',
                facilitatorId,
                JSON.stringify([{ stepId: 'verify', at: new Date().toISOString(), type: 'router_verify_result', status: 'ok' }]),
                JSON.stringify(body)
            ]
        )
    } catch (e) {
        console.error("Failed to insert event", e)
    }

    // Async tracking
    P402Analytics.trackPayment(
        paymentSignature || 'unknown_sig',
        'eip155:8453', // Base Default
        tenantId || 'anonymous'
    );

    return NextResponse.json({
        verified: verificationResult.status === 'valid',
        facilitatorId,
        verification: verificationResult
    })
}
