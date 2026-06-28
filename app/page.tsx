import type { Metadata } from 'next'
import { TopNav } from "@/components/TopNav"
import { Footer } from "@/components/Footer"
import { BazaarLoop } from "@/components/landing/BazaarLoop"
import { Testimonials } from "@/components/landing/Testimonials"
import { LiveRoutingDemo } from "@/components/landing/LiveRoutingDemo"
import { ProductionFeatures } from "@/components/landing/ProductionFeatures"
import Link from 'next/link'
import { PricingStrip } from "@/components/landing/PricingStrip"
import { HeroABTest } from "@/components/landing/HeroABTest"
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'P402 Meter | Make AI Spend Accountable',
    description: 'P402 meters every AI call and turns token usage into a live ledger for budgets, margins, workflows, policy results, and evidence.',
    alternates: { canonical: 'https://p402.io' },
    keywords: [
        'AI spend accountability', 'AI cost ledger', 'AI COGS dashboard', 'AI budget control',
        'AI margin control', 'token usage attribution', 'AI spend audit', 'enterprise AI budget',
        'embedded AI margin', 'metered AI economic events', 'AI feature margin',
        'AI usage ledger', 'evidence bundle', 'AP2 mandates'
    ],
    openGraph: {
        title: 'P402 Meter | Make AI Spend Accountable',
        description: 'Meter every AI call. Turn token usage into a live ledger for budgets, margins, workflows, policy results, and evidence.',
        url: 'https://p402.io',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'P402 Meter | Make AI Spend Accountable',
        description: 'Meter every AI call. Turn token usage into a live ledger with owner, budget, and policy result.',
        site: '@p402io',
    },
};

const buyerPaths = [
    {
        eyebrow: 'Developer building AI software',
        title: 'Know AI feature margin.',
        body: 'Track AI COGS, feature margin, customer cost, retry waste, context waste, and cost per accepted output.',
        ctaLabel: 'Start free',
        ctaHref: '/login',
    },
    {
        eyebrow: 'Enterprise AI spend manager',
        title: 'See department, employee, workflow, model, and vendor spend.',
        body: 'A one-time engagement that produces an AI Spend Accountability Report covering attribution, leakage, and evidence readiness.',
        ctaLabel: 'Run AI Spend Audit',
        ctaHref: '/get-access?intent=ai-spend-audit',
    },
    {
        eyebrow: 'Regulated workflow operator',
        title: 'Track cost, review status, privacy mode, and exportable evidence.',
        body: 'Export evidence bundles, finance reports, and event proof for every AI economic event.',
        ctaLabel: 'See evidence',
        ctaHref: '/dashboard/prove?demo=1',
    },
    {
        eyebrow: 'Agent builder',
        title: 'Give agents budgets, receipts, and payment traces.',
        body: 'Mandates constrain each agent’s spend cryptographically. Receipts and settlement records back every payable AI work item.',
        ctaLabel: 'Read docs',
        ctaHref: '/docs',
    },
    {
        eyebrow: 'Partner',
        title: 'Help clients deploy AI spend accountability.',
        body: 'Refer, implement, and advise teams adopting the P402 partner program.',
        ctaLabel: 'Apply as partner',
        ctaHref: '/partners/apply',
    },
];

const trustSignals = [
    {
        label: 'Privacy boundary',
        body: 'Meter economics, not content. Metadata-only by default. Five privacy modes from metadata-only to full-trace opt-in.',
    },
    {
        label: 'Status boundary',
        body: 'Meter is shipped. Control runtime flip remains gated. Optimize recommendations remain gated until outcome data is sufficient.',
    },
    {
        label: 'Proof object',
        body: 'Dashboard event detail, evidence bundle, finance report, CSV appendix.',
    },
    {
        label: 'Conversion next step',
        body: 'Start free, Run AI Spend Audit, See evidence, Apply as partner, or Read docs.',
    },
];

