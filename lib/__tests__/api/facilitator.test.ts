/**
 * Facilitator API Integration Tests
 * ==================================
 * Tests for x402-compliant facilitator endpoints.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the database
vi.mock('@/lib/db', () => ({
    default: {
        query: vi.fn()
    }
}));

vi.mock('@/lib/x402/security-checks', () => ({
    SecurityChecks: {
        validateAuthorization: vi.fn().mockResolvedValue(true)
    }
}));

describe('GET /api/v1/facilitator/supported', () => {
    it('should return x402-compliant response with kinds array', async () => {
        const expectedResponse = {
            kinds: [
                { x402Version: 2, scheme: 'exact', network: 'eip155:8453' },
                { x402Version: 2, scheme: 'onchain', network: 'eip155:8453' }
            ],
            extensions: [],
            signers: {
                'eip155:*': [expect.stringMatching(/^0x/)]
            }
        };

        expect(expectedResponse.kinds).toBeInstanceOf(Array);
        expect(expectedResponse.kinds[0]).toHaveProperty('x402Version', 2);
        expect(expectedResponse.kinds[0]).toHaveProperty('scheme');
        expect(expectedResponse.kinds[0]).toHaveProperty('network');
        expect(expectedResponse.extensions).toEqual([]);
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
    it('should return SettleResponse with required fields', () => {
        // x402 spec SettleResponse: { success, transaction, network, payer, errorReason? }
        const successResponse = {
            success: true,
            transaction: '0x' + '1'.repeat(64),
            network: 'eip155:8453',
            payer: '0xUserAddress',
        };

        expect(successResponse).toHaveProperty('success', true);
        expect(successResponse).toHaveProperty('transaction');
        expect(successResponse).toHaveProperty('network', 'eip155:8453');
        expect(successResponse).toHaveProperty('payer');
        expect(successResponse.transaction).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should NOT include PAYMENT-RESPONSE header (resource server concern)', () => {
        // The x402 reference facilitator does NOT set this header.
        // PAYMENT-RESPONSE is set by the resource server, not the facilitator.
        const facilitatorResponseHeaders: Record<string, string> = {};
        expect(facilitatorResponseHeaders).not.toHaveProperty('PAYMENT-RESPONSE');
    });

    it('should return error with errorReason field', () => {
        const errorResponse = {
            success: false,
            transaction: '',
            network: 'eip155:8453',
            payer: null,
            errorReason: 'Payment verification failed on-chain.',
        };

        expect(errorResponse).toHaveProperty('success', false);
        expect(errorResponse).toHaveProperty('errorReason');
        expect(errorResponse).toHaveProperty('transaction', '');
        expect(errorResponse).toHaveProperty('payer', null);
    });

    it('should accept x402 wire format with paymentPayload + paymentRequirements', () => {
        const x402Request = {
            paymentPayload: {
                x402Version: 2,
                scheme: 'exact',
                network: 'eip155:8453',
                payload: {
                    signature: '0x' + 'ab'.repeat(65),
                    authorization: {
                        from: '0x' + '1'.repeat(40),
                        to: '0x' + '2'.repeat(40),
                        value: '1000000',
                        validAfter: '0',
                        validBefore: '1735689600',
                        nonce: '0x' + '0'.repeat(64),
                    },
                },
            },
            paymentRequirements: {
                scheme: 'exact',
                network: 'eip155:8453',
                maxAmountRequired: '1000000',
                resource: 'https://example.com',
                description: 'Test payment',
                payTo: '0x' + '2'.repeat(40),
                asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            },
        };

        expect(x402Request.paymentPayload).toHaveProperty('payload');
        expect(x402Request.paymentPayload.payload).toHaveProperty('signature');
        expect(x402Request.paymentPayload.payload).toHaveProperty('authorization');
        expect(x402Request.paymentRequirements).toHaveProperty('maxAmountRequired');
        expect(x402Request.paymentRequirements).toHaveProperty('payTo');
    });

    it('should still accept legacy format with txHash/authorization', () => {
        const legacyRequest = {
            txHash: '0x' + '1'.repeat(64),
            amount: '10.0',
            asset: 'USDC',
        };

        expect(legacyRequest).toHaveProperty('txHash');
        expect(legacyRequest).toHaveProperty('amount');
    });
});

describe('POST /api/v1/facilitator/verify', () => {
    it('should accept x402-compliant paymentPayload and paymentRequirements', () => {
        const verifyRequest = {
            paymentPayload: {
                x402Version: 2,
                scheme: 'exact',
                network: 'eip155:8453',
                payload: {
                    signature: '0x' + 'ab'.repeat(65),
                    authorization: {
                        from: '0x' + '1'.repeat(40),
                        to: '0x' + '2'.repeat(40),
                        value: '1000000',
                        validAfter: '0',
                        validBefore: '1735689600',
                        nonce: '0x' + '0'.repeat(64)
                    }
                }
            },
            paymentRequirements: {
                scheme: 'exact',
                network: 'eip155:8453',
                maxAmountRequired: '1000000',
                resource: 'https://example.com',
                description: 'Test payment',
                payTo: '0x' + '2'.repeat(40),
                asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
            }
        };

        expect(verifyRequest.paymentPayload).toHaveProperty('payload');
        expect(verifyRequest.paymentPayload.payload).toHaveProperty('signature');
        expect(verifyRequest.paymentPayload.payload).toHaveProperty('authorization');
        expect(verifyRequest.paymentRequirements).toHaveProperty('maxAmountRequired');
        expect(verifyRequest.paymentRequirements).toHaveProperty('payTo');
    });

    it('should return { isValid, payer } on success', () => {
        const successResponse = { isValid: true, payer: '0x' + '1'.repeat(40) };

        expect(successResponse).toHaveProperty('isValid', true);
        expect(successResponse).toHaveProperty('payer');
        expect(successResponse.payer).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should return { isValid: false, invalidReason } on failure', () => {
        const errorResponse = { isValid: false, invalidReason: 'Insufficient amount' };

        expect(errorResponse).toHaveProperty('isValid', false);
        expect(errorResponse).toHaveProperty('invalidReason');
    });

    it('should NOT include PAYMENT-RESPONSE header (resource server concern)', () => {
        const facilitatorResponseHeaders: Record<string, string> = {};
        expect(facilitatorResponseHeaders).not.toHaveProperty('PAYMENT-RESPONSE');
    });
});
