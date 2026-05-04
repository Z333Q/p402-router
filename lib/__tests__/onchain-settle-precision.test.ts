/**
 * Regression test: onchain scheme dispatch — bigint precision
 * ============================================================
 * Ensures that when scheme === 'onchain', maxAmountRequired is forwarded to
 * verifyTransaction as a bigint via BigInt(str), and never passed through
 * Number() / 1e6 (the float-lossy conversion used by the EIP-3009 path).
 *
 * 7 is chosen deliberately: it is non-trivial and would round-trip cleanly
 * through float arithmetic, but its correct bigint form (7n) is easy to
 * distinguish from a mistaken float-converted value (7e-6 ≈ 0.000007 → 0n).
 *
 * Regression guard: ensures the early-return at settle/route.ts:139-141
 * remains intact and that future refactors cannot silently route an onchain
 * request through the EIP-3009 float path.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mock replay protection (dynamic import inside handleOnchainSettle) ─────────
vi.mock('@/lib/replay-protection', () => ({
    ReplayProtection: {
        claimTxHash: vi.fn().mockResolvedValue({ claimed: true }),
        releaseTxHash: vi.fn().mockResolvedValue(undefined),
    },
}));

// ── Mock verifyTransaction — capture the minAmount argument ────────────────────
const mockVerifyTransaction = vi.fn();
vi.mock('@/lib/x402/verify', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/x402/verify')>();
    return {
        ...actual,
        verifyTransaction: mockVerifyTransaction,
    };
});

// ── Suppress billing / plan side-effects ──────────────────────────────────────
vi.mock('@/lib/billing/plan-guard', () => ({
    getTenantPlan: vi.fn().mockResolvedValue('free'),
}));
vi.mock('@/lib/billing/entitlements', () => ({
    computePlatformFeeUsd: vi.fn().mockReturnValue(0),
}));
vi.mock('@/lib/billing/usage', () => ({
    recordUsage: vi.fn().mockResolvedValue(undefined),
}));

// ── Fixture values ────────────────────────────────────────────────────────────

const MOCK_TX_HASH = `0x${'7a'.repeat(32)}` as const;
const MOCK_PAY_TO  = '0xe00DD502FF571F3C721f22B3F9E525312d21D797';
const MOCK_SENDER  = '0x66BFD98Eddb19EdD8b357ccd67fBDdA41ddB3A2b';
const TEMPO_ASSET  = '0x20C000000000000000000000b9537d11c60E8b50'; // USDC.e

/** Build a minimal valid onchain settle request body */
function onchainBody(maxAmountRequired: string) {
    return {
        paymentPayload: {
            scheme: 'onchain',
            network: 'eip155:4217',
            payload: { txHash: MOCK_TX_HASH },
        },
        paymentRequirements: {
            scheme: 'onchain',
            network: 'eip155:4217',
            maxAmountRequired,
            payTo: MOCK_PAY_TO,
            asset: TEMPO_ASSET,
        },
    };
}

function makeRequest(body: object) {
    return new NextRequest('http://localhost/api/v1/facilitator/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('onchain settle — precision regression', () => {
    beforeEach(() => {
        mockVerifyTransaction.mockReset();
        // Default: simulate a valid Transfer event returning exactly the expected amount
        mockVerifyTransaction.mockResolvedValue({
            valid: true,
            amount: 7n,
            sender: MOCK_SENDER,
        });
    });

    it('passes maxAmountRequired as bigint 7n to verifyTransaction, not as float', async () => {
        // Regression test: ensures the onchain scheme dispatch never silently routes
        // through the EIP-3009 float path (Number(atomic) / 1e6). If it did, the
        // value 7 would be converted to 0.000007 → BigInt(0) before reaching verify.
        const { POST } = await import('@/app/api/v1/facilitator/settle/route');

        const res = await POST(makeRequest(onchainBody('7')));
        expect(res.status).toBe(200);

        const json = await res.json() as { success: boolean };
        expect(json.success).toBe(true);

        // Confirm verifyTransaction was called exactly once
        expect(mockVerifyTransaction).toHaveBeenCalledTimes(1);

        // The third argument is minAmount — must be bigint 7n
        const [, , minAmount] = mockVerifyTransaction.mock.calls[0] as [unknown, unknown, bigint, ...unknown[]];
        expect(typeof minAmount).toBe('bigint');
        expect(minAmount).toBe(7n);
    });

    it('correctly rejects when verifyTransaction returns invalid (amount mismatch)', async () => {
        mockVerifyTransaction.mockResolvedValue({
            valid: false,
            error: 'Insufficient amount: got 6, expected ≥ 7',
        });

        const { POST } = await import('@/app/api/v1/facilitator/settle/route');
        const res = await POST(makeRequest(onchainBody('7')));

        expect(res.status).toBe(400);
        const json = await res.json() as { success: boolean; errorReason: string };
        expect(json.success).toBe(false);
        expect(json.errorReason).toMatch(/not found|Insufficient|invalid/i);
    });

    it('uses BigInt conversion, not Number/float, for a round-trip-safe value', async () => {
        // 7 passes through Number() cleanly (7.0 === 7), but the float path
        // divides by 1e6 before settlement, turning 7 → 0 raw units.
        // This test confirms the BigInt path is taken regardless.
        mockVerifyTransaction.mockResolvedValue({
            valid: true,
            amount: 7n,
            sender: MOCK_SENDER,
        });

        const { POST } = await import('@/app/api/v1/facilitator/settle/route');
        await POST(makeRequest(onchainBody('7')));

        const [, , minAmount] = mockVerifyTransaction.mock.calls[0] as [unknown, unknown, bigint, ...unknown[]];
        // If the float path were taken: Number('7') / 1e6 = 7e-6, BigInt(7e-6) = 0n
        expect(minAmount).not.toBe(0n);
        expect(minAmount).toBe(7n);
    });
});
