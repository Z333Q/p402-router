import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { SettlementService } from '@/lib/services/settlement-service';

vi.mock('@/lib/services/settlement-service');

function createRequest(body: unknown) {
    return new NextRequest(new URL('/api/v1/router/settle', 'https://p402.io'), {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

describe('POST /api/v1/router/settle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should reject invalid input (missing amount)', async () => {
        const req = createRequest({
            payment: { scheme: 'onchain', txHash: '0x' + 'a'.repeat(64) }
            // missing amount
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error.code).toBe('INVALID_INPUT');
    });

    it('should reject invalid tx hash format', async () => {
        const req = createRequest({
            amount: '10.00',
            payment: { scheme: 'onchain', txHash: 'invalid-hash' }
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error.code).toBe('INVALID_INPUT');
    });

    it('should handle onchain settlement correctly', async () => {
        (SettlementService.settle as any).mockResolvedValue({
            settled: true,
            facilitatorId: 'chain_base',
            receipt: {
                txHash: '0x' + 'a'.repeat(64),
                verifiedAmount: '10.00',
                asset: 'USDC',
                timestamp: new Date().toISOString()
            }
        });

        const req = createRequest({
            amount: '10.00',
            asset: 'USDC',
            payment: {
                scheme: 'onchain',
                txHash: '0x' + 'a'.repeat(64)
            }
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.settled).toBe(true);
        expect(data.scheme).toBe('onchain');
        expect(SettlementService.settle).toHaveBeenCalledOnce();
    });

    it('should handle receipt settlement correctly', async () => {
        (SettlementService.settleWithReceipt as any).mockResolvedValue({
            settled: true,
            facilitatorId: 'p402-receipt',
            receipt: {
                txHash: 'receipt:rcpt_123',
                verifiedAmount: '5.00',
                asset: 'USDC',
                timestamp: new Date().toISOString()
            }
        });

        const req = createRequest({
            amount: '5.00',
            asset: 'USDC',
            payment: {
                scheme: 'receipt',
                receiptId: 'rcpt_123'
            }
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.settled).toBe(true);
        expect(data.scheme).toBe('receipt');
        expect(SettlementService.settleWithReceipt).toHaveBeenCalledOnce();
    });

    it('should return API error when settlement service throws', async () => {
        const { ApiError } = await import('@/lib/errors');
        (SettlementService.settle as any).mockRejectedValue(
            new ApiError({
                code: 'REPLAY_DETECTED',
                status: 409,
                message: 'This transaction hash has already been processed.',
                requestId: 'test'
            })
        );

        const req = createRequest({
            amount: '10.00',
            payment: {
                scheme: 'onchain',
                txHash: '0x' + 'a'.repeat(64)
            }
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(409);
        expect(data.error.code).toBe('REPLAY_DETECTED');
    });

    it('should validate exact payment scheme fields', async () => {
        const req = createRequest({
            amount: '10.00',
            payment: {
                scheme: 'exact',
                authorization: {
                    from: 'not-an-address',
                    to: '0x' + 'b'.repeat(40),
                    value: '10000000',
                    validAfter: 0,
                    validBefore: 9999999999,
                    nonce: '0x' + 'a'.repeat(64),
                    v: 27,
                    r: '0x' + 'c'.repeat(64),
                    s: '0x' + 'd'.repeat(64)
                }
            }
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });
});
