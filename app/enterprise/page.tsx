import type { Metadata } from 'next';
import Link from 'next/link';
import { MeterBrand } from '../meter/_components/MeterBrand';

/* eslint-disable react/no-unescaped-entities */

/**
 * 3S-3: enterprise audience hub for CFO, controller, and FinOps buyers.
 * Forked from the canonical /meter template. Section order is preserved.
 * Persona sections cut to internal roles (finance, compliance) rather than
 * external personas (developers, enterprise).
 */

export const metadata: Metadata = {
    title: 'Enterprise AI Budget Dashboard | P402',
    description:
        'Give finance a dashboard for AI spend by department, employee, workflow, model, vendor, budget, outcome, and evidence status.',
    alternates: { canonical: 'https://p402.io/enterprise' },
    openGraph: {
        title: 'Enterprise AI Budget Dashboard | P402',
        description:
            'Give finance a dashboard for AI spend by department, employee, workflow, model, vendor, budget, outcome, and evidence status.',
        url: 'https://p402.io/enterprise',
    },
};

const FAQ_ENTRIES: ReadonlyArray<{ q: string; a: string }> = [
    {
        q: 'How does P402 attribute AI calls to a department or employee?',
        a: 'Owner metadata is attached at the moment of the call. Department, employee, workflow, model, vendor, customer, budget, and policy result are recorded with the event, not reconstructed from invoices weeks later.',
    },
    {
        q: 'Does P402 store prompts?',
        a: 'No, by default. P402 runs in metadata-only mode out of the box. Owner, cost, tokens, budget, policy result, outcome, and evidence status are recorded. Prompt and response content stay out unless the tenant opts in to a different mode.',
    },
    {
        q: 'How does this differ from a FinOps tool?',
        a: 'FinOps tools report cloud spend after the billing period closes. P402 records the AI economic event when it happens, with owner, workflow, model, vendor, customer, budget, and outcome already attached. Finance reads the same ledger compliance signs off on.',
    },
    {
        q: 'Can P402 cover multiple providers?',
        a: 'Yes. P402 wraps any HTTP-callable model behind one ledger. OpenAI, Anthropic, Gemini, Bedrock, OpenRouter, and direct provider calls land in the same attribution surface, with consistent owner and budget taxonomy.',
    },
    {
        q: 'What is required to start?',
        a: 'Create a P402 key and route existing AI calls through it, or post meter-only events from your backend. The first event lands in the ledger and the dashboard renders against real data.',
    },
    {
        q: 'Who in the organization owns this?',
        a: 'Finance owns the budget and the report. Engineering owns the integration. Compliance reviews the evidence bundles and privacy posture. P402 keeps the same event ledger as the source of truth for all three.',
    },
];

const JSONLD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Service',
            name: 'P402 Enterprise',
            provider: { '@type': 'Organization', name: 'P402' },
            url: 'https://p402.io/enterprise',
            description:
                'Enterprise dashboard for AI spend by department, employee, workflow, model, vendor, budget, outcome, and evidence status. One ledger for finance, procurement, and audit.',
        },
        {
            '@type': 'Product',
            name: 'P402 Enterprise',
            brand: { '@type': 'Brand', name: 'P402' },
            description:
                'AI budget dashboard with department, employee, workflow, model, vendor, customer, budget, outcome, and evidence attribution on every event.',
        },
        {
            '@type': 'FAQPage',
            mainEntity: FAQ_ENTRIES.map((e) => ({
                '@type': 'Question',
                name: e.q,
                acceptedAnswer: { '@type': 'Answer', text: e.a },
            })),
        },
    ],
};

export default function EnterprisePage() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
            />

            <TopBar />

            <main className="max-w-5xl mx-auto px-6 py-16 flex flex-col gap-20">
                <Hero />
                <Problem />
                <Records />
                <HowItWorks />
                <Privacy />
                <Proof />
                <ForFinance />
                <ForCompliance />
                <Faq />
                <Related />
                <FinalCta />
            </main>
        </>
    );
}

function TopBar() {
    return (
        <div className="border-b-2 border-neutral-700 px-6 py-3 flex items-center justify-between">
            <MeterBrand />
            <div className="flex items-center gap-4">
                <Link
                    href="/docs"
                    className="text-[10px] font-mono text-neutral-400 hover:text-primary uppercase tracking-wider transition-colors"
                >
                    Docs
                </Link>
                <Link
                    href="/pricing"
                    className="text-[10px] font-mono text-neutral-400 hover:text-primary uppercase tracking-wider transition-colors"
                >
                    Pricing
                </Link>
                <Link
                    href="/dashboard"
                    className="text-[10px] font-mono text-neutral-400 hover:text-primary uppercase tracking-wider transition-colors"
                >
                    Dashboard
                </Link>
            </div>
        </div>
    );
}

