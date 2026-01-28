/**
 * P402 V2 Session Funding Endpoint
 * =================================
 * Credit a session after payment verification.
 * 
 * POST /api/v2/sessions/fund
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
    let tenantId = req.headers.get('x-p402-tenant');
    if (!tenantId || tenantId === 'default' || tenantId === 'anonymous') {
        const tRes = await pool.query('SELECT id FROM tenants LIMIT 1');
        tenantId = tRes.rows[0]?.id || '00000000-0000-0000-0000-000000000001';
    }

    try {
        const body = await req.json();
        const {
            session_id,
            amount,
            tx_hash,
            source = 'direct',
            network = 'base'
        } = body;

        if (!session_id) {
            return NextResponse.json({ error: { message: 'session_id required' } }, { status: 400 });
        }

        if (amount === undefined || amount === null) {
            return NextResponse.json({ error: { message: 'amount required' } }, { status: 400 });
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return NextResponse.json({ error: { message: 'Invalid amount' } }, { status: 400 });
        }

        // 1. Resolve & Verify Session
        const sessionRes = await pool.query(
            "SELECT * FROM agent_sessions WHERE session_token = $1 AND tenant_id = $2",
            [session_id, tenantId]
        );

        if (sessionRes.rowCount === 0) {
            return NextResponse.json({ error: { message: 'Session not found' } }, { status: 404 });
        }

        const session = sessionRes.rows[0];
        if (session.status !== 'active') {
            return NextResponse.json({ error: { message: `Session is ${session.status}` } }, { status: 400 });
        }

        // 2. Replay Protection
        if (tx_hash) {
            const replayRes = await pool.query(
                "SELECT 1 FROM session_transactions WHERE tx_hash = $1",
                [tx_hash]
            );
            if (replayRes.rowCount! > 0) {
                return NextResponse.json({ error: { message: 'Transaction already processed' } }, { status: 409 });
            }
        }

        // 3. Update Budget (Atomic)
        const updateRes = await pool.query(
            `UPDATE agent_sessions 
             SET budget_total_usd = budget_total_usd + $1 
             WHERE session_token = $2 AND tenant_id = $3
             RETURNING *`,
            [amountNum, session_id, tenantId]
        );

        const updatedSession = updateRes.rows[0];

        // 4. Record Transaction
        if (tx_hash) {
            await pool.query(
                `INSERT INTO session_transactions (id, session_id, tx_hash, amount, source, network, status) 
                 VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')`,
                [`tx_${crypto.randomUUID().replace(/-/g, '')}`, session_id, tx_hash, amountNum, source, network]
            );
        }

        return NextResponse.json({
            success: true,
            session: {
                object: 'session',
                id: updatedSession.session_token,
                tenant_id: updatedSession.tenant_id,
                agent_id: updatedSession.agent_id,
                budget: {
                    total_usd: parseFloat(updatedSession.budget_total_usd),
                    used_usd: parseFloat(updatedSession.budget_spent_usd),
                    remaining_usd: parseFloat(updatedSession.budget_total_usd) - parseFloat(updatedSession.budget_spent_usd)
                },
                policy: updatedSession.policies,
                status: updatedSession.status,
                created_at: updatedSession.created_at,
                expires_at: updatedSession.expires_at
            },
            amount_credited: amountNum,
            tx_hash: tx_hash || null
        });

    } catch (error: any) {
        console.error('[Sessions/Fund] Error:', error);
        return NextResponse.json({
            error: {
                type: 'internal_error',
                message: error.message
            }
        }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-P402-Tenant, X-P402-Session',
            'Access-Control-Max-Age': '86400'
        }
    });
}
