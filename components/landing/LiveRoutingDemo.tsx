'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const SCENARIOS = [
    {
        prompt: 'Summarize this legal contract in plain English.',
        mode: 'cost',
        modeLabel: 'Cost',
        from: 'claude-opus-4-6',
        to: 'deepseek-chat',
        fromCost: '0.01500',
        toCost: '0.00041',
        savedPct: '97%',
        latencyMs: 412,
        inputTokens: 847,
        outputTokens: 203,
        reqId: 'req_3f8a2c91',
    },
    {
        prompt: 'Audit this Solidity contract for re-entrancy vulnerabilities.',
        mode: 'quality',
        modeLabel: 'Quality',
        from: 'deepseek-chat',
        to: 'claude-opus-4-6',
        fromCost: '0.00041',
        toCost: '0.01500',
        savedPct: null,
        latencyMs: 1840,
        inputTokens: 1203,
        outputTokens: 511,
        reqId: 'req_7d4b1e22',
    },
    {
        prompt: 'Return the current ETH/USD price as JSON.',
        mode: 'speed',
        modeLabel: 'Speed',
        from: 'gpt-5.4',
        to: 'gemini-3.1-flash',
        fromCost: '0.01000',
        toCost: '0.00009',
        savedPct: '99%',
        latencyMs: 84,
        inputTokens: 22,
        outputTokens: 38,
        reqId: 'req_9c5f3a77',
    },
    {
        prompt: 'Draft a 30-day roadmap for a Series A fintech startup.',
        mode: 'balanced',
        modeLabel: 'Balanced',
        from: 'gpt-5.4-turbo',
        to: 'claude-sonnet-4-6',
        fromCost: '0.04000',
        toCost: '0.00510',
        savedPct: '87%',
        latencyMs: 723,
        inputTokens: 312,
        outputTokens: 688,
        reqId: 'req_1a8d6c44',
    },
] as const;

const MODE_COLORS: Record<string, string> = {
    cost: '#B6FF2E',
    quality: '#818CF8',
    speed: '#22D3EE',
    balanced: '#F59E0B',
};

type Phase = 'routing' | 'done';

