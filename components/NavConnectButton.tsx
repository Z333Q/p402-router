'use client';

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function NavConnectButton() {
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
