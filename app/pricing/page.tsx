import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import {
    BRIDGE_OFFERS,
    ENTERPRISE_FLOOR_ARR_USD,
    PLANS,
    PLAN_IDS,
    PRICING_PAGE_SUPPORT_LINE,
    formatUsd,
} from "@/lib/pricing/rate-card";
import { PlanCard } from "./_components/PlanCard";
import { BridgeOfferCard } from "./_components/BridgeOfferCard";
import { FAQItem } from "./_components/FAQItem";
import { BuyerPathTabs } from "./_components/BuyerPathTabs";
import { AddOnsList } from "./_components/AddOnsList";

export const metadata = {
    title: 'Pricing | P402 — AI Spend Accountability',
    description: 'P402 pricing: Sandbox free, Developer $249/mo, Business $2,500/mo annual, Scale $5,000/mo annual, Enterprise from $60k ARR. Pilots from $15k. Usage-based metered AI events. No cost-savings claim.',
    alternates: { canonical: 'https://p402.io/pricing' },
    openGraph: {
        title: 'P402 Pricing — AI Spend Accountability',
        description: 'Start free. Production plans from $249/month. Enterprise pilots from $35k. Usage-based, metadata-only, procurement-ready.',
        url: 'https://p402.io/pricing',
    },
};

// Schema.org Product + Offers JSON-LD per 3AY §16.3
const pricingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'P402 — AI Spend Accountability',
    description: 'AI spend accountability and governance software for the enterprise. Metered AI events, workflow attribution, shadow controls, outcome ingestion, audit-grade evidence.',
    brand: { '@type': 'Brand', name: 'P402' },
    offers: PLAN_IDS.map((id) => {
        const p = PLANS[id];
        return {
            '@type': 'Offer',
            name: p.name,
            description: p.audience,
            price: p.annualPriceUsd === null ? undefined : String(p.annualPriceUsd === 0 ? 0 : p.annualPriceUsd),
            priceCurrency: 'USD',
            url: `https://p402.io${p.ctaHref}`,
        };
    }),
};

