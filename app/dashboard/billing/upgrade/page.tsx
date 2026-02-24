'use client';

import React, { useState } from 'react';
import { Badge, Button, ProTierBadge } from '../../_components/ui';
import { Zap, CreditCard, Wallet, Check, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UpgradePlanPage() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleStripeCheckout = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v2/billing/checkout', {
                method: 'POST',
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert(data.error || 'Failed to initialize checkout');
                setLoading(false);
            }
        } catch (err) {
            console.error("Failed to init checkout", err);
            alert('Billing system unreachable');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <Badge variant="primary" className="mb-4">Scale Your Intelligence</Badge>
                <h2 className="text-5xl font-black uppercase tracking-tighter text-black italic mb-6">
                    Upgrade your routing power
                </h2>
                <p className="mt-4 text-sm font-mono text-neutral-500 uppercase tracking-widest font-bold max-w-2xl mx-auto">
                    Choose between traditional credit card subscriptions (Stripe) or <br className="hidden md:block" />
                    Web3 smart wallet billing streams (Base L2 / USDC).
                </p>
            </div>

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">

                {/* Stripe Option */}
                <div className="border-4 border-black bg-white p-10 flex flex-col shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] relative transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black uppercase text-black tracking-tight flex items-center gap-2">
                                <CreditCard className="w-6 h-6" /> Stripe Pro
                            </h3>
                        </div>

                        <div className="mb-8 border-b-4 border-black pb-8">
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-7xl font-black text-black tracking-tighter">$499</span>
                                <span className="text-xl font-bold uppercase text-neutral-400">/ mo</span>
                            </div>
                            <p className="text-xs font-mono font-black uppercase text-neutral-500">Standard Pro routing tier paid via Credit Card.</p>
                        </div>

                        <ul className="space-y-5 mb-10">
                            <FeatureItem text="Unlimited Bandwidth (Consumption based)" />
                            <FeatureItem text="Advanced Analytics & Retries" />
                            <FeatureItem text="Custom Routing Policies" />
                            <FeatureItem text="Priority Routing Infrastructure" />
                            <FeatureItem text="Premium Developer Support" />
                        </ul>
                    </div>

                    <Button
                        onClick={handleStripeCheckout}
                        loading={loading}
                        variant="primary"
                        className="w-full py-6 text-xl tracking-widest"
                    >
                        {loading ? 'INITIALIZING...' : 'UPGRADE VIA STRIPE'}
                    </Button>
                </div>

                {/* Web3 / Crypto Option */}
                <div className="border-4 border-black bg-black p-10 flex flex-col shadow-[16px_16px_0px_0px_rgba(182,255,46,1)] relative transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(182,255,46,1)] overflow-hidden">
                    {/* RECOMMENDED BADGE */}
                    <div className="absolute top-0 right-0 bg-[#B6FF2E] text-black font-black uppercase px-6 py-2 text-xs tracking-widest border-l-4 border-b-4 border-black -rotate-1 translate-x-1">
                        Best Value
                    </div>

                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-8 text-white">
                            <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                <Wallet className="w-6 h-6 text-[#B6FF2E]" /> Wallet Pro
                            </h3>
                        </div>

                        <div className="mb-8 border-b-4 border-neutral-800 pb-8">
                            <div className="flex items-baseline gap-2 mb-2 text-white">
                                <span className="text-7xl font-black tracking-tighter text-[#B6FF2E]">499</span>
                                <span className="text-2xl font-black text-[#B6FF2E] uppercase">USDC</span>
                                <span className="text-xl font-bold uppercase text-neutral-500">/ mo</span>
                            </div>
                            <p className="text-xs font-mono font-black uppercase text-neutral-400">Decentralized subscription streaming via Base L2.</p>
                        </div>

                        <ul className="space-y-5 mb-10">
                            <FeatureItem text="No fiat conversion fees" dark />
                            <FeatureItem text="Gasless EIP-2612 Permits" dark />
                            <FeatureItem text="Pay-as-you-go autonomy" dark />
                            <FeatureItem text="On-chain Verifiable Trust" dark />
                            <FeatureItem text="Priority Network Access" dark />
                        </ul>
                    </div>

                    <Button
                        onClick={() => router.push('/dashboard/billing/wallet')}
                        variant="secondary"
                        className="w-full py-6 text-xl tracking-widest !bg-white !text-black"
                    >
                        CONNECT WALLET &rarr;
                    </Button>

                    <p className="mt-4 text-center text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                        powered by x402 settlement protocol
                    </p>
                </div>

            </div>

            {/* COMPARISON LINK */}
            <div className="mt-20 text-center">
                <button
                    onClick={() => router.push('/pricing')}
                    className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 hover:text-black transition-colors flex items-center gap-2 mx-auto border-b-2 border-transparent hover:border-black pb-1"
                >
                    View Detailed Plan Comparison <ArrowRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}

function FeatureItem({ text, dark = false }: { text: string; dark?: boolean }) {
    return (
        <li className={`flex items-start gap-3 text-sm font-bold uppercase tracking-tight ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>
            <span className={`flex-shrink-0 w-5 h-5 border-2 border-black flex items-center justify-center ${dark ? 'bg-[#B6FF2E] text-black' : 'bg-black text-white'}`}>
                <Check className="w-3 h-3" strokeWidth={4} />
            </span>
            {text}
        </li>
    );
}
