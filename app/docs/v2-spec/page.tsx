'use client';

import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { Badge, Card, MetricBox } from '../../dashboard/_components/ui';

export default function V2SpecPage() {
    return (
        <div className="min-h-screen bg-white">
            <TopNav />
            <main className="max-w-[1200px] mx-auto px-6 py-24">

                {/* Visual Header */}
                <div className="mb-32 border-b-8 border-black pb-24">
                    <Badge variant="primary" className="mb-6">Protocol Specification</Badge>
                    <h1 className="text-[10rem] font-black leading-[0.8] tracking-tighter uppercase italic mb-12">
                        V2.0.0
                    </h1>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
                        <p className="text-3xl font-bold leading-tight uppercase tracking-tight">
                            The Payment-Aware <br />
                            <span className="text-[#22D3EE]">Orchestration Layer</span> <br />
                            for the Agentic Web.
                        </p>
                        <div className="text-neutral-500 text-sm font-bold uppercase tracking-widest text-right">
                            Released January 2026 <br />
                            Codename: "Antigravity" <br />
                            <a href="/whitepaper.pdf" target="_blank" className="inline-block mt-4 px-4 py-2 bg-neutral-100 text-black border-2 border-black hover:bg-black hover:text-white transition-all text-[10px] tracking-widest">
                                ↓ Download PDF
                            </a>
                        </div>
                    </div>
                </div>

                {/* The Core Shift */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-24 mb-48">
                    <div className="lg:col-span-1">
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-neutral-400 mb-8">Strategic Pivot</h2>
                        <div className="space-y-4">
                            <div className="p-4 border-2 border-black line-through text-neutral-400 font-bold uppercase italic">
                                V1: Payment Processor
                            </div>
                            <div className="p-8 border-4 border-black bg-[#B6FF2E] text-black font-black uppercase italic text-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                V2: Orchestration Layer
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        <h3 className="text-5xl font-black uppercase mb-8 italic">The insight</h3>
                        <p className="text-xl text-neutral-600 leading-relaxed mb-8">
                            Payment is necessary but not sufficient. Developers don't just need to pay for APIs; they need a layer that <strong>optimizes for cost</strong>, <strong>guarantees reliability</strong>, and <strong>enforces agent guardrails</strong>.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <MetricBox label="Models Supported" value="106" subtext="Across 12 Publishers" />
                            <MetricBox label="Protocol Version" value="x402-v2" subtext="EIP-3009 Optimized" />
                        </div>
                    </div>
                </section>

                {/* The Four Layers */}
                <section className="mb-48 bg-black text-white p-24 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#22D3EE] opacity-20 blur-[100px]" />
                    <h2 className="text-6xl font-black uppercase mb-16 italic text-[#22D3EE]">The Architecture</h2>

                    <div className="space-y-12">
                        <Layer
                            num="01"
                            title="Orchestration Layer"
                            desc="The Brain. Routes each request to the optimal provider based on task, cost, quality, and availability."
                            tags={['Router', 'Policy', 'Intelligence']}
                        />
                        <Layer
                            num="02"
                            title="Settlement Layer"
                            desc="The Wallet. Handles session keys, facilitation, and on-chain verification via x402."
                            tags={['Session Keys', 'x402', 'Facilitators']}
                        />
                        <Layer
                            num="03"
                            title="Discovery Layer"
                            desc="The Bazaar. A global registry of x402-enabled services for agents to discover and use."
                            tags={['Bazaar', 'Discovery', 'Ranking']}
                        />
                        <Layer
                            num="04"
                            title="Provider Layer"
                            desc="The Models. Unified adapters for 50+ LLM publishers including OpenAI, Anthropic, and Google."
                            tags={['Unified API', 'Health Monitor', 'Adapter SDK']}
                        />
                    </div>
                </section>

                {/* Feature Highlights */}
                <section className="mb-48">
                    <h2 className="text-5xl font-black uppercase mb-16 italic">Feature Specifications</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <Card title="Router Engine (4.1)" className="!p-8">
                            <ul className="space-y-4">
                                <li className="flex gap-3 text-sm font-bold uppercase tracking-tight">
                                    <span className="text-[#22D3EE]">✓</span> 5 Routing Modes (Cost, Quality, Speed...)
                                </li>
                                <li className="flex gap-3 text-sm font-bold uppercase tracking-tight">
                                    <span className="text-[#22D3EE]">✓</span> Automatic Multi-Provider Failover
                                </li>
                                <li className="flex gap-3 text-sm font-bold uppercase tracking-tight">
                                    <span className="text-[#22D3EE]">✓</span> Smart Rate-Limit Load Balancing
                                </li>
                            </ul>
                        </Card>
                        <Card title="Semantic Cache (4.2)" className="!p-8">
                            <ul className="space-y-4">
                                <li className="flex gap-3 text-sm font-bold uppercase tracking-tight">
                                    <span className="text-[#22D3EE]">✓</span> Embedding-based Similarity Search
                                </li>
                                <li className="flex gap-3 text-sm font-bold uppercase tracking-tight">
                                    <span className="text-[#22D3EE]">✓</span> Namespace Isolation for Privacy
                                </li>
                                <li className="flex gap-3 text-sm font-bold uppercase tracking-tight">
                                    <span className="text-[#22D3EE]">✓</span> Configurable Similarity Thresholds
                                </li>
                            </ul>
                        </Card>
                    </div>
                </section>

                {/* Closing CTA */}
                <div className="text-center py-24 border-t-8 border-black">
                    <h2 className="text-8xl font-black uppercase tracking-tighter mb-12">Build the Future.</h2>
                    <div className="flex justify-center gap-6">
                        <a href="/docs/api" className="px-12 py-5 bg-black text-white font-black uppercase tracking-widest hover:bg-[#22D3EE] hover:text-black transition-all">
                            View API Docs
                        </a>
                        <a href="/dashboard" className="px-12 py-5 border-4 border-black font-black uppercase tracking-widest hover:bg-neutral-50 transition-all">
                            Open Dashboard
                        </a>
                    </div>
                </div>

            </main>
            <Footer />
        </div>
    );
}

function Layer({ num, title, desc, tags }: { num: string, title: string, desc: string, tags: string[] }) {
    return (
        <div className="group border-b-2 border-neutral-800 pb-12 hover:border-[#22D3EE] transition-colors">
            <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="text-xs font-black text-neutral-600 group-hover:text-[#22D3EE] py-2">{num}</div>
                <div className="flex-1">
                    <h3 className="text-4xl font-black uppercase mb-4 tracking-tighter italic">{title}</h3>
                    <p className="text-neutral-400 text-lg max-w-2xl leading-relaxed mb-6">{desc}</p>
                    <div className="flex gap-2">
                        {tags.map(t => (
                            <span key={t} className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-neutral-900 border border-neutral-700">
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
