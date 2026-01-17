import { renderHook, waitFor } from '@testing-library/react';
import { useWalletSync } from '../useWalletSync';
import { useAccount } from 'wagmi';
import { useSession } from 'next-auth/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('wagmi', () => ({
    useAccount: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
    useSession: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('useWalletSync()', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValue({
            json: () => Promise.resolve({ ok: true })
        });
    });

    it('should not link if wallet is disconnected', () => {
        vi.mocked(useAccount).mockReturnValue({ isConnected: false, address: undefined } as any);
        vi.mocked(useSession).mockReturnValue({ status: 'unauthenticated', data: null } as any);

        const { result } = renderHook(() => useWalletSync());
        expect(result.current.isLinked).toBe(false);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('should attempt to link if wallet is connected and authenticated', async () => {
        vi.mocked(useAccount).mockReturnValue({ isConnected: true, address: '0x123' } as any);
        vi.mocked(useSession).mockReturnValue({
            status: 'authenticated',
            data: { user: { email: 'test@p402.io' } }
        } as any);

        const { result } = renderHook(() => useWalletSync());

        await waitFor(() => expect(result.current.isLinked).toBe(true));
        expect(fetch).toHaveBeenCalledWith('/api/v1/user/link-wallet', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ walletAddress: '0x123' })
        }));
    });

    it('should handle link errors gracefully', async () => {
        vi.mocked(useAccount).mockReturnValue({ isConnected: true, address: '0x456' } as any);
        vi.mocked(useSession).mockReturnValue({
            status: 'authenticated',
            data: { user: { email: 'err@p402.io' } }
        } as any);

        (global.fetch as any).mockResolvedValueOnce({
            json: () => Promise.resolve({ ok: false, error: 'ALREADY_LINKED' })
        });

        const { result } = renderHook(() => useWalletSync());

        await waitFor(() => expect(result.current.error).toBe('ALREADY_LINKED'));
        expect(result.current.isLinked).toBe(false);
    });
});
