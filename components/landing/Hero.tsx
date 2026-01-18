'use client';

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RoutingSimulation } from './RoutingSimulation'
import { Github, Zap } from 'lucide-react'
import { Badge } from '@/app/dashboard/_components/ui'

export function Hero() {
    return (
        <section className="py-24 overflow-hidden bg-white">
            <div className="container mx-auto px-6 max-w-7xl text-center">
                {/* 1. Aggressive Hook */}
                <div className="mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="flex justify-center mb-6">
                        <Badge variant="primary" className="!py-1 tracking-[0.2em]">AI COST ANALYTICS</Badge>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black uppercase leading-[0.85] mb-8 tracking-tighter text-black">
                        OPTIMIZE YOUR AI<br />
                        <span className="text-primary">INFRASTRUCTURE</span>
                    </h1>

                    <p className="text-2xl md:text-3xl font-bold text-neutral-500 uppercase tracking-tight max-w-3xl mx-auto mb-12">
                        Audit your API usage and uncover hidden cost savings in seconds.
                    </p>

                    {/* 2. Centralized Audit Form */}
                    <div className="max-w-4xl mx-auto mb-24">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const url = (e.target as any).repoUrl.value;
                                if (url) window.location.href = `/dashboard/audit?url=${encodeURIComponent(url)}`;
                            }}
                            className="flex flex-col md:flex-row gap-0 border-2 border-black bg-white"
                        >
                            <div className="flex-1 relative border-b-2 md:border-b-0 md:border-r-2 border-black">
                                <input
                                    name="repoUrl"
                                    placeholder="Enter GitHub Repo URL..."
                                    className="w-full h-16 px-6 font-mono text-lg font-black uppercase placeholder-neutral-300 focus:outline-none border-none"
                                    required
                                />
                            </div>
                            <button type="submit" className="bg-[#B6FF2E] hover:bg-black hover:text-white text-black font-black px-12 h-16 text-xl uppercase tracking-tighter transition-all">
                                Deep Cost Audit
                            </button>
                        </form>
                        <div className="mt-8 flex justify-center">
                            <a href="https://www.producthunt.com/products/p402-io?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-p402-io" target="_blank" rel="noopener noreferrer">
                                <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1060148&theme=light&t=1767960638366" alt="P402.io - Route, verify, and settle paid API calls with clear traces | Product Hunt" style={{ width: '250px', height: '54px' }} width="250" height="54" className="hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all border-2 border-black" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* 3. The Protocol Explanation (Below the fold/Secondary) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center pt-24 border-t-8 border-black">
                    <div className="text-left">
                        <h2 className="text-4xl md:text-5xl font-black uppercase leading-none mb-8 tracking-tighter">
                            THE P402 PROTOCOL:<br />
                            ROUTE, VERIFY, SETTLE.
                        </h2>

                        <p className="text-lg text-neutral-600 mb-12 font-medium leading-relaxed max-w-xl">
                            P402 is an autonomous orchestration layer. We sit between your agents and AI providers to enforce spend controls, settle in USDC, and optimize routing in real-time.
                        </p>

                        <div className="flex flex-wrap gap-4 mb-12">
                            <Link href="/get-access" className="px-8 py-3 bg-black text-white font-black uppercase tracking-widest hover:bg-[#B6FF2E] hover:text-black transition-all border-2 border-black">Get Access</Link>
                            <Link href="/docs/api" className="px-8 py-3 border-2 border-black font-black uppercase tracking-widest hover:bg-neutral-50 transition-all">API Reference</Link>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <Metric label="UPTIME" value="99.99%" />
                            <Metric label="TOKEN" value="USDC" />
                            <Metric label="FEE" value="1%" />
                            <Metric label="LATENCY" value="<100ms" />
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-0 bg-[#B6FF2E]/10 -rotate-2 group-hover:rotate-0 transition-transform border-4 border-black" />
                        <div className="relative border-4 border-black bg-white p-4 translate-x-4 translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                            <RoutingSimulation />
                        </div>
                    </div>
                </div>

            </div>
        </section>
    )
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-1 text-neutral-600">{label}</div>
            <div className="text-xl font-extrabold">{value}</div>
        </div>
    )
}

