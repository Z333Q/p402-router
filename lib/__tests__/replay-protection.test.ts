import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReplayProtection } from '../replay-protection';

// Mock the database module
vi.mock('@/lib/db', () => ({
    default: {
        query: vi.fn()
    }
}));

import pool from '@/lib/db';

describe('ReplayProtection', () => {
    const TEST_TX_HASH = '0x' + 'a'.repeat(64);
    const TEST_REQUEST_ID = 'test_req_1';
    const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('claimTxHash', () => {
        it('should successfully claim a new transaction hash', async () => {
            // INSERT succeeds (rowCount=1 means new row inserted)
            (pool.query as any).mockResolvedValueOnce({ rowCount: 1, rows: [{ tx_hash: TEST_TX_HASH }] });

            const result = await ReplayProtection.claimTxHash({
                txHash: TEST_TX_HASH,
                requestId: TEST_REQUEST_ID,
                tenantId: TEST_TENANT_ID,
                amountUsd: 10.0
            });

            expect(result.claimed).toBe(true);
            expect(pool.query).toHaveBeenCalledTimes(1);
            expect((pool.query as any).mock.calls[0][1]).toContain(TEST_TX_HASH);
        });

        it('should reject duplicate claims', async () => {
            // INSERT returns 0 rows (conflict, hash already exists)
            (pool.query as any).mockResolvedValueOnce({ rowCount: 0, rows: [] });
            // SELECT returns existing record
            (pool.query as any).mockResolvedValueOnce({
                rows: [{ request_id: 'req_1', processed_at: new Date('2024-01-01') }]
            });

            const result = await ReplayProtection.claimTxHash({
                txHash: TEST_TX_HASH,
                requestId: 'req_2',
                tenantId: TEST_TENANT_ID
            });

            expect(result.claimed).toBe(false);
            expect(result.existingRequestId).toBe('req_1');
            expect(pool.query).toHaveBeenCalledTimes(2);
        });

        it('should normalize tx hash case', async () => {
            const uppercaseHash = '0x' + 'A'.repeat(64);
            const expectedNormalized = '0x' + 'a'.repeat(64);

            (pool.query as any).mockResolvedValueOnce({ rowCount: 1, rows: [{ tx_hash: expectedNormalized }] });

            await ReplayProtection.claimTxHash({
                txHash: uppercaseHash,
                requestId: 'req_1',
                tenantId: TEST_TENANT_ID
            });

            // Should have been called with the lowercase normalized hash
            expect((pool.query as any).mock.calls[0][1][0]).toBe(expectedNormalized);
        });

        it('should reject invalid tx hash format', async () => {
            await expect(ReplayProtection.claimTxHash({
                txHash: 'invalid',
                requestId: TEST_REQUEST_ID,
                tenantId: TEST_TENANT_ID
            })).rejects.toThrow('Invalid transaction hash format');

            // DB should never be called for invalid format
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('should reject tx hash that is too short', async () => {
            await expect(ReplayProtection.claimTxHash({
                txHash: '0xabc',
                requestId: TEST_REQUEST_ID,
                tenantId: TEST_TENANT_ID
            })).rejects.toThrow('Invalid transaction hash format');
        });

        it('should wrap database errors as INTERNAL_ERROR', async () => {
            (pool.query as any).mockRejectedValueOnce(new Error('connection refused'));

            await expect(ReplayProtection.claimTxHash({
                txHash: TEST_TX_HASH,
                requestId: TEST_REQUEST_ID,
                tenantId: TEST_TENANT_ID
            })).rejects.toThrow('Failed to verify transaction uniqueness');
        });
    });

    describe('releaseTxHash', () => {
        it('should release a claimed hash', async () => {
            (pool.query as any).mockResolvedValueOnce({ rowCount: 1 });

            await ReplayProtection.releaseTxHash(TEST_TX_HASH);

            expect(pool.query).toHaveBeenCalledTimes(1);
            expect((pool.query as any).mock.calls[0][0]).toContain('DELETE');
            expect((pool.query as any).mock.calls[0][1][0]).toBe(TEST_TX_HASH);
        });

        it('should normalize hash case when releasing', async () => {
            const uppercaseHash = '0x' + 'B'.repeat(64);
            const expectedNormalized = '0x' + 'b'.repeat(64);

            (pool.query as any).mockResolvedValueOnce({ rowCount: 1 });

            await ReplayProtection.releaseTxHash(uppercaseHash);

            expect((pool.query as any).mock.calls[0][1][0]).toBe(expectedNormalized);
        });
    });

    describe('isProcessed', () => {
        it('should return true when hash exists', async () => {
            (pool.query as any).mockResolvedValueOnce({ rowCount: 1 });

            const result = await ReplayProtection.isProcessed(TEST_TX_HASH);
            expect(result).toBe(true);
        });

        it('should return false when hash does not exist', async () => {
            (pool.query as any).mockResolvedValueOnce({ rowCount: 0 });

            const result = await ReplayProtection.isProcessed(TEST_TX_HASH);
            expect(result).toBe(false);
        });
    });

    describe('cleanup', () => {
        it('should delete old records and return count', async () => {
            (pool.query as any).mockResolvedValueOnce({ rowCount: 5, rows: [] });

            const count = await ReplayProtection.cleanup(30);
            expect(count).toBe(5);
            expect((pool.query as any).mock.calls[0][1][0]).toBe(30);
        });

        it('should default to 30 days retention', async () => {
            (pool.query as any).mockResolvedValueOnce({ rowCount: 0, rows: [] });

            await ReplayProtection.cleanup();
            expect((pool.query as any).mock.calls[0][1][0]).toBe(30);
        });
    });
});
