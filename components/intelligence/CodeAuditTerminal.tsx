'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Copy, AlertTriangle, Play, CheckCircle2, XCircle, Loader2, ArrowRight, ExternalLink, ShieldCheck, Zap, Gauge, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CodeAuditTerminalProps {
    className?: string;
    variant?: 'compact' | 'full';
    initialValue?: string;
}

export const CodeAuditTerminal = ({ className, variant = 'full', initialValue = '' }: CodeAuditTerminalProps) => {
    const [code, setCode] = useState(initialValue);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [report, setReport] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<{ riskScore: number; costPerHour: number } | null>(null);
    const reportEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (reportEndRef.current) {
            reportEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [report]);

    const handleAudit = async () => {
        if (!code.trim()) return;
        setIsAnalyzing(true);
        setError(null);
        setReport(null);
        setMetrics(null);

        try {
            const res = await fetch('/api/v1/intelligence/code-audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Audit failed');

            setReport(data.report);
            setMetrics(data.metrics);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const isCompact = variant === 'compact';

    return (
        <div className={cn("flex flex-col gap-6", className)}>
            <div className={cn(
                "relative z-10 w-full border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]",
                isAnalyzing || report ? "bg-[#0A0A0A]" : "bg-[#141414]"
            )}>
                {/* Terminal Header */}
                <div className="bg-[#B6FF2E] border-b-2 border-black p-3 sm:p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-black border border-black"></div>
                        <div className="w-3 h-3 bg-white border border-black"></div>
                        <span className="font-mono text-[10px] sm:text-xs font-black ml-2 uppercase tracking-tighter sm:tracking-normal">
                            P402_SAFETY_AUDIT_V2.0
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <div className={cn(
                            "px-2 py-0.5 border border-black/20 font-mono text-[9px] sm:text-[10px] font-bold uppercase",
                            isAnalyzing ? "animate-pulse bg-black text-white" : ""
                        )}>
                            {isAnalyzing ? "SCANNING_THREATS..." : "READY"}
                        </div>
                    </div>
                </div>

                {/* Terminal Body */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    {!report && !isAnalyzing && (
                        <>
                            <div className="font-mono text-[10px] sm:text-xs text-[#22D3EE] flex items-center gap-2">
                                <Play size={10} className="fill-current" />
                                <span>p402@safety:~$ ./initialize --deep-scan</span>
                            </div>

                            <textarea
                                className={cn(
                                    "w-full bg-[#1A1A1A] border-2 border-[#333] text-gray-300 font-mono text-sm p-4 focus:outline-none focus:border-[#B6FF2E] focus:text-white resize-none placeholder:text-gray-600 shadow-inner leading-relaxed",
                                    isCompact ? "h-32" : "h-80"
                                )}
                                placeholder="// Paste Agent Code or GitHub flattening from GitIngest.com..."
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                            />

                            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center justify-between">
                                <div className="flex items-start gap-3 bg-[#222] border border-[#333] p-3 flex-1">
                                    <AlertTriangle className="w-4 h-4 text-[#B6FF2E] shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-gray-400 font-mono leading-tight">
                                        <span className="text-[#B6FF2E] font-bold uppercase">Logic Guard:</span> P402 Auditor detects financial loops, provider leakage, and model-tier waste in real-time.
                                    </p>
                                </div>

                                <button
                                    onClick={handleAudit}
                                    disabled={!code.trim() || isAnalyzing}
                                    className="w-full sm:w-auto px-8 sm:px-12 py-3 sm:py-4 bg-[#B6FF2E] text-black border-4 border-black text-lg sm:text-xl font-black uppercase tracking-tight shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50"
                                >
                                    {isAnalyzing ? "AUDITING..." : "DEEP AUDIT"}
                                </button>
                            </div>
                        </>
                    )}

                    {isAnalyzing && (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4 font-mono">
                            <Loader2 className="w-12 h-12 text-[#B6FF2E] animate-spin" />
                            <div className="text-[#B6FF2E] font-black uppercase tracking-widest text-sm animate-pulse">
                                Simulating Agent Burn Rate...
                            </div>
                            <div className="text-neutral-500 text-[10px] uppercase text-center max-w-xs">
                                Analyzing context tokens, model tiers, and loop logic for financial death loops.
                            </div>
                        </div>
                    )}

                    {report && (
                        <div className="space-y-6">
                            {/* Quick Metrics */}
                            {metrics && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="border-2 border-[#333] p-4 bg-[#111]">
                                        <div className="text-[10px] font-black text-neutral-500 uppercase mb-1">Risk Score</div>
                                        <div className={cn(
                                            "text-3xl font-black italic",
                                            metrics.riskScore >= 7 ? "text-red-500" : metrics.riskScore >= 4 ? "text-amber-500" : "text-green-500"
                                        )}>
                                            {metrics.riskScore}/10
                                        </div>
                                    </div>
                                    <div className="border-2 border-[#333] p-4 bg-[#111]">
                                        <div className="text-[10px] font-black text-neutral-500 uppercase mb-1">Simulated Burn</div>
                                        <div className="text-3xl font-black italic text-[#B6FF2E]">
                                            ${metrics.costPerHour.toFixed(2)}/hr
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Report Text */}
                            <div className="prose prose-invert prose-p:font-mono prose-p:text-xs prose-p:leading-relaxed prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter prose-blockquote:border-l-[#B6FF2E] max-w-none prose-table:border prose-table:border-neutral-800 prose-th:bg-neutral-900 prose-td:border-neutral-800 p-2 text-neutral-300">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {report}
                                </ReactMarkdown>
                            </div>

                            {/* Action Area (Conversion) */}
                            <div className="border-4 border-[#B6FF2E] p-6 sm:p-8 bg-black space-y-4">
                                <h3 className="text-2xl sm:text-3xl font-black uppercase italic text-[#B6FF2E] leading-none mb-2">
                                    Secure your wallet.
                                </h3>
                                <p className="text-xs sm:text-sm font-bold text-neutral-400 leading-relaxed uppercase tracking-tight">
                                    Don't let infinite loops drain your treasury. P402 AP2 Mandates enforce budget caps at the protocol level.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                    <button
                                        onClick={() => window.location.href = '/docs'}
                                        className="bg-[#B6FF2E] text-black px-8 py-3 font-black uppercase text-sm border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                                    >
                                        Deploy Safeguard
                                    </button>
                                    <button
                                        onClick={() => { setReport(null); setCode(''); }}
                                        className="bg-neutral-800 text-white px-8 py-3 font-black uppercase text-sm border-2 border-black hover:bg-neutral-700 transition-all"
                                    >
                                        Audit New File
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="border-2 border-red-500/50 bg-red-500/10 p-4 font-mono text-red-500 h-80 flex flex-col items-center justify-center gap-4 text-center">
                            <XCircle className="w-8 h-8" />
                            <div>
                                <div className="font-black uppercase">Audit System Failure</div>
                                <div className="text-xs mt-1">{error}</div>
                            </div>
                            <button
                                onClick={() => setError(null)}
                                className="mt-4 px-4 py-2 border border-red-500 text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
                <div ref={reportEndRef} />
            </div>

            {/* Sidebar info (only if full variant) */}
            {!isCompact && !report && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <BenefitBox
                        icon={<Target className="text-[#B6FF2E]" />}
                        title="Provider Leakage"
                        desc="Detects exposed keys and unbuffered provider calls."
                    />
                    <BenefitBox
                        icon={<Zap className="text-[#B6FF2E]" />}
                        title="Token Bloat"
                        desc="Identifies context waste and inefficient prompting."
                    />
                    <BenefitBox
                        icon={<Gauge className="text-[#B6FF2E]" />}
                        title="Death Loops"
                        desc="Simulates execution to find infinite wallet drains."
                    />
                </div>
            )}
        </div>
    );
};

function BenefitBox({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="border-2 border-neutral-900 p-4 bg-white flex gap-4">
            <div className="mt-1">{icon}</div>
            <div className="space-y-1">
                <div className="font-black uppercase text-[10px] tracking-wider">{title}</div>
                <p className="text-[11px] text-neutral-500 font-medium leading-tight">{desc}</p>
            </div>
        </div>
    );
}
