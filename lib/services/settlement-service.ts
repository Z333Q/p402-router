import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { formatUnits, parseUnits } from 'viem';
import pool from '@/lib/db'
import { BlockchainService } from '@/lib/blockchain'
import { getTokenConfig } from '@/lib/tokens'
import { P402Analytics } from '@/lib/analytics'
import { ApiError } from '@/lib/errors'
import { EIP3009Authorization, validateAuthorizationStructure } from '@/lib/x402/eip3009'
import { TransferAuthorization, EIP3009Signature } from '@/lib/blockchain/eip3009'
import { ReplayProtection } from '@/lib/replay-protection'
import { P402_CONFIG } from '@/lib/constants'
import { queueFeedback as queueERC8004Feedback } from '@/lib/erc8004/feedback-service'
import { AP2PolicyEngine } from '@/lib/ap2-policy-engine'
import { getFacilitatorWallet } from '@/lib/x402/facilitator-wallet'
import { isCdpEnabled } from '@/lib/cdp-client'

// ---------------------------------------------------------------------------
// Receipt helpers (EIP-3009 receipt reuse scheme)
// ---------------------------------------------------------------------------

/** Sign receipt data with HMAC-SHA256 using the configured receipt secret. */
function signReceipt(receiptId: string, txHash: string, originalAmountAtomic: string, payer: string): string {
    const secret = process.env.P402_RECEIPT_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'dev-fallback';
    return createHmac('sha256', secret)
        .update(`${receiptId}:${txHash}:${originalAmountAtomic}:${payer.toLowerCase()}`)
        .digest('hex');
}

/** Verify an HMAC receipt signature in constant time. */
function verifyReceiptSig(receiptId: string, txHash: string, originalAmountAtomic: string, payer: string, sig: string): boolean {
    const expected = signReceipt(receiptId, txHash, originalAmountAtomic, payer);
    try {
        return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
        return false;
    }
}

export interface SettleRequest {
    tenantId?: string;
    decisionId?: string;
    txHash?: string; // Optional if using authorization
    amount?: string;
    asset?: string;
    authorization?: EIP3009Authorization; // New field for EIP-3009
    network?: string;
    mandateId?: string; // AP2 mandate ID for budget deduction
}

export interface SettleResponse {
    settled: boolean;
    facilitatorId: string;
    payer?: string;  // x402 spec: address of the payer
    receipt: {
        txHash: string;
        verifiedAmount?: string;
        asset?: string;
        timestamp: string;
        receiptId?: string;  // present when receipt scheme is supported
    };
}

