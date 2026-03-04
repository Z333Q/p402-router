/**
 * CDP Server Wallet unit tests
 * ============================
 * Tests cdp-server-wallet.ts in isolation by mocking the cdp-client module
 * directly (avoids ESM constructor issues with the CDP SDK mock).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock fns at module scope ───────────────────────────────────────────────────
const mockGetOrCreateAccount = vi.fn();
const mockCreatePolicy = vi.fn();

// ── Mock @/lib/cdp-client (not the raw SDK) ───────────────────────────────────
let cdpEnabledFlag = true;

vi.mock('@/lib/cdp-client', () => ({
    isCdpEnabled: () => cdpEnabledFlag,
    getCdpClientAsync: async () => ({
        evm: { getOrCreateAccount: mockGetOrCreateAccount },
        policies: { createPolicy: mockCreatePolicy },
    }),
    _resetCdpClient: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn().mockResolvedValue({ rows: [] }) },
}));

import {
    getOrProvisionAgentWallet,
    createSessionSpendingPolicy,
} from '@/lib/cdp-server-wallet';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getOrProvisionAgentWallet', () => {
    beforeEach(() => {
        cdpEnabledFlag = true;
        vi.clearAllMocks();
    });

    it('returns address, wallet name, and source "cdp"', async () => {
        mockGetOrCreateAccount.mockResolvedValue({
            address: '0xABCDEF1234567890abcdef1234567890ABCDEF12',
        });

        const result = await getOrProvisionAgentWallet('agent-xyz-123');

        expect(result.address).toBe('0xABCDEF1234567890abcdef1234567890ABCDEF12');
        expect(result.cdpWalletName).toBe('p402-agent-agent-xyz-123');
        expect(result.source).toBe('cdp');
        expect(mockGetOrCreateAccount).toHaveBeenCalledWith({
            name: 'p402-agent-agent-xyz-123',
        });
    });

    it('sanitises special characters to hyphens', async () => {
        mockGetOrCreateAccount.mockResolvedValue({ address: '0x1234567890123456789012345678901234567890' });
        await getOrProvisionAgentWallet('agent with spaces & SPECIAL!chars');

        const callArg = mockGetOrCreateAccount.mock.calls[0]?.[0] as { name: string };
        expect(callArg.name).toMatch(/^p402-agent-/);
        expect(callArg.name).not.toMatch(/[^a-z0-9-]/);
    });

    it('lowercases the wallet name', async () => {
        mockGetOrCreateAccount.mockResolvedValue({ address: '0x1234567890123456789012345678901234567890' });
        await getOrProvisionAgentWallet('MyAgentID');

        const callArg = mockGetOrCreateAccount.mock.calls[0]?.[0] as { name: string };
        expect(callArg.name).toBe('p402-agent-myagentid');
    });

    it('truncates agent IDs longer than 50 chars', async () => {
        mockGetOrCreateAccount.mockResolvedValue({ address: '0x1234567890123456789012345678901234567890' });
        await getOrProvisionAgentWallet('a'.repeat(100));

        const callArg = mockGetOrCreateAccount.mock.calls[0]?.[0] as { name: string };
        // prefix 'p402-agent-' (11) + max 50 sanitised chars = 61
        expect(callArg.name.length).toBeLessThanOrEqual(61);
    });

    it('throws when CDP is not enabled', async () => {
        cdpEnabledFlag = false;
        await expect(getOrProvisionAgentWallet('test')).rejects.toThrow(/not enabled/i);
    });
});

describe('createSessionSpendingPolicy', () => {
    beforeEach(() => {
        cdpEnabledFlag = true;
        vi.clearAllMocks();
    });

    it('returns a policy ID on success', async () => {
        mockCreatePolicy.mockResolvedValue({ id: 'pol_test_001' });
        const id = await createSessionSpendingPolicy(50, '0x1234567890123456789012345678901234567890');
        expect(id).toBe('pol_test_001');
    });

    it('returns null when policy creation throws (non-fatal)', async () => {
        mockCreatePolicy.mockRejectedValue(new Error('CDP policy API error'));
        const id = await createSessionSpendingPolicy(50, '0x1234567890123456789012345678901234567890');
        expect(id).toBeNull();
    });

    it('returns null when CDP is disabled', async () => {
        cdpEnabledFlag = false;
        const id = await createSessionSpendingPolicy(100, '0x1234567890123456789012345678901234567890');
        expect(id).toBeNull();
    });
});

describe('cdp-client flag toggle', () => {
    it('isCdpEnabled() respects the flag for enabling/disabling auto-pay', async () => {
        const { isCdpEnabled } = await import('@/lib/cdp-client');
        cdpEnabledFlag = true;
        expect(isCdpEnabled()).toBe(true);
        cdpEnabledFlag = false;
        expect(isCdpEnabled()).toBe(false);
    });
});
