import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SettlementService } from '../settlement-service'
import pool from '@/lib/db'
import { BlockchainService } from '@/lib/blockchain'
import { getTokenConfig } from '@/lib/tokens'
import { ReplayProtection } from '@/lib/replay-protection'

// Mock dependencies
vi.mock('@/lib/db', () => ({
    default: {
        query: vi.fn()
    }
}))
vi.mock('@/lib/blockchain')
vi.mock('@/lib/tokens')
vi.mock('@/lib/analytics')
vi.mock('@/lib/replay-protection')

describe('SettlementService', () => {
    const VALID_TX_HASH = '0x' + '1'.repeat(64);

    beforeEach(() => {
        vi.clearAllMocks()
    })

    const mockRequest = {
        txHash: VALID_TX_HASH,
        amount: '10.00',
        asset: 'USDC'
    }

    it('should settle successfully when all conditions met', async () => {
        (getTokenConfig as any).mockReturnValue({ decimals: 6, symbol: 'USDC' });

        // Mock replay protection claim success
        (ReplayProtection.claimTxHash as any).mockResolvedValue({ claimed: true });

        // Mock tenant treasury lookup
        (pool.query as any)
            .mockResolvedValueOnce({ rows: [{ treasury_address: '0xTreasury' }] }) // Tenant check
            .mockResolvedValueOnce({}); // Insert event

        // Mock blockchain verify
        (BlockchainService.verifyPayment as any).mockResolvedValue({
            verified: true,
            actualAmount: '10.00',
            asset: 'USDC',
            payerAddress: '0xPayer'
        });

        const result = await SettlementService.settle('req_1', mockRequest);

        expect(result.settled).toBe(true);
        expect(result.receipt.verifiedAmount).toBe('10.00');
        expect(result.receipt.txHash).toBe(VALID_TX_HASH);
        expect(ReplayProtection.claimTxHash).toHaveBeenCalledOnce();
    })

    it('should throw REPLAY_DETECTED if tx already processed', async () => {
        (getTokenConfig as any).mockReturnValue({ decimals: 6, symbol: 'USDC' });

        // Mock replay protection returns already claimed
        (ReplayProtection.claimTxHash as any).mockResolvedValue({
            claimed: false,
            existingRequestId: 'req_original',
            existingProcessedAt: new Date()
        });

        await expect(SettlementService.settle('req_1', mockRequest))
            .rejects
            .toThrow("This transaction hash has already been processed.");
    })

    it('should throw VERIFICATION_FAILED if blockchain check fails', async () => {
        (getTokenConfig as any).mockReturnValue({ decimals: 6, symbol: 'USDC' });

        // Mock replay claim success
        (ReplayProtection.claimTxHash as any).mockResolvedValue({ claimed: true });
        (ReplayProtection.releaseTxHash as any).mockResolvedValue(undefined);

        // Tenant lookup succeeds
        (pool.query as any)
            .mockResolvedValueOnce({ rows: [{ treasury_address: '0xTreasury' }] }) // Tenant
            .mockResolvedValueOnce({}); // Log failure event

        // Blockchain verification fails
        (BlockchainService.verifyPayment as any).mockResolvedValue({
            verified: false,
            error: 'Tx not found'
        });

        await expect(SettlementService.settle('req_1', mockRequest))
            .rejects
            .toThrow("Payment verification failed on-chain");

        // Should release the tx hash on verification failure
        expect(ReplayProtection.releaseTxHash).toHaveBeenCalledWith(VALID_TX_HASH);
    })

    it('should throw when txHash is missing for legacy settlement', async () => {
        (getTokenConfig as any).mockReturnValue({ decimals: 6, symbol: 'USDC' });

        await expect(SettlementService.settle('req_1', {
            amount: '10.00',
            asset: 'USDC'
            // no txHash
        })).rejects.toThrow('txHash is required for legacy settlement');
    })

    it('should throw NO_TREASURY when tenant has no treasury configured', async () => {
        (getTokenConfig as any).mockReturnValue({ decimals: 6, symbol: 'USDC' });
        (ReplayProtection.claimTxHash as any).mockResolvedValue({ claimed: true });
        (ReplayProtection.releaseTxHash as any).mockResolvedValue(undefined);

        // Tenant lookup returns no treasury
        (pool.query as any).mockResolvedValueOnce({ rows: [{}] });

        await expect(SettlementService.settle('req_1', mockRequest))
            .rejects
            .toThrow('Tenant configuration error');

        // Should release claim on config error
        expect(ReplayProtection.releaseTxHash).toHaveBeenCalledWith(VALID_TX_HASH);
    })
})
