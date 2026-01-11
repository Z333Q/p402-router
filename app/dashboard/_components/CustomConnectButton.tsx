'use client';

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from './ui';

export default function CustomConnectButton() {
    return (
        <ConnectButton.Custom>
            {({ openConnectModal, mounted, account, chain }) => {
                const ready = mounted;
                const connected = ready && account && chain;

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
                                    <Button variant="primary" onClick={openConnectModal} className="text-[10px] py-1 px-3">
                                        Connect
                                    </Button>
                                );
                            }
                            return null;
                        })()}
                    </div>
                );
            }}
        </ConnectButton.Custom>
    );
}
