import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { base, mainnet, optimism } from 'wagmi/chains'

export const wagmiConfig = getDefaultConfig({
    appName: 'P402 Router Console',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '8f6e15dbc3215108255419644558435f',
    chains: [base, mainnet, optimism],
    ssr: true, // Server-side rendering support
})