export default async function Page() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main>
                {/* 1. Hero */}
                <section className="bg-white border-b-2 border-black">
                    <div className="container mx-auto px-6 max-w-7xl py-20 md:py-28">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
                            <div className="lg:col-span-7 flex flex-col justify-center">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-6">AI spend accountability infrastructure</div>
                                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-none mb-8">
                                    Make AI spend<br />accountable.
                                </h1>
                                <p className="text-base md:text-lg text-neutral-700 font-medium leading-relaxed mb-8">
                                    P402 turns every AI request into an economic event with owner, workflow, model, provider, tokens, cost, budget, policy result, outcome, and evidence status. Private by default, metadata-only metering.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                    <Link href="/meter" className="btn btn-primary text-base px-8 py-4 h-auto">
                                        Install Meter
                                    </Link>
                                    <Link href="/dashboard?demo=1" className="text-base px-8 py-4 h-auto border-2 border-black bg-white text-black font-black uppercase tracking-wider hover:bg-black hover:text-primary transition-colors inline-flex items-center justify-center">
                                        See dashboard
                                    </Link>
                                </div>
                                <p className="text-sm text-neutral-500 font-medium">
                                    No prompt storage required. Metadata-only mode is available from the first event.
                                </p>
                            </div>
                            <div className="lg:col-span-5 flex">
                                <div className="w-full">
                                    <HeroABTest />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Verify strip */}
                <section className="py-5 bg-neutral-50 border-b-2 border-black">
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-widest">
                            <span className="text-neutral-400">Verify independently:</span>
                            <Link href="/status" className="flex items-center gap-1.5 text-black hover:text-primary transition-colors no-underline">
                                <span className="w-2 h-2 bg-green-500 inline-block" />
                                System status
                            </Link>
                            <Link href="/trust" className="text-black hover:text-primary transition-colors no-underline">Trust Center</Link>
                            <a href="https://basescan.org/address/0xd03c7ab9a84d86dbc171367168317d6ebe408601" target="_blank" rel="noopener noreferrer" className="text-black hover:text-primary transition-colors no-underline">
                                Settlement contract
                            </a>
                            <a href="https://basescan.org/address/0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6" target="_blank" rel="noopener noreferrer" className="text-black hover:text-primary transition-colors no-underline">
                                Treasury
                            </a>
                            <a href="https://github.com/Z333Q/p402-protocol" target="_blank" rel="noopener noreferrer" className="text-black hover:text-primary transition-colors no-underline">
                                Open source SDK
                            </a>
                            <span className="text-neutral-200">|</span>
                            <Link href="/demo" className="text-black hover:text-primary transition-colors no-underline">Protocol demo</Link>
                            <Link href="/meter" className="flex items-center gap-1.5 text-black hover:text-primary transition-colors no-underline">
                                <span className="w-2 h-2 bg-primary inline-block" />
                                Live industry demos
                            </Link>
                        </div>
                    </div>
                </section>

                {/* 3. Problem block */}
                <section className="py-20 md:py-28 bg-white border-b-2 border-black">
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">The problem</div>
                        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-8 max-w-4xl">
                            AI spend arrives too late.
                        </h2>
                        <p className="text-lg md:text-xl text-neutral-700 font-medium leading-relaxed max-w-3xl">
                            Provider invoices show totals after usage happens. They do not show which customer, feature, workflow, department, employee, model, or retry caused the cost. P402 records that ownership when the event happens.
                        </p>
                    </div>
                </section>

                {/* 4. System block: install strip */}
                <section className="py-16 bg-white border-b-2 border-black">
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-6">Install in your environment</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-black border-2 border-black">
                            <div className="bg-white p-6">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">VS Code / Cursor / Windsurf</div>
                                <div className="font-mono text-sm bg-neutral-50 border border-neutral-200 px-3 py-2 mb-2">ext install p402-protocol.p402</div>
                                <p className="text-xs text-neutral-500 leading-relaxed">Embedded MCP server. Tools appear in Copilot agent mode on install. No config files.</p>
                            </div>
                            <div className="bg-white p-6">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">Claude Desktop / JetBrains</div>
                                <div className="font-mono text-sm bg-neutral-50 border border-neutral-200 px-3 py-2 mb-2">npx -y @p402/mcp-server</div>
                                <p className="text-xs text-neutral-500 leading-relaxed">stdio MCP server. Add to your client config with <code className="bg-neutral-100 px-1">P402_API_KEY</code>.</p>
                            </div>
                            <div className="bg-[#B6FF2E] p-6">
                                <div className="text-[10px] font-black uppercase tracking-widest text-black/60 mb-3">REST API / SDK</div>
                                <div className="font-mono text-sm bg-black/10 border border-black/10 px-3 py-2 mb-2">npm install @p402/sdk</div>
                                <p className="text-xs text-black/60 leading-relaxed">OpenAI-compatible endpoint. Drop-in replacement. Change the base URL and API key.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. Buyer-path cards */}
                <section id="buyer-paths" className="py-20 md:py-28 bg-white border-b-2 border-black">
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="mb-10">
                            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Buyer paths</div>
                            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Five paths. One protocol.</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-px bg-black border-2 border-black">
                            {buyerPaths.map((path, i) => {
                                const isAccent = i === 0;
                                const spanClass = i < 4 ? 'lg:col-span-3 xl:col-span-2' : 'lg:col-span-6 xl:col-span-2';
                                return (
                                    <Link
                                        key={i}
                                        href={path.ctaHref}
                                        className={`group ${isAccent ? 'bg-primary hover:bg-black' : 'bg-white hover:bg-neutral-50'} p-8 flex flex-col gap-4 transition-colors no-underline ${spanClass}`}
                                    >
                                        <div className={`text-[10px] font-black uppercase tracking-widest ${isAccent ? 'text-black/60 group-hover:text-primary/60' : 'text-neutral-500'}`}>
                                            {path.eyebrow}
                                        </div>
                                        <h3 className={`text-xl font-black uppercase tracking-tighter ${isAccent ? 'text-black group-hover:text-primary' : 'text-black group-hover:text-primary'} transition-colors`}>
                                            {path.title}
                                        </h3>
                                        <p className={`text-sm font-medium leading-relaxed flex-1 ${isAccent ? 'text-black/70 group-hover:text-neutral-400' : 'text-neutral-600'}`}>
                                            {path.body}
                                        </p>
                                        <span className={`text-[10px] font-black uppercase tracking-widest mt-auto transition-colors ${isAccent ? 'text-black/50 group-hover:text-primary' : 'text-neutral-400 group-hover:text-black'}`}>
                                            {path.ctaLabel}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* 6. Trust block */}
                <section className="py-20 md:py-28 bg-neutral-50 border-b-2 border-black">
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="mb-10">
                            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Trust</div>
                            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">What P402 commits to.</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-black border-2 border-black">
                            {trustSignals.map((signal, i) => (
                                <div key={i} className="bg-white p-6 flex flex-col gap-3">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{signal.label}</div>
                                    <p className="text-sm font-medium text-neutral-700 leading-relaxed">{signal.body}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 7. Proof block: live routing demo */}
                <LiveRoutingDemo />

                {/* 8. Pricing */}
                <PricingStrip />

                {/* 9. Production features */}
                <ProductionFeatures />

                {/* 10. Social proof */}
                <Testimonials />

                {/* 11. Agent marketplace */}
                <BazaarLoop />

                {/* 12. Final CTA */}
                <section className="py-32 bg-primary text-center border-t-2 border-black">
                    <div className="container mx-auto px-6">
                        <div className="text-[10px] font-black uppercase tracking-widest text-black/60 mb-4">Meter is shipped.</div>
                        <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-4 leading-none">
                            Give every token<br />an owner.
                        </h2>
                        <p className="text-black/70 font-bold text-xl mb-10 max-w-xl mx-auto">
                            Start with one metered event.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Link href="/meter" className="btn btn-dark text-xl px-10 py-5 h-auto">
                                Install Meter
                            </Link>
                            <Link href="/get-access?intent=ai-spend-audit" className="text-xl px-10 py-5 h-auto border-2 border-black bg-transparent text-black font-black uppercase tracking-wider hover:bg-black hover:text-primary transition-colors inline-flex items-center justify-center">
                                Run AI Spend Audit
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    )
}
