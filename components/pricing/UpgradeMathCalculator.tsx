'use client';

import React, { useState, useEffect } from 'react';
import { useUpgradeMath } from '@/hooks/useUpgradeMath';
import { Calculator, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

export function UpgradeMathCalculator() {
    const { data, isLoading, isError } = useUpgradeMath();
    const [volume, setVolume] = useState<number>(50000); // Default $50k/mo for anonymous

    // Sync volume with user data if authenticated
    useEffect(() => {
        if (data?.authenticated && data.trailing_30d.volume_usd > 0) {
            setVolume(Math.round(data.trailing_30d.volume_usd));
        }
    }, [data]);

    const calculateFees = (v: number) => ({
        free: v * 0.01,
        pro: v * 0.0075,
        enterprise: v * 0.004,
    });

    const fees = calculateFees(volume);
    const proSavings = fees.free - fees.pro;
    const enterpriseSavings = fees.free - fees.enterprise;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="max-w-4xl mx-auto my-12 p-8 border-2 border-black bg-white shadow-[8px_8px_0px_#000]">
            <div className="flex items-center gap-3 mb-8 border-b-2 border-black pb-4">
                <Calculator className="w-8 h-8 text-[var(--primary)]" />
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight">Upgrade Math Calculator</h2>
                    <p className="font-mono text-xs uppercase text-[var(--neutral-400)]">
                        {data?.authenticated ? 'Based on your actual 30-day trailing volume' : 'Estimate your savings based on volume'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Inputs */}
                <div className="space-y-8">
                    <div>
                        <div className="flex justify-between items-end mb-4">
                            <label className="text-sm font-black uppercase tracking-widest">Monthly x402 Volume</label>
                            <span className="text-2xl font-black font-mono text-[var(--primary)]">{formatCurrency(volume)}</span>
                        </div>
                        <input
                            type="range"
                            min="1000"
                            max="1000000"
                            step="1000"
                            value={volume}
                            onChange={(e) => setVolume(parseInt(e.target.value))}
                            className="w-full h-2 bg-[var(--neutral-300)] appearance-none cursor-pointer accent-black border border-black"
                        />
                        <div className="flex justify-between mt-2 font-mono text-[10px] uppercase text-[var(--neutral-400)]">
                            <span>$1k</span>
                            <span>$500k</span>
                            <span>$1M+</span>
                        </div>
                    </div>

                    {data?.authenticated && data.trailing_30d.failed_count > 0 && (
                        <div className="p-4 bg-[var(--info)]/20 border-2 border-black border-dashed flex gap-4">
                            <AlertCircle className="w-6 h-6 shrink-0" />
                            <div className="text-xs font-bold leading-tight uppercase">
                                <span className="text-[var(--error)]">Attention:</span> Your account had {data.trailing_30d.failed_count} failed settlements last month.
                                <br />
                                <span className="block mt-1">Estimated "Cost of Issues": <span className="font-black underline">{formatCurrency(data.trailing_30d.estimated_issue_cost_usd)}</span></span>
                                <span className="block mt-1 text-[10px] text-[var(--neutral-700)]">* Pro retries & priority routing would have likely avoided these.</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Outputs */}
                <div className="space-y-6">
                    <div className="p-6 bg-[var(--neutral-100)] border-2 border-black">
                        <p className="text-xs font-bold uppercase mb-4 text-[var(--neutral-400)] tracking-widest">Monthly Platform Fees</p>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="font-mono text-xs uppercase font-bold">Free (1.00%)</span>
                                <span className="font-black">{formatCurrency(fees.free)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[var(--primary)] bg-black px-2 py-1">
                                <span className="font-mono text-xs uppercase font-black">Pro (0.75%)</span>
                                <span className="font-black">{formatCurrency(fees.pro)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-mono text-xs uppercase font-bold text-[var(--neutral-400)]">Enterprise (0.40%)</span>
                                <span className="font-black text-[var(--neutral-400)]">{formatCurrency(fees.enterprise)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-[var(--primary)] border-2 border-black shadow-[4px_4px_0px_#000]">
                        <div className="flex items-start gap-4">
                            <TrendingUp className="w-10 h-10" />
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Projected Pro Savings</p>
                                <h3 className="text-4xl font-black tracking-tighter mb-2">
                                    {formatCurrency(proSavings)}<span className="text-sm font-bold tracking-normal italic uppercase"> / mo</span>
                                </h3>
                                <p className="text-[10px] font-bold uppercase leading-tight opacity-80">
                                    That's {formatCurrency(proSavings * 12)} back in your treasury per year.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {data?.authenticated && (
                <div className="mt-8 pt-6 border-t-2 border-black border-dashed flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-xs font-bold uppercase">Personalized strategy active for tenant: <span className="font-mono text-[var(--primary)] bg-black px-1">{data.tenant_id}</span></span>
                    </div>
                    <button className="text-[10px] font-bold uppercase underline hover:no-underline">Reset Data</button>
                </div>
            )}
        </div>
    );
}