function Hero() {
    return (
        <section className="flex flex-col gap-6 max-w-3xl">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                {'>'} _ P402 ENTERPRISE
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
                Give finance a real ledger for<br />
                <span className="text-primary">AI spend.</span>
            </h1>
            <p className="text-base font-mono text-neutral-300 leading-relaxed">
                P402 turns AI usage into a dashboard for department, employee, workflow,
                model, vendor, budget, outcome, and evidence status. Finance reviews the
                same event ledger compliance signs off on.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/ai-spend-audit"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    Run AI Spend Audit
                </Link>
                <Link
                    href="/dashboard?demo=1"
                    className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
                >
                    See dashboard
                </Link>
            </div>

            <p className="text-[11px] font-mono text-neutral-500 leading-relaxed pt-2">
                Metadata-only by default. Five privacy modes. P402 meters economics, not
                content.
            </p>
        </section>
    );
}

function Problem() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>The problem</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                AI spend lives outside finance.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                AI provider invoices arrive after the fact, aggregated by month, with no
                department, employee, workflow, or vendor breakout. Finance owns the cost
                without the attribution. P402 records ownership when the call happens,
                then exposes it to finance, procurement, audit, and the budget owner in
                one ledger.
            </p>
        </section>
    );
}

const RECORDS: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'Department', line: 'Spend grouped by the department that owns the workflow.' },
    { name: 'Employee',   line: 'Per-seat attribution for every call that ran under a user.' },
    { name: 'Workflow',   line: 'The task or process the call served, surfaced in one view.' },
    { name: 'Model',      line: 'Provider and model, with requested and used split out per event.' },
    { name: 'Vendor',     line: 'Vendor mix, share of spend, and per-vendor outcomes.' },
    { name: 'Customer',   line: 'Per-customer cost when the workflow served an end user.' },
    { name: 'Budget',     line: 'Budget the event drew from and remaining balance for the owner.' },
    { name: 'Outcome',    line: 'Accepted, rejected, revised, escalated, or failed events.' },
    { name: 'Evidence',   line: 'Receipt and evidence bundle status on every event.' },
];