export function LiveRoutingDemo() {
    const [idx, setIdx] = useState(0);
    const [phase, setPhase] = useState<Phase>('routing');

    useEffect(() => {
        setPhase('routing');
        const t = setTimeout(() => setPhase('done'), 1100);
        return () => clearTimeout(t);
    }, [idx]);

    useEffect(() => {
        if (phase !== 'done') return;
        const t = setTimeout(() => setIdx(i => (i + 1) % SCENARIOS.length), 3400);
        return () => clearTimeout(t);
    }, [phase]);

    const s = SCENARIOS[idx]!;
    const accent = MODE_COLORS[s.mode] ?? '#B6FF2E';
    const provider = s.to.split('-')[0] ?? s.to;

    return (
        <section className="py-24 bg-[#0D0D0D] border-t-2 border-b-2 border-black">
            <div className="container mx-auto px-6 max-w-7xl">

                <div className="mb-12">
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                        Live Routing
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white italic leading-none">
                        Every request.<br />Routed live.
                    </h2>
                    <p className="text-neutral-400 font-bold mt-4 text-sm uppercase tracking-widest max-w-xl">
                        P402 selects the optimal model for each call. You write the same OpenAI-compatible code.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 border-2 border-neutral-800">

                    {/* Left — incoming request */}
                    <div className="bg-neutral-900 p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-neutral-800 flex flex-col gap-6">
                        <div className="text-[9px] font-black uppercase tracking-widest text-neutral-600">
                            Incoming Request
                        </div>

                        {/* Mode */}
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Mode:</span>
                            <span
                                className="px-2 py-0.5 border font-black text-[10px] uppercase tracking-widest"
                                style={{ color: accent, borderColor: accent }}
                            >
                                {s.modeLabel}
                            </span>
                        </div>

                        {/* Prompt */}
                        <div className="border border-neutral-700 bg-neutral-800 p-4 font-mono text-sm text-neutral-200 leading-relaxed">
                            <div className="text-[9px] text-neutral-600 uppercase tracking-widest mb-2 font-sans">prompt</div>
                            &ldquo;{s.prompt}&rdquo;
                        </div>

                        {/* Route swap */}
                        <div className="space-y-3 font-mono text-xs border-t border-neutral-800 pt-5">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-neutral-600 uppercase text-[9px] w-12 shrink-0">Model</span>
                                <span className="text-neutral-500 line-through">{s.from}</span>
                                <span className="text-neutral-600 text-[9px]">→</span>
                                <span className="font-black" style={{ color: accent }}>{s.to}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-neutral-600 uppercase text-[9px] w-12 shrink-0">Cost</span>
                                <span className="text-neutral-500 line-through">${s.fromCost}</span>
                                <span className="text-neutral-600 text-[9px]">→</span>
                                <span className="font-black" style={{ color: accent }}>${s.toCost}</span>
                                {s.savedPct && (
                                    <span className="text-[9px] font-black text-neutral-500 ml-1">
                                        ({s.savedPct} saved)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right — p402_metadata */}
                    <div className="bg-black p-8 flex flex-col">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="text-[9px] font-black uppercase tracking-widest text-neutral-600">
                                p402_metadata
                            </div>
                            {phase === 'routing' ? (
                                <span className="text-[9px] font-mono text-yellow-500 animate-pulse">● routing...</span>
                            ) : (
                                <span className="text-[9px] font-mono text-green-500">● complete</span>
                            )}
                        </div>

                        <div className="font-mono text-[11px] leading-loose text-neutral-300 flex-1 min-h-[200px]">
                            {phase === 'routing' ? (
                                <span className="text-neutral-700">// selecting optimal provider...</span>
                            ) : (
                                <div className="space-y-0.5">
                                    <div><span className="text-neutral-500">request_id:   </span><span className="text-white">&quot;{s.reqId}&quot;</span></div>
                                    <div><span className="text-neutral-500">provider:     </span><span style={{ color: accent }}>&quot;{provider}&quot;</span></div>
                                    <div><span className="text-neutral-500">model:        </span><span style={{ color: accent }}>&quot;{s.to}&quot;</span></div>
                                    <div><span className="text-neutral-500">cost_usd:     </span><span className="text-green-400">{s.toCost}</span></div>
                                    {s.savedPct && (
                                        <div><span className="text-neutral-500">savings:      </span><span className="text-green-400">&quot;{s.savedPct}&quot;</span></div>
                                    )}
                                    <div><span className="text-neutral-500">latency_ms:   </span><span className="text-white">{s.latencyMs}</span></div>
                                    <div><span className="text-neutral-500">input_tokens: </span><span className="text-white">{s.inputTokens}</span></div>
                                    <div><span className="text-neutral-500">output_tokens:</span><span className="text-white">{s.outputTokens}</span></div>
                                    <div><span className="text-neutral-500">cached:       </span><span className="text-white">false</span></div>
                                    <div><span className="text-neutral-500">routing_mode: </span><span style={{ color: accent }}>&quot;{s.mode}&quot;</span></div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-neutral-800 flex items-center justify-between">
                            <Link
                                href="/product/routing"
                                className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors no-underline"
                            >
                                How routing works →
                            </Link>
                            <Link
                                href="/docs/sdk"
                                className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors no-underline"
                            >
                                Full schema →
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-4 text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-700">
                    <span>300+ models</span>
                    <span>·</span>
                    <span>Cost / Speed / Quality / Balanced</span>
                    <span>·</span>
                    <span>OpenAI-compatible</span>
                    <span>·</span>
                    <span>Full audit trail</span>
                    <span>·</span>
                    <span>Semantic cache</span>
                </div>
            </div>
        </section>
    );
}
