import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { Check, Info, HelpCircle } from "lucide-react";
import { Badge } from "@/app/dashboard/_components/ui";
import { UpgradeMathCalculator } from "@/components/pricing/UpgradeMathCalculator";

export const metadata = {
    title: 'Pricing | P402 Router',
    description: 'P402 pricing: Free (1% fee), Pro $499/mo (0.75% fee, Claude Skill), Enterprise (custom). Pay with Stripe or USDC via EIP-2612. AI payment router for agent commerce.',
    alternates: { canonical: 'https://p402.io/pricing' },
    openGraph: { title: 'P402 Pricing — Free, Pro $499/mo, Enterprise', description: 'Transparent platform fees for AI routing. Higher fees for experiments, lower for production. Pay with card or USDC.', url: 'https://p402.io/pricing' },
};

const pricingJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'SoftwareApplication',
            name: 'P402 Router',
            applicationCategory: 'DeveloperApplication',
            offers: [
                {
                    '@type': 'Offer',
                    name: 'Free',
                    price: '0',
                    priceCurrency: 'USD',
                    description: '1.00% platform fee. Standard x402 routing, basic AP2 mandate caps, 5 integration audits/mo.',
                },
                {
                    '@type': 'Offer',
                    name: 'Pro',
                    price: '499',
                    priceCurrency: 'USD',
                    description: '0.75% platform fee. High priority routing, unlimited audits, 90-day analytics, Claude Skill.',
                    billingIncrement: 1,
                },
                {
                    '@type': 'Offer',
                    name: 'Enterprise',
                    price: 'Custom',
                    priceCurrency: 'USD',
                    description: 'Volume-tiered platform fee. Dedicated infrastructure, multi-stage AP2 approvals, moderation queues.',
                },
            ],
        },
        {
            '@type': 'FAQPage',
            mainEntity: [
                {
                    '@type': 'Question',
                    name: 'What is the difference between the platform fee and the subscription?',
                    acceptedAnswer: { '@type': 'Answer', text: 'The subscription fee (e.g., $499/mo for Pro) unlocks the SaaS control plane, advanced analytics, and priority infrastructure. The platform fee (e.g., 0.75% for Pro) is taken atomically on-chain during each x402 settlement.' },
                },
                {
                    '@type': 'Question',
                    name: 'Can I pay for my subscription with crypto?',
                    acceptedAnswer: { '@type': 'Answer', text: 'Yes. In the Billing dashboard, you can opt to pay via our gasless EIP-2612 wallet flow using USDC on Base, or via traditional Stripe.' },
                },
                {
                    '@type': 'Question',
                    name: 'Do cache hits count towards my platform fee?',
                    acceptedAnswer: { '@type': 'Answer', text: 'No. Semantic Cache hits bypass the routing engine and on-chain settlement entirely, making them free of platform fees.' },
                },
                {
                    '@type': 'Question',
                    name: 'Is there an AI assistant to help with P402 integration?',
                    acceptedAnswer: { '@type': 'Answer', text: 'Yes. The P402 Claude Skill gives Claude Code and Claude.ai deep knowledge of the routing API, billing guard, x402 payment flows, and A2A protocol. Install it from p402.io/docs/skill.' },
                },
                {
                    '@type': 'Question',
                    name: 'Does the VS Code extension work on the Free plan?',
                    acceptedAnswer: { '@type': 'Answer', text: 'Yes. The VS Code extension (p402-protocol.p402) is available on all plans including Free. Install it with ext install p402-protocol.p402 in VS Code, Cursor, or Windsurf. The MCP server is bundled with zero config required.' },
                },
                {
                    '@type': 'Question',
                    name: 'Why is the escrow fee 2% instead of my plan rate?',
                    acceptedAnswer: { '@type': 'Answer', text: 'Escrow involves two on-chain transactions and a dispute window. The 2% fee is enforced by the P402Escrow smart contract at release and applies uniformly across all plans. You can disable escrow in Developer Settings to use direct x402 settlement at your plan\'s standard rate.' },
                },
            ],
        },
    ],
};

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-[var(--neutral-50)] text-[var(--neutral-900)] font-sans selection:bg-[var(--primary)] selection:text-black flex flex-col">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }} />
            <TopNav />

            <main className="flex-grow">
                {/* 1. Hero Section */}
                <section className="pt-32 pb-16 px-6 max-w-7xl mx-auto text-center">
                    <Badge variant="primary" className="mb-6 mx-auto"><span className="font-mono">{">_"}</span> Protocol Economics v2.0</Badge>
                    <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 leading-tight">
                        Agent commerce pricing <br className="hidden md:block" />
                        <span className="heading-accent">that rewards commitment.</span>
                    </h1>
                    <p className="text-lg md:text-xl font-mono text-[var(--neutral-700)] max-w-3xl mx-auto font-bold">
                        Free: <span className="text-black font-black">1.00%</span> per settled payment.&nbsp;
                        Pro: <span className="text-black font-black">0.75%</span>.&nbsp;
                        Enterprise: volume rate.
                        <br className="hidden sm:block" />
                        <span className="text-[var(--neutral-500)]">Every basis point is enforced on-chain — not in an SLA.</span>
                    </p>
                </section>

                {/* 2. Upgrade Math Calculator */}
                <section className="px-6 py-12 bg-white border-y-2 border-black">
                    <div className="container mx-auto max-w-7xl">
                        <div className="text-center mb-4">
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Prove it to yourself.</h2>
                            <p className="font-mono text-sm text-[var(--neutral-500)] uppercase">Drop in your monthly AI spend. The math does the talking.</p>
                        </div>
                        <UpgradeMathCalculator />
                    </div>
                </section>

                {/* 3. Fee Rate Strip */}
                <section className="bg-black border-b-2 border-black py-10 px-6">
                    <div className="max-w-4xl mx-auto">
                        <p className="text-center text-[10px] font-black uppercase tracking-widest text-[var(--neutral-500)] mb-6">Platform fee per settled payment</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[var(--neutral-800)] border-2 border-[var(--neutral-800)]">
                            <div className="p-6 sm:p-8 text-center">
                                <div className="text-4xl sm:text-5xl font-black text-white mb-2">1.00<span className="text-xl sm:text-2xl">%</span></div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--neutral-500)] mb-1">Free</div>
                                <div className="text-[10px] font-bold text-[var(--neutral-600)] font-mono">$0 / mo</div>
                            </div>
                            <div className="p-6 sm:p-8 text-center bg-[var(--neutral-900)]">
                                <div className="text-4xl sm:text-5xl font-black text-[var(--primary)] mb-2">0.75<span className="text-xl sm:text-2xl">%</span></div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--neutral-400)] mb-1">Pro</div>
                                <div className="text-[10px] font-bold text-[var(--neutral-500)] font-mono">$499 / mo</div>
                                <div className="mt-3 text-[9px] font-black uppercase tracking-wider text-[var(--neutral-600)] border border-[var(--neutral-700)] px-2 py-1 inline-block whitespace-nowrap">
                                    Pays for itself at ~$200K / mo
                                </div>
                            </div>
                            <div className="p-6 sm:p-8 text-center">
                                <div className="text-4xl sm:text-5xl font-black text-[var(--neutral-400)] mb-2">Vol. <span className="text-xl sm:text-2xl">rate</span></div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--neutral-500)] mb-1">Enterprise</div>
                                <div className="text-[10px] font-bold text-[var(--neutral-600)] font-mono">Custom / mo</div>
                            </div>
                        </div>
                        <p className="text-center text-[10px] font-bold text-[var(--neutral-700)] mt-4 font-mono uppercase tracking-wider">
                            Fees deducted atomically at settlement — enforced by contract, not policy
                        </p>
                        <p className="text-center text-[10px] font-bold text-[var(--neutral-600)] mt-2 font-mono uppercase tracking-wider">
                            Escrow-protected payments (Bazaar): <span className="text-[var(--primary)]">2% flat</span> — enforced on-chain at escrow release · <span className="text-[var(--neutral-500)]">toggleable per account</span>
                        </p>
                    </div>
                </section>

                {/* 4. The Three Neo-Brutalist Tier Cards */}
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
                                    <li className="flex items-start gap-3"><Check className="w-5 h-5 shrink-0 text-black" strokeWidth={3} /> <span>VS Code extension — embedded MCP, zero config</span></li>
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
                                    Volume-Tiered Platform Fee
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

                {/* 5. Plan Comparison */}
                <section className="py-24 bg-white border-y-2 border-black">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-center mb-16">
                            <h2 className="text-5xl font-black uppercase tracking-tighter mb-4 italic">Everything included.</h2>
                            <p className="font-mono text-sm text-[var(--neutral-500)] uppercase tracking-widest font-bold">Every limit. Every feature. Nothing hidden.</p>
                        </div>

                        <div className="overflow-x-auto border-2 border-black">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-black uppercase text-[10px] font-black tracking-widest">
                                        <th className="p-5 bg-[var(--neutral-100)] w-2/5"></th>
                                        <th className="p-5 bg-[var(--neutral-100)] text-center">Free</th>
                                        <th className="p-5 bg-[var(--primary)] border-x-2 border-black text-center text-black">
                                            Pro
                                            <span className="block text-[9px] font-bold normal-case tracking-wide mt-0.5 opacity-70">Most popular</span>
                                        </th>
                                        <th className="p-5 bg-[var(--neutral-100)] text-center">Enterprise</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    <CategoryRow label="Pricing" />
                                    <ComparisonRow label="Platform fee per settlement" free="1.00%" pro="0.75%" enterprise="Volume rate" />
                                    <ComparisonRow label="Escrow-protected payments (Bazaar)" free="2% flat" pro="2% flat" enterprise="2% flat" />
                                    <ComparisonRow label="Monthly subscription" free="$0 / mo" pro="$499 / mo" enterprise="Custom" />

                                    <CategoryRow label="Routing" />
                                    <ComparisonRow label="Settlement priority" free="Standard" pro="High priority" enterprise="Dedicated cluster" />

                                    <CategoryRow label="Analytics" />
                                    <ComparisonRow label="Usage history" free="7 days" pro="90 days" enterprise="1 year" />
                                    <ComparisonRow label="Integration audits" free="5 / month" pro="Unlimited" enterprise="Unlimited" />
                                    <ComparisonRow label="Scheduled audits" free="—" pro="Daily or weekly" enterprise="Policy-linked" />

                                    <CategoryRow label="Governance" />
                                    <ComparisonRow label="Spend mandate rules" free="Basic caps" pro="Advanced rules" enterprise="Multi-stage approvals" />
                                    <ComparisonRow label="Compliance export" free="—" pro="Preview" enterprise="Signed bundles + CSV" />
                                    <ComparisonRow label="Agent trust & publishing" free="Public scanner" pro="Verified workflow" enterprise="Moderation queue" />

                                    <CategoryRow label="Developer tools" />
                                    <ComparisonRow label="Claude Skill" free="✓" pro="✓" enterprise="✓" />
                                    <ComparisonRow label="VS Code / Cursor / Windsurf" free="✓" pro="✓" enterprise="✓" />
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* 6. Frequently Asked Questions (FAQ) */}
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
                                },
                                {
                                    q: "Does the VS Code extension work on the Free plan?",
                                    a: "Yes — the extension is available on all plans including Free. Install it with 'ext install p402-protocol.p402' in VS Code, Cursor, or Windsurf. The MCP server is bundled inside the extension; tools appear in Copilot agent mode immediately with no config files required. Run 'P402: Configure API Key' from the command palette to connect your account."
                                },
                                {
                                    q: "Why is the escrow fee 2% instead of my plan rate?",
                                    a: "Escrow involves two on-chain transactions (deposit + release) and a 48-hour dispute window. The 2% fee covers settlement gas and dispute infrastructure. It is enforced directly by the P402Escrow smart contract at release — not by the platform layer — so it applies uniformly across all plans. You can disable escrow in Developer Settings and fall back to direct x402 settlement at your plan's standard rate."
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

function CategoryRow({ label }: { label: string }) {
    return (
        <tr className="border-b border-black bg-black">
            <td colSpan={4} className="px-5 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">{label}</td>
        </tr>
    );
}

function ComparisonRow({ label, free, pro, enterprise }: { label: string; free: string; pro: string; enterprise: string }) {
    const isDash = (val: string) => val === '—';
    const isCheck = (val: string) => val === '✓';

    const renderCell = (val: string) => {
        if (isDash(val)) return <span className="text-[var(--neutral-300)] text-lg leading-none">—</span>;
        if (isCheck(val)) return <Check className="w-5 h-5 text-[var(--success)] mx-auto" strokeWidth={3} />;
        return <span className="font-bold text-black">{val}</span>;
    };

    return (
        <tr className="border-b border-[var(--neutral-200)] hover:bg-[var(--neutral-100)] transition-colors">
            <td className="p-5 font-medium text-[var(--neutral-600)] border-r-2 border-black">{label}</td>
            <td className="p-5 text-center">{renderCell(free)}</td>
            <td className="p-5 bg-[var(--primary)]/10 border-x-2 border-black text-center">{renderCell(pro)}</td>
            <td className="p-5 text-center">{renderCell(enterprise)}</td>
        </tr>
    );
}