export default function PricingPage() {
    return (
        <main className="min-h-screen bg-white">
            <TopNav />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }} />

            {/* ── Hero ────────────────────────────────────────────────── */}
            <section className="max-w-6xl mx-auto px-6 lg:px-8 pt-16 pb-12">
                <h1 className="text-5xl lg:text-6xl font-black text-black uppercase tracking-tight leading-[0.95]">
                    Simple pricing for<br />accountable AI spend
                </h1>
                <p className="mt-6 text-base lg:text-lg font-mono text-neutral-700 max-w-2xl">
                    {PRICING_PAGE_SUPPORT_LINE}
                </p>
            </section>

            {/* ── Buyer-path tabs (3AY §4.2) ───────────────────────────── */}
            <section className="max-w-6xl mx-auto px-6 lg:px-8 pb-4">
                <BuyerPathTabs />
            </section>

            {/* ── "Build" plans: Sandbox + Developer ──────────────────── */}
            <section id="plans-build" className="max-w-6xl mx-auto px-6 lg:px-8 pb-16 scroll-mt-20">
                <h2 className="text-2xl font-black text-black uppercase tracking-tight mb-6">
                    For builders
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PlanCard plan={PLANS.sandbox} />
                    <PlanCard plan={PLANS.developer} />
                </div>
            </section>

            {/* ── "Govern" plans: Business + Scale + Enterprise ──────── */}
            <section id="plans-govern" className="bg-neutral-50 border-y-2 border-neutral-200 scroll-mt-20">
                <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
                    <h2 className="text-2xl font-black text-black uppercase tracking-tight mb-6">
                        For governance and FinOps
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <PlanCard plan={PLANS.business} highlight />
                        <PlanCard plan={PLANS.scale} />
                        <PlanCard plan={PLANS.enterprise} />
                    </div>
                    <p className="mt-6 text-xs font-mono text-neutral-500">
                        Annual prices shown for Business and Scale. Business monthly billing is available at a 40% premium; Scale and Enterprise are annual only.
                    </p>
                </div>
            </section>

            {/* ── Event metric explainer ──────────────────────────────── */}
            <section className="py-12">
                <div className="max-w-6xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div>
                        <h2 className="text-2xl font-black text-black uppercase tracking-tight">How billing works</h2>
                    </div>
                    <div className="lg:col-span-2 space-y-4 text-sm font-mono text-neutral-800 leading-relaxed">
                        <p>
                            P402 bills primarily on <strong>metered AI events</strong>. One metered AI event is one unique provider-bound, meter-only, or policy-evaluated AI request recorded for your tenant during the billing period.
                        </p>
                        <p>
                            Outcome records, dashboard views, audit exports, and admin actions are <strong>not</strong> billable.
                        </p>
                        <p>
                            Every paid plan includes alerts at 50%, 80%, 100%, and 120% of included usage. Self-serve plans support optional hard caps.
                        </p>
                        <Link
                            href="/pricing/metric-definition"
                            className="inline-flex items-center gap-2 text-sm font-black text-black uppercase tracking-wide border-b-2 border-black hover:text-primary hover:border-primary"
                        >
                            Read the full metric definition →
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── "Pilot" bridge offers ───────────────────────────────── */}
            <section id="bridge-offers" className="max-w-6xl mx-auto px-6 lg:px-8 py-16 scroll-mt-20">
                <div className="mb-8">
                    <h2 className="text-3xl font-black text-black uppercase tracking-tight">
                        Launch a pilot
                    </h2>
                    <p className="mt-3 text-sm font-mono text-neutral-700 max-w-2xl">
                        Two paid bridge engagements, each producing executive-grade evidence and a clear next step.
                    </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <BridgeOfferCard offer={BRIDGE_OFFERS.proof_sprint} />
                    <BridgeOfferCard offer={BRIDGE_OFFERS.paid_pilot} />
                    <BridgeOfferCard offer={BRIDGE_OFFERS.regulated_pilot} />
                </div>
            </section>

            {/* ── Enterprise procurement section ──────────────────────── */}
            <section className="bg-black text-white py-16">
                <div className="max-w-6xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight text-primary">
                            Enterprise
                        </h2>
                        <p className="mt-3 text-3xl font-black tracking-tight text-white">
                            From {formatUsd(ENTERPRISE_FLOOR_ARR_USD)} ARR
                        </p>
                    </div>
                    <div className="lg:col-span-2 space-y-4 text-sm font-mono text-neutral-300 leading-relaxed">
                        <p className="text-white">
                            Enterprise customers typically allocate <strong>1 to 3 percent</strong> of their annual governed AI spend to P402 for accountability, attribution, controls, and audit-grade evidence.
                        </p>
                        <p>
                            Includes SSO and SAML, SCIM, fine-grained RBAC, custom retention, DPA, SLA, procurement pack, custom support, and optional private deployment design.
                        </p>
                        <Link
                            href="/get-access?intent=enterprise"
                            className="inline-flex items-center justify-center h-11 px-6 bg-primary text-black font-black text-[11px] uppercase tracking-widest border-2 border-primary hover:bg-black hover:text-primary transition-colors no-underline"
                        >
                            Request enterprise pricing
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Add-ons (3AX §29.1) + future cost-measurement module note ── */}
            <AddOnsList />

            {/* ── Settlement / protocol pricing transition ────────────── */}
            <section className="bg-neutral-50 border-y-2 border-neutral-200">
                <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div>
                        <h2 className="text-2xl font-black text-black uppercase tracking-tight">Settlement pricing</h2>
                    </div>
                    <div className="lg:col-span-2 space-y-3 text-sm font-mono text-neutral-800 leading-relaxed">
                        <p>
                            Settlement is optional. Direct x402 settlement, EIP-3009 facilitator usage, and on-chain escrow remain documented under protocol pricing. Customers can run P402&apos;s accountability layer without enabling settlement.
                        </p>
                        <p>
                            Add-on settlement is priced above (0.5% of settled value with a $500/mo floor). For protocol-level details and facilitator usage, see the docs.
                        </p>
                        <div className="flex flex-wrap gap-3 mt-2">
                            <Link
                                href="/docs/facilitator"
                                className="inline-flex items-center gap-2 text-sm font-black text-black uppercase tracking-wide border-b-2 border-black hover:text-primary hover:border-primary"
                            >
                                Facilitator docs →
                            </Link>
                            <Link
                                href="/docs/router"
                                className="inline-flex items-center gap-2 text-sm font-black text-black uppercase tracking-wide border-b-2 border-black hover:text-primary hover:border-primary"
                            >
                                Router docs →
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Trust badges ────────────────────────────────────────── */}
            <section className="max-w-6xl mx-auto px-6 lg:px-8 py-12 border-b-2 border-neutral-200">
                <div className="flex flex-wrap gap-x-8 gap-y-3 justify-center text-[11px] font-mono uppercase tracking-widest text-neutral-600">
                    <span>Metadata-only</span>
                    <span>•</span>
                    <span>Tenant-scoped</span>
                    <span>•</span>
                    <span>Usage-based</span>
                    <span>•</span>
                    <span>No prompt storage</span>
                    <span>•</span>
                    <span>Audit trail</span>
                    <span>•</span>
                    <span>Shadow-mode first</span>
                </div>
            </section>

            {/* ── FAQ ─────────────────────────────────────────────────── */}
            <section className="max-w-4xl mx-auto px-6 lg:px-8 py-16">
                <h2 className="text-3xl font-black text-black uppercase tracking-tight mb-8">
                    Frequently asked questions
                </h2>
                <div className="space-y-3">
                    <FAQItem question="What is a metered AI event?">
                        <p>
                            One unique provider-bound, meter-only, or policy-evaluated AI request event recorded by P402 for your tenant during the billing period. Hosted requests, SDK-submitted meter events, policy-evaluated requests, settled work events, and unique customer-caused retries all count.
                        </p>
                        <p>
                            Dashboard views, outcome records, duplicate replays of the same event id, internal heartbeats, support actions, admin audit reads, and synthetic QA events do not count.
                        </p>
                    </FAQItem>
                    <FAQItem question="Are outcome records billed?">
                        <p>
                            No. Outcome records are permanently non-billable. They are the proof asset that supports later Optimize Readiness; billing them would create the wrong incentive.
                        </p>
                    </FAQItem>
                    <FAQItem question="Do you store prompts or responses?">
                        <p>
                            No. P402 is metadata-only. Prompts, responses, messages, raw traces, stored content, completion text, request bodies, and response bodies are rejected at the API boundary by the forbidden-field scan and at the foundation layer by metadata sanitization.
                        </p>
                    </FAQItem>
                    <FAQItem question="What happens when I exceed included events?">
                        <p>
                            You receive in-product and email alerts at 50%, 80%, 100%, and 120% of included usage. Sandbox stops recording at the cap. Developer, Business, and Scale apply the published overage rate ($0.25, $0.12, and $0.08 per 1,000 events respectively). Enterprise uses a committed annual rate, with overage trued up at renewal by default.
                        </p>
                        <p>
                            Self-serve plans support optional hard caps. No customer is surprised by a bill.
                        </p>
                    </FAQItem>
                    <FAQItem question="Do you support annual contracts?">
                        <p>
                            Yes. Business is annual-default with a 40% monthly premium if you prefer month-to-month. Scale and Enterprise are annual-only. Multi-year prepay discounts are available; ask sales.
                        </p>
                    </FAQItem>
                    <FAQItem question="Do you support SSO and SCIM?">
                        <p>
                            SSO and SCIM ship with Enterprise. Scale customers can add SSO as an add-on. Business and below use email plus role-based permissions.
                        </p>
                    </FAQItem>
                    <FAQItem question="Do you offer regulated pilots?">
                        <p>
                            Yes. Regulated Pilots start at $50,000 for a 90-day engagement covering healthcare, finance, legal, insurance, and public sector buyers. Privacy mode and evidence requirements are included. BAA path available for regulated pilots after security and contracting review.
                        </p>
                    </FAQItem>
                    <FAQItem question="Is settlement required?">
                        <p>
                            No. P402&apos;s accountability layer works whether or not you use the settlement layer. Settlement is an optional add-on for customers who want on-chain payment for AI services through P402.
                        </p>
                    </FAQItem>
                    <FAQItem question="When do cost-savings claims appear?">
                        <p>
                            P402 does not claim cost savings until a later measurement methodology ships. There is no success fee, no revenue share, and no specific percentage claim on any P402 surface today. Pricing is flat usage, not performance-based.
                        </p>
                    </FAQItem>
                    <FAQItem question="How does Proof Sprint credit work?">
                        <p>
                            100% of the $15,000 Proof Sprint fee is credited toward a Paid Pilot if the Paid Pilot is signed within 30 days of Proof Sprint readout. The credit is one-time and does not apply to annual contract.
                        </p>
                    </FAQItem>
                </div>
            </section>

            {/* ── Final CTA footer ────────────────────────────────────── */}
            <section className="bg-neutral-50 border-t-2 border-neutral-200 py-16">
                <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-black text-black uppercase tracking-tight">
                        Make AI spend accountable
                    </h2>
                    <p className="mt-3 text-sm font-mono text-neutral-700">
                        Start free or book a scoping call.
                    </p>
                    <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center h-12 px-8 bg-black border-2 border-black text-white font-black text-[11px] uppercase tracking-widest hover:bg-primary hover:text-black transition-colors no-underline"
                        >
                            Start free sandbox
                        </Link>
                        <Link
                            href="/get-access?intent=scoping-call"
                            className="inline-flex items-center justify-center h-12 px-8 bg-white border-2 border-black text-black font-black text-[11px] uppercase tracking-widest hover:bg-black hover:text-primary transition-colors no-underline"
                        >
                            Book a scoping call
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
