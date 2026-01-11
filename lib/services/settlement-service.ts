import pool from '@/lib/db'
import { BlockchainService } from '@/lib/blockchain'
import { getTokenConfig } from '@/lib/tokens'
import { P402Analytics } from '@/lib/analytics'
import { ApiError } from '@/lib/errors'

export interface SettleRequest {
    tenantId?: string;
    decisionId?: string;
    txHash: string;
    amount: string;
    asset: string;
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
        const { tenantId, decisionId, txHash, amount, asset } = input

        // 1. Resolve Token
        const tokenConfig = getTokenConfig(asset)
        if (!tokenConfig && asset !== 'native') {
            throw new ApiError({
                code: 'UNSUPPORTED_ASSET',
                status: 400,
                message: `Asset ${asset} is not supported.`,
                requestId
            })
        }

        // 2. Replay Protection
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
            txHash,
            amount,
            asset,
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
                    JSON.stringify({ txHash, amount, asset, error: verification.error })
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
                JSON.stringify({ txHash, amount, asset }),
                verification.actualAmount,
                verification.asset || asset
            ]
        )

        // Async tracking
        P402Analytics.trackSettlement(
            verification.actualAmount || amount,
            verification.asset || asset,
            targetTenantId || 'anonymous'
        );

        return {
            settled: true,
            facilitatorId: 'chain_base',
            receipt: {
                txHash,
                verifiedAmount: verification.actualAmount,
                asset: verification.asset,
                timestamp: new Date().toISOString()
            }
        }
    }
}
