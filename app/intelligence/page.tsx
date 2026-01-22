'use client';
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { Brain, Shield, Zap, ArrowRight, FileText, BarChart3, Lock } from "lucide-react";
import Link from "next/link";

const CASE_STUDIES = [
    {
        title: "Large Language Model Cost Interception",
        sector: "Enterprise AI",
        metric: "84% Reduction",
        description: "How a Tier-1 financial institution used P402 Smart Caching to eliminate redundant agentic sub-queries.",
        icon: <Zap className="text-primary" />,
        link: "#"
    },
    {
        title: "Autonomous Agent Spend Governance",
        sector: "SaaS Ops",
        metric: "100% Policy Compliance",
        description: "Implementing cryptographically enforced spend mandates for 5,000+ autonomous research agents.",
        icon: <Shield className="text-[#22D3EE]" />,
        link: "#"
    },
    {
        title: "Trustless A2A Settlement Scaling",
        sector: "FinTech",
        metric: "1.2M Tx/Day",
        description: "Scaling trustless micro-settlements on Base L2 using x402 and gasless EIP-3009 refuelers.",
        icon: <Lock className="text-[#B6FF2E]" />,
        link: "#"
    }
];

export default function IntelligenceHub() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />

            <main>
                {/* Hero section for Intelligence */}
                <section className="pt-32 pb-24 border-b-2 border-black bg-neutral-50 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                    <div className="container mx-auto px-6 max-w-7xl relative z-10">
                        <div className="max-w-3xl">
                            <div className="badge badge-primary bg-black text-white px-4 py-1 border-2 border-black font-black uppercase text-[10px] tracking-widest mb-6">
                                Research & Insights
                            </div>
                            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter italic mb-8 leading-none">
                                Intelligence <br /><span className="text-primary">Leader</span> Hub
                            </h1>
                            <p className="text-xl font-bold text-neutral-600 uppercase tracking-tight max-w-2xl leading-relaxed">
                                Defining the standards for Agent-to-Agent (A2A) commerce. Explore our technical research,
                                case studies, and protocol benchmarks.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Case Studies */}
                <section className="py-24 bg-white">
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="flex justify-between items-end mb-16 border-b-4 border-black pb-8">
                            <div>
                                <h2 className="text-4xl font-black uppercase italic tracking-tighter">Case Studies</h2>
                                <p className="font-bold text-neutral-500 uppercase tracking-widest text-xs mt-2">Real-world implementation of the x402 standard</p>
                            </div>
                            <Link href="/get-access" className="hidden md:flex items-center gap-2 font-black uppercase text-xs border-b-2 border-black hover:text-primary transition-colors pb-1">
                                Submit your implementation <ArrowRight size={14} />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {CASE_STUDIES.map((study, i) => (
                                <div key={i} className="group p-8 border-4 border-black bg-white hover:bg-neutral-50 transition-all hover:translate-x-2 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full">
                                    <div className="w-12 h-12 border-2 border-black bg-white flex items-center justify-center mb-6 transform -rotate-3 group-hover:rotate-0 transition-transform">
                                        {study.icon}
                                    </div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">{study.sector}</div>
                                    <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-4 leading-tight">{study.title}</h3>
                                    <p className="text-sm font-bold text-neutral-600 mb-8 flex-grow leading-relaxed uppercase tracking-tight">
                                        {study.description}
                                    </p>
                                    <div className="pt-6 border-t-2 border-dashed border-neutral-200 mt-auto">
                                        <div className="flex justify-between items-center">
                                            <span className="text-2xl font-black text-primary italic">{study.metric}</span>
                                            <Link href={study.link} className="btn-link font-black uppercase text-[10px] tracking-widest border-b-2 border-black">View Details &rarr;</Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Technical Papers */}
                <section className="py-24 bg-black text-white">
                    <div className="container mx-auto px-6 max-w-7xl">
                        <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-16 border-b-2 border-neutral-800 pb-8">Technical Research</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <Link href="/WHITEPAPER_V3.md" className="group flex gap-8 items-start p-8 border-2 border-neutral-800 hover:border-primary transition-colors">
                                <div className="p-4 bg-neutral-900 border border-neutral-700">
                                    <FileText className="text-primary" size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase italic mb-2 group-hover:text-primary transition-colors">Protocol Whitepaper v3.0</h3>
                                    <p className="text-neutral-400 font-bold text-sm uppercase tracking-tight mb-4">Deep dive into A2A Orchestration and the x402 standard.</p>
                                    <span className="text-[10px] font-mono font-bold tracking-widest text-neutral-600">PDF / 42 PAGES</span>
                                </div>
                            </Link>
                            <div className="group flex gap-8 items-start p-8 border-2 border-neutral-800 hover:border-[#22D3EE] transition-colors cursor-not-allowed grayscale">
                                <div className="p-4 bg-neutral-900 border border-neutral-700">
                                    <BarChart3 className="text-[#22D3EE]" size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase italic mb-2">2026 Agent Economy Report</h3>
                                    <p className="text-neutral-400 font-bold text-sm uppercase tracking-tight mb-4">Analysis of micro-transaction growth in autonomous networks.</p>
                                    <span className="text-[10px] font-mono font-bold tracking-widest text-neutral-600">COMING SOON / Q1 2026</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Newsletter / CTA */}
                <section className="py-24 bg-[#B6FF2E] border-y-2 border-black text-center">
                    <div className="container mx-auto px-6">
                        <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-8 max-w-2xl mx-auto">
                            Get the latest intelligence on A2A commerce standards.
                        </h2>
                        <Link href="/get-access" className="btn btn-dark text-xl px-12 py-5 h-auto">
                            Join the Network
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
