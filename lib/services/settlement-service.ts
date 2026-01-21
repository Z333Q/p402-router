import pool from '@/lib/db'
import { BlockchainService } from '@/lib/blockchain'
import { getTokenConfig } from '@/lib/tokens'
import { P402Analytics } from '@/lib/analytics'
import { ApiError } from '@/lib/errors'
import { EIP3009Authorization } from '@/lib/x402/eip3009'
import { getFacilitatorWallet } from '@/lib/x402/facilitator-wallet'
import { SecurityChecks } from '@/lib/x402/security-checks'

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

        // 2. Replay Protection
        // txHash guarded above
        const replayCheck = await pool.query(
            "SELECT id FROM events WHERE (raw_payload->>'txHash') = $1 AND outcome = 'settled'",
            [txHash]
        )
        if (replayCheck.rows.length > 0) {
            throw new ApiError({
                code: 'REPLAY_DETECTED',
                status: 409,
                message: 'This transaction hash has already been processed.',
                requestId
            })
        }

        // 3. Get Tenant Treasury Address
        // Defaulting to a specific ID if not provided - replicating logic from controller
        const targetTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
        const tenantRes = await pool.query('SELECT treasury_address FROM tenants WHERE id = $1', [targetTenantId])
        const treasury = tenantRes.rows[0]?.treasury_address

        if (!treasury) {
            throw new ApiError({
                code: 'NO_TREASURY',
                status: 500,
                message: 'Tenant configuration error',
                requestId
            })
        }

        // 4. Verify On-Chain
        const verification = await BlockchainService.verifyPayment(
            txHash!, // Verified by guard clause above
            amount || '0',
            assetCode,
            treasury
        )

        if (!verification.verified) {
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
            targetTenantId || 'anonymous'
        );

        return {
            settled: true,
            facilitatorId: 'chain_base',
            receipt: {
                txHash: txHash!,
                verifiedAmount: verification.actualAmount,
                asset: verification.asset,
                timestamp: new Date().toISOString()
            }
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

        // 1. Resolve Token Config
        const tokenConfig = getTokenConfig(asset);
        if (!tokenConfig || !tokenConfig.supportsEIP3009) {
            throw new ApiError({
                code: 'UNSUPPORTED_FEATURE',
                status: 400,
                message: `Asset ${asset} does not support EIP-3009 settlement.`,
                requestId
            })
        }

        // 2. Replay Protection (Nonce check)
        const nonceUsed = await pool.query(
            "SELECT id FROM events WHERE (raw_payload->'authorization'->>'nonce') = $1 AND outcome = 'settled'",
            [authorization.nonce]
        );

        if (nonceUsed.rows.length > 0) {
            throw new ApiError({
                code: 'REPLAY_DETECTED',
                status: 409,
                message: 'This authorization nonce has already been used.',
                requestId
            });
        }

        // 3. Resolve Tenant Treasury
        const targetTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
        const tenantRes = await pool.query('SELECT treasury_address FROM tenants WHERE id = $1', [targetTenantId]);
        const treasury = tenantRes.rows[0]?.treasury_address;

        if (!treasury) {
            throw new ApiError({
                code: 'NO_TREASURY',
                status: 500,
                message: 'Tenant configuration error',
                requestId
            });
        }

        // 4. Validate Recipient
        if (authorization.to.toLowerCase() !== treasury.toLowerCase()) {
            throw new ApiError({
                code: 'INVALID_RECIPIENT',
                status: 400,
                message: `Authorization recipient ${authorization.to} does not match tenant treasury ${treasury}`,
                requestId
            });
        }

        // 5. Security Checks (Pre-flight)
        await SecurityChecks.validateAuthorization(authorization, tokenConfig, requestId);

        // 6. Execute On-Chain
        let txHash: string;
        try {
            const facilitator = getFacilitatorWallet();
            txHash = await facilitator.executeSettlement(tokenConfig.address, authorization, requestId);
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
            receipt: {
                txHash,
                verifiedAmount: amountHuman,
                asset: tokenConfig.symbol,
                timestamp: new Date().toISOString()
            }
        };
    }
}
