import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { A2AMessage, A2ATask, A2ATaskState, A2ATaskStatus } from '../../../lib/a2a-types';
import { query } from '../../../lib/db';
import { A2A_ERRORS, A2AError } from '../../../lib/a2a-errors';
import { pushNotificationService } from '../../../lib/push-service';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Basic JSON-RPC validation
        if (body.jsonrpc !== '2.0' || !body.method) {
            return NextResponse.json({
                jsonrpc: '2.0',
                error: A2A_ERRORS.INVALID_REQUEST,
                id: body.id || null
            });
        }

        const { method, params, id } = body;
        const tenantIdHeader = req.headers.get('X-P402-Tenant');

        // Dispatch methods
        if (method === 'message/send') {
            return handleMessageSend(params, id, tenantIdHeader);
        }

        if (method === 'x402/payment-submitted') {
            return handleX402PaymentSubmitted(params, id, tenantIdHeader);
        }

        return NextResponse.json({
            jsonrpc: '2.0',
            error: A2A_ERRORS.METHOD_NOT_FOUND,
            id
        });

    } catch (error) {
        console.error('JSON-RPC Error:', error);
        return NextResponse.json({
            jsonrpc: '2.0',
            error: A2A_ERRORS.PARSE_ERROR,
            id: null
        });
    }
}

async function handleMessageSend(params: any, id: string | number, tenantId: string | null) {
    if (!params || !params.message) {
        return NextResponse.json({
            jsonrpc: '2.0',
            error: A2A_ERRORS.INVALID_PARAMS,
            id
        });
    }

    // 1. Create Task
    const taskId = `task_${uuidv4()}`;
    const contextId = params.contextId || `ctx_${uuidv4()}`;

    // Tenant Resolution
    let tenantUuid: string | undefined;

    if (tenantId) {
        tenantUuid = tenantId;
    } else {
        const tRes = await query('SELECT id FROM tenants LIMIT 1');
        if (tRes && tRes.rowCount && tRes.rowCount > 0) tenantUuid = tRes.rows[0].id;
    }

    if (!tenantUuid) {
        return NextResponse.json({
            jsonrpc: '2.0',
            error: A2A_ERRORS.UNAUTHORIZED,
            id
        });
    }

    try {
        // 2. Ensure Context Exists
        await query(
            `INSERT INTO a2a_contexts (id, tenant_id) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
            [contextId, tenantUuid]
        );

        // 3. Insert Task
        const message: A2AMessage = params.message;

        // Mock processing result
        const firstPart = message.parts && message.parts.length > 0 ? message.parts[0] : null;
        const textContent = firstPart && 'text' in firstPart ? firstPart.text : "";

        const resultMessage: A2AMessage = {
            role: 'agent',
            parts: [
                { type: 'text', text: "I have received your message: " + (textContent || "") }
            ]
        };

        await query(
            `INSERT INTO a2a_tasks (
            id, tenant_id, context_id, request_message, configuration, state, result_message, completed_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
                taskId,
                tenantUuid,
                contextId,
                JSON.stringify(message),
                JSON.stringify(params.configuration || {}),
                'completed',
                JSON.stringify(resultMessage)
            ]
        );

        // 4. Notify via Push
        pushNotificationService.notifyTaskStateChange({
            task_id: taskId,
            context_id: contextId,
            tenant_id: tenantUuid,
            state: 'completed'
        }).catch(err => console.error('Push Notification Error:', err));

        // 5. Construct Response
        const task: A2ATask = {
            id: taskId,
            contextId,
            status: {
                state: 'completed',
                message: resultMessage,
                timestamp: new Date().toISOString()
            }
        };


        return NextResponse.json({
            jsonrpc: '2.0',
            result: { task },
            id
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({
            jsonrpc: '2.0',
            error: A2A_ERRORS.INTERNAL_ERROR,
            id
        });
    }
}

async function handleX402PaymentSubmitted(params: any, id: string | number, tenantIdHeader: string | null) {
    if (!params || !params.payment_id || !params.scheme) {
        return NextResponse.json({
            jsonrpc: '2.0',
            error: A2A_ERRORS.INVALID_PARAMS,
            id
        });
    }

    const { payment_id, scheme, tx_hash, signature, receipt_id } = params;

    try {
        // 1. Fetch payment record
        const res = await query('SELECT * FROM x402_payments WHERE payment_id = $1', [payment_id]);
        if (res.rowCount === 0) {
            return NextResponse.json({
                jsonrpc: '2.0',
                error: { code: -32007, message: 'Payment record not found' },
                id
            });
        }

        const payment = res.rows[0];

        // 2. Verify payment (Mock implementation)
        // In production, we would use blockchain.ts to verify the tx_hash or signature
        let settled_at = new Date();
        let status = 'completed';

        // 3. Update payment record
        await query(
            `UPDATE x402_payments 
             SET status = $2, tx_hash = $3, settled_at = $4, scheme = $5
             WHERE payment_id = $1`,
            [payment_id, status, tx_hash || null, settled_at, scheme]
        );

        // 4. Generate Receipt (if completed)
        const newReceiptId = `rec_${uuidv4().substring(0, 8)}`;
        const receiptSignature = `sig_${uuidv4()}`;

        await query(
            `INSERT INTO x402_receipts (receipt_id, payment_id, tenant_id, signature, receipt_data, valid_until)
             VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '30 days')`,
            [newReceiptId, payment_id, payment.tenant_id, receiptSignature, JSON.stringify({ amount: payment.amount_usd })]
        );

        return NextResponse.json({
            jsonrpc: '2.0',
            result: {
                payment_id,
                status: 'completed',
                settlement: {
                    tx_hash: tx_hash || `mock_tx_${uuidv4()}`,
                    amount_settled: payment.amount_raw || "0"
                },
                receipt: {
                    receipt_id: newReceiptId,
                    signature: receiptSignature,
                    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }
            },
            id
        });

    } catch (error) {
        console.error('X402 Settlement Error:', error);
        return NextResponse.json({
            jsonrpc: '2.0',
            error: A2A_ERRORS.INTERNAL_ERROR,
            id
        });
    }
}
