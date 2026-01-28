import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/app/dashboard/_components/ui';

export const metadata: Metadata = {
    title: 'P402 Intelligence | The Agentic Economy Research',
    description: 'Foundational research papers and economic modeling for the autonomous AI economy.',
};

const PILLARS = [
    {
        id: 'protocol-economics',
        title: 'Protocol Economics',
        desc: 'Market design for atomic agent settlement and Flash Crash prevention.',
        audience: 'DeFi Architects',
    },
    {
        id: 'machine-governance',
        title: 'Machine Governance',
        desc: 'Cryptographic policy enforcement for non-deterministic agents.',
        audience: 'CISOs & Policy',
    },
    {
        id: 'agentic-orchestration',
        title: 'Agentic Orchestration',
        desc: 'Quality-of-service pricing and competitive routing logic.',
        audience: 'Systems Engineers',
    },
    {
        id: 'sentinel-layer',
        title: 'The Sentinel Layer',
        desc: 'Real-time anomaly detection and economic circuit breakers.',
        audience: 'Risk Auditors',
    }
];

export default function IntelligencePage() {
    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-[#B6FF2E] selection:text-black">
            {/* Header */}
            <header className="border-b-2 border-neutral-800 p-8 lg:p-12">
                <div className="max-w-7xl mx-auto">
                    <Badge variant="primary" className="mb-6">Knowledge Base</Badge>
                    <h1 className="text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-8">
                        Intelligence<br />Engine
                    </h1>
                    <p className="text-xl text-neutral-400 max-w-2xl leading-relaxed font-mono">
                        Definitive research on the economic and security architecture of the Agentic Web.
                        Moving beyond "dumb pipes" to cryptographic stewardship.
                    </p>
                </div>
            </header>

            {/* Pillars Grid */}
            <main className="max-w-7xl mx-auto p-8 lg:p-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-neutral-800 border-2 border-neutral-800">
                    {PILLARS.map((pillar) => (
                        <Link
                            key={pillar.id}
                            href={`/intelligence/${pillar.id}`}
                            className="group bg-black p-12 hover:bg-neutral-900 transition-colors relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[#B6FF2E] text-4xl">→</span>
                            </div>

                            <div className="h-full flex flex-col justify-between space-y-8">
                                <div>
                                    <span className="font-mono text-xs text-[#B6FF2E] uppercase tracking-widest mb-2 block">
                                        Pillar: {pillar.audience}
                                    </span>
                                    <h2 className="text-3xl font-bold uppercase tracking-tight group-hover:text-white transition-colors">
                                        {pillar.title}
                                    </h2>
                                </div>
                                <p className="text-neutral-500 font-mono text-sm leading-relaxed border-l-2 border-neutral-800 pl-4">
                                    {pillar.desc}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Featured Research List */}
                <section className="mt-24">
                    <div className="flex items-baseline justify-between border-b-2 border-white pb-4 mb-12">
                        <h3 className="text-4xl font-bold uppercase">Complete Catalog</h3>
                        <span className="font-mono text-neutral-500 text-sm">v2.1 Archive</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        {/* Column 1: Foundational Papers */}
                        <div>
                            <h4 className="text-[#B6FF2E] font-mono text-xs uppercase tracking-widest mb-6">Foundational Papers</h4>
                            <div className="space-y-0 border-t border-neutral-800">
                                {[
                                    { title: 'The x402 Standard', slug: 'x402-standard', id: '001' },
                                    { title: 'AP2 Mandates: Zero-Trust', slug: 'ap2-mandates', id: '002' },
                                    { title: 'Economics of Latency', slug: 'economics-of-latency', id: '003' },
                                    { title: 'Flash Crash Protection', slug: 'flash-crash-protection', id: '004' },
                                    { title: 'Verifiable Compute', slug: 'verifiable-compute', id: '005' },
                                ].map((paper) => (
                                    <Link
                                        key={paper.slug}
                                        href={`/intelligence/research/${paper.slug}`}
                                        className="block border-b border-neutral-800 py-6 hover:bg-neutral-900 transition-colors group"
                                    >
                                        <div className="flex items-center gap-6">
                                            <span className="font-mono text-neutral-600 text-xs w-12">RES-{paper.id}</span>
                                            <h5 className="text-lg font-bold uppercase group-hover:text-[#B6FF2E] transition-colors line-clamp-1">
                                                {paper.title}
                                            </h5>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Column 2: Case Studies */}
                        <div>
                            <h4 className="text-[#22D3EE] font-mono text-xs uppercase tracking-widest mb-6">Industrial Case Studies</h4>
                            <div className="space-y-0 border-t border-neutral-800">
                                {[
                                    { title: 'The Black Friday Swarm', slug: 'black-friday-swarm', id: 'CS1' },
                                    { title: 'The Medical Data Heist', slug: 'medical-data-heist', id: 'CS2' },
                                    { title: 'Supply Chain Miracle', slug: 'supply-chain-miracle', id: 'CS3' },
                                ].map((caseStudy) => (
                                    <Link
                                        key={caseStudy.slug}
                                        href={`/intelligence/research/${caseStudy.slug}`}
                                        className="block border-b border-neutral-800 py-6 hover:bg-neutral-900 transition-colors group"
                                    >
                                        <div className="flex items-center gap-6">
                                            <span className="font-mono text-neutral-600 text-xs w-12">{caseStudy.id}</span>
                                            <h5 className="text-lg font-bold uppercase group-hover:text-[#22D3EE] transition-colors line-clamp-1">
                                                {caseStudy.title}
                                            </h5>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
