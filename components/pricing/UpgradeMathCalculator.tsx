'use client';

import React, { useState, useEffect } from 'react';
import { useUpgradeMath } from '@/hooks/useUpgradeMath';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function UpgradeMathCalculator() {
    const { data } = useUpgradeMath();
    const [aiSpend, setAiSpend] = useState<number>(50000);
    const [cacheRate, setCacheRate] = useState<number>(25); // %

    useEffect(() => {
        if (data?.authenticated && data.trailing_30d.volume_usd > 0) {
            setAiSpend(Math.round(data.trailing_30d.volume_usd));
        }
    }, [data]);

    const cache = cacheRate / 100;
    const cacheSavings = aiSpend * cache;
    const routingSavings = aiSpend * (1 - cache) * 0.20;
    const feeSavings = aiSpend * 0.0025; // 1.00% → 0.75%
    const totalSavings = cacheSavings + routingSavings + feeSavings;
    const netAfterPro = Math.max(0, totalSavings - 499);

    const pct = (part: number) => totalSavings > 0 ? Math.round((part / totalSavings) * 100) : 0;

    const fmt = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="max-w-5xl mx-auto my-12 border-2 border-black bg-white shadow-[8px_8px_0px_#000]">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-2 border-black p-6">
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Your P402 savings breakdown</h2>
                    <p className="font-mono text-xs uppercase text-[var(--neutral-400)] mt-0.5">
                        {data?.authenticated
                            ? 'Based on your actual 30-day trailing volume'
                            : 'Adjust the sliders to match your workload'}
                    </p>
                </div>
                <div className="text-right shrink-0">
                    <div className="text-3xl font-black bg-black text-[var(--primary)] px-4 py-2 inline-block">
                        {fmt(totalSavings)}<span className="text-sm font-bold text-[var(--neutral-400)]"> / mo</span>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--neutral-400)] mt-1">estimated total savings</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y-2 lg:divide-y-0 lg:divide-x-2 divide-black">

                {/* Left: Inputs */}
                <div className="p-8 space-y-8">

                    {/* Slider 1: AI Spend */}
                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <label className="text-xs font-black uppercase tracking-widest">Monthly AI spend</label>
                            <span className="text-2xl font-black font-mono text-[var(--primary)]">{fmt(aiSpend)}</span>
                        </div>
                        <input
                            type="range" min="1000" max="1000000" step="1000" value={aiSpend}
                            onChange={e => setAiSpend(parseInt(e.target.value))}
                            className="w-full h-2 bg-[var(--neutral-300)] appearance-none cursor-pointer accent-black"
                        />
                        <div className="flex justify-between mt-1.5 font-mono text-[10px] uppercase text-[var(--neutral-400)]">
                            <span>$1k</span><span>$500k</span><span>$1M+</span>
                        </div>
                    </div>

                    {/* Slider 2: Cache hit rate */}
                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest block">Cache hit rate</label>
                                <span className="text-[10px] font-bold text-[var(--neutral-500)] font-mono uppercase">
                                    repeat queries served at $0
                                </span>
                            </div>
                            <span className="text-2xl font-black font-mono">{cacheRate}%</span>
                        </div>
                        <input
                            type="range" min="5" max="60" step="5" value={cacheRate}
                            onChange={e => setCacheRate(parseInt(e.target.value))}
                            className="w-full h-2 bg-[var(--neutral-300)] appearance-none cursor-pointer accent-black"
                        />
                        <div className="flex justify-between mt-1.5 font-mono text-[10px] uppercase text-[var(--neutral-400)]">
                            <span>5% new</span><span>25% typical</span><span>60% mature</span>
                        </div>
                    </div>

                    {/* Cache compounding explainer */}
                    <div className="border-2 border-black border-dashed p-4 bg-[var(--neutral-100)] space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--neutral-500)]">
                            How cache hit rate compounds
                        </p>
                        <p className="text-xs font-bold text-[var(--neutral-700)] leading-relaxed">
                            P402 embeds and indexes every request. As your app scales, semantically similar
                            queries hit the cache instead of the LLM — at zero cost. New accounts typically
                            see 15–20%. After 90 days, mature accounts exceed 35%.
                        </p>
                        <p className="text-xs font-bold text-[var(--neutral-500)] leading-relaxed">
                            Every audit trace P402 captures also feeds this model — meaning the longer you
                            stay, the smarter and cheaper your routing becomes.
                        </p>
                    </div>

                    {/* Authenticated: failed settlement warning */}
                    {data?.authenticated && data.trailing_30d.failed_count > 0 && (
                        <div className="p-4 border-2 border-dashed border-black flex gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0 text-[var(--error)]" />
                            <div className="text-xs font-bold leading-tight uppercase">
                                <span className="text-[var(--error)]">{data.trailing_30d.failed_count} failed settlements</span> last month —
                                estimated cost{' '}
                                <span className="font-black underline">{fmt(data.trailing_30d.estimated_issue_cost_usd)}</span>.
                                Pro retries would have recovered most of these.
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Savings breakdown */}
                <div className="p-8 flex flex-col gap-4">

                    {/* Row 1: Cache */}
                    <div className="p-5 border-2 border-black bg-[var(--primary)]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest">Semantic cache</p>
                                <p className="text-[10px] font-bold opacity-60">{cacheRate}% of calls returned for $0</p>
                            </div>
                            <span className="text-2xl font-black tabular-nums">{fmt(cacheSavings)}<span className="text-xs font-bold"> / mo</span></span>
                        </div>
                        <div className="h-1.5 bg-black/20 mt-4">
                            <div className="h-full bg-black transition-all duration-300" style={{ width: `${pct(cacheSavings)}%` }} />
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-wider opacity-50 mt-1">{pct(cacheSavings)}% of total savings</p>
                    </div>

                    {/* Row 2: Routing */}
                    <div className="p-5 border-2 border-black bg-[var(--neutral-100)]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest">Smart routing</p>
                                <p className="text-[10px] font-bold text-[var(--neutral-500)]">~20% savings on non-cached calls</p>
                            </div>
                            <span className="text-2xl font-black tabular-nums">{fmt(routingSavings)}<span className="text-xs font-bold text-[var(--neutral-400)]"> / mo</span></span>
                        </div>
                        <div className="h-1.5 bg-[var(--neutral-300)] mt-4">
                            <div className="h-full bg-black transition-all duration-300" style={{ width: `${pct(routingSavings)}%` }} />
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-[var(--neutral-400)] mt-1">{pct(routingSavings)}% of total savings</p>
                    </div>

                    {/* Row 3: Fee reduction */}
                    <div className="p-5 border-2 border-black bg-[var(--neutral-100)]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest">Pro fee reduction</p>
                                <p className="text-[10px] font-bold text-[var(--neutral-500)]">1.00% → 0.75% per settlement</p>
                            </div>
                            <span className="text-2xl font-black tabular-nums">{fmt(feeSavings)}<span className="text-xs font-bold text-[var(--neutral-400)]"> / mo</span></span>
                        </div>
                        <div className="h-1.5 bg-[var(--neutral-300)] mt-4">
                            <div className="h-full bg-black transition-all duration-300" style={{ width: `${pct(feeSavings)}%` }} />
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-[var(--neutral-400)] mt-1">{pct(feeSavings)}% of total savings</p>
                    </div>

                    {/* Total panel */}
                    <div className="p-5 border-2 border-black bg-black text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--neutral-400)]">Total savings</p>
                                <p className="text-[10px] font-bold text-[var(--neutral-600)] mt-0.5">vs single-provider, unoptimized</p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-black text-[var(--primary)] tabular-nums">
                                    {fmt(totalSavings)}<span className="text-sm text-[var(--neutral-400)]"> / mo</span>
                                </div>
                                <div className="text-[10px] font-bold text-[var(--neutral-600)] mt-0.5">{fmt(totalSavings * 12)} / year</div>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-[var(--neutral-800)] flex justify-between items-center">
                            <p className="text-[10px] font-bold font-mono uppercase text-[var(--neutral-600)]">
                                Pro subscription: $499 / mo
                            </p>
                            <p className="text-[10px] font-black uppercase text-[var(--primary)]">
                                Net gain {fmt(netAfterPro)} / mo
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {data?.authenticated && (
                <div className="border-t-2 border-black border-dashed px-8 py-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-[10px] font-bold uppercase">
                        Live data — tenant{' '}
                        <span className="font-mono text-[var(--primary)] bg-black px-1">{data.tenant_id}</span>
                    </span>
                </div>
            )}
        </div>
    );
}
