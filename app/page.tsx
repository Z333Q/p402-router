import type { Metadata } from 'next'
import { TopNav } from "@/components/TopNav"
import { Footer } from "@/components/Footer"
import { HeroAuditor } from "@/components/landing/HeroAuditor"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { BazaarLoop } from "@/components/landing/BazaarLoop"
import { Testimonials } from "@/components/landing/Testimonials"
import { RequestInspector } from "@/components/landing/RequestInspector"
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
                {/* 1. Hero — one endpoint, code swap, live routing */}
                <HeroAuditor />

                {/* 2. How it works — 3-step activation path */}
                <HowItWorks />

                {/* 3. Proof strip — trust before depth */}
                <section className="py-5 bg-neutral-50 border-t-2 border-b-2 border-black">
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-widest">
                            <span className="text-neutral-400">Verify independently:</span>
                            <Link href="/status" className="flex items-center gap-1.5 text-black hover:text-primary transition-colors no-underline">
                                <span className="w-2 h-2 bg-green-500 inline-block" />
                                System status
                            </Link>
                            <Link href="/trust" className="text-black hover:text-primary transition-colors no-underline">Trust Center</Link>
                            <a href="https://basescan.org/address/0xd03c7ab9a84d86dbc171367168317d6ebe408601" target="_blank" rel="noopener noreferrer" className="text-black hover:text-primary transition-colors no-underline">
                                Settlement contract ↗
                            </a>
                            <a href="https://basescan.org/address/0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6" target="_blank" rel="noopener noreferrer" className="text-black hover:text-primary transition-colors no-underline">
                                Treasury ↗
                            </a>
                            <a href="https://github.com/Z333Q/p402-protocol" target="_blank" rel="noopener noreferrer" className="text-black hover:text-primary transition-colors no-underline">
                                Open source SDK ↗
                            </a>
                        </div>
                    </div>
                </section>

                {/* 3b. Client install strip */}
                <section className="py-10 bg-white border-b-2 border-black">
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-6">Install in your environment</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-black border-2 border-black">
                            <div className="bg-white p-6">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">VS Code / Cursor / Windsurf</div>
                                <div className="font-mono text-sm bg-neutral-50 border border-neutral-200 px-3 py-2 mb-2">ext install p402-protocol.p402</div>
                                <p className="text-xs text-neutral-500 leading-relaxed">Embedded MCP server — tools appear in Copilot agent mode on install. No config files.</p>
                            </div>
                            <div className="bg-white p-6">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">Claude Desktop / JetBrains</div>
                                <div className="font-mono text-sm bg-neutral-50 border border-neutral-200 px-3 py-2 mb-2">npx -y @p402/mcp-server</div>
                                <p className="text-xs text-neutral-500 leading-relaxed">stdio MCP server. Add to your client config with <code className="bg-neutral-100 px-1">P402_API_KEY</code>.</p>
                            </div>
                            <div className="bg-[#B6FF2E] p-6">
                                <div className="text-[10px] font-black uppercase tracking-widest text-black/60 mb-3">REST API / SDK</div>
                                <div className="font-mono text-sm bg-black/10 border border-black/10 px-3 py-2 mb-2">npm install @p402/sdk</div>
                                <p className="text-xs text-black/60 leading-relaxed">OpenAI-compatible endpoint. Drop-in replacement — change the base URL and API key.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. Product doorway cards — lead to where the work happens */}
                <section id="product" className="py-20 bg-white border-b-2 border-black">
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="mb-10">
                            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">What you get</div>
                            <h2 className="text-4xl font-black uppercase tracking-tighter">Four capabilities. One protocol.</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-black border-2 border-black">
                            <Link href="/product/payments" className="group bg-white p-8 flex flex-col gap-4 hover:bg-neutral-50 transition-colors no-underline">
                                <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Payments</div>
                                <h3 className="text-xl font-black uppercase tracking-tighter text-black group-hover:text-primary transition-colors">Verify. Settle. Receipt.</h3>
                                <p className="text-sm font-medium text-neutral-600 leading-relaxed flex-1">
                                    EIP-3009 gasless USDC settlement on Base. Sign once, facilitator executes. Receipts for repeat access without re-payment.
                                </p>
                                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 group-hover:text-black transition-colors mt-auto">x402 protocol →</span>
                            </Link>
                            <Link href="/product/controls" className="group bg-white p-8 flex flex-col gap-4 hover:bg-neutral-50 transition-colors no-underline">
                                <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Controls</div>
                                <h3 className="text-xl font-black uppercase tracking-tighter text-black group-hover:text-primary transition-colors">Mandates. Policies. Evidence.</h3>
                                <p className="text-sm font-medium text-neutral-600 leading-relaxed flex-1">
                                    AP2 mandates constrain each agent&apos;s spend cryptographically. Policies enforce account-wide limits. Every deny returns a structured code with requestId.
                                </p>
                                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 group-hover:text-black transition-colors mt-auto">AP2 mandates →</span>
                            </Link>
                            <Link href="/product/orchestration" className="group bg-white p-8 flex flex-col gap-4 hover:bg-neutral-50 transition-colors no-underline">
                                <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Orchestration</div>
                                <h3 className="text-xl font-black uppercase tracking-tighter text-black group-hover:text-primary transition-colors">Tasks. Stream. Trace.</h3>
                                <p className="text-sm font-medium text-neutral-600 leading-relaxed flex-1">
                                    A2A JSON-RPC 2.0 task protocol with SSE streaming. Payment-required events are structured messages — not errors. Live trace for every routing decision.
                                </p>
                                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 group-hover:text-black transition-colors mt-auto">A2A protocol →</span>
                            </Link>
                            <Link href="/product/ecosystem" className="group bg-primary p-8 flex flex-col gap-4 hover:bg-black transition-colors no-underline">
                                <div className="text-[10px] font-black text-black/60 uppercase tracking-widest group-hover:text-primary/60">Ecosystem</div>
                                <h3 className="text-xl font-black uppercase tracking-tighter text-black group-hover:text-primary transition-colors">Skills. Bazaar. Verified.</h3>
                                <p className="text-sm font-medium text-black/70 group-hover:text-neutral-400 leading-relaxed flex-1">
                                    Publish typed skills. List paid agents on the Bazaar. Earn Verified Publisher status. ERC-8004 on-chain reputation — optional, toggleable.
                                </p>
                                <span className="text-[10px] font-black uppercase tracking-widest text-black/50 group-hover:text-primary transition-colors mt-auto">Bazaar marketplace →</span>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* 4. Live routing demo — show the product working */}
                <RequestInspector />

                {/* 5. Pricing — surface early before the deep dive */}
                <PricingStrip />

                {/* 6. Production features */}
                <ProductionFeatures />

                {/* 7. Social proof */}
                <Testimonials />

                {/* 8. Agent marketplace */}
                <BazaarLoop />

                {/* 9. Intelligence — for those who want the full story */}
                <section className="py-20 bg-black text-white border-y-2 border-neutral-800">
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="flex flex-col lg:flex-row gap-12 items-start">
                            <div className="lg:w-80 shrink-0">
                                <Badge variant="primary" className="mb-4">Research</Badge>
                                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-4">
                                    Intelligence Engine
                                </h2>
                                <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
                                    The routing decisions P402 makes are driven by a real-time intelligence layer. Explore the research.
                                </p>
                                <Link href="/intelligence" className="inline-flex items-center h-10 px-5 bg-primary text-black font-black text-[11px] uppercase tracking-wider border-2 border-primary hover:bg-black hover:text-primary hover:border-primary transition-colors no-underline">
                                    Read the research →
                                </Link>
                            </div>
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-px bg-white/10 border border-white/10">
                                {[
                                    { title: "Protocol Economics", desc: "Atomic settlement & market design.", link: "/intelligence/protocol-economics" },
                                    { title: "Machine Governance", desc: "Cryptographic AP2 mandates.", link: "/intelligence/machine-governance" },
                                    { title: "Agentic Orchestration", desc: "QoS semantic routing logic.", link: "/intelligence/agentic-orchestration" },
                                    { title: "The Sentinel Layer", desc: "Flash crash protection systems.", link: "/intelligence/sentinel-layer" },
                                    { title: "Trustless Agents", desc: "ERC-8004 on-chain identity & reputation.", link: "/docs/erc8004" },
                                    { title: "Validation Registry", desc: "High-value transaction verification.", link: "/docs/erc8004" },
                                ].map((pillar, i) => (
                                    <Link key={i} href={pillar.link} className="group bg-neutral-900 p-5 hover:bg-neutral-800 transition-colors no-underline">
                                        <h3 className="text-sm font-black uppercase text-primary mb-1.5 group-hover:underline decoration-2 underline-offset-4">
                                            {pillar.title}
                                        </h3>
                                        <p className="text-neutral-500 font-mono text-[11px] leading-relaxed">
                                            {pillar.desc}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 10. Final CTA — drive to signup */}
                <section className="py-32 bg-primary text-center border-t-2 border-black">
                    <div className="container mx-auto px-6">
                        <div className="text-[10px] font-black uppercase tracking-widest text-black/60 mb-4">Free to start. No credit card.</div>
                        <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-4 leading-none">
                            Start routing<br />in minutes.
                        </h2>
                        <p className="text-black/70 font-bold text-xl mb-10 max-w-xl mx-auto">
                            One endpoint. 300+ models. Automatic cost savings. Gasless payments on Base.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Link href="/login" className="btn btn-dark text-xl px-10 py-5 h-auto">
                                Create Free Account
                            </Link>
                            <Link href="/developers/quickstart" className="text-xl px-10 py-5 h-auto border-2 border-black bg-transparent text-black font-black uppercase tracking-wider hover:bg-black hover:text-primary transition-colors inline-flex items-center justify-center">
                                Run Quickstart
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
