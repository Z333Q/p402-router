import type { Metadata } from 'next';
import Link from 'next/link';
import { MeterBrand } from '../meter/_components/MeterBrand';

/* eslint-disable react/no-unescaped-entities */

export const metadata: Metadata = {
    title: 'AI Spend Dashboard for Teams and Models | P402',
    description:
        'See where AI spend goes by department, workflow, model, vendor, and customer, with outcome and evidence status.',
    alternates: { canonical: 'https://p402.io/monitor' },
    openGraph: {
        title: 'AI Spend Dashboard for Teams and Models | P402',
        description:
            'See where AI spend goes by department, workflow, model, vendor, and customer, with outcome and evidence status.',
        url: 'https://p402.io/monitor',
    },
};

const FAQ_ENTRIES: ReadonlyArray<{ q: string; a: string }> = [
    {
        q: 'Does Monitor change runtime behavior?',
        a: 'No. Monitor is read-only over the metering ledger. It groups, filters, and exports events that Meter already recorded. It does not gate, throttle, or reroute calls.',
    },
    {
        q: 'What dimensions are available?',
        a: 'Department, employee, workflow, model, vendor, customer, outcome, evidence status, and drift. Every dimension is sourced from the event ownership Meter captured at request time.',
    },
    {
        q: 'Does it work without prompts?',
        a: 'Yes. Monitor reads the same metadata-only events Meter records by default. No prompts, no responses, and no tenant content is required to render attribution.',
    },
    {
        q: 'Can finance export this?',
        a: 'Yes. Each view exports to CSV and to a finance report bundle. Finance, procurement, and audit can review the same ledger without engineering pulling reports by hand.',
    },
    {
        q: 'How does it differ from cloud cost tools?',
        a: 'Cloud cost tools report infrastructure spend after the billing period closes. Monitor reads AI economic events at request time, with owner, workflow, model, vendor, outcome, and evidence already attached.',
    },
    {
        q: 'What is the first integration step?',
        a: 'Create a P402 key and send one metered event, or route an existing OpenAI-compatible request through P402. The first event lands in the ledger and Monitor renders against real data.',
    },
];

const JSONLD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'SoftwareApplication',
            name: 'P402 Monitor',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://p402.io/monitor',
            description:
                'P402 Monitor turns the metering ledger into department, employee, workflow, model, vendor, and customer dashboards with outcome and evidence status.',
        },
        {
            '@type': 'Product',
            name: 'P402 Monitor',
            brand: { '@type': 'Brand', name: 'P402' },
            description:
                'AI spend dashboard. Attributes every AI event by department, employee, workflow, model, vendor, and customer with outcome and evidence status.',
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

export default function MonitorPage() {
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
                <ForDevelopers />
                <ForEnterprise />
                <Faq />
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
                {'>'} _ P402 MONITOR
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
                See where AI spend goes by team,<br />
                workflow, model, and <span className="text-primary">vendor.</span>
            </h1>
            <p className="text-base font-mono text-neutral-300 leading-relaxed">
                P402 Monitor turns the metering ledger into department, employee,
                workflow, model, vendor, and customer dashboards with outcome and
                evidence status.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/get-access?intent=ai-spend-audit"
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
                Read-only over the ledger. Monitor never changes runtime behavior.
            </p>
        </section>
    );
}

function Problem() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>The problem</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                AI spend has no owner.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Without attribution, finance cannot tell which department, workflow,
                model, or vendor caused which cost. Monitor breaks every event out by
                owner so spend, outcome, and evidence land in one ledger.
            </p>
        </section>
    );
}

const RECORDS: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'Department', line: 'Spend grouped by the department that owns the workflow.' },
    { name: 'Employee',   line: 'Per-seat attribution for each call that ran under a user.' },
    { name: 'Workflow',   line: 'The task or process the call served, shown in one view.' },
    { name: 'Model',      line: 'Provider and model, with requested and used split out.' },
    { name: 'Vendor',     line: 'Provider mix, share of spend, and per-vendor outcomes.' },
    { name: 'Customer',   line: 'Per-customer cost when the workflow served an end user.' },
    { name: 'Outcome',    line: 'Accepted, rejected, revised, escalated, or failed events.' },
    { name: 'Evidence',   line: 'Receipt and evidence bundle status on every event.' },
    { name: 'Drift',      line: 'Change in cost, mix, or outcome against a chosen baseline.' },
];

function Records() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>What Monitor records</SectionLabel>
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
        title: 'Connect P402 metering.',
        body: 'Route AI calls through P402, or post meter-only events from your backend. Monitor reads the same ledger Meter writes.',
    },
    {
        n: '02',
        title: 'Group events by owner taxonomy.',
        body: 'Aggregate by department, employee, workflow, model, vendor, customer, outcome, or evidence status, in any combination.',
    },
    {
        n: '03',
        title: 'Filter by department, workflow, model, vendor, or customer.',
        body: 'Drill into the subset that matters. Compare against a chosen baseline window to see drift.',
    },
    {
        n: '04',
        title: 'Export the breakdown for finance review.',
        body: 'CSV and finance report bundles for procurement, finance, and audit, without exposing prompts.',
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
                Attribute economics, not content.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Monitor reads the same metadata-only events Meter records. Prompt and
                response storage are off by default. The dashboards render owner,
                workflow, model, vendor, customer, outcome, and evidence without
                touching tenant content.
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
                Each vertical demo is a working surface on the same metering layer.
                Use them to see the event detail, ownership attribution, policy
                result, and evidence status against a concrete workflow.
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

function ForDevelopers() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>For developers</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Spot the workflow that quietly eats your margin.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Monitor groups your AI events by workflow, model, vendor, and
                customer, with cost and outcome on every row. Find the retry storm,
                the long-context call, or the failing workflow without a separate
                analytics pipeline.
            </p>
            <div>
                <Link
                    href="/get-access"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    Start free
                </Link>
            </div>
        </section>
    );
}

function ForEnterprise() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>For enterprise</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Give finance one ledger for AI spend.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                One ledger across departments, employees, workflows, models, vendors,
                and customers. Finance, procurement, and audit work from the same
                event detail, with privacy mode, policy result, outcome, and evidence
                status on every event.
            </p>
            <div>
                <Link
                    href="/get-access?intent=ai-spend-audit"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    Run AI Spend Audit
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

function FinalCta() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>Get started</SectionLabel>
            <h2 className="text-3xl lg:text-4xl font-bold uppercase tracking-tight">
                Give every token an owner.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Start with one metered event. Monitor renders the ledger by
                department, workflow, model, vendor, and customer the moment events
                land.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/get-access?intent=ai-spend-audit"
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
