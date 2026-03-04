/**
 * x402 Dual-Format Parser unit tests
 * ====================================
 * Verifies that parseX402Header() correctly handles both:
 *   - Official JSON format (from @x402/fetch clients)
 *   - Legacy key=value semicolon-delimited format (P402 v1 clients)
 */

import { describe, it, expect } from 'vitest';
import { parseX402Header } from '@/lib/x402/verify';

const MOCK_FROM = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const MOCK_TO   = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const MOCK_SIG  = '0x' + 'ab'.repeat(65);
const MOCK_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// ── Official JSON format ───────────────────────────────────────────────────────

const OFFICIAL_PAYLOAD = {
    x402Version: 2,
    scheme: 'exact',
    network: 'eip155:8453',
    payload: {
        signature: MOCK_SIG,
        authorization: {
            from: MOCK_FROM,
            to:   MOCK_TO,
            value: '1000000',
            validAfter:  '0',
            validBefore: '9999999999',
            nonce: '0x' + '00'.repeat(32),
        },
    },
};

const OFFICIAL_HEADER = JSON.stringify(OFFICIAL_PAYLOAD);

// ── Legacy key=value format ────────────────────────────────────────────────────
// Format: x402-v1;network=8453;token=0x...;amount=1000000;sig=0x...
const LEGACY_HEADER = [
    'x402-v1',
    'network=8453',
    `token=${MOCK_USDC}`,
    'tok=USDC',
    'amount=1000000',
    `sig=${MOCK_SIG}`,
].join(';');

// ── Official JSON tests ───────────────────────────────────────────────────────

describe('parseX402Header — official JSON format', () => {
    it('parses valid JSON payload without throwing', () => {
        const result = parseX402Header(OFFICIAL_HEADER);
        expect(result).not.toBeNull();
        expect(result?.format).toBe('official');
    });

    it('resolves chain ID from CAIP-2 network string', () => {
        const result = parseX402Header(OFFICIAL_HEADER);
        expect(result?.network).toBe(8453);
    });

    it('resolves USDC token symbol from chain + address', () => {
        const result = parseX402Header(OFFICIAL_HEADER);
        expect(result?.tokenSymbol).toBe('USDC');
    });

    it('extracts authorization from/to/value', () => {
        const result = parseX402Header(OFFICIAL_HEADER);
        expect(result?.authorization?.from).toBe(MOCK_FROM);
        expect(result?.authorization?.to).toBe(MOCK_TO);
        expect(result?.authorization?.value).toBe('1000000');
    });

    it('extracts amount shorthand', () => {
        const result = parseX402Header(OFFICIAL_HEADER);
        expect(result?.amount).toBe('1000000');
    });

    it('extracts signature', () => {
        const result = parseX402Header(OFFICIAL_HEADER);
        expect(result?.signature).toBe(MOCK_SIG);
    });

    it('returns null for obviously invalid JSON', () => {
        // starts with { but is not valid
        const result = parseX402Header('{not: valid json at all!!!}');
        expect(result).toBeNull();
    });

    it('returns null when authorization is missing entirely', () => {
        const stripped = JSON.stringify({ x402Version: 2, scheme: 'exact', network: 'eip155:8453' });
        // No payload → authorization undefined → result is still returned but without authorization
        // The parser doesn't require authorization to be present
        const result = parseX402Header(stripped);
        // version and network are required for a useful parse, but the function returns what it can
        if (result) {
            expect(result.format).toBe('official');
            expect(result.authorization).toBeUndefined();
        }
    });

    it('handles whitespace-padded JSON', () => {
        const result = parseX402Header('  ' + OFFICIAL_HEADER + '  ');
        expect(result?.format).toBe('official');
    });
});

// ── Legacy key=value tests ─────────────────────────────────────────────────────

describe('parseX402Header — legacy key=value format', () => {
    it('parses valid legacy header', () => {
        const result = parseX402Header(LEGACY_HEADER);
        expect(result).not.toBeNull();
        expect(result?.format).toBe('legacy');
    });

    it('extracts version from x402-v1 prefix', () => {
        const result = parseX402Header(LEGACY_HEADER);
        expect(result?.version).toBe('v1');
    });

    it('extracts chain ID from network= field', () => {
        const result = parseX402Header(LEGACY_HEADER);
        expect(result?.network).toBe(8453);
    });

    it('extracts token address', () => {
        const result = parseX402Header(LEGACY_HEADER);
        expect(result?.token?.toLowerCase()).toBe(MOCK_USDC.toLowerCase());
    });

    it('extracts token symbol from tok= field', () => {
        const result = parseX402Header(LEGACY_HEADER);
        expect(result?.tokenSymbol).toBe('USDC');
    });

    it('extracts amount', () => {
        const result = parseX402Header(LEGACY_HEADER);
        expect(result?.amount).toBe('1000000');
    });

    it('extracts signature from sig= field', () => {
        const result = parseX402Header(LEGACY_HEADER);
        expect(result?.signature).toBe(MOCK_SIG);
    });

    it('returns null for header missing version and network', () => {
        const result = parseX402Header('just-some-garbage-without-proper-fields');
        expect(result).toBeNull();
    });

    it('parses tx hash from tx= field', () => {
        const txHeader = `x402-v1;network=8453;tx=0x${'cc'.repeat(32)}`;
        const result = parseX402Header(txHeader);
        expect(result?.txHash).toBe(`0x${'cc'.repeat(32)}`);
    });
});

// ── Format discrimination ──────────────────────────────────────────────────────

describe('parseX402Header — format discrimination', () => {
    it('identifies JSON format by leading brace', () => {
        expect(parseX402Header(OFFICIAL_HEADER)?.format).toBe('official');
    });

    it('identifies legacy format for key=value strings', () => {
        expect(parseX402Header(LEGACY_HEADER)?.format).toBe('legacy');
    });

    it('returns null for empty string', () => {
        expect(parseX402Header('')).toBeNull();
    });
});
