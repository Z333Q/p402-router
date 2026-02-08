import pool from '@/lib/db';
import { ApiError } from '@/lib/errors';

export interface ClaimTxHashInput {
    txHash: string;
    requestId: string;
    tenantId: string;
    amountUsd?: number;
    asset?: string;
    network?: string;
    settlementType?: 'onchain' | 'exact' | 'receipt';
}

export interface ClaimResult {
    claimed: boolean;
    existingRequestId?: string;
    existingProcessedAt?: Date;
}

/**
 * ReplayProtection provides atomic transaction hash claiming
 * to prevent double-spending attacks.
 * 
 * Usage:
 *   1. Call claimTxHash() BEFORE doing any verification
 *   2. If claimed=false, reject as replay attempt
 *   3. If verification fails, call releaseTxHash() to allow retry
 */
export class ReplayProtection {

    /**
     * Atomically claim a transaction hash.
     * 
     * Uses INSERT ... ON CONFLICT DO NOTHING to handle race conditions.
     * Two concurrent requests with the same txHash will both attempt INSERT,
     * but only one will succeed due to PRIMARY KEY constraint.
     * 
     * @returns ClaimResult indicating whether we claimed this hash
     */
    static async claimTxHash(input: ClaimTxHashInput): Promise<ClaimResult> {
        const { txHash, requestId, tenantId, amountUsd, asset, network, settlementType } = input;

        // Normalize to lowercase for consistent comparison
        const normalizedHash = txHash.toLowerCase();

        // Validate format
        if (!normalizedHash.match(/^0x[a-f0-9]{64}$/)) {
            throw new ApiError({
                code: 'INVALID_TX_HASH',
                status: 400,
                message: 'Invalid transaction hash format',
                requestId
            });
        }

        try {
            // Atomic insert - will fail if hash already exists
            const result = await pool.query(
                `INSERT INTO processed_tx_hashes 
                 (tx_hash, request_id, tenant_id, amount_usd, asset, network, settlement_type)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (tx_hash) DO NOTHING
                 RETURNING tx_hash`,
                [normalizedHash, requestId, tenantId, amountUsd || null, asset || 'USDC', network || 'base', settlementType || 'onchain']
            );

            if (result.rowCount === 1) {
                // Successfully claimed
                return { claimed: true };
            }

            // Hash already exists - get info about original
            const existing = await pool.query(
                `SELECT request_id, processed_at FROM processed_tx_hashes WHERE tx_hash = $1`,
                [normalizedHash]
            );

            return {
                claimed: false,
                existingRequestId: existing.rows[0]?.request_id,
                existingProcessedAt: existing.rows[0]?.processed_at
            };

        } catch (error: any) {
            console.error('[ReplayProtection] Database error:', error);
            throw new ApiError({
                code: 'INTERNAL_ERROR',
                status: 500,
                message: 'Failed to verify transaction uniqueness',
                requestId
            });
        }
    }

    /**
     * Release a claimed transaction hash.
     * 
     * Call this if verification fails AFTER claiming, to allow
     * the user to retry with the same hash if needed.
     */
    static async releaseTxHash(txHash: string): Promise<void> {
        const normalizedHash = txHash.toLowerCase();
        await pool.query(
            'DELETE FROM processed_tx_hashes WHERE tx_hash = $1',
            [normalizedHash]
        );
    }

    /**
     * Check if a transaction has been processed (read-only).
     * 
     * Use for informational queries. Do NOT use for authorization -
     * always use claimTxHash() which is atomic.
     */
    static async isProcessed(txHash: string): Promise<boolean> {
        const result = await pool.query(
            'SELECT 1 FROM processed_tx_hashes WHERE tx_hash = $1',
            [txHash.toLowerCase()]
        );
        return result.rowCount > 0;
    }

    /**
     * Cleanup old transaction records.
     * 
     * Run via daily cron job to prevent table bloat.
     * 30 days retention is sufficient since blockchain finality
     * is achieved within minutes.
     */
    static async cleanup(daysToKeep: number = 30): Promise<number> {
        const result = await pool.query(
            `DELETE FROM processed_tx_hashes 
             WHERE processed_at < NOW() - INTERVAL '1 day' * $1
             RETURNING tx_hash`,
            [daysToKeep]
        );

        const deletedCount = result.rowCount || 0;
        console.log(`[ReplayProtection] Cleaned up ${deletedCount} old records`);
        return deletedCount;
    }
}
