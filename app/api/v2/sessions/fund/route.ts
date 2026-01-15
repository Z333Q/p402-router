/**
 * P402 V2 Session Funding Endpoint
 * =================================
 * Credit a session after payment verification.
 * 
 * POST /api/v2/sessions/fund
 * 
 * Used by P402 mini-app to credit sessions after Base Pay or direct USDC transfers.
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * POST /api/v2/sessions/fund
 * Credit a session after payment verification
 * 
 * Body:
 * - session_id: string (required)
 * - amount: string | number (required, USDC amount)
 * - tx_hash: string (optional, blockchain transaction hash)
 * - source: string (optional, 'base_pay' | 'direct' | 'test')
 * - network: string (optional, 'base' | 'base_sepolia')
 */
export async function POST(req: NextRequest) {
    const tenantId = req.headers.get('x-p402-tenant') || 'default';

    try {
        const body = await req.json();
        const {
            session_id,
            amount,
            tx_hash,
            source = 'direct',
            network = 'base'
        } = body;

        // Validate required fields
        if (!session_id) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    message: 'session_id required',
                    code: 'MISSING_SESSION_ID'
                }
            }, { status: 400 });
        }

        if (amount === undefined || amount === null) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    message: 'amount required',
                    code: 'MISSING_AMOUNT'
                }
            }, { status: 400 });
        }

        // Validate session ID format
        if (!session_id.startsWith('sess_')) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    message: 'Invalid session_id format',
                    code: 'INVALID_SESSION_ID'
                }
            }, { status: 400 });
        }

        // Validate amount
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    message: 'Invalid amount - must be a positive number',
                    code: 'INVALID_AMOUNT'
                }
            }, { status: 400 });
        }

        if (amountNum > 100000) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    message: 'Amount exceeds maximum ($100,000)',
                    code: 'AMOUNT_TOO_HIGH'
                }
            }, { status: 400 });
        }

        // Validate tx_hash format if provided
        if (tx_hash && !/^0x[a-fA-F0-9]{64}$/.test(tx_hash)) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    message: 'Invalid transaction hash format',
                    code: 'INVALID_TX_HASH'
                }
            }, { status: 400 });
        }

        // Check session exists and is active
        const sessionQuery = `
            SELECT session_id, tenant_id, budget_total, budget_used, status
            FROM agent_sessions
            WHERE session_id = $1 AND tenant_id = $2
        `;
        const sessionResult = await pool.query(sessionQuery, [session_id, tenantId]);

        if (sessionResult.rows.length === 0) {
            return NextResponse.json({
                error: {
                    type: 'not_found',
                    message: 'Session not found',
                    code: 'SESSION_NOT_FOUND'
                }
            }, { status: 404 });
        }

        const session = sessionResult.rows[0];

        if (session.status !== 'active') {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    message: `Session is ${session.status}`,
                    code: 'SESSION_NOT_ACTIVE'
                }
            }, { status: 400 });
        }

        // Check for duplicate transaction if tx_hash provided
        if (tx_hash) {
            const dupeQuery = `
                SELECT id FROM session_transactions WHERE tx_hash = $1
            `;
            const dupeResult = await pool.query(dupeQuery, [tx_hash]);

            if (dupeResult.rows.length > 0) {
                return NextResponse.json({
                    error: {
                        type: 'conflict',
                        message: 'Transaction already processed',
                        code: 'DUPLICATE_TX'
                    }
                }, { status: 409 });
            }

            // Record transaction
            const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const insertTxQuery = `
                INSERT INTO session_transactions (id, session_id, tx_hash, amount, source, network, status, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', NOW())
            `;
            await pool.query(insertTxQuery, [txId, session_id, tx_hash, amountNum, source, network]);
        }

        // Update session budget
        const updateQuery = `
            UPDATE agent_sessions
            SET budget_total = budget_total + $1
            WHERE session_id = $2 AND tenant_id = $3
            RETURNING 
                session_id,
                tenant_id,
                agent_identifier,
                budget_total,
                budget_used,
                budget_total - budget_used as budget_remaining,
                policy_snapshot,
                status,
                created_at,
                expires_at
        `;
        const updateResult = await pool.query(updateQuery, [amountNum, session_id, tenantId]);

        if (updateResult.rows.length === 0) {
            return NextResponse.json({
                error: {
                    type: 'internal_error',
                    message: 'Failed to update session',
                    code: 'UPDATE_FAILED'
                }
            }, { status: 500 });
        }

        const updatedSession = updateResult.rows[0];

        console.log(`[Sessions/Fund] Session ${session_id} credited ${amountNum} USDC via ${source}`);

        return NextResponse.json({
            success: true,
            session: {
                object: 'session',
                id: updatedSession.session_id,
                tenant_id: updatedSession.tenant_id,
                agent_identifier: updatedSession.agent_identifier,
                // V2 spec compatible fields
                balance_usdc: parseFloat(updatedSession.budget_remaining),
                budget_total: parseFloat(updatedSession.budget_total),
                budget_spent: parseFloat(updatedSession.budget_used),
                // Legacy budget object
                budget: {
                    total_usd: parseFloat(updatedSession.budget_total),
                    used_usd: parseFloat(updatedSession.budget_used),
                    remaining_usd: parseFloat(updatedSession.budget_remaining)
                },
                policy: updatedSession.policy_snapshot,
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
                message: error.message || 'Failed to fund session',
                code: 'INTERNAL_ERROR'
            }
        }, { status: 500 });
    }
}

/**
 * OPTIONS - CORS preflight
 */
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
