'use client';

import React, { useState, useEffect } from 'react';
import { Terminal, ArrowRight, ArrowDown, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const ROUTING_EXAMPLES = [
    { from: 'claude-opus-4-6', to: 'gemini-2.0-flash', fromCost: '$0.015', toCost: '$0.0003', saved: '98%' },
    { from: 'gpt-4o', to: 'deepseek-v3', fromCost: '$0.005', toCost: '$0.0003', saved: '94%' },
    { from: 'o3', to: 'claude-haiku-4-5', fromCost: '$0.060', toCost: '$0.0008', saved: '99%' },
];

export const HeroAuditor = () => {
    const [routeIdx, setRouteIdx] = useState(0);

    useEffect(() => {
        const t = setInterval(() => {
            setRouteIdx(i => (i + 1) % ROUTING_EXAMPLES.length);
        }, 3200);
        return () => clearInterval(t);
    }, []);

    const ex = ROUTING_EXAMPLES[routeIdx];
    if (!ex) return null;

    return (
        <section className="w-full bg-white border-b-2 border-black font-sans text-black selection:bg-[#B6FF2E] selection:text-black">
            <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">

                {/* LEFT — Value Prop */}
                <div className="col-span-1 lg:col-span-7 p-8 lg:p-14 flex flex-col justify-center border-b-2 lg:border-b-0 lg:border-r-2 border-black bg-white">
                    <div className="inline-flex items-center gap-2 mb-6 border-2 border-black px-3 py-1 bg-black text-white w-fit shadow-[4px_4px_0px_0px_#B6FF2E]">
                        <Terminal className="w-4 h-4" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider">Live on Base Mainnet</span>
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-extrabold uppercase leading-[0.88] tracking-tighter mb-6">
                        One<br />
                        Endpoint.<br />
                        <span className="bg-[#B6FF2E] px-2 text-black">Every AI.</span>
                    </h1>

                    <p className="text-base lg:text-lg font-bold text-neutral-600 max-w-lg mb-10 leading-relaxed border-l-4 border-black pl-5">
                        Drop P402 in where you use OpenAI. We route to the cheapest model
                        that meets your quality bar. Payments settle gaslessly on Base.
                        Full audit trail.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link href="/login">
                            <button className="h-12 px-8 bg-[#B6FF2E] text-black font-mono font-black uppercase tracking-wider hover:-translate-y-1 transition-transform border-2 border-black shadow-[4px_4px_0px_0px_#000] w-full sm:w-auto">
                                Get Started Free
                            </button>
                        </Link>
                        <Link href="/developers/quickstart">
                            <button className="h-12 px-8 bg-white text-black font-mono font-bold uppercase tracking-wider hover:-translate-y-1 transition-transform border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 group w-full sm:w-auto">
                                Run Quickstart
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </Link>
                    </div>

                    {/* Trust signals */}
                    <div className="mt-8 flex flex-wrap gap-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-[#B6FF2E] stroke-[3]" />300+ models</span>
                        <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-[#B6FF2E] stroke-[3]" />Zero gas fees</span>
                        <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-[#B6FF2E] stroke-[3]" />OpenAI-compatible</span>
                        <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-[#B6FF2E] stroke-[3]" />USDC on Base</span>
                    </div>
                </div>

                {/* RIGHT — Code Swap + Live Routing Decision */}
                <div className="col-span-1 lg:col-span-5 bg-[#0D0D0D] p-6 lg:p-10 flex flex-col justify-center gap-6 relative overflow-hidden">
                    {/* Subtle grid texture */}
                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                    {/* Code swap visual */}
                    <div className="relative z-10 space-y-3">
                        {/* Before */}
                        <div className="border border-neutral-700 bg-neutral-900 p-4 font-mono text-xs leading-relaxed">
                            <div className="text-neutral-500 mb-2 text-[9px] uppercase tracking-widest">Before</div>
                            <div className="text-neutral-400">{'const openai = new OpenAI({'}</div>
                            <div className="pl-4 text-neutral-300">{'baseURL: '}<span className="text-red-400 line-through opacity-60">{'\'https://api.openai.com/v1\''}</span></div>
                            <div className="text-neutral-400">{'});'}</div>
                        </div>

                        {/* Arrow */}
                        <div className="flex items-center justify-center">
                            <div className="flex items-center gap-2 border border-[#B6FF2E]/30 bg-[#B6FF2E]/5 px-3 py-1">
                                <ArrowDown size={12} className="text-[#B6FF2E]" />
                                <span className="text-[#B6FF2E] font-mono text-[9px] font-black uppercase tracking-widest">one change</span>
                            </div>
                        </div>

                        {/* After */}
                        <div className="border-2 border-[#B6FF2E] bg-neutral-900 p-4 font-mono text-xs leading-relaxed shadow-[0_0_20px_rgba(182,255,46,0.1)]">
                            <div className="text-[#B6FF2E] mb-2 text-[9px] uppercase tracking-widest">After — P402</div>
                            <div className="text-neutral-400">{'const openai = new OpenAI({'}</div>
                            <div className="pl-4 text-neutral-300">{'baseURL: '}<span className="text-[#B6FF2E]">{'\'https://p402.io/api/v2\''}</span></div>
                            <div className="text-neutral-400">{'});'}</div>
                            <div className="mt-2 text-neutral-600 text-[9px]">{'// Same SDK. Every model. Automatic routing.'}</div>
                        </div>
                    </div>

                    {/* Live routing decision */}
                    <div className="relative z-10 border border-neutral-700 bg-neutral-900 p-4 font-mono text-xs">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Last Routing Decision</span>
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-[#B6FF2E] rounded-full animate-pulse inline-block" />
                                <span className="text-[9px] text-[#B6FF2E] font-bold uppercase">live</span>
                            </span>
                        </div>

                        <div className="space-y-1.5 text-[11px]">
                            <div className="flex items-center gap-2">
                                <span className="text-neutral-500">req</span>
                                <span className="text-neutral-400 line-through opacity-50">{ex.from}</span>
                                <ArrowRight size={10} className="text-neutral-600" />
                                <span className="text-[#B6FF2E] font-bold">{ex.to}</span>
                            </div>
                            <div className="flex gap-6 mt-2 pt-2 border-t border-neutral-800">
                                <div>
                                    <div className="text-[9px] text-neutral-600 uppercase">was</div>
                                    <div className="text-red-400 font-bold">{ex.fromCost}<span className="text-neutral-600 font-normal">/1K</span></div>
                                </div>
                                <div>
                                    <div className="text-[9px] text-neutral-600 uppercase">now</div>
                                    <div className="text-[#B6FF2E] font-bold">{ex.toCost}<span className="text-neutral-600 font-normal">/1K</span></div>
                                </div>
                                <div>
                                    <div className="text-[9px] text-neutral-600 uppercase">saved</div>
                                    <div className="text-white font-black">{ex.saved}</div>
                                </div>
                            </div>
                            <div className="text-[9px] text-neutral-600 mt-1 pt-2 border-t border-neutral-800">
                                ✓ Settled via x402 · Base · gasless
                            </div>
                        </div>
                    </div>

                    {/* Decorative watermark */}
                    <div className="absolute bottom-3 right-4 font-mono text-7xl font-black text-white/[0.03] select-none pointer-events-none">
                        402
                    </div>
                </div>
            </div>
        </section>
    );
};
