import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { A2AMessage, A2ATask, A2ATaskState, A2ATaskStatus } from '../../../lib/a2a-types';
import { query } from '../../../lib/db';
import { A2A_ERRORS, A2AError, toA2ARpcError } from '../../../lib/a2a-errors';
import { pushNotificationService } from '../../../lib/push-service';
import { SettlementService } from '../../../lib/services/settlement-service';
import { findActiveMandate } from '../../../lib/ap2-policy-engine';
import { EIP3009Authorization } from '../../../lib/x402/eip3009';
import { validateAgentTrust } from '../../../lib/erc8004/validation-guard';
import { ApiError } from '../../../lib/errors';
import { createEscrow, getEscrowByReference } from '../../../lib/services/escrow-service';

const BAZAAR_ESCROW_THRESHOLD_USD = 1.00;

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

        // ── S4-004: ERC-8004 Agent Trust Gate ────────────────────────────────
        // Validate the calling agent's DID against the on-chain reputation
        // registry before any method is dispatched. Throws ApiError on failure.
        const agentDid = req.headers.get('x-agent-did') || params?.agentDid || 'anonymous';
        try {
            await validateAgentTrust(agentDid);
        } catch (trustErr) {
            // Format as JSON-RPC 2.0 per protocol spec — HTTP always 200
            const rpcError = toA2ARpcError(trustErr);
            return NextResponse.json({
                jsonrpc: '2.0',
                error: rpcError,
                id: id || null
            }, { status: 200 });
        }
        // ─────────────────────────────────────────────────────────────────────

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

        // 3b. Auto-escrow for priced Bazaar tasks (> $1.00)
        let escrowId: string | null = null;
        const priceUsd: number | undefined = params.price_usd ?? params.configuration?.price_usd;
        const providerAddress: string | undefined = params.provider_address ?? params.configuration?.provider_address;
        const payerAddress: string | undefined = params.payer_address ?? tenantUuid;

        if (priceUsd && priceUsd >= BAZAAR_ESCROW_THRESHOLD_USD && providerAddress && payerAddress) {
            try {
                const escrow = await createEscrow({
                    referenceId: taskId,
                    payer: payerAddress,
                    provider: providerAddress,
                    netAmountUsd: priceUsd,
                });
                escrowId = escrow.id;
            } catch (escrowErr) {
                // Non-blocking — task proceeds even if escrow creation fails
                console.warn('[A2A] Auto-escrow failed (non-blocking):', (escrowErr as Error).message);
            }
        }

        const configuration = {
            ...(params.configuration || {}),
            ...(escrowId ? { escrow_id: escrowId, price_usd: priceUsd } : {}),
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
                JSON.stringify(configuration),
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
            },
            metadata: {
                ...(escrowId ? { escrow_id: escrowId, price_usd: priceUsd } : {}),
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

    if (payment.status === 'completed') {
        return NextResponse.json({
            jsonrpc: '2.0',
            error: { code: -32008, message: 'Payment already settled' },
            id
        });
    }

    const effectiveScheme = scheme || 'onchain';

    // 1.5 Look up active AP2 mandate for this payment's agent (if applicable)
    let mandateId: string | undefined;
    if (payment.tenant_id && params.agent_did) {
        try {
            const activeMandate = await findActiveMandate(payment.tenant_id, params.agent_did);
            if (activeMandate) {
                mandateId = activeMandate.id;
            }
        } catch (err) {
            console.error('[A2A] Mandate lookup failed (non-blocking):', err);
        }
    }

    try {
        let verificationResult: { verified: boolean; error?: string; txHash?: string };

        switch (effectiveScheme) {
            case 'onchain': {
                if (!tx_hash) {
                    return NextResponse.json({
                        jsonrpc: '2.0',
                        error: {
                            code: -32602,
                            message: 'tx_hash is required for onchain scheme',
                            data: { scheme: 'onchain', required: ['tx_hash'] }
                        },
                        id
                    });
                }

                if (!tx_hash.match(/^0x[a-fA-F0-9]{64}$/)) {
                    return NextResponse.json({
                        jsonrpc: '2.0',
                        error: { code: -32602, message: 'Invalid tx_hash format' },
                        id
                    });
                }

                try {
                    const settleResult = await SettlementService.settle(
                        `a2a_${payment_id}`,
                        {
                            tenantId: payment.tenant_id,
                            mandateId,
                            txHash: tx_hash,
                            amount: payment.amount_usd?.toString() || '0',
                            asset: payment.asset || 'USDC'
                        }
                    );

                    verificationResult = {
                        verified: settleResult.settled,
                        txHash: tx_hash
                    };
                } catch (error: any) {
                    if (error.code === 'REPLAY_DETECTED') {
                        return NextResponse.json({
                            jsonrpc: '2.0',
                            error: {
                                code: -32009,
                                message: 'Transaction already processed (replay detected)',
                                data: { tx_hash }
                            },
                            id
                        });
                    }
                    if (error.code === 'VERIFICATION_FAILED') {
                        verificationResult = { verified: false, error: error.message };
                    } else {
                        throw error;
                    }
                }
                break;
            }

            case 'exact': {
                const { authorization: authParams, signature } = params;

                if (!authParams || !signature) {
                    return NextResponse.json({
                        jsonrpc: '2.0',
                        error: {
                            code: -32602,
                            message: 'authorization and signature are required for exact scheme',
                            data: { scheme: 'exact', required: ['authorization', 'signature'] }
                        },
                        id
                    });
                }

                // Validate signature format (65-byte hex = '0x' + 130 hex chars)
                if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) {
                    return NextResponse.json({
                        jsonrpc: '2.0',
                        error: { code: -32602, message: 'Invalid signature format (expected 65-byte hex string)' },
                        id
                    });
                }

                // Parse r/s/v from compact 65-byte signature (r+s+v byte order)
                const r = `0x${signature.slice(2, 66)}` as `0x${string}`;
                const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
                let v = parseInt(signature.slice(130, 132), 16);
                // Normalize recovery ID: some wallets return 0/1, EIP-155 requires 27/28
                if (v < 2) v += 27;

                const authorization: EIP3009Authorization = {
                    from: authParams.from,
                    to: authParams.to,
                    value: authParams.value,
                    validAfter: authParams.validAfter,
                    validBefore: authParams.validBefore,
                    nonce: authParams.nonce,
                    v,
                    r,
                    s
                };

                try {
                    const settleResult = await SettlementService.settleWithAuthorization(
                        `a2a_${payment_id}`,
                        authorization,
                        {
                            tenantId: payment.tenant_id,
                            mandateId,
                            amount: payment.amount_usd?.toString() || '0',
                            asset: payment.asset || 'USDC'
                        }
                    );

                    verificationResult = {
                        verified: settleResult.settled,
                        txHash: settleResult.receipt.txHash
                    };
                } catch (error: any) {
                    if (error.code === 'REPLAY_DETECTED') {
                        return NextResponse.json({
                            jsonrpc: '2.0',
                            error: {
                                code: -32009,
                                message: 'Authorization already used (replay detected)',
                                data: { payment_id }
                            },
                            id
                        });
                    }
                    if (error.code === 'VERIFICATION_FAILED' || error.code === 'INVALID_AUTHORIZATION') {
                        verificationResult = { verified: false, error: error.message };
                    } else {
                        throw error;
                    }
                }
                break;
            }

            case 'receipt': {
                if (!receipt_id) {
                    return NextResponse.json({
                        jsonrpc: '2.0',
                        error: {
                            code: -32602,
                            message: 'receipt_id is required for receipt scheme',
                            data: { scheme: 'receipt', required: ['receipt_id'] }
                        },
                        id
                    });
                }

                try {
                    const settleResult = await SettlementService.settleWithReceipt(
                        `a2a_${payment_id}`,
                        {
                            tenantId: payment.tenant_id,
                            receiptId: receipt_id,
                            amount: payment.amount_usd?.toString() || '0',
                            asset: payment.asset || 'USDC'
                        }
                    );

                    verificationResult = {
                        verified: settleResult.settled,
                        txHash: settleResult.receipt.txHash
                    };
                } catch (error: any) {
                    if (error.code === 'REPLAY_DETECTED') {
                        return NextResponse.json({
                            jsonrpc: '2.0',
                            error: {
                                code: -32009,
                                message: 'Receipt already used (replay detected)',
                                data: { receipt_id }
                            },
                            id
                        });
                    }
                    verificationResult = { verified: false, error: error.message };
                }
                break;
            }

            default: {
                return NextResponse.json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32602,
                        message: `Unknown scheme: ${effectiveScheme}`,
                        data: { supported: ['onchain', 'exact', 'receipt'] }
                    },
                    id
                });
            }
        }

        if (!verificationResult.verified) {
            await query(
                `UPDATE x402_payments 
                 SET status = 'failed', error = $2, updated_at = NOW() 
                 WHERE payment_id = $1`,
                [payment_id, verificationResult.error || 'Verification failed']
            );

            return NextResponse.json({
                jsonrpc: '2.0',
                error: {
                    code: -32008,
                    message: verificationResult.error || 'Payment verification failed',
                    data: { payment_id }
                },
                id
            });
        }

        // Success
        const settled_at = new Date();
        const settledTxHash = verificationResult.txHash || tx_hash;

        await query(
            `UPDATE x402_payments
             SET status = 'completed', tx_hash = $2, settled_at = $3, scheme = $4, updated_at = NOW()
             WHERE payment_id = $1`,
            [payment_id, settledTxHash, settled_at, effectiveScheme]
        );

        // Generate receipt with real HMAC-SHA256 signature
        const newReceiptId = `rec_${uuidv4().substring(0, 8)}`;
        const receiptSecret = process.env.P402_RECEIPT_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'dev-fallback';
        const receiptSigInput = `${newReceiptId}:${settledTxHash}:${payment.amount_usd ?? 0}:${payment.asset ?? 'USDC'}`;
        const receiptSignature = createHmac('sha256', receiptSecret).update(receiptSigInput).digest('hex');

        await query(
            `INSERT INTO x402_receipts
             (receipt_id, payment_id, tenant_id, signature, receipt_data, valid_until)
             VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '30 days')`,
            [
                newReceiptId,
                payment_id,
                payment.tenant_id,
                receiptSignature,
                JSON.stringify({
                    amount: payment.amount_usd,
                    asset: payment.asset,
                    tx_hash: settledTxHash,
                    settled_at: settled_at.toISOString()
                })
            ]
        );

        return NextResponse.json({
            jsonrpc: '2.0',
            result: {
                payment_id,
                status: 'completed',
                settlement: {
                    tx_hash: settledTxHash,
                    scheme: effectiveScheme,
                    amount_settled: payment.amount_raw || payment.amount_usd?.toString() || '0',
                    verified_at: settled_at.toISOString()
                },
                receipt: {
                    receipt_id: newReceiptId,
                    signature: receiptSignature,
                    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }
            },
            id
        });

    } catch (error: any) {
        console.error('X402 Settlement Error:', error);
        return NextResponse.json({
            jsonrpc: '2.0',
            error: A2A_ERRORS.INTERNAL_ERROR,
            id
        });
    }
}
