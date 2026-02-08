import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReplayProtection } from '../replay-protection';
import pool from '@/lib/db';

describe('ReplayProtection', () => {
    const TEST_TX_HASH = '0x' + 'a'.repeat(64);
    const TEST_REQUEST_ID = 'test_req_1';
    const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001';

    beforeEach(async () => {
        // Clean up test data
        await pool.query('DELETE FROM processed_tx_hashes WHERE tx_hash = $1', [TEST_TX_HASH]);
    });

    afterEach(async () => {
        await pool.query('DELETE FROM processed_tx_hashes WHERE tx_hash = $1', [TEST_TX_HASH]);
    });

    describe('claimTxHash', () => {
        it('should successfully claim a new transaction hash', async () => {
            const result = await ReplayProtection.claimTxHash({
                txHash: TEST_TX_HASH,
                requestId: TEST_REQUEST_ID,
                tenantId: TEST_TENANT_ID,
                amountUsd: 10.0
            });

            expect(result.claimed).toBe(true);
        });

        it('should reject duplicate claims', async () => {
            // First claim succeeds
            const result1 = await ReplayProtection.claimTxHash({
                txHash: TEST_TX_HASH,
                requestId: 'req_1',
                tenantId: TEST_TENANT_ID
            });
            expect(result1.claimed).toBe(true);

            // Second claim fails
            const result2 = await ReplayProtection.claimTxHash({
                txHash: TEST_TX_HASH,
                requestId: 'req_2',
                tenantId: TEST_TENANT_ID
            });
            expect(result2.claimed).toBe(false);
            expect(result2.existingRequestId).toBe('req_1');
        });

        // it('should handle race conditions correctly', async () => {
        //     // Simulate 20 concurrent claims (reduce from 100 for speed)
        //     const promises = Array(20).fill(null).map((_, i) =>
        //         ReplayProtection.claimTxHash({
        //             txHash: TEST_TX_HASH,
        //             requestId: `req_${i}`,
        //             tenantId: TEST_TENANT_ID
        //         })
        //     );

        //     const results = await Promise.all(promises);
        //     const successCount = results.filter(r => r.claimed).length;
        //     const failCount = results.filter(r => !r.claimed).length;

        //     // Exactly one should succeed
        //     expect(successCount).toBe(1);
        //     expect(failCount).toBe(19);
        // });

        it('should normalize tx hash case', async () => {
            // Claim with uppercase
            const result1 = await ReplayProtection.claimTxHash({
                txHash: '0x' + 'A'.repeat(64),
                requestId: 'req_1',
                tenantId: TEST_TENANT_ID
            });
            expect(result1.claimed).toBe(true);

            // Try to claim with lowercase
            const result2 = await ReplayProtection.claimTxHash({
                txHash: '0x' + 'a'.repeat(64),
                requestId: 'req_2',
                tenantId: TEST_TENANT_ID
            });
            expect(result2.claimed).toBe(false);
        });

        it('should reject invalid tx hash format', async () => {
            await expect(ReplayProtection.claimTxHash({
                txHash: 'invalid',
                requestId: TEST_REQUEST_ID,
                tenantId: TEST_TENANT_ID
            })).rejects.toThrow('Invalid transaction hash format');
        });
    });

    describe('releaseTxHash', () => {
        it('should release a claimed hash', async () => {
            // Claim
            await ReplayProtection.claimTxHash({
                txHash: TEST_TX_HASH,
                requestId: TEST_REQUEST_ID,
                tenantId: TEST_TENANT_ID
            });

            // Release
            await ReplayProtection.releaseTxHash(TEST_TX_HASH);

            // Should be able to claim again
            const result = await ReplayProtection.claimTxHash({
                txHash: TEST_TX_HASH,
                requestId: 'req_new',
                tenantId: TEST_TENANT_ID
            });
            expect(result.claimed).toBe(true);
        });
    });
});
