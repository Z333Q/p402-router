import { describe, it, expect, vi, beforeEach } from 'vitest';
import { P402Client, P402Error } from './index';
import { parseUnits, encodeFunctionData } from 'viem';

// Mock global fetch
global.fetch = vi.fn();

describe('P402Client', () => {
    let client: P402Client;

    beforeEach(() => {
        vi.resetAllMocks();
        client = new P402Client({
            routerUrl: 'https://test-router.io',
            debug: false
        });
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            const defaultClient = new P402Client();
            // @ts-ignore
            expect(defaultClient.routerUrl).toBe('https://p402.io');
        });

        it('should initialize with custom values', () => {
            const customClient = new P402Client({ routerUrl: 'https://custom.io/' });
            // @ts-ignore
            expect(customClient.routerUrl).toBe('https://custom.io');
        });
    });

    describe('checkout', () => {
        const mockRequest = {
            amount: '10.0',
            network: 'eip155:8453' as any
        };

        const VALID_TX_HASH = '0x7777777777777777777777777777777777777777777777777777777777777777';
        const VALID_TREASURY = '0x1234567890123456789012345678901234567890';

        let mockSigner: any;

        beforeEach(() => {
            mockSigner = vi.fn().mockResolvedValue(VALID_TX_HASH);
        });

        it('should throw error for invalid amount', async () => {
            const result = await client.checkout({ amount: '0' }, mockSigner);
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('INVALID_INPUT');
        });

        it('should complete successful checkout flow', async () => {
            // Mock Plan API
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    allow: true,
                    candidates: [{
                        name: 'Test Facilitator',
                        payment: { treasuryAddress: VALID_TREASURY }
                    }]
                })
            } as any);

            // Mock Settle API
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    settled: true,
                    receipt: { status: 'confirmed' }
                })
            } as any);

            const result = await client.checkout(mockRequest, mockSigner);

            expect(result.success).toBe(true);
            expect(result.txHash).toBe(VALID_TX_HASH);
            expect(result.receipt.status).toBe('confirmed');
        });

        it('should handle policy denial', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    allow: false,
                    policy: { reasons: ['Insufficient funds'] }
                })
            } as any);

            const result = await client.checkout(mockRequest, mockSigner);

            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('POLICY_DENIED');
            expect(result.error?.details).toContain('Insufficient funds');
        });

        it('should handle network error in plan', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false,
                statusText: 'Service Unavailable'
            } as any);

            const result = await client.checkout(mockRequest, mockSigner);

            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('NETWORK_ERROR');
        });

        it('should handle settlement failure', async () => {
            // Plan OK
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    allow: true,
                    candidates: [{ payment: { treasuryAddress: VALID_TREASURY } }]
                })
            } as any);

            // Settle Fail
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    settled: false,
                    message: 'Invalid TX'
                })
            } as any);

            const result = await client.checkout(mockRequest, mockSigner);

            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('SETTLEMENT_FAILED');
            expect(result.error?.message).toBe('Invalid TX');
        });
    });
});
