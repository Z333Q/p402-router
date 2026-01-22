'use client';

import React, { useState } from 'react';
import { Terminal, Copy, ExternalLink, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { CodeAuditTerminal } from '@/components/intelligence/CodeAuditTerminal';

export const HeroAuditor = () => {
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
        <section className="w-full bg-white border-b-2 border-black font-sans text-black selection:bg-[#B6FF2E] selection:text-black">
            <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">

                {/* LEFT COLUMN: BRANDING */}
                <div className="col-span-1 lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center border-b-2 lg:border-b-0 lg:border-r-2 border-black bg-white">
                    <div className="inline-flex items-center gap-2 mb-6 border-2 border-black px-3 py-1 bg-[#22D3EE] w-fit shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <Terminal className="w-4 h-4" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider">v2.0 Stable</span>
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-extrabold uppercase leading-[0.9] tracking-tighter mb-6 italic">
                        Payment<br />Aware<br /><span className="bg-[#B6FF2E] px-2 NOT-italic">Orchestration</span>
                    </h1>

                    <p className="text-lg lg:text-xl font-medium text-neutral-600 max-w-lg mb-10 leading-relaxed border-l-4 border-[#B6FF2E] pl-6 font-bold uppercase tracking-tight">
                        The operating system for the Agentic Economy. <br />
                        Route, Negotiate, and Settle in milliseconds.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link href="/bazaar">
                            <button className="h-12 px-8 bg-black text-white font-mono font-bold uppercase tracking-wider hover:-translate-y-1 transition-transform border-2 border-black shadow-[4px_4px_0px_0px_#B6FF2E] w-full sm:w-auto">
                                Join Bazaar Waitlist
                            </button>
                        </Link>
                        <Link href="/docs">
                            <button className="h-12 px-8 bg-white text-black font-mono font-bold uppercase tracking-wider hover:-translate-y-1 transition-transform border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 group w-full sm:w-auto">
                                Read Documentation
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </Link>
                    </div>
                </div>

                {/* RIGHT COLUMN: THE AUDITOR (Interactive) */}
                <div className="col-span-1 lg:col-span-5 bg-[#F5F5F5] p-6 lg:p-12 flex flex-col justify-center relative overflow-hidden">
                    {/* Abstract background grid */}
                    <div className="absolute inset-0 opacity-[0.05]"
                        style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    </div>

                    <CodeAuditTerminal variant="compact" className="relative z-10" />

                    {/* Decorative Elements */}
                    <div className="absolute bottom-4 right-4 font-mono text-6xl font-black text-black/5 select-none pointer-events-none">
                        402
                    </div>
                </div>

            </div>
        </section>
    );
};
