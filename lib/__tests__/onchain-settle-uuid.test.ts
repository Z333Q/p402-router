/**
 * Unit test: handleOnchainSettle passes a valid UUID to claimTxHash
 * =================================================================
 * Regression guard for the bug found in Phase 1 Track 2 where
 * tenantId: 'onchain' was passed to claimTxHash, causing Postgres error
 * 22P02 (invalid_text_representation) because tenant_id is UUID NOT NULL.
 *
 * Fix: tenantId: '00000000-0000-0000-0000-000000000001' (system tenant UUID).
 * This test asserts the parameter shape of the claimTxHash call so the bug
 * cannot be re-introduced silently.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SYSTEM_TENANT_UUID = '00000000-0000-0000-0000-000000000001';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockClaimTxHash = vi.fn();
const mockReleaseTxHash = vi.fn();

vi.mock('@/lib/replay-protection', () => ({
    ReplayProtection: {
        claimTxHash: mockClaimTxHash,
        releaseTxHash: mockReleaseTxHash,
        isProcessed: vi.fn().mockResolvedValue(false),
    },
}));

const mockVerifyTransaction = vi.fn();
vi.mock('@/lib/x402/verify', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/x402/verify')>();
    return { ...actual, verifyTransaction: mockVerifyTransaction };
});

vi.mock('@/lib/billing/plan-guard',    () => ({ getTenantPlan: vi.fn().mockResolvedValue('free') }));
vi.mock('@/lib/billing/entitlements',  () => ({ computePlatformFeeUsd: vi.fn().mockReturnValue(0) }));
vi.mock('@/lib/billing/usage',         () => ({ recordUsage: vi.fn().mockResolvedValue(undefined) }));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_TX = `0x${'ab'.repeat(32)}` as const;
const TREASURY = '0xe00DD502FF571F3C721f22B3F9E525312d21D797';
const USDC_E   = '0x20C000000000000000000000b9537d11c60E8b50';
const SENDER   = '0x66BFD98Eddb19EdD8b357ccd67fBDdA41ddB3A2b';

function makeOnchainRequest(txHash = VALID_TX) {
    return new NextRequest('http://localhost/api/v1/facilitator/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            paymentPayload: {
                scheme:  'onchain',
                network: 'eip155:4217',
                payload: { txHash },
            },
            paymentRequirements: {
                scheme:             'onchain',
                network:            'eip155:4217',
                maxAmountRequired:  '1',
                payTo:              TREASURY,
                asset:              USDC_E,
            },
        }),
    });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('handleOnchainSettle — claimTxHash UUID regression', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mockClaimTxHash.mockResolvedValue({ claimed: true });
        mockVerifyTransaction.mockResolvedValue({ valid: true, amount: 1n, sender: SENDER });
    });

    it('passes a valid UUID as tenantId to claimTxHash, not the string "onchain"', async () => {
        const { POST } = await import('@/app/api/v1/facilitator/settle/route');
        await POST(makeOnchainRequest());

        expect(mockClaimTxHash).toHaveBeenCalledTimes(1);
        const [callArg] = mockClaimTxHash.mock.calls[0] as [{ tenantId: string }];

        // Must be a valid UUID — 'onchain' is not
        expect(callArg.tenantId).toMatch(UUID_REGEX);
        expect(callArg.tenantId).not.toBe('onchain');
    });

    it('passes the system tenant UUID specifically', async () => {
        const { POST } = await import('@/app/api/v1/facilitator/settle/route');
        await POST(makeOnchainRequest());

        const [callArg] = mockClaimTxHash.mock.calls[0] as [{ tenantId: string }];
        expect(callArg.tenantId).toBe(SYSTEM_TENANT_UUID);
    });

    it('passes settlementType: "onchain" (the correct field for the scheme name)', async () => {
        const { POST } = await import('@/app/api/v1/facilitator/settle/route');
        await POST(makeOnchainRequest());

        const [callArg] = mockClaimTxHash.mock.calls[0] as [{ settlementType: string; tenantId: string }];
        expect(callArg.settlementType).toBe('onchain');
        // settlementType and tenantId must be different fields with different values
        expect(callArg.tenantId).not.toBe(callArg.settlementType);
    });

    it('succeeds end-to-end when claimTxHash returns claimed: true', async () => {
        const { POST } = await import('@/app/api/v1/facilitator/settle/route');
        const res = await POST(makeOnchainRequest());
        const json = await res.json() as { success: boolean; transaction: string };

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.transaction).toBe(VALID_TX);
    });

    it('returns 409 when claimTxHash reports already claimed (replay)', async () => {
        mockClaimTxHash.mockResolvedValue({ claimed: false, existingRequestId: 'req_prior' });

        const { POST } = await import('@/app/api/v1/facilitator/settle/route');
        const res = await POST(makeOnchainRequest());
        const json = await res.json() as { success: boolean };

        expect(res.status).toBe(409);
        expect(json.success).toBe(false);
    });
});
