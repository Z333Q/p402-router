'use client';

/**
 * Root Providers
 * ==============
 * Provider hierarchy (order is critical):
 *
 *   SessionProvider           — NextAuth JWT session
 *     CDPHooksProvider        — CDP embedded wallet context (MUST wrap WagmiProvider)
 *       WagmiProvider         — wagmi config with CDP + RainbowKit connectors
 *         QueryClientProvider — TanStack React Query
 *           RainbowKitProvider — RainbowKit modal (secondary wallet UI)
 *             WalletSync      — headless: syncs connected wallet → NextAuth session
 *
 * CDP Embedded Wallet auth is handled separately via useCdpAuth hook / CDPEmailAuth
 * component — CDPHooksProvider just sets up the context; it does not show any UI.
 */

import React from 'react';
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import { CDPHooksProvider } from '@coinbase/cdp-hooks';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { WalletSync } from '@/components/WalletSync';
import { wagmiConfig, cdpConfig } from '@/lib/wagmi';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Prevent refetch storms on window focus during development
            refetchOnWindowFocus: false,
            staleTime: 30_000,
        },
    },
});

const rainbowTheme = lightTheme({
    accentColor: '#B6FF2E',
    accentColorForeground: '#000',
    borderRadius: 'none',
    fontStack: 'system',
});

function WalletProviders({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={rainbowTheme}>
                    <WalletSync />
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

export function Providers({ children }: { children: React.ReactNode }) {
    // CDPHooksProvider throws "Project ID is required" when projectId is empty.
    // Guard here so the site degrades to RainbowKit-only when the env var is unset.
    const hasCdpProjectId = Boolean(cdpConfig.projectId);

    return (
        <SessionProvider>
            {hasCdpProjectId ? (
                <CDPHooksProvider config={cdpConfig}>
                    <WalletProviders>{children}</WalletProviders>
                </CDPHooksProvider>
            ) : (
                <WalletProviders>{children}</WalletProviders>
            )}
        </SessionProvider>
    );
}
