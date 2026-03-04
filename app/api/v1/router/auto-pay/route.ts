/**
 * POST /api/v1/router/auto-pay
 * ============================
 * Internal endpoint called by the A2A orchestrator when a remote agent returns
 * a `payment-required` x402 message and auto-pay is enabled.
 *
 * This endpoint:
 *   1. Validates the CRON_SECRET (internal-only — never exposed to clients)
 *   2. Looks up the session's CDP server wallet
 *   3. Signs an EIP-3009 authorization using the CDP wallet
 *   4. Submits to /api/v1/facilitator/settle
 *   5. Returns { tx_hash, receipt_id } to the orchestrator
 *
 * Security: CRON_SECRET header required. This endpoint is not in CORS_ORIGINS
 * and is only called server-to-server.
 */

import { NextRequest, NextResponse } from 'next/server';
import { toAccount } from 'viem/accounts';
import { createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import pool from '@/lib/db';
import { getCdpClientAsync, isCdpEnabled } from '@/lib/cdp-client';
import { toApiErrorResponse, ApiError } from '@/lib/errors';
import { P402_CONFIG } from '@/lib/constants';
import { AP2PolicyEngine } from '@/lib/ap2-policy-engine';
import { queueFeedback } from '@/lib/erc8004/feedback-service';

export const dynamic = 'force-dynamic';

interface AutoPayRequest {
    session_id?: string;
    tenant_id: string;
    payment_required: {
        payment_id: string;
        recipient: string;       // payee address
        amount: string;          // USDC atomic units
        asset: string;           // token address
        network: string;
        nonce: string;           // bytes32
        valid_after: string;     // unix seconds
        valid_before: string;    // unix seconds
        resource: string;
        description: string;
    };
}

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();

    // ── Auth: internal only ────────────────────────────────────────────────
    const cronSecret = req.headers.get('x-cron-secret');
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isCdpEnabled()) {
        return NextResponse.json(
            { error: 'CDP Server Wallet not enabled — cannot auto-pay' },
            { status: 503 }
        );
    }

    let body: AutoPayRequest;
    try {
        body = await req.json() as AutoPayRequest;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { session_id, tenant_id, payment_required: pr } = body;
    if (!pr?.recipient || !pr.amount || !pr.nonce) {
        return NextResponse.json({ error: 'Missing payment_required fields' }, { status: 400 });
    }

    const startTime = Date.now();

    try {
        // ── Resolve session wallet ─────────────────────────────────────────
        let walletName: string | null = null;
        let session: { cdp_wallet_name: string | null; wallet_address: string | null; policies: Record<string, unknown> | null; agent_id: string | null } | null = null;

        if (session_id) {
            const sessionRes = await pool.query(
                `SELECT cdp_wallet_name, wallet_address, policies, agent_id FROM agent_sessions WHERE session_token = $1 AND tenant_id = $2`,
                [session_id, tenant_id]
            );
            session = sessionRes.rows[0] ?? null;
            walletName = session?.cdp_wallet_name ?? null;
        }

        // ── Mandate verification (pre-flight) ─────────────────────────────
        const amountUsd = parseFloat(pr.amount) / 1_000_000; // USDC atomic → dollars
        const mandateId: string | undefined = typeof session?.policies?.ap2_mandate_id === 'string'
            ? session.policies.ap2_mandate_id
            : undefined;

        if (mandateId) {
            const check = await AP2PolicyEngine.verifyMandate(
                mandateId,
                amountUsd,
                'a2a-payment',
                session?.agent_id ?? undefined
            );
            if (!check.valid) {
                queueFeedback({
                    settled: false,
                    facilitatorId: 'p402-auto-pay',
                    eventId: pr.payment_id,
                    agentId: session?.agent_id ?? undefined,
                    errorCode: check.error?.code,
                }).catch(() => {});
                return NextResponse.json(
                    { error: { type: 'mandate_error', code: check.error?.code, message: check.error?.message } },
                    { status: 403 }
                );
            }
        }

        if (!walletName) {
            // Fall back to facilitator wallet name for tenant-level auto-pay
            walletName = `p402-tenant-${tenant_id.slice(0, 8)}`;
        }

        // ── Get CDP account ────────────────────────────────────────────────
        const cdp = await getCdpClientAsync();
        const cdpAccount = await cdp.evm.getOrCreateAccount({ name: walletName });
        const viemAccount = toAccount(cdpAccount as Parameters<typeof toAccount>[0]);

        // ── Build EIP-3009 authorization ────────────────────────────────────
        const EIP712_DOMAIN = {
            name: 'USD Coin',
            version: '2',
            chainId: 8453n,
            verifyingContract: (pr.asset || P402_CONFIG.USDC_ADDRESS) as `0x${string}`,
        } as const;

        const EIP712_TYPES = {
            TransferWithAuthorization: [
                { name: 'from',        type: 'address' },
                { name: 'to',          type: 'address' },
                { name: 'value',       type: 'uint256' },
                { name: 'validAfter',  type: 'uint256' },
                { name: 'validBefore', type: 'uint256' },
                { name: 'nonce',       type: 'bytes32' },
            ],
        } as const;

        const walletClient = createWalletClient({
            account: viemAccount,
            chain: base,
            transport: http(process.env.BASE_RPC_URL ?? 'https://mainnet.base.org'),
        });

        const signature = await walletClient.signTypedData({
            account: viemAccount,
            domain: EIP712_DOMAIN,
            types: EIP712_TYPES,
            primaryType: 'TransferWithAuthorization',
            message: {
                from:        viemAccount.address,
                to:          pr.recipient as `0x${string}`,
                value:       BigInt(pr.amount),
                validAfter:  BigInt(pr.valid_after),
                validBefore: BigInt(pr.valid_before),
                nonce:       pr.nonce as `0x${string}`,
            },
        });

        // ── Submit to facilitator settle ────────────────────────────────────
        const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
        const settleRes = await fetch(`${baseUrl}/api/v1/facilitator/settle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                paymentPayload: {
                    x402Version: 2,
                    scheme: 'exact',
                    network: 'eip155:8453',
                    payload: {
                        signature,
                        authorization: {
                            from:        viemAccount.address,
                            to:          pr.recipient,
                            value:       pr.amount,
                            validAfter:  pr.valid_after,
                            validBefore: pr.valid_before,
                            nonce:       pr.nonce,
                        },
                    },
                },
                paymentRequirements: {
                    scheme: 'exact',
                    network: 'eip155:8453',
                    maxAmountRequired: pr.amount,
                    resource: pr.resource,
                    description: pr.description,
                    payTo: pr.recipient,
                    asset: pr.asset || P402_CONFIG.USDC_ADDRESS,
                },
            }),
        });

        if (!settleRes.ok) {
            const errText = await settleRes.text();
            queueFeedback({
                settled: false,
                facilitatorId: 'p402-auto-pay',
                eventId: pr.payment_id,
                agentId: session?.agent_id ?? undefined,
                errorCode: 'CDP_WALLET_ERROR',
            }).catch(() => {});
            throw new ApiError({
                code: 'CDP_WALLET_ERROR',
                status: 502,
                message: `Facilitator settle failed: ${errText}`,
                requestId,
            });
        }

        const settleData = await settleRes.json() as { transaction?: string; receipt_id?: string };

        // ── Post-settlement: mandate usage + budget tracking + ERC-8004 ───
        if (mandateId) {
            AP2PolicyEngine.recordUsage(mandateId, amountUsd).catch(e =>
                console.warn('[auto-pay] recordUsage failed:', e)
            );
        }
        if (session_id) {
            pool.query(
                `UPDATE agent_sessions SET budget_spent_usd = budget_spent_usd + $1 WHERE session_token = $2`,
                [amountUsd, session_id]
            ).catch(e => console.warn('[auto-pay] budget decrement failed:', e));
        }
        queueFeedback({
            settled: true,
            facilitatorId: 'p402-auto-pay',
            eventId: pr.payment_id,
            agentId: session?.agent_id ?? undefined,
            latencyMs: Date.now() - startTime,
        }).catch(() => {});

        return NextResponse.json({
            ok: true,
            payment_id: pr.payment_id,
            tx_hash: settleData.transaction,
            receipt_id: settleData.receipt_id,
            from: viemAccount.address,
            amount: pr.amount,
        });

    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
