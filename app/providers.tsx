'use client'

import React from 'react'
import {
    RainbowKitProvider,
    getDefaultConfig,
    lightTheme,
} from '@rainbow-me/rainbowkit'
import { wagmiConfig } from '@/lib/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { SessionProvider } from 'next-auth/react'
import { WalletSync } from '@/components/WalletSync'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <WagmiProvider config={wagmiConfig}>
                <QueryClientProvider client={queryClient}>
                    <RainbowKitProvider
                        theme={lightTheme({
                            accentColor: '#B6FF2E',
                            accentColorForeground: '#000',
                            borderRadius: 'none',
                            fontStack: 'system',
                        })}
                    >
                        <WalletSync />
                        {children}
                    </RainbowKitProvider>
                </QueryClientProvider>
            </WagmiProvider>
        </SessionProvider>
    )
}
