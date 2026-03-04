'use client';

import { useWalletSync } from '@/hooks/useWalletSync';
import { useCdpAuth } from '@/hooks/useCdpAuth';

/**
 * Headless component rendered once inside Providers.
 * Runs two background hooks:
 *   • useWalletSync  — links connected wallet address to NextAuth session (API call)
 *   • useCdpAuth     — bridges CDP embedded wallet → NextAuth session (signature-based)
 */
export function WalletSync() {
    useWalletSync();
    useCdpAuth();
    return null;
}
