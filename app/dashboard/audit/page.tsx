'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Badge,
    Button,
    Card,
    StatusDot
} from '../_components/ui';
import {
    Zap,
    Play,
    ExternalLink,
    AlertTriangle,
    Target,
    Gauge,
    Copy,
    Sparkles,
    ShieldCheck,
    Cpu
} from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';

export default function AuditPage() {
    const { address } = useAccount();
    const { data: balanceData } = useBalance({
        address,
        chainId: 8453,
    });

    const [codeSnippet, setCodeSnippet] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    // The specific P402 Gem Link
    const GEM_URL = "https://gemini.google.com/gem/f964a110b802";

    const handleAudit = () => {
        if (!codeSnippet.trim()) return;

        // 1. Copy content to clipboard
        navigator.clipboard.writeText(codeSnippet);
        setIsCopied(true);

        // 2. Open Gem in new tab
        setTimeout(() => {
            window.open(GEM_URL, '_blank');
            setIsCopied(false);
        }, 1000);
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto font-sans">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Badge variant="primary">Enterprise</Badge>
                        <Badge variant="default">v2.0</Badge>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-black italic">
                        Security & Cost <span className="text-primary NOT-italic">Auditor</span>
                    </h1>
                    <p className="text-neutral-500 font-bold uppercase text-xs tracking-widest max-w-md">
                        Powered by Gemini 1.5 Pro • Real-time Threat detection • Infrastructure optimization
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <StatusDot status="healthy" label="Gemini Engine Active" />
                </div>
            </div>

            {/* Main Terminal Area */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                {/* Left: The Terminal (8/12) */}
                <div className="xl:col-span-8 space-y-8">
                    <div className="relative z-10 w-full bg-[#141414] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">

                        {/* Terminal Header */}
                        <div className="bg-[#B6FF2E] border-b-2 border-black p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-black border border-black"></div>
                                <div className="w-3 h-3 bg-white border border-black"></div>
                                <span className="font-mono text-xs font-black ml-2 uppercase">P402_DEEP_AUDIT_V2.BIN</span>
                            </div>
                            <div className="hidden sm:flex gap-2">
                                <div className="px-2 py-0.5 border border-black/20 font-mono text-[10px] font-bold uppercase">System: Armed</div>
                            </div>
                        </div>

                        {/* Terminal Body */}
                        <div className="p-6 space-y-6">
                            <div className="font-mono text-xs text-[#22D3EE] flex items-center gap-2">
                                <Play size={10} className="fill-current" />
                                <span>p402@audit:~$ initialize --mode=deep-scan</span>
                            </div>

                            <textarea
                                className="w-full h-80 bg-[#1A1A1A] border-2 border-[#333] text-gray-300 font-mono text-sm p-4 focus:outline-none focus:border-[#B6FF2E] focus:text-white resize-none placeholder:text-gray-600 shadow-inner leading-relaxed"
                                placeholder="// Paste Agent Code, Github URLs, or LangChain manifests here..."
                                value={codeSnippet}
                                onChange={(e) => setCodeSnippet(e.target.value)}
                            />

                            <div className="flex flex-col sm:flex-row gap-6 items-center justify-between">
                                <div className="flex items-start gap-3 bg-[#222] border border-[#333] p-3 flex-1">
                                    <AlertTriangle className="w-4 h-4 text-[#B6FF2E] shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-gray-400 font-mono leading-tight">
                                        <span className="text-[#B6FF2E] font-bold">RECOGNITION:</span> P402 Auditor automatically detects provider leakage, redundant context tokens, and model-tier inefficiencies.
                                    </p>
                                </div>

                                <Button
                                    onClick={handleAudit}
                                    disabled={!codeSnippet.trim()}
                                    className="w-full sm:w-auto h-16 px-12 !bg-[#B6FF2E] !text-black border-4 border-black !text-xl font-black uppercase tracking-tight shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                                >
                                    {isCopied ? (
                                        <div className="flex items-center gap-3">
                                            <Copy size={20} />
                                            <span>Ready!</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <span>Run Audit</span>
                                            <ExternalLink size={20} />
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px] border-2 border-black p-4 bg-white space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-neutral-400">
                                <ShieldCheck size={12} />
                                <span>Security Level</span>
                            </div>
                            <div className="text-xl font-black uppercase tracking-tight">Zero-Knowledge</div>
                        </div>
                        <div className="flex-1 min-w-[200px] border-2 border-black p-4 bg-white space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-neutral-400">
                                <Cpu size={12} />
                                <span>Analysis Node</span>
                            </div>
                            <div className="text-xl font-black uppercase tracking-tight">Gemini 1.5 Pro</div>
                        </div>
                        <div className="flex-1 min-w-[200px] border-2 border-black p-4 bg-white space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-neutral-400">
                                <Sparkles size={12} />
                                <span>Compliance</span>
                            </div>
                            <div className="text-xl font-black uppercase tracking-tight">Agentic Standard</div>
                        </div>
                    </div>
                </div>

                {/* Right: Sidebar Info (4/12) */}
                <div className="xl:col-span-4 space-y-6">
                    <Card title="WHAT WE SCAN FOR" className="border-4 border-black bg-white">
                        <div className="space-y-6 pt-4">
                            <AuditMetric
                                icon={<Target className="text-primary" />}
                                title="Provider Leakage"
                                desc="Detection of hardcoded API keys or unbuffered provider calls."
                            />
                            <AuditMetric
                                icon={<Zap className="text-primary" />}
                                title="Context Optimization"
                                desc="Analysis of token bloat and redundant system prompt overhead."
                            />
                            <AuditMetric
                                icon={<Gauge className="text-primary" />}
                                title="Tier Efficiency"
                                desc="Automated mapping of tasks to cost-effective models (e.g. Haiku)."
                            />
                        </div>
                    </Card>

                    <div className="p-8 bg-black text-white border-4 border-primary space-y-4">
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic text-primary">Stay Inside.</h3>
                        <p className="text-sm font-medium text-neutral-400 leading-relaxed">
                            P402 uses your clipboard as a secure transit layer. Once you hit 'Run Audit', we prepare your context for the Gem and open it in a focus tab.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AuditMetric({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex gap-4">
            <div className="mt-1">{icon}</div>
            <div className="space-y-1">
                <div className="font-black uppercase text-xs tracking-wider">{title}</div>
                <p className="text-[11px] text-neutral-500 font-medium leading-normal">{desc}</p>
            </div>
        </div>
    );
}
