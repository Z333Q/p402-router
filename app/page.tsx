import type { Metadata } from 'next'
import { TopNav } from "@/components/TopNav"
import { Footer } from "@/components/Footer"
import { HeroAuditor } from "@/components/landing/HeroAuditor"
import { BazaarLoop } from "@/components/landing/BazaarLoop"
import { Testimonials } from "@/components/landing/Testimonials"
import { RequestInspector } from "@/components/landing/RequestInspector"
import { LandingGuide } from "@/components/landing/LandingGuide"
import { ProductionFeatures } from "@/components/landing/ProductionFeatures"
import Link from 'next/link'
import { Badge } from "@/app/dashboard/_components/ui"
import { PricingStrip } from "@/components/landing/PricingStrip"

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'P402 | AI Payment Router for Agent Commerce',
    description: 'Route LLM calls across 300+ AI models with intelligent cost optimization. Settle micropayments in USDC on Base via the x402 protocol. The economic layer for autonomous AI agents.',
    alternates: { canonical: 'https://p402.io' },
    keywords: [
        'AI payment router', 'LLM routing', 'x402 protocol', 'agent payments', 'USDC micropayments',
        'A2A protocol', 'AI cost optimization', 'Base blockchain', 'EIP-3009', 'Claude Code',
        'OpenAI compatible', 'multi-model routing', 'agentic commerce', 'AP2 mandates'
    ],
    openGraph: {
        title: 'P402 | AI Payment Router — 300+ Models, USDC Settlement',
        description: 'Route AI calls across 300+ models. Settle USDC micropayments with zero gas fees via EIP-3009. The economic layer for autonomous AI agents.',
        url: 'https://p402.io',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'P402 — AI Payment Router for Agent Commerce',
        description: 'Route 300+ AI models. Settle USDC micropayments. Zero gas via EIP-3009. Built for the Agentic Web.',
        site: '@p402_io',
    },
};

export default async function Page() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main>
                <HeroAuditor />

                <LandingGuide />

                {/* Protocol Deep Dive / Features */}
                <section id="product" className="py-24 bg-white border-t-2 border-black">
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="card p-10 border-2 border-black bg-white shadow-[8px_8px_0px_#000]">
                                <div className="text-[10px] font-black text-black mb-2 uppercase">EIP-3009 Settlement</div>
                                <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter italic">Gasless Payments</h3>
                                <p className="text-sm font-bold leading-relaxed text-neutral-600">
                                    Users pay zero gas fees. P402's facilitator network executes USDC transfers on Base L2 using
                                    EIP-3009 transferWithAuthorization, eliminating wallet friction for AI payments.
                                </p>
                            </div>
                            <div className="card p-10 border-2 border-black bg-white shadow-[8px_8px_0px_#000]">
                                <div className="text-[10px] font-black text-black mb-2 uppercase">Global Edge Network</div>
                                <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter italic">Sub-50ms Verification</h3>
                                <p className="text-sm font-bold leading-relaxed text-neutral-600">
                                    Production facilitator deployed across 15 global regions on Cloudflare Workers. Real-time payment
                                    verification with P95 latency under 50ms worldwide.
                                </p>
                            </div>
                            <div className="card p-10 border-2 border-black bg-white shadow-[8px_8px_0px_#000]">
                                <div className="text-[10px] font-black text-black mb-2 uppercase">Real-time Analytics</div>
                                <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter italic">Cost Transparency</h3>
                                <p className="text-sm font-bold leading-relaxed text-neutral-600">
                                    Live cost tracking, transaction history, and savings analytics. Complete audit trail with
                                    on-chain verification and multisig treasury security controls.
                                </p>
                            </div>
                            <div className="card p-10 border-2 border-black bg-emerald-50 shadow-[8px_8px_0px_#000]">
                                <div className="text-[10px] font-black text-black mb-2 uppercase">ERC-8004 Trustless Agents</div>
                                <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter italic">On-Chain Trust</h3>
                                <p className="text-sm font-bold leading-relaxed text-neutral-600">
                                    Every facilitator carries a verifiable on-chain identity and reputation score. Payment-backed
                                    feedback ensures only real users build trust. No centralized reputation — just math.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <RequestInspector />

                <ProductionFeatures />

                {/* Intelligence Engine Feature */}
                <section className="py-32 bg-black text-white border-y-2 border-white">
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="flex flex-col lg:flex-row gap-16 items-start">
                            <div className="lg:w-1/3">
                                <Badge variant="primary" className="mb-6">Knowledge Base</Badge>
                                <h2 className="text-5xl lg:text-7xl font-black uppercase tracking-tighter leading-none mb-6">
                                    Intelligence<br />Engine
                                </h2>
                                <p className="text-neutral-400 font-mono text-lg mb-8 leading-relaxed">
                                    P402 is not just code; it is a new economic physics for the Agentic Web.
                                    Explore our foundational research papers on flash settlement, circuit breakers, and machine governance.
                                </p>
                                <Link href="/intelligence" className="inline-block bg-[#B6FF2E] text-black font-bold uppercase px-8 py-4 border-2 border-transparent hover:border-white hover:bg-black hover:text-white transition-all text-sm tracking-widest">
                                    Read the Research →
                                </Link>
                            </div>
                            <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-3 gap-px bg-white/20 border-2 border-white/20">
                                {[
                                    { title: "Protocol Economics", desc: "Atomic settlement & market design.", link: "/intelligence/protocol-economics" },
                                    { title: "Machine Governance", desc: "Cryptographic AP2 mandates.", link: "/intelligence/machine-governance" },
                                    { title: "Agentic Orchestration", desc: "QoS semantic routing logic.", link: "/intelligence/agentic-orchestration" },
                                    { title: "The Sentinel Layer", desc: "Flash crash protection systems.", link: "/intelligence/sentinel-layer" },
                                    { title: "Trustless Agents", desc: "ERC-8004 on-chain identity & reputation.", link: "/docs/erc8004" },
                                    { title: "Validation Registry", desc: "High-value transaction verification.", link: "/docs/erc8004" },
                                ].map((pillar, i) => (
                                    <Link key={i} href={pillar.link} className="group bg-neutral-900 p-8 hover:bg-black transition-colors">
                                        <h3 className="text-xl font-bold uppercase text-[#B6FF2E] mb-2 group-hover:underline decoration-2 underline-offset-4">
                                            {pillar.title}
                                        </h3>
                                        <p className="text-neutral-400 font-mono text-sm leading-relaxed">
                                            {pillar.desc}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <PricingStrip />
                <BazaarLoop />
                <Testimonials />

                {/* CTA */}
                <section className="py-32 bg-primary text-center border-t-2 border-black">
                    <div className="container mx-auto px-6">
                        <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-8 leading-none italic">
                            Try real payments<br />in 60 seconds
                        </h2>
                        <div className="flex justify-center gap-6">
                            <Link href="/demo/payment-flow" className="btn btn-dark text-2xl px-12 py-6 h-auto">
                                Live Payment Demo
                            </Link>
                            <Link href="/docs" className="btn btn-outline text-2xl px-12 py-6 h-auto border-2 border-black bg-transparent text-black hover:bg-black hover:text-primary">
                                Read Documentation
                            </Link>
                        </div>
                        <div className="mt-8">
                            <Link href="/docs/skill" className="inline-flex items-center gap-2 text-black font-black uppercase tracking-widest text-sm border-b-2 border-black hover:border-transparent transition-all">
                                <span className="text-base">⬡</span> Get the Claude Skill →
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    )
}
