'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import dynamic from 'next/dynamic';

const ConnectButton = dynamic(
    () => import('@rainbow-me/rainbowkit').then(mod => mod.ConnectButton),
    { ssr: false }
);
import { Card, Badge } from './ui';
import { clsx } from 'clsx';
import { ShieldAlert, Fingerprint } from 'lucide-react';

type WalletRequiredProps = {
    children: React.ReactNode;
    title?: string;
    description?: string;
    mode?: 'hard' | 'soft';
};

export function WalletRequired({
    children,
    title = "Identity Connection Required",
    description = "You need to connect an x402-compliant wallet to anchor routing policies and sign settlement challenges.",
    mode = 'soft'
}: WalletRequiredProps) {
    const { isConnected } = useAccount();

    if (isConnected) {
        return <>{children}</>;
    }

    if (mode === 'soft') {
        return (
            <div className="space-y-4">
                <div className="bg-primary/90 backdrop-blur-sm border-2 border-black p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-black/5 animate-scanline pointer-events-none" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-black text-primary border-2 border-black shrink-0">
                            <Fingerprint size={24} className="animate-pulse" />
                        </div>
                        <div className="space-y-1">
                            <div className="font-black uppercase tracking-tighter text-black flex items-center gap-2">
                                {title}
                                <Badge tone="bad" className="bg-black text-white border-none py-0.5 px-1.5 text-[8px]">Unanchored</Badge>
                            </div>
                            <p className="text-xs font-bold text-black/70 max-w-xl leading-relaxed italic">{description}</p>
                        </div>
                    </div>
                    <div className="shrink-0 relative z-10">
                        <ConnectButton
                            label="Anchor Identity"
                            accountStatus="address"
                            showBalance={false}
                        />
                    </div>
                </div>
                <div className="opacity-40 grayscale pointer-events-none select-none">
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div className="relative group">
            <div className="filter blur-md grayscale opacity-20 pointer-events-none user-select-none transition-all duration-700">
                {children}
            </div>
            <div className="absolute inset-0 flex items-center justify-center z-50 p-6 animate-in fade-in zoom-in-95 duration-500">
                <Card className="w-full max-w-md bg-white border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] p-8 text-center space-y-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 animate-flicker pointer-events-none" />

                    <div className="space-y-4 pt-4">
                        <div className="mx-auto w-16 h-16 bg-primary border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <ShieldAlert size={32} className="text-black" />
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-black italic">{title}</h2>
                        <p className="text-sm font-medium text-neutral-600 leading-relaxed px-4 italic underline decoration-primary/20 decoration-2 underline-offset-4">
                            {description}
                        </p>
                    </div>

                    <div className="flex justify-center pt-4">
                        <ConnectButton
                            label="Connect Wallet to Unlock Console"
                            accountStatus="address"
                            showBalance={false}
                        />
                    </div>

                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">
                        Secure x402 Handshake Pending...
                    </div>
                </Card>
            </div>
        </div>
    );
}
