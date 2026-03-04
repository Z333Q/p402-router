/**
 * useCdpAuth
 * ==========
 * Bridges a connected CDP Embedded Wallet → NextAuth session.
 *
 * Flow:
 *   1. wagmi's useAccount() detects a connected CDP wallet (address available)
 *   2. If no NextAuth session exists yet, this hook triggers sign-in automatically
 *   3. The wallet signs a timestamped message (proves ownership, expires in 5 min)
 *   4. signIn('cdp-wallet', { address, signature, message }) creates the session
 *   5. Tenant is auto-provisioned by lib/auth.ts signIn callback (same as Google)
 *
 * The hook is idempotent — it only fires once per wallet address per page session.
 * It is safe to include in the WalletSync component alongside useWalletSync.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useSession, signIn } from 'next-auth/react';

export function useCdpAuth(): void {
    const { address, isConnected, connector } = useAccount();
    const { data: session, status } = useSession();
    const { signMessageAsync } = useSignMessage();
    const lastBridged = useRef<string | null>(null);

    useEffect(() => {
        // Only run when:
        //   • wallet is connected AND has an address
        //   • session loading is complete
        //   • no active NextAuth session
        //   • not already bridged for this address
        if (
            !isConnected ||
            !address ||
            status === 'loading' ||
            status === 'authenticated' ||
            lastBridged.current === address
        ) {
            return;
        }

        // Only auto-bridge for CDP-sourced connections to avoid hijacking
        // existing EOA / RainbowKit sessions unnecessarily.
        const connectorId = connector?.id ?? '';
        const isCdpConnector =
            connectorId.includes('cdp') ||
            connectorId.includes('coinbase-cdp');

        if (!isCdpConnector) return;

        const bridge = async () => {
            try {
                const timestamp = Math.floor(Date.now() / 1000);
                const message = [
                    'Sign in to P402',
                    `Address: ${address}`,
                    `Timestamp: ${timestamp}`,
                ].join('\n');

                const signature = await signMessageAsync({ message });

                const result = await signIn('cdp-wallet', {
                    address,
                    signature,
                    message,
                    redirect: false,
                });

                if (result?.ok) {
                    lastBridged.current = address;
                }
            } catch (err) {
                // Non-fatal: user can still use the app; manual sign-in will work
                console.error('[useCdpAuth] Bridge failed:', err);
            }
        };

        void bridge();
    }, [address, isConnected, status, connector, signMessageAsync]);
}
