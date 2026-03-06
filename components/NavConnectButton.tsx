'use client';

import React from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuthState } from '@/lib/hooks/useAuthState';

export default function NavConnectButton() {
    const { state: authState, isLoading } = useAuthState();

    // Google user with no wallet linked — show activation prompt instead of wallet UI
    if (!isLoading && authState === 'identity_only') {
        return (
            <Link
                href="/dashboard/settings?activate=payments"
                className="flex items-center gap-1.5 h-9 px-3 bg-warning text-black font-black text-[10px] uppercase tracking-widest border-2 border-black hover:bg-black hover:text-warning transition-colors whitespace-nowrap"
            >
                <span className="text-xs">⚡</span>
                Activate Payments
            </Link>
        );
    }

    return (
        <ConnectButton.Custom>
            {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
            }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected = ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated');

                return (
                    <div
                        {...(!ready && {
                            'aria-hidden': true,
                            'style': {
                                opacity: 0,
                                pointerEvents: 'none',
                                userSelect: 'none',
                            },
                        })}
                    >
                        {(() => {
                            if (!connected) {
                                return (
                                    <button onClick={openConnectModal} type="button" className="btn btn-primary text-xs !py-1.5 !px-3">
                                        Connect Wallet
                                    </button>
                                );
                            }

                            if (chain.unsupported) {
                                return (
                                    <button onClick={openChainModal} type="button" className="btn bg-error text-white text-xs !py-1.5 !px-3">
                                        Wrong Network
                                    </button>
                                );
                            }

                            return (
                                <div className="flex gap-3">
                                    <button
                                        onClick={openChainModal}
                                        type="button"
                                        className="btn btn-secondary flex items-center gap-1"
                                    >
                                        {chain.hasIcon && (
                                            <div className="w-3 h-3 rounded-full overflow-hidden mr-1 bg-gray-200">
                                                {chain.iconUrl && (
                                                    <img
                                                        alt={chain.name ?? 'Chain icon'}
                                                        src={chain.iconUrl}
                                                        className="w-3 h-3"
                                                    />
                                                )}
                                            </div>
                                        )}
                                        <span className="text-xs">{chain.name}</span>
                                    </button>

                                    <button onClick={openAccountModal} type="button" className="btn btn-secondary text-xs !py-1.5 !px-3">
                                        {account.displayName}
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                );
            }}
        </ConnectButton.Custom>
    );
}
