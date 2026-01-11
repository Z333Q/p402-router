import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SettlementService } from '../settlement-service'
import pool from '@/lib/db'
import { BlockchainService } from '@/lib/blockchain'
import { getTokenConfig } from '@/lib/tokens'

// Mock dependencies
vi.mock('@/lib/db', () => ({
    default: {
        query: vi.fn()
    }
}))
vi.mock('@/lib/blockchain')
vi.mock('@/lib/tokens')
vi.mock('@/lib/analytics')

describe('SettlementService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const mockRequest = {
        txHash: '0x123...abc', // format check skipped by service (handled by zod in controller)
        amount: '10.00',
        asset: 'USDC'
    }

    it('should settle successfully when all conditions met', async () => {
        // 1. Mock Token
        (getTokenConfig as any).mockReturnValue({ decimals: 6 });

        // 2. Mock Replay Check (No rows = no replay)
        (pool.query as any)
            .mockResolvedValueOnce({ rows: [] }) // Replay check
            .mockResolvedValueOnce({ rows: [{ treasury_address: '0xTreasury' }] }) // Tenant check
            .mockResolvedValueOnce({}); // Insert event

        // 3. Mock Blockchain Verify
        (BlockchainService.verifyPayment as any).mockResolvedValue({
            verified: true,
            actualAmount: '10.00',
            asset: 'USDC',
            payerAddress: '0xPayer'
        });

        const result = await SettlementService.settle('req_1', mockRequest);

        expect(result.settled).toBe(true);
        expect(result.receipt.verifiedAmount).toBe('10.00');
    })

    it('should throw REPLAY_DETECTED if tx already processed', async () => {
        (getTokenConfig as any).mockReturnValue({ decimals: 6 });
        // Mock Replay Check (Rows exist = replay)
        (pool.query as any).mockResolvedValueOnce({ rows: [{ id: 'evt_1' }] });

        await expect(SettlementService.settle('req_1', mockRequest))
            .rejects
            .toThrow("This transaction hash has already been processed.");
    })

    it('should throw VERIFICATION_FAILED if blockchain check fails', async () => {
        (getTokenConfig as any).mockReturnValue({ decimals: 6 });
        (pool.query as any)
            .mockResolvedValueOnce({ rows: [] }) // Replay ok
            .mockResolvedValueOnce({ rows: [{ treasury_address: '0xTreasury' }] }); // Tenant ok

        (BlockchainService.verifyPayment as any).mockResolvedValue({
            verified: false,
            error: 'Tx not found'
        });

        await expect(SettlementService.settle('req_1', mockRequest))
            .rejects
            .toThrow("Payment verification failed on-chain");
    })
})
