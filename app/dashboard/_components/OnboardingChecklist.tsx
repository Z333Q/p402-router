'use client';
import React, { useEffect, useState } from 'react';
import { Card, Badge, Button } from './ui';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import dynamic from 'next/dynamic';
import clsx from 'clsx';

const CustomConnectButton = dynamic(() => import('./CustomConnectButton'), { ssr: false });

export function OnboardingChecklist() {
    const { address, isConnected } = useAccount();
    const { data: balanceData } = useBalance({
        address,
        chainId: 8453, // Base
    });

    const [dismissed, setDismissed] = useState(false);
    const [hasCheckedBazaar, setHasCheckedBazaar] = useState(false);

    // Check local storage for dismissal
    useEffect(() => {
        const d = localStorage.getItem('onboarding_dismissed');
        if (d) setDismissed(true);
    }, []);

    // Check local storage for bazaar visit
    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.pathname === '/bazaar') {
            localStorage.setItem('bazaar_visited', 'true');
        }
        const b = localStorage.getItem('bazaar_visited');
        if (b) setHasCheckedBazaar(true);
    }, []);


    const steps = [
        {
            id: 'wallet',
            label: 'Connect Wallet',
            description: 'Link your Web3 identity.',
            completed: isConnected
        },
        {
            id: 'usdc',
            label: 'Load USDC',
            description: 'Base L2 Gas & Payment Token.',
            completed: Number(balanceData?.value || 0) > 0
        },
        {
            id: 'bazaar',
            label: 'Explore Bazaar',
            description: 'Find a service to route.',
            completed: hasCheckedBazaar
        }
    ];

    const allCompleted = steps.every(s => s.completed);

    if (dismissed && allCompleted) return null;

    return (
        <Card className="bg-white border-2 border-black p-0 overflow-hidden mb-8 shadow-none rounded-none">
            <div className="bg-primary border-b-2 border-black p-4 flex justify-between items-center group">
                <div className="flex items-center gap-2">
                    <Badge tone="ok" className="bg-black text-primary font-bold rounded-none">Mission</Badge>
                    <h2 className="font-extrabold uppercase tracking-tight text-sm text-black">Initialize Your Node</h2>
                </div>
                {allCompleted ? (
                    <Button variant="dark" className="text-[10px] py-1 px-4 hover:translate-y-[-2px] transition-transform" onClick={() => setDismissed(true)}>
                        Deploy to Production
                    </Button>
                ) : (
                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest font-mono">
                        {steps.filter(s => s.completed).length} / {steps.length} Syncing...
                    </span>
                )}
            </div>

            <div className="divide-y-2 divide-black/10 bg-white">
                {steps.map((step) => (
                    <div key={step.id} className={clsx(
                        "p-5 flex items-center gap-4 transition-colors hover:bg-neutral-50 cursor-default relative",
                        step.completed ? "bg-primary/20" : "bg-white"
                    )}>
                        <div className={clsx(
                            "flex-shrink-0 transition-transform duration-200",
                            step.completed ? "text-black scale-100" : "text-neutral-300"
                        )}>
                            {step.completed ? <CheckCircle2 size={24} strokeWidth={3} /> : <Circle size={24} strokeWidth={3} />}
                        </div>
                        <div className="flex-1">
                            <div className={clsx(
                                "font-extrabold uppercase text-xs tracking-tight mb-0.5",
                                step.completed ? "text-neutral-500 line-through" : "text-black"
                            )}>
                                {step.label}
                            </div>
                            <div className="text-[10px] text-neutral-500 font-medium font-mono">
                                {step.completed ? "OPTIMIZED" : step.description}
                            </div>
                        </div>
                        {!step.completed && (
                            <>
                                {step.id === 'wallet' && (
                                    <div className="relative z-10">
                                        <CustomConnectButton />
                                    </div>
                                )}
                                {step.id === 'usdc' && (
                                    <div className="relative z-10">
                                        <a href="https://www.coinbase.com/buy/usdc" target="_blank" rel="noopener noreferrer">
                                            <Button variant="secondary" className="text-[10px] py-1 px-3 border-2 border-black hover:bg-neutral-100">
                                                Get USDC
                                            </Button>
                                        </a>
                                    </div>
                                )}
                                {step.id === 'bazaar' && (
                                    <div className="relative z-10">
                                        <a href="/bazaar">
                                            <Button variant="secondary" className="text-[10px] py-1 px-3 border-2 border-black hover:bg-neutral-100">
                                                Browse
                                            </Button>
                                        </a>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>

            {allCompleted && (
                <div className="p-4 bg-black text-primary text-center font-black uppercase text-[11px] tracking-[0.2em]">
                    Intelligence Layer Ready
                </div>
            )}
        </Card>
    );
}
