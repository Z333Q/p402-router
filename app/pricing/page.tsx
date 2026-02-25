import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { Check, Info, HelpCircle } from "lucide-react";
import { Badge } from "@/app/dashboard/_components/ui";
import { UpgradeMathCalculator } from "@/components/pricing/UpgradeMathCalculator";

export const metadata = {
    title: 'Pricing | P402 Router',
    description: 'Agent commerce pricing that rewards commitment. Pro includes Claude Skill — AI-assisted integration for routing, billing guard, and x402 payment flows. High platform fees for experiments, lower for production.',
};

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-[var(--neutral-50)] text-[var(--neutral-900)] font-sans selection:bg-[var(--primary)] selection:text-black flex flex-col">
            <TopNav />

            <main className="flex-grow">
                {/* 1. Hero Section */}
                <section className="pt-32 pb-16 px-6 max-w-7xl mx-auto text-center">
                    <Badge variant="primary" className="mb-6 mx-auto">Protocol Economics v2.0</Badge>
                    <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 leading-tight">
                        Agent commerce pricing <br className="hidden md:block" />
                        <span className="bg-[var(--primary)] px-4 mt-2 inline-block -rotate-1 border-2 border-black">that rewards commitment</span>
                    </h1>
                    <p className="text-lg md:text-xl font-mono text-[var(--neutral-700)] max-w-3xl mx-auto font-bold">
                        Higher platform fees for experiments. <br className="hidden sm:inline" />
                        Lower fees and advanced governance for production.
                    </p>
                </section>

                {/* 2. Upgrade Math Calculator */}
                <section className="px-6 py-12 bg-white border-y-2 border-black">
                    <div className="container mx-auto max-w-7xl">
                        <div className="text-center mb-4">
                            <h2 className="text-3xl font-black uppercase tracking-tighter">The Conversion Hook</h2>
                            <p className="font-mono text-sm text-[var(--neutral-500)] uppercase">Calculate your real-world savings</p>
                        </div>
                        <UpgradeMathCalculator />
                    </div>
                </section>

                {/* 3. The Three Neo-Brutalist Tier Cards */}
                <section className="px-6 py-24 max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">

                        {/* TIER 1: FREE (Experiment) */}
                        <div className="card bg-white border-2 border-black flex flex-col relative transition-transform hover:-translate-y-1">
                            <div className="p-8 border-b-2 border-black">
                                <h2 className="text-3xl font-black uppercase tracking-wide mb-2">Free</h2>
                                <p className="font-mono text-sm text-[var(--neutral-700)] h-12 leading-tight font-bold">
                                    Built for testing paid endpoints and early bazaar listings.
                                </p>
                                <div className="mt-6 mb-2">
                                    <span className="text-6xl font-black">$0</span>
                                    <span className="font-mono text-[var(--neutral-700)] font-bold"> / mo</span>
                                </div>
                                <div className="inline-block bg-[var(--neutral-300)] text-black font-black uppercase text-xs px-3 py-1 border-2 border-black">
                                    1.00% Platform Fee
                                </div>
                            </div>
                            <div className="p-8 flex-1 flex flex-col gap-6">
                                <ul className="flex flex-col gap-4 font-mono text-sm flex-1 font-bold">
                                    <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-black" strokeWidth={3} /> <span>Standard x402 routing</span></li>
                                    <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-black" strokeWidth={3} /> <span>Basic AP2 Mandate caps</span></li>
                                    <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-black" strokeWidth={3} /> <span>5 Integration Audits / mo</span></li>
                                    <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-black" strokeWidth={3} /> <span>7-day runtime trend summary</span></li>
                                </ul>
                                <Link
                                    href="/login"
                                    className="btn w-full bg-white text-black text-center font-black uppercase py-5 border-2 border-black hover:bg-[var(--neutral-300)] transition-colors mt-auto text-sm tracking-widest"
                                >
                                    Start Building
                                </Link>
                            </div>
                        </div>

                        {/* TIER 2: PRO (Operate) */}
                        <div className="card bg-white border-2 border-black flex flex-col relative shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] z-10 scale-100 lg:scale-105 transition-all">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--primary)] border-2 border-black px-6 py-2 font-black uppercase tracking-widest text-sm shadow-[4px_4px_0px_#000]">
                                Most Popular
                            </div>
                            <div className="p-8 border-b-2 border-black bg-[var(--neutral-900)] text-white">
                                <h2 className="text-3xl font-black uppercase tracking-wide mb-2 text-[var(--primary)]">Pro</h2>
                                <p className="font-mono text-sm text-[var(--neutral-300)] h-12 leading-tight font-bold">
                                    Built for production routing, advanced analytics, auto-retries, and verified publishing.
                                </p>
                                <div className="mt-6 mb-2">
                                    <span className="text-6xl font-black">$499</span>
                                    <span className="font-mono text-[var(--neutral-400)] font-bold"> / mo</span>
                                </div>
                                <div className="inline-block bg-[var(--primary)] text-black font-black uppercase text-xs px-3 py-1 border-2 border-black">
                                    0.75% Platform Fee
                                </div>
                            </div>
                            <div className="p-8 flex-1 flex flex-col gap-6 bg-white">
                                <ul className="flex flex-col gap-4 font-mono text-sm flex-1 font-black">
                                    <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-[var(--primary)] bg-black" strokeWidth={3} /> <span>High priority routing cluster</span></li>
                                    <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-[var(--primary)] bg-black" strokeWidth={3} /> <span>Unlimited integration audits</span></li>
                                    <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-[var(--primary)] bg-black" strokeWidth={3} /> <span>90-day route-level analytics</span></li>
                                    <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-[var(--primary)] bg-black" strokeWidth={3} /> <span>Scheduled daily health audits</span></li>
                                    <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-[var(--primary)] bg-black" strokeWidth={3} /> <span>Verified Publisher Workflow</span></li>
                                    <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-[var(--primary)] bg-black" strokeWidth={3} /> <span><Link href="/docs/skill" className="underline">Claude Skill</Link> — AI integration assistant</span></li>
                                    <li className="flex items-start gap-3 text-xs bg-[var(--neutral-100)] p-2 border border-black border-dashed"><Info className="w-4 h-4 shrink-0" /> <span>Pay via Stripe or EIP-2612</span></li>
                                </ul>
                                <Link
                                    href="/dashboard/billing"
                                    className="btn w-full bg-[var(--primary)] text-black text-center font-black uppercase py-5 border-2 border-black hover:bg-[var(--primary-hover)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all mt-auto text-sm tracking-widest"
                                >
                                    Upgrade to Pro
                                </Link>
                            </div>
                        </div>

                        {/* TIER 3: ENTERPRISE (Govern) */}
                        <div className="card bg-[var(--neutral-900)] text-white border-2 border-black flex flex-col relative transition-transform hover:-translate-y-1">
                            <div className="p-8 border-b-2 border-black">
                                <h2 className="text-3xl font-black uppercase tracking-wide mb-2">Enterprise</h2>
                                <p className="font-mono text-sm text-[var(--neutral-400)] h-12 leading-tight font-bold">
                                    Built for strict policy controls, attestation workflows, and safety ops.
                                </p>
                                <div className="mt-6 mb-2">
                                    <span className="text-6xl font-black text-[var(--neutral-300)]">Custom</span>
                                </div>
                                <div className="inline-block bg-white text-black font-black uppercase text-xs px-3 py-1 border-2 border-black">
                                    From 0.40% Platform Fee
                                </div>
                            </div>
                            <div className="p-8 flex-1 flex flex-col gap-6">
                                <ul className="flex flex-col gap-4 font-mono text-sm flex-1 text-[var(--neutral-300)] font-bold">
                                    <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-white" strokeWidth={3} /> <span>Dedicated routing infrastructure</span></li>
                                    <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-white" strokeWidth={3} /> <span>Policy-linked scheduled audits</span></li>
                                    <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-white" strokeWidth={3} /> <span>Multi-stage AP2 approvals</span></li>
                                    <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-white" strokeWidth={3} /> <span>Moderation & Incident Queues</span></li>
                                    <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-white" strokeWidth={3} /> <span>Signed Evidence & CSV Exports</span></li>
                                    <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-white" strokeWidth={3} /> <span>Dedicated Slack support</span></li>
                                </ul>
                                <Link
                                    href="mailto:sales@p402.io"
                                    className="btn w-full bg-black text-white text-center font-black uppercase py-5 border-2 border-[var(--neutral-400)] hover:bg-white hover:text-black hover:border-white transition-colors mt-auto text-sm tracking-widest"
                                >
                                    Contact Sales
                                </Link>
                            </div>
                        </div>

                    </div>
                </section>

                {/* 4. The Feature & Audit Matrix */}
                <section className="py-24 bg-white border-y-2 border-black">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-center mb-16">
                            <h2 className="text-5xl font-black uppercase tracking-tighter mb-4 italic">Feature & Audit Matrix</h2>
                            <p className="font-mono text-sm text-[var(--neutral-500)] uppercase tracking-widest font-bold">PLG Funnels & Trust Capabilities</p>
                        </div>

                        <div className="overflow-x-auto border-2 border-black">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[var(--neutral-100)] border-b-2 border-black uppercase text-[10px] font-black tracking-widest">
                                        <th className="p-6">Capability</th>
                                        <th className="p-6">Free (Experiment)</th>
                                        <th className="p-6 bg-[var(--primary)]/20 border-x-2 border-black">Pro (Operate)</th>
                                        <th className="p-6">Enterprise (Govern)</th>
                                    </tr>
                                </thead>
                                <tbody className="font-bold text-sm">
                                    <ComparisonRow label="x402 Settlement" free="Standard Priority" pro="High Priority" enterprise="Dedicated Cluster" />
                                    <ComparisonRow label="Integration Audits" free="5 On-Demand / mo" pro="Unlimited" enterprise="Unlimited" />
                                    <ComparisonRow label="Runtime Trends" free="7-day Summary" pro="90-day Route-level" enterprise="365-day Org-wide" />
                                    <ComparisonRow label="Scheduled Audits" free="Locked" pro="Daily / Weekly" enterprise="Policy-Linked" />
                                    <ComparisonRow label="Trust & Publisher" free="Public Scanner" pro="Verified Workflow" enterprise="Moderation Queue" />
                                    <ComparisonRow label="AP2 Mandate Limits" free="Basic Caps" pro="Advanced Rules" enterprise="Multi-stage Approvals" />
                                    <ComparisonRow label="Audit Evidence" free="Locked" pro="Preview" enterprise="Signed Bundles & CSV" />
                                    <ComparisonRow label="Claude Skill" free="Community" pro="Included" enterprise="Included" />
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* 5. Frequently Asked Questions (FAQ) */}
                <section className="py-24 bg-[var(--neutral-50)]">
                    <div className="container mx-auto px-6 max-w-4xl">
                        <div className="flex items-center justify-center gap-3 mb-12">
                            <HelpCircle className="w-8 h-8 text-[var(--primary)]" />
                            <h2 className="text-4xl font-black uppercase tracking-tighter italic text-center">
                                Frequently Asked Questions
                            </h2>
                        </div>

                        <div className="space-y-6">
                            {[
                                {
                                    q: "What is the difference between the platform fee and the subscription?",
                                    a: "The subscription fee (e.g., $499/mo for Pro) unlocks the SaaS control plane, advanced analytics, and priority infrastructure. The platform fee (e.g., 0.75% for Pro) is taken atomically on-chain during each x402 settlement to cover routing and facilitation costs."
                                },
                                {
                                    q: "Can I pay for my subscription with crypto?",
                                    a: "Yes. In the Billing dashboard, you can opt to pay via our gasless EIP-2612 wallet flow using USDC on Base, or via traditional Stripe (Credit Card/Apple Pay)."
                                },
                                {
                                    q: "Do cache hits count towards my platform fee?",
                                    a: "No. Our Semantic Cache is designed to save you money. Cache hits bypass the routing engine and on-chain settlement, making them free of platform fees."
                                },
                                {
                                    q: "What happens if my agent loses its Trustless Reputation?",
                                    a: "If an agent's reputation drops below your defined threshold, the ERC-8004 validation guard will intercept requests. On the Enterprise tier, these incidents are routed to a Moderation Queue for manual review and override."
                                },
                                {
                                    q: "Is there an AI assistant to help with P402 integration?",
                                    a: "Yes. The P402 Claude Skill gives Claude Code and Claude.ai deep knowledge of the routing API, billing guard, TypeScript interfaces, x402 payment flows, and A2A protocol. Install it from p402.io/docs/skill and ask Claude to generate integration code, debug routing decisions, set up agent spending controls, or compare model pricing across 300+ models."
                                }
                            ].map((faq, i) => (
                                <div key={i} className="bg-white border-2 border-black p-8 hover:bg-[var(--neutral-100)] transition-all shadow-[4px_4px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000] cursor-default">
                                    <h3 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                                        <span className="text-[var(--primary)] bg-black px-1.5 py-0.5 text-xs">Q</span> {faq.q}
                                    </h3>
                                    <p className="text-[var(--neutral-600)] font-bold text-sm leading-relaxed border-l-4 border-black pl-4">
                                        {faq.a}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-32 bg-black text-center border-t-2 border-black overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-50"></div>
                    <div className="container mx-auto px-6 relative z-10">
                        <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-8 leading-none italic text-white hover:text-[var(--primary)] transition-colors cursor-default">
                            Ready <br /> to Route?
                        </h2>
                        <p className="max-w-xl mx-auto text-[var(--neutral-400)] font-black text-lg mb-12 uppercase">
                            Stop guessing economics. Start verifying them. Join the first economic layer built specifically for the Agentic Web.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-6">
                            <Link href="/login" className="btn btn-primary bg-[var(--primary)] text-black text-xl px-12 py-6 h-auto font-black uppercase tracking-widest border-2 border-black shadow-[8px_8px_0px_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                                Get Started Free
                            </Link>
                            <Link href="/demo/payment-flow" className="btn border-2 border-white text-white text-xl px-12 py-6 h-auto font-black uppercase tracking-widest bg-transparent hover:bg-white hover:text-black transition-all">
                                See Live Demo
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}

function ComparisonRow({ label, free, pro, enterprise }: { label: string; free: string; pro: string; enterprise: string }) {
    const isLocked = (val: string) => val.toLowerCase() === 'locked';

    return (
        <tr className="border-b-2 border-black">
            <td className="p-6 font-black uppercase tracking-tight italic bg-[var(--neutral-100)] border-r-2 border-black">{label}</td>
            <td className={`p-6 font-bold ${isLocked(free) ? 'text-[var(--neutral-400)] italic' : 'text-black'}`}>{free}</td>
            <td className="p-6 bg-[var(--primary)]/10 border-x-2 border-black font-black">{pro}</td>
            <td className="p-6 font-bold">{enterprise}</td>
        </tr>
    );
}
