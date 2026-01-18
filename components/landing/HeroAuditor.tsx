'use client';

import React, { useState } from 'react';
import { Terminal, Copy, ExternalLink, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

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
                        <Link href="/docs/router">
                            <button className="h-12 px-8 bg-black text-white font-mono font-bold uppercase tracking-wider hover:-translate-y-1 transition-transform border-2 border-black shadow-[4px_4px_0px_0px_#B6FF2E] w-full sm:w-auto">
                                Read Whitepaper
                            </button>
                        </Link>
                        <Link href="/docs/api">
                            <button className="h-12 px-8 bg-white text-black font-mono font-bold uppercase tracking-wider hover:-translate-y-1 transition-transform border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 group w-full sm:w-auto">
                                View Documentation
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

                    {/* The "Terminal" Window */}
                    <div className="relative z-10 w-full bg-[#141414] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">

                        {/* Terminal Header */}
                        <div className="bg-[#B6FF2E] border-b-2 border-black p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-black border border-black"></div>
                                <div className="w-3 h-3 bg-white border border-black"></div>
                                <span className="font-mono text-xs font-bold ml-2 uppercase">P402_SAFETY_AUDIT.EXE</span>
                            </div>
                            <div className="flex gap-1">
                                {[1, 2, 3].map(i => <div key={i} className="w-1 h-4 bg-black/20"></div>)}
                            </div>
                        </div>

                        {/* Terminal Body */}
                        <div className="p-4 space-y-4">
                            <div className="font-mono text-xs text-[#22D3EE] mb-2">
                                root@p402:~# initialize_audit_sequence
                            </div>

                            <textarea
                                className="w-full h-32 bg-[#1A1A1A] border-2 border-[#333] text-gray-300 font-mono text-sm p-3 focus:outline-none focus:border-[#B6FF2E] focus:text-white resize-none placeholder:text-gray-600"
                                placeholder="// Paste your Python agent code or GitHub URL here..."
                                value={codeSnippet}
                                onChange={(e) => setCodeSnippet(e.target.value)}
                            />

                            {/* Pro Tip Badge */}
                            <div className="flex items-start gap-2 bg-[#222] border border-[#333] p-2">
                                <AlertTriangle className="w-4 h-4 text-[#B6FF2E] shrink-0 mt-0.5" />
                                <p className="text-[10px] text-gray-400 font-mono leading-tight">
                                    <span className="text-[#B6FF2E] font-bold">PRO TIP:</span> For private repos, use <span className="text-white underline decoration-dashed">GitIngest.com</span> to flatten your repo before pasting.
                                </p>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={handleAudit}
                                disabled={!codeSnippet.trim()}
                                className="w-full group h-12 bg-[#B6FF2E] border-2 border-black flex items-center justify-center gap-3 hover:bg-[#A0E626] active:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCopied ? (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        <span className="font-mono font-bold uppercase text-black">COPIED TO CLIPBOARD!</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="font-mono font-bold uppercase text-black">RUN DEEP AUDIT</span>
                                        <ExternalLink className="w-4 h-4 text-black group-hover:rotate-45 transition-transform" />
                                    </>
                                )}
                            </button>

                            <div className="text-center">
                                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Powered by Gemini 3</span>
                            </div>
                        </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute bottom-4 right-4 font-mono text-6xl font-black text-black/5 select-none pointer-events-none">
                        402
                    </div>
                </div>

            </div>
        </section>
    );
};