function Records() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>What enterprise sees</SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {RECORDS.map((r) => (
                    <div
                        key={r.name}
                        className="border-2 border-neutral-700 p-4 flex flex-col gap-1"
                    >
                        <div className="text-primary text-[10px] font-mono font-bold uppercase tracking-wider">
                            {r.name}
                        </div>
                        <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                            {r.line}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

const STEPS: ReadonlyArray<{ n: string; title: string; body: string }> = [
    {
        n: '01',
        title: 'Connect existing AI providers through P402.',
        body: 'Route AI calls through P402, or post meter-only events from your backend. Existing OpenAI, Anthropic, Gemini, Bedrock, and OpenRouter integrations land in the same ledger.',
    },
    {
        n: '02',
        title: 'Tag events with owner taxonomy already used in finance.',
        body: 'Department, employee, workflow, vendor, customer, and budget identifiers map to the same taxonomy finance already reports against. No new owner model required.',
    },
    {
        n: '03',
        title: 'Review department, workflow, model, vendor, and customer spend in the dashboard.',
        body: 'Group and filter events by any combination of owners. Compare against a baseline window to see drift in cost, mix, or outcome.',
    },
    {
        n: '04',
        title: 'Export evidence bundles and finance reports for review.',
        body: 'CSV and finance report bundles for procurement, finance, and audit. Evidence bundles surface policy result, privacy mode, and outcome per event without exposing prompts.',
    },
];

function HowItWorks() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>How it works</SectionLabel>
            <ol className="flex flex-col gap-4">
                {STEPS.map((s) => (
                    <li key={s.n} className="border-2 border-neutral-700 p-5 flex flex-col md:flex-row gap-4">
                        <div className="text-3xl font-bold font-mono tabular-nums text-primary shrink-0 md:w-16">
                            {s.n}
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="text-sm font-bold uppercase tracking-tight text-neutral-50">
                                {s.title}
                            </div>
                            <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                                {s.body}
                            </div>
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
}

const MODES: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'metadata_only',   line: 'Owner, cost, tokens, budget, policy, outcome, and evidence status. No prompts. No responses. Default.' },
    { name: 'fingerprint_only', line: 'Adds a hash fingerprint of prompt and response for dedup and replay protection. Content stays out.' },
    { name: 'redacted_trace',  line: 'Prompt and response retained after a redaction pass for fields the tenant policy allows.' },
    { name: 'private_gateway', line: 'Your environment hosts the inference, P402 records the economic event over a signed channel.' },
    { name: 'full_trace',      line: 'Opt-in. Prompts and responses retained verbatim with the event. Requires explicit tenant policy.' },
];

function Privacy() {
    return (
        <section className="flex flex-col gap-6 max-w-3xl">
            <SectionLabel>Privacy</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Meter economics, not content.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Enterprise dashboards run over the same metadata-only events Meter
                records. Prompt content is off by default. Finance, procurement, and
                audit review the ledger without touching tenant content. Sensitive
                workflows can run under private gateway mode.
            </p>

            <ul className="flex flex-col gap-2">
                {MODES.map((m) => (
                    <li key={m.name} className="border-2 border-neutral-700 p-3 flex flex-col gap-1">
                        <code className="text-primary text-[11px] font-mono font-bold">
                            {m.name}
                        </code>
                        <span className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                            {m.line}
                        </span>
                    </li>
                ))}
            </ul>

            <Link
                href="/trust"
                className="self-start border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
            >
                Read the trust posture
            </Link>
        </section>
    );
}

const PROOF: ReadonlyArray<{ name: string; line: string; href: string }> = [
    { name: 'Healthcare',  line: 'Medicaid prior authorization with HIPAA-aligned demo mode and human review gate.',  href: '/meter/healthcare' },
    { name: 'Legal',       line: 'M&A contract due diligence across an 8-document synthetic data room.',              href: '/meter/legal' },
    { name: 'Real estate', line: 'Tenant application screening with fraud scoring and HUD fair-housing audit trail.', href: '/meter/real-estate' },
    { name: 'Enterprise',  line: 'Department, employee, model, and workflow attribution across one organization.',    href: '/meter/enterprise' },
];

function Proof() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>Proof</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Same metering layer, four shipped workflows.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed max-w-3xl">
                Each vertical demo is a working surface on the same metering layer. Use
                them to see the event detail, ownership attribution, policy result, and
                evidence status against a concrete workflow.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PROOF.map((p) => (
                    <Link
                        key={p.href}
                        href={p.href}
                        className="border-2 border-neutral-700 p-4 flex flex-col gap-2 hover:border-primary transition-colors"
                    >
                        <div className="text-primary text-[10px] font-mono font-bold uppercase tracking-wider">
                            {p.name}
                        </div>
                        <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                            {p.line}
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function ForFinance() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>For finance</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                One ledger for AI spend by department, workflow, model, and vendor.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Stop reconciling AI provider invoices against engineering tickets after
                the month closes. P402 records attribution at event time. Finance opens
                the dashboard and sees AI spend by department, workflow, model, vendor,
                customer, and budget, with outcome and evidence already attached.
            </p>
            <div>
                <Link
                    href="/dashboard?demo=1"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    See dashboard
                </Link>
            </div>
        </section>
    );
}

function ForCompliance() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>For compliance</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Evidence finance, audit, and legal can sign off on.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Every event records the privacy mode, policy result, owner, model, and
                outcome. Evidence bundles export the same record to finance, audit, and
                legal. Compliance reviews posture and exceptions in the same ledger
                finance reports from.
            </p>
            <div>
                <Link
                    href="/trust"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    Read the trust posture
                </Link>
            </div>
        </section>
    );
}

function Faq() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>FAQ</SectionLabel>
            <div className="flex flex-col gap-3">
                {FAQ_ENTRIES.map((e) => (
                    <details
                        key={e.q}
                        className="border-2 border-neutral-700 p-4 group"
                    >
                        <summary className="text-sm font-bold uppercase tracking-tight text-neutral-50 cursor-pointer list-none flex items-center justify-between gap-4">
                            <span>{e.q}</span>
                            <span className="text-primary text-xs font-mono shrink-0 group-open:hidden">
                                {'+'}
                            </span>
                            <span className="text-primary text-xs font-mono shrink-0 hidden group-open:inline">
                                {'−'}
                            </span>
                        </summary>
                        <p className="mt-3 text-[12px] font-mono text-neutral-300 leading-relaxed">
                            {e.a}
                        </p>
                    </details>
                ))}
            </div>
        </section>
    );
}

const RELATED: ReadonlyArray<{ name: string; line: string; href: string }> = [
    { name: 'Monitor', line: 'Read-only dashboards for AI spend by department, workflow, model, vendor, and customer.', href: '/monitor' },
    { name: 'Prove',   line: 'Cryptographic receipts and evidence bundles for finance, audit, and legal review.',       href: '/prove' },
    { name: 'Trust',   line: 'Privacy posture, retention defaults, and operating model for regulated environments.',    href: '/trust' },
];

function Related() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>Related</SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {RELATED.map((r) => (
                    <Link
                        key={r.href}
                        href={r.href}
                        className="border-2 border-neutral-700 p-4 flex flex-col gap-2 hover:border-primary transition-colors"
                    >
                        <div className="text-primary text-[10px] font-mono font-bold uppercase tracking-wider">
                            {r.name}
                        </div>
                        <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                            {r.line}
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function FinalCta() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>Get started</SectionLabel>
            <h2 className="text-3xl lg:text-4xl font-bold uppercase tracking-tight">
                Run an AI Spend Audit, then keep the dashboard.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                The audit produces the AI Spend Accountability Report. The same metering
                layer continues as a live ledger for finance, procurement, audit, and the
                budget owner.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/ai-spend-audit"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    Run AI Spend Audit
                </Link>
                <Link
                    href="/trust"
                    className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
                >
                    Read the trust posture
                </Link>
            </div>
        </section>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            {children}
        </div>
    );
}
