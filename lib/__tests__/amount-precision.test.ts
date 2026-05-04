/**
 * Amount precision round-trip tests
 * ===================================
 * Verifies that the formatUnits / parseUnits replacements introduced in
 * Phase 1 Prompt 4.5 are precision-clean for all practical USDC.e amounts.
 *
 * The prior float code (Number(atomic) / 1e6 and BigInt(Math.round(parseFloat(x) * 1e6)))
 * was non-monotonic for sub-cent amounts: values below 1e-6 rounded to 0, and
 * values above Number.MAX_SAFE_INTEGER lost integer precision.
 *
 * formatUnits(bigint, decimals) → string   (viem, precision-clean)
 * parseUnits(string, decimals)  → bigint   (viem, precision-clean, inverse of formatUnits)
 */

import { describe, it, expect } from 'vitest';
import { formatUnits, parseUnits } from 'viem';

const DECIMALS = 6; // USDC.e on Tempo, USDC on Base

function roundTrip(raw: bigint): bigint {
    return parseUnits(formatUnits(raw, DECIMALS), DECIMALS);
}

describe('formatUnits / parseUnits round-trip — USDC.e 6-decimal precision', () => {
    it('round-trips 7n (the precision regression test value)', () => {
        expect(roundTrip(7n)).toBe(7n);
    });

    it('round-trips 1n (the Phase 1 settlement floor: $0.000001)', () => {
        expect(roundTrip(1n)).toBe(1n);
    });

    it('round-trips 1_000_000n (1 full USDC.e = $1.00)', () => {
        expect(roundTrip(1_000_000n)).toBe(1_000_000n);
    });

    it('round-trips 1_000_000_000n (1000 USDC.e = $1000.00)', () => {
        expect(roundTrip(1_000_000_000n)).toBe(1_000_000_000n);
    });

    it('round-trips 123_456_789_012_345_678n (above Number.MAX_SAFE_INTEGER)', () => {
        // Number.MAX_SAFE_INTEGER = 9_007_199_254_740_991
        // This value is ~123 trillion USDC.e — well above MAX_SAFE_INTEGER.
        // The old Number() path would silently lose precision here.
        const large = 123_456_789_012_345_678n;
        expect(roundTrip(large)).toBe(large);
    });

    it('formatUnits(1n, 6) produces "0.000001" (not "1e-6" or "0")', () => {
        expect(formatUnits(1n, 6)).toBe('0.000001');
    });

    it('formatUnits(7n, 6) produces "0.000007" (not "7e-6" or "0")', () => {
        expect(formatUnits(7n, 6)).toBe('0.000007');
    });

    it('old float path loses precision above Number.MAX_SAFE_INTEGER', () => {
        // Documenting the exact failure mode the fix prevents.
        // Number.MAX_SAFE_INTEGER = 9_007_199_254_740_991
        // Any bigint above this cannot be represented exactly as a float.
        // The old code: (Number(amountAtomic) / 1e6).toString()
        // For large amounts: Number(large) silently rounds to nearest float,
        // so the string and any subsequent parse produce a wrong atomic value.
        const large = 123_456_789_012_345_678n; // above MAX_SAFE_INTEGER

        // Old float path: Number() truncates precision, round-trip fails
        const floatResult = BigInt(
            Math.round(parseFloat((Number(large) / 1e6).toString()) * 1e6)
        );
        expect(floatResult).not.toBe(large); // float path loses precision

        // Correct path: formatUnits → parseUnits preserves all bits
        expect(roundTrip(large)).toBe(large);
    });
});
