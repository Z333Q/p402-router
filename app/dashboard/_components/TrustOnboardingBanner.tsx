'use client';

import React, { useState, useEffect } from 'react';
import { Card, Badge, Button } from './ui';
import { ShieldCheck, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';

export function TrustOnboardingBanner() {
    const [dismissed, setDismissed] = useState(true);

    useEffect(() => {
        const d = localStorage.getItem('trust_onboarding_dismissed');
        if (!d) setDismissed(false);
    }, []);

    const handleDismiss = () => {
        localStorage.setItem('trust_onboarding_dismissed', 'true');
        setDismissed(true);
    };

    if (dismissed) return null;

    return (
        <Card className="bg-white border-2 border-black p-0 overflow-hidden mb-8 shadow-none">
            <div className="bg-primary border-b-2 border-black p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-black" strokeWidth={3} />
                    <h2 className="font-extrabold uppercase tracking-tight text-sm text-black">
                        Trustless Agent Identity
                    </h2>
                </div>
                <button onClick={handleDismiss} className="p-1 hover:bg-black/10 transition-colors">
                    <X size={14} strokeWidth={3} />
                </button>
            </div>

            <div className="p-6">
                <p className="text-sm font-bold text-neutral-600 mb-6">
                    ERC-8004 enables on-chain identity and reputation for AI agents. Build trust through verified interactions.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    {[
                        { step: '01', title: 'Register Agent NFT', desc: 'Mint your on-chain identity on Base' },
                        { step: '02', title: 'Build Reputation', desc: 'Earn trust through settlements' },
                        { step: '03', title: 'Enable Validation', desc: 'Guard high-value transactions' },
                    ].map((item, i) => (
                        <div key={item.step} className="flex-1 p-4 border-2 border-black/10 relative">
                            <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                                Step {item.step}
                            </div>
                            <div className="text-xs font-extrabold uppercase mb-1">{item.title}</div>
                            <div className="text-[10px] text-neutral-500 font-medium">{item.desc}</div>
                            {i < 2 && (
                                <ArrowRight size={12} className="absolute right-[-14px] top-1/2 -translate-y-1/2 text-neutral-300 hidden sm:block" />
                            )}
                        </div>
                    ))}
                </div>

                <Link href="/docs/erc8004">
                    <Button variant="dark" size="sm" className="text-[10px]">
                        Read ERC-8004 Guide
                    </Button>
                </Link>
            </div>
        </Card>
    );
}
