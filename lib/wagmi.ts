/**
 * Wagmi Configuration
 * ===================
 * Dual-wallet setup: CDP Embedded Wallet (primary) + RainbowKit connectors (secondary).
 *
 * CDP Embedded Wallet is listed FIRST in connectors[] so wagmi auto-connects to it
 * when a CDP session already exists (no MetaMask required).
 *
 * RainbowKit connectors follow — users with existing EOA wallets continue to use them
 * exactly as before. Zero breaking changes for existing users.
 *
 * Provider hierarchy required in app/providers.tsx:
 *   CDPHooksProvider → WagmiProvider → QueryClientProvider → RainbowKitProvider
 */

import { createConfig, http } from 'wagmi';
import { base, mainnet, optimism } from 'wagmi/chains';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
    metaMaskWallet,
    walletConnectWallet,
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
// CDP Embedded Wallet connector — handles its own auth UI via CDPHooksProvider
// ---------------------------------------------------------------------------

export const cdpEmbeddedConnector = createCDPEmbeddedWalletConnector({
    cdpConfig,
    providerConfig: {
        chains: [base, mainnet, optimism],
        transports: {
            [base.id]:     http(),
            [mainnet.id]:  http(),
            [optimism.id]: http(),
        },
    },
});

// ---------------------------------------------------------------------------
// RainbowKit wallet list — only EOA wallets visible in the modal.
// cdpEmbeddedConnector is intentionally excluded here: CDP email auth is
// handled by CDPEmailAuth directly, not via the RainbowKit modal.
// ---------------------------------------------------------------------------

const WALLETCONNECT_PROJECT_ID =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
    '8f6e15dbc3215108255419644558435f';

const rainbowKitConnectors = connectorsForWallets(
    [
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
// Final wagmi config — CDP connector first = default auto-connect target.
// multiInjectedProviderDiscovery: false — prevents EIP-6963 auto-detection
// which would otherwise surface the CDP embedded connector in RainbowKit's
// "Installed" section. Explicit connectors above cover all intended wallets.
// ---------------------------------------------------------------------------

export const wagmiConfig = createConfig({
    connectors: [cdpEmbeddedConnector, ...rainbowKitConnectors],
    chains: [base, mainnet, optimism],
    transports: {
        [base.id]:     http(),
        [mainnet.id]:  http(),
        [optimism.id]: http(),
    },
    multiInjectedProviderDiscovery: false,
    ssr: true,
});