export class SettlementService {
    static async settle(requestId: string, input: SettleRequest): Promise<SettleResponse> {
        // HACK: legacy overload support
        if (input.authorization) {
            return this.settleWithAuthorization(requestId, input.authorization, input);
        }

        const { tenantId, decisionId, txHash, amount, asset } = input

        if (!txHash) {
            throw new ApiError({
                code: 'INVALID_REQUEST',
                status: 400,
                message: 'txHash is required for legacy settlement',
                requestId
            })
        }

        // 1. Resolve Token
        const assetCode = asset || 'USDC';
        const tokenConfig = getTokenConfig(assetCode);
        if (!tokenConfig && assetCode !== 'native') {
            throw new ApiError({
                code: 'UNSUPPORTED_ASSET',
                status: 400,
                message: `Asset ${assetCode} is not supported.`,
                requestId
            })
        }

        // 2. Replay Protection (Atomic)
        const targetTenantId = tenantId || '00000000-0000-0000-0000-000000000001';

        // Ensure atomic claim before any verification
        const claimResult = await ReplayProtection.claimTxHash({
            txHash,
            requestId,
            tenantId: targetTenantId,
            amountUsd: amount ? parseFloat(amount) : undefined,
            asset: assetCode,
            settlementType: 'onchain'
        });

        if (!claimResult.claimed) {
            throw new ApiError({
                code: 'REPLAY_DETECTED',
                status: 409,
                message: 'This transaction hash has already been processed.',
                details: {
                    originalRequestId: claimResult.existingRequestId,
                    processedAt: claimResult.existingProcessedAt
                },
                requestId
            });
        }

        try {
            // 3. Get Tenant Treasury Address
            const tenantRes = await pool.query('SELECT treasury_address FROM tenants WHERE id = $1', [targetTenantId])
            const treasury = tenantRes.rows[0]?.treasury_address

            if (!treasury) {
                // Release claim on configuration error so it can be retried if fixed
                await ReplayProtection.releaseTxHash(txHash);
                throw new ApiError({
                    code: 'NO_TREASURY',
                    status: 500,
                    message: 'Tenant configuration error',
                    requestId
                })
            }

            // 4. Verify On-Chain
            const verification = await BlockchainService.verifyPayment(
                txHash,
                amount || '0',
                assetCode,
                treasury
            )

            if (!verification.verified) {
                // Release claim on verification failure so user can try again (e.g. if they sent wrong amount and want to retry with correct tx)
                await ReplayProtection.releaseTxHash(txHash);

                // Log failure
                await pool.query(
                    `INSERT INTO events (
                    event_id, tenant_id, trace_id, outcome, steps, raw_payload, created_at
                 ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                    [
                        crypto.randomUUID(),
                        targetTenantId,
                        decisionId,
                        'error',
                        JSON.stringify([{ stepId: 'settle', at: new Date().toISOString(), type: 'blockchain_verification_failed', error: verification.error }]),
                        JSON.stringify({ txHash, amount, asset: assetCode, error: verification.error })
                    ]
                )

                throw new ApiError({
                    code: 'VERIFICATION_FAILED',
                    status: 400,
                    message: 'Payment verification failed on-chain.',
                    requestId
                })
            }

            // 5. Record Success Event
            await pool.query(
                `INSERT INTO events (
                event_id, tenant_id, trace_id, outcome, steps, raw_payload, amount, asset, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                [
                    crypto.randomUUID(),
                    targetTenantId,
                    decisionId,
                    'settled',
                    JSON.stringify([{
                        stepId: 'settle',
                        at: new Date().toISOString(),
                        type: 'on_chain_confirmed',
                        txHash,
                        actualAmount: verification.actualAmount,
                        payer: verification.payerAddress
                    }]),
                    JSON.stringify({ txHash, amount, asset: assetCode }),
                    verification.actualAmount,
                    verification.asset || assetCode
                ]
            )

            // Async tracking
            P402Analytics.trackSettlement(
                verification.actualAmount || amount || '0',
                verification.asset || assetCode,
                targetTenantId
            );

            // 6. AP2 Mandate Budget Deduction
            if (input.mandateId) {
                const settlementAmountUsd = parseFloat(verification.actualAmount || amount || '0');
                AP2PolicyEngine.recordUsage(input.mandateId, settlementAmountUsd)
                    .catch(err => console.error('[AP2] Mandate usage recording failed:', err));
            }

            // ERC-8004 Reputation Feedback (async, non-blocking)
            if (process.env.ERC8004_ENABLE_REPUTATION === 'true') {
                queueERC8004Feedback({
                    settled: true,
                    facilitatorId: 'chain_base',
                }).catch(err => console.error('[ERC8004] Feedback queue failed:', err));
            }

            return {
                settled: true,
                facilitatorId: 'chain_base',
                payer: verification.payerAddress || undefined,
                receipt: {
                    txHash: txHash,
                    verifiedAmount: verification.actualAmount,
                    asset: verification.asset,
                    timestamp: new Date().toISOString()
                }
            }
        } catch (error) {
            // If it's not one of our known ApiErrors where we already released, release here?
            // Actually, if we crash mid-execution, we might want to keep the lock or release it?
            // Safe bet: if it's an unexpected crash, maybe we should release. 
            // But if it's REPLAY_DETECTED we shouldn't.
            // The logic inside try block handles explicit releasing for known failures.
            throw error;
        }
    }

    /**
     * Executes an on-chain settlement using EIP-3009 authorization.
     */
    static async settleWithAuthorization(
        requestId: string,
        authorization: EIP3009Authorization,
        context: SettleRequest
    ): Promise<SettleResponse> {
        const { tenantId, decisionId, asset = 'USDC' } = context;
        const targetTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
        const tokenConfig = getTokenConfig(asset) || { decimals: 6, symbol: 'USDC' };

        // 1. Validate authorization structure
        if (!validateAuthorizationStructure(authorization)) {
            throw new ApiError({
                code: 'INVALID_AUTHORIZATION',
                status: 400,
                message: 'Invalid EIP-3009 authorization structure',
                requestId
            });
        }

        // 2. Convert to our internal format
        const transferAuth: TransferAuthorization = {
            from: authorization.from,
            to: authorization.to,
            value: authorization.value.toString(),
            validAfter: Number(authorization.validAfter),
            validBefore: Number(authorization.validBefore),
            nonce: authorization.nonce
        };

        const signature: EIP3009Signature = {
            v: authorization.v,
            r: authorization.r,
            s: authorization.s
        };

        // 3. Verify payment against P402 treasury and requirements
        const expectedAmountUSD = parseFloat(context.amount || '0');
        const verification = await BlockchainService.verifyExactPayment(
            transferAuth,
            signature,
            expectedAmountUSD
        );

        if (!verification.verified) {
            throw new ApiError({
                code: 'VERIFICATION_FAILED',
                status: 400,
                message: verification.error || 'EIP-3009 payment verification failed',
                requestId
            });
        }

        // 4. Replay Protection using our secure system
        const replayCheck = await ReplayProtection.claimTxHash({
            txHash: verification.paymentHash,
            requestId,
            tenantId: tenantId || '00000000-0000-0000-0000-000000000001',
            amountUsd: verification.amount,
            asset: 'USDC',
            network: 'base',
            settlementType: 'exact'
        });

        if (!replayCheck.claimed) {
            throw new ApiError({
                code: 'REPLAY_DETECTED',
                status: 409,
                message: 'This authorization has already been used',
                requestId
            });
        }

        // 5. Execute gasless transfer (P402 pays gas)
        //    CDP Server Wallet (Mode A) or legacy private key (Mode B) via FacilitatorWallet.
        let txHash: string;
        try {
            if (isCdpEnabled()) {
                // Mode A — CDP Server Wallet: keys in TEE, never in this process
                const wallet = await getFacilitatorWallet();
                const tokenConfig = getTokenConfig(asset) ?? { address: P402_CONFIG.USDC_ADDRESS };
                const hash = await wallet.executeSettlement(
                    tokenConfig.address,
                    authorization,
                    requestId
                );
                txHash = hash;
            } else {
                // Mode B — Legacy ethers path (raw private key)
                const facilitatorPrivateKey = process.env.P402_FACILITATOR_PRIVATE_KEY;
                if (!facilitatorPrivateKey) {
                    await ReplayProtection.releaseTxHash(verification.paymentHash);
                    throw new ApiError({
                        code: 'INTERNAL_ERROR',
                        status: 500,
                        message: 'Facilitator wallet not configured. Set CDP_SERVER_WALLET_ENABLED=true or P402_FACILITATOR_PRIVATE_KEY.',
                        requestId
                    });
                }
                const execution = await BlockchainService.executeEIP3009Transfer(
                    transferAuth,
                    signature,
                    facilitatorPrivateKey
                );
                if (!execution.success) {
                    await ReplayProtection.releaseTxHash(verification.paymentHash);
                    throw new Error(execution.error ?? 'Transfer execution failed');
                }
                txHash = execution.txHash;
            }
        } catch (error: any) {
            // Log failure
            await pool.query(
                `INSERT INTO events (
                event_id, tenant_id, trace_id, outcome, steps, raw_payload, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                [
                    crypto.randomUUID(),
                    targetTenantId,
                    decisionId,
                    'error',
                    JSON.stringify([{
                        stepId: 'settle_eip3009',
                        at: new Date().toISOString(),
                        type: 'execution_failed',
                        error: error.message
                    }]),
                    JSON.stringify({ authorization, error: error.message })
                ]
            );
            throw error; // Propagate ApiError from facilitator
        }

        // 6. Record Success
        // formatUnits is precision-clean for all uint256 values including sub-cent amounts.
        const amountUnscaled = BigInt(authorization.value);
        const amountHuman = formatUnits(amountUnscaled, tokenConfig.decimals);

        await pool.query(
            `INSERT INTO events (
            event_id, tenant_id, trace_id, outcome, steps, raw_payload, amount, asset, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
                crypto.randomUUID(),
                targetTenantId,
                decisionId,
                'settled',
                JSON.stringify([{
                    stepId: 'settle_eip3009',
                    at: new Date().toISOString(),
                    type: 'on_chain_executed',
                    txHash,
                    nonce: authorization.nonce,
                    payer: authorization.from
                }]),
                JSON.stringify({ authorization, txHash, amount: amountHuman, asset }),
                amountHuman,
                tokenConfig.symbol
            ]
        );

        // Async tracking
        P402Analytics.trackSettlement(
            amountHuman,
            tokenConfig.symbol,
            targetTenantId
        );

        // 7. AP2 Mandate Budget Deduction
        if (context.mandateId) {
            const settlementAmountUsd = parseFloat(amountHuman);
            AP2PolicyEngine.recordUsage(context.mandateId, settlementAmountUsd)
                .catch(err => console.error('[AP2] Mandate usage recording failed:', err));
        }

        // ERC-8004 Reputation Feedback (async, non-blocking)
        if (process.env.ERC8004_ENABLE_REPUTATION === 'true') {
            queueERC8004Feedback({
                settled: true,
                facilitatorId: 'p402-eip3009',
            }).catch(err => console.error('[ERC8004] Feedback queue failed:', err));
        }

        // World AgentKit Human-Anchored Reputation (async, non-blocking)
        // If the payer is a World ID-verified human in AgentBook, update their
        // reputation score to reflect the successful settlement.
        if (process.env.AGENTKIT_ENABLED === 'true') {
            Promise.resolve().then(async () => {
                try {
                    const { createAgentBookVerifier } = await import('@worldcoin/agentkit');
                    const { recordSettlement } = await import('@/lib/identity/reputation');
                    const agentBook = createAgentBookVerifier({ network: 'base' });
                    const humanId = await agentBook.lookupHuman(authorization.from, 'eip155:8453');
                    if (humanId) {
                        await recordSettlement(humanId);
                    }
                } catch (err) {
                    console.warn('[Reputation] Settlement update failed (non-blocking):', (err as Error).message);
                }
            });
        }

        // Generate and store a reusable receipt for this settlement
        const receiptId = `sr_${randomBytes(6).toString('hex')}`;
        const originalAmountAtomic = BigInt(authorization.value).toString();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        const receiptSig = signReceipt(receiptId, txHash, originalAmountAtomic, authorization.from);

        await pool.query(
            `INSERT INTO settlement_receipts
             (receipt_id, payer_address, original_amount_atomic, consumed_amount_atomic,
              facilitator_signature, tx_hash, asset, network, expires_at)
             VALUES ($1, $2, $3, 0, $4, $5, $6, $7, $8)
             ON CONFLICT (receipt_id) DO NOTHING`,
            [
                receiptId,
                authorization.from.toLowerCase(),
                originalAmountAtomic,
                receiptSig,
                txHash,
                tokenConfig.symbol,
                'eip155:8453',
                expiresAt,
            ]
        );

        return {
            settled: true,
            facilitatorId: 'p402-eip3009',
            payer: authorization.from,
            receipt: {
                txHash,
                verifiedAmount: amountHuman,
                asset: tokenConfig.symbol,
                timestamp: new Date().toISOString(),
                receiptId,
            }
        };
    }

    /**
     * Settle using a previously created receipt (reuse prior payment).
     * Atomically consumes from the receipt's remaining balance — no new
     * EIP-3009 signature required from the user.
     */
    static async settleWithReceipt(
        requestId: string,
        input: {
            tenantId?: string;
            decisionId?: string;
            receiptId: string;
            amount: string;
            asset: string;
        }
    ): Promise<SettleResponse> {
        const { tenantId, decisionId, receiptId, amount, asset } = input;
        const targetTenantId = tenantId || '00000000-0000-0000-0000-000000000001';

        // 1. Look up receipt
        const res = await pool.query(
            `SELECT receipt_id, payer_address, original_amount_atomic, consumed_amount_atomic,
                    facilitator_signature, tx_hash, expires_at, asset AS receipt_asset, network
             FROM settlement_receipts WHERE receipt_id = $1`,
            [receiptId]
        );

        if (!res.rows[0]) {
            throw new ApiError({
                code: 'RECEIPT_NOT_FOUND',
                status: 404,
                message: `Receipt ${receiptId} not found`,
                requestId,
            });
        }

        const receipt = res.rows[0] as {
            payer_address: string;
            original_amount_atomic: string;
            consumed_amount_atomic: string;
            facilitator_signature: string;
            tx_hash: string;
            expires_at: string;
            receipt_asset: string;
            network: string;
        };

        // 2. Expiry check
        if (new Date(receipt.expires_at) < new Date()) {
            throw new ApiError({
                code: 'RECEIPT_EXPIRED',
                status: 409,
                message: 'Receipt has expired',
                requestId,
            });
        }

        // 3. Signature verification (prevents forged receipts)
        const sigValid = verifyReceiptSig(
            receiptId,
            receipt.tx_hash,
            receipt.original_amount_atomic,
            receipt.payer_address,
            receipt.facilitator_signature
        );
        if (!sigValid) {
            throw new ApiError({
                code: 'INVALID_SIGNATURE',
                status: 400,
                message: 'Receipt signature invalid',
                requestId,
            });
        }

        // 4. Balance check
        // parseUnits is the precision-clean inverse of formatUnits.
        const requestedAtomic = parseUnits(amount, 6);
        const remaining = BigInt(receipt.original_amount_atomic) - BigInt(receipt.consumed_amount_atomic);
        if (requestedAtomic > remaining) {
            throw new ApiError({
                code: 'RECEIPT_INSUFFICIENT_BALANCE',
                status: 402,
                message: `Insufficient receipt balance: ${Number(remaining) / 1e6} ${receipt.receipt_asset} remaining, ${amount} requested`,
                requestId,
            });
        }

        // 5. Atomic consumption — the WHERE clause re-checks the balance to handle
        //    concurrent requests (optimistic concurrency without a SELECT FOR UPDATE).
        const updateRes = await pool.query(
            `UPDATE settlement_receipts
             SET consumed_amount_atomic = consumed_amount_atomic + $2
             WHERE receipt_id = $1
               AND consumed_amount_atomic + $2 <= original_amount_atomic
             RETURNING consumed_amount_atomic`,
            [receiptId, requestedAtomic.toString()]
        );

        if (!updateRes.rowCount) {
            throw new ApiError({
                code: 'RECEIPT_INSUFFICIENT_BALANCE',
                status: 402,
                message: 'Concurrent receipt consumption failed — please retry',
                requestId,
            });
        }

        // 6. Record event
        await pool.query(
            `INSERT INTO events (
                event_id, tenant_id, trace_id, outcome, steps, raw_payload, amount, asset, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
                crypto.randomUUID(),
                targetTenantId,
                decisionId,
                'settled',
                JSON.stringify([{
                    stepId: 'settle_receipt',
                    at: new Date().toISOString(),
                    type: 'receipt_consumed',
                    receiptId,
                    requestedAtomic: requestedAtomic.toString(),
                }]),
                JSON.stringify({ receiptId, amount, asset }),
                amount,
                asset,
            ]
        );

        P402Analytics.trackSettlement(amount, asset, targetTenantId);

        // ERC-8004 Reputation Feedback (async, non-blocking)
        if (process.env.ERC8004_ENABLE_REPUTATION === 'true') {
            queueERC8004Feedback({
                settled: true,
                facilitatorId: 'p402-receipt',
            }).catch(err => console.error('[ERC8004] Feedback queue failed:', err));
        }

        return {
            settled: true,
            facilitatorId: 'p402-receipt',
            payer: receipt.payer_address,
            receipt: {
                txHash: receipt.tx_hash,
                verifiedAmount: amount,
                asset,
                timestamp: new Date().toISOString(),
                receiptId,
            }
        };
    }
}
