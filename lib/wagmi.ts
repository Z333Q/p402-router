/**
 * Wagmi Configuration
 * ===================
 * Dual-wallet setup: CDP Embedded Wallet (hidden) + RainbowKit EOA connectors.
 *
 * CDP Embedded Wallet is registered with wagmi via a hidden RainbowKit wallet
 * so it never appears in the "Connect a Wallet" modal. CDP auth is handled
 * exclusively by the CDPEmailAuth component (email OTP flow on /login).
 *
 * EOA wallets (MetaMask, WalletConnect, Browser Wallet) appear in the modal
 * for users who already have a crypto wallet.
 *
 * Provider hierarchy required in app/providers.tsx:
 *   CDPHooksProvider → WagmiProvider → QueryClientProvider → RainbowKitProvider
 */

import { createConfig, http } from 'wagmi';
import { base, mainnet, optimism } from 'wagmi/chains';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import type { Wallet } from '@rainbow-me/rainbowkit';
import {
    metaMaskWallet,
    walletConnectWallet,
    injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createCDPEmbeddedWalletConnector } from '@coinbase/cdp-wagmi';
import type { Config as CDPConfig } from '@coinbase/cdp-core';

// ---------------------------------------------------------------------------
// CDP config — projectId is public-safe (Next.js NEXT_PUBLIC_ prefix)
// ---------------------------------------------------------------------------

const CDP_PROJECT_ID =
    process.env.NEXT_PUBLIC_CDP_PROJECT_ID ?? '';

export const cdpConfig: CDPConfig = {
    projectId: CDP_PROJECT_ID,
    ethereum: {
        // 'eoa' = standard EOA wallet (vs 'smart' for EIP-4337 smart accounts)
        createOnLogin: 'eoa',
    },
};

// ---------------------------------------------------------------------------
// Hidden CDP wallet — registered with wagmi for auto-connect + signing,
// but hidden from the RainbowKit modal. Users authenticate via CDPEmailAuth.
// ---------------------------------------------------------------------------

const hiddenCdpWallet = (): Wallet => ({
    id: 'cdp-embedded-wallet',
    name: 'CDP Embedded Wallet',
    iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
    iconBackground: '#000',
    hidden: () => true,
    createConnector: () => createCDPEmbeddedWalletConnector({
        cdpConfig,
        providerConfig: {
            chains: [base, mainnet, optimism],
            transports: {
                [base.id]:     http(),
                [mainnet.id]:  http(),
                [optimism.id]: http(),
            },
        },
    }),
});

// ---------------------------------------------------------------------------
// RainbowKit connectors — CDP hidden, EOA wallets visible in modal.
// ---------------------------------------------------------------------------

const WALLETCONNECT_PROJECT_ID =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
    '8f6e15dbc3215108255419644558435f';

const rainbowKitConnectors = connectorsForWallets(
    [
        {
            // Hidden — registered with wagmi but never shown in modal
            groupName: 'Embedded',
            wallets: [hiddenCdpWallet],
        },
        {
            groupName: 'Connect existing wallet',
            wallets: [metaMaskWallet, walletConnectWallet, injectedWallet],
        },
    ],
    {
        appName: 'P402 Router Console',
        projectId: WALLETCONNECT_PROJECT_ID,
    },
);

// ---------------------------------------------------------------------------
// Final wagmi config — all connectors via connectorsForWallets (no duplicates).
// multiInjectedProviderDiscovery: false prevents EIP-6963 auto-detection which
// would otherwise surface the CDP provider in the "Installed" section.
// ---------------------------------------------------------------------------

export const wagmiConfig = createConfig({
    connectors: rainbowKitConnectors,
    chains: [base, mainnet, optimism],
    transports: {
        [base.id]:     http(),
        [mainnet.id]:  http(),
        [optimism.id]: http(),
    },
    multiInjectedProviderDiscovery: false,
    ssr: true,
});
