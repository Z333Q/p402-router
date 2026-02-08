import pool from '@/lib/db'
import { BlockchainService } from '@/lib/blockchain'
import { getTokenConfig } from '@/lib/tokens'
import { P402Analytics } from '@/lib/analytics'
import { ApiError } from '@/lib/errors'
import { EIP3009Authorization, validateAuthorizationStructure } from '@/lib/x402/eip3009'
import { TransferAuthorization, EIP3009Signature } from '@/lib/blockchain/eip3009'
import { ReplayProtection } from '@/lib/replay-protection'
import { P402_CONFIG } from '@/lib/constants'

export interface SettleRequest {
    tenantId?: string;
    decisionId?: string;
    txHash?: string; // Optional if using authorization
    amount?: string;
    asset?: string;
    authorization?: EIP3009Authorization; // New field for EIP-3009
    network?: string;
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
                code: 'PAYMENT_VERIFICATION_FAILED',
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
        const facilitatorPrivateKey = process.env.FACILITATOR_PRIVATE_KEY;
        if (!facilitatorPrivateKey) {
            await ReplayProtection.releaseTxHash(verification.paymentHash);
            throw new ApiError({
                code: 'FACILITATOR_NOT_CONFIGURED',
                status: 500,
                message: 'Facilitator wallet not configured',
                requestId
            });
        }

        let txHash: string;
        try {
            const execution = await BlockchainService.executeEIP3009Transfer(
                transferAuth,
                signature,
                facilitatorPrivateKey
            );

            if (!execution.success) {
                await ReplayProtection.releaseTxHash(verification.paymentHash);
                throw new Error(execution.error || 'Transfer execution failed');
            }

            txHash = execution.txHash;
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
        // Calculate human-readable amount for record
        const amountUnscaled = BigInt(authorization.value);
        const amountHuman = (Number(amountUnscaled) / Math.pow(10, tokenConfig.decimals)).toString();

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

        return {
            settled: true,
            facilitatorId: 'p402-eip3009',
            payer: authorization.from,
            receipt: {
                txHash,
                verifiedAmount: amountHuman,
                asset: tokenConfig.symbol,
                timestamp: new Date().toISOString()
            }
        };
    }
}
