'use client';

import { useWalletSync } from '@/hooks/useWalletSync';

/**
 * Headless component that handles syncing the connected wallet
 * with the user session in the background.
 */
export function WalletSync() {
    useWalletSync();
    return null;
}
