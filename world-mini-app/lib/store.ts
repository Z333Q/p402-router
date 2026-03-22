/**
 * Zustand persisted store — user state shared across all Mini App screens.
 * Human identity is already verified by World App; we just read it.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorldStore {
    // Identity (set after MiniKit.walletAuth)
    walletAddress: string | null;
    humanVerified: boolean;

    // Credit balance (synced from P402 API)
    creditsRemaining: number | null;
    humanUsageRemaining: number | null;
    reputationScore: number | null;

    // Actions
    setWallet: (address: string) => void;
    setVerified: (verified: boolean) => void;
    setCredits: (balance: number | null) => void;
    setHumanUsage: (remaining: number | null) => void;
    setReputation: (score: number | null) => void;
    reset: () => void;
}

export const useWorldStore = create<WorldStore>()(
    persist(
        (set) => ({
            walletAddress: null,
            humanVerified: false,
            creditsRemaining: null,
            humanUsageRemaining: null,
            reputationScore: null,

            setWallet: (address) => set({ walletAddress: address }),
            setVerified: (verified) => set({ humanVerified: verified }),
            setCredits: (balance) => set({ creditsRemaining: balance }),
            setHumanUsage: (remaining) => set({ humanUsageRemaining: remaining }),
            setReputation: (score) => set({ reputationScore: score }),
            reset: () => set({
                walletAddress: null,
                humanVerified: false,
                creditsRemaining: null,
                humanUsageRemaining: null,
                reputationScore: null,
            }),
        }),
        {
            name: 'p402-world-store',
        }
    )
);
