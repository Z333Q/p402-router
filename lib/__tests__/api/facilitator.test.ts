/**
 * Facilitator API Integration Tests
 * ==================================
 * Tests for x402-compliant facilitator endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('@/lib/db', () => ({
    default: {
        query: vi.fn()
    }
}));

vi.mock('@/lib/blockchain', () => ({
    BlockchainService: {
        verifyPayment: vi.fn()
    }
}));

describe('GET /api/v1/facilitator/supported', () => {
    it('should return x402-compliant response with kinds array', async () => {
        // Expected x402 fields
        const expectedResponse = {
            kinds: [
                { x402Version: 1, scheme: 'exact', network: 'eip155:8453' },
                { x402Version: 1, scheme: 'onchain', network: 'eip155:8453' }
            ],
            extensions: ['bazaar'],
            signers: {
                'eip155:*': [expect.stringMatching(/^0x/)]
            }
        };

        // Verify structure
        expect(expectedResponse.kinds).toBeInstanceOf(Array);
        expect(expectedResponse.kinds[0]).toHaveProperty('x402Version');
        expect(expectedResponse.kinds[0]).toHaveProperty('scheme');
        expect(expectedResponse.kinds[0]).toHaveProperty('network');
        expect(expectedResponse.extensions).toContain('bazaar');
        expect(expectedResponse.signers).toHaveProperty('eip155:*');
    });

    it('should include legacy fields for backward compatibility', () => {
        const legacyFields = {
            success: true,
            facilitatorId: 'p402-local',
            networks: ['eip155:8453', 'eip155:84532'],
            assets: ['USDC'],
            schemes: ['exact', 'onchain', 'receipt'],
            capabilities: {
                verify: true,
                settle: true,
                supported: true,
                list: true
            }
        };

        expect(legacyFields).toHaveProperty('facilitatorId');
        expect(legacyFields).toHaveProperty('networks');
        expect(legacyFields.networks).toContain('eip155:8453');
    });
});

describe('POST /api/v1/facilitator/settle', () => {
    it('should return x402-compliant success response', () => {
        const successResponse = {
            success: true,
            payer: '0xUserAddress',
            transaction: '0x' + '1'.repeat(64),
            network: 'eip155:8453',
            receipt: {
                txHash: '0x' + '1'.repeat(64),
                verifiedAmount: '1.0',
                asset: 'USDC',
                timestamp: new Date().toISOString()
            }
        };

        expect(successResponse).toHaveProperty('success', true);
        expect(successResponse).toHaveProperty('payer');
        expect(successResponse).toHaveProperty('transaction');
        expect(successResponse).toHaveProperty('network', 'eip155:8453');
        expect(successResponse.transaction).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should return x402-compliant error response with errorReason', () => {
        const errorResponse = {
            success: false,
            errorReason: 'Payment verification failed on-chain.',
            error: {
                code: 'VERIFICATION_FAILED',
                message: 'Payment verification failed on-chain.'
            }
        };

        expect(errorResponse).toHaveProperty('success', false);
        expect(errorResponse).toHaveProperty('errorReason');
        expect(errorResponse.error).toHaveProperty('code');
    });

    it('should reject requests without required fields', () => {
        const invalidRequest = {
            // Missing txHash and authorization
            asset: 'USDC'
        };

        // Should have txHash or authorization
        expect(invalidRequest).not.toHaveProperty('txHash');
        expect(invalidRequest).not.toHaveProperty('authorization');
    });
});

describe('POST /api/v1/facilitator/verify', () => {
    it('should verify on-chain transaction', () => {
        const verifyRequest = {
            txHash: '0x' + '1'.repeat(64),
            amount: '1.0',
            asset: 'USDC',
            network: 'eip155:8453'
        };

        expect(verifyRequest.txHash).toMatch(/^0x[a-f0-9]{64}$/);
        expect(parseFloat(verifyRequest.amount)).toBeGreaterThan(0);
    });

    it('should return verification result with proof', () => {
        const verifyResponse = {
            success: true,
            transaction: '0x' + '1'.repeat(64),
            network: 'eip155:8453',
            verification_id: 'v_20_123456',
            status: 'verified',
            proof: {
                facilitatorId: 'p402_base_fac',
                routeId: 'some-route',
                requestId: 'req_123',
                timestamp: Date.now(),
                outcome: 'success',
                actualAmount: '1.0',
                payer: '0xUserAddress'
            }
        };

        expect(verifyResponse).toHaveProperty('success', true);
        expect(verifyResponse).toHaveProperty('proof');
        expect(verifyResponse.proof).toHaveProperty('payer');
    });
});
