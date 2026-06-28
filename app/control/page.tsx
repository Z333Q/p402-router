import type { Metadata } from 'next';
import Link from 'next/link';
import { MeterBrand } from '../meter/_components/MeterBrand';

/* eslint-disable react/no-unescaped-entities */

export const metadata: Metadata = {
    title: 'AI Spend Controls and Policy Simulator | P402',
    description:
        'Set budgets and policy boundaries for AI usage by team, workflow, model, and vendor. Runtime enforcement is gated.',
    alternates: { canonical: 'https://p402.io/control' },
    openGraph: {
        title: 'AI Spend Controls and Policy Simulator | P402',
        description:
            'Set budgets and policy boundaries for AI usage by team, workflow, model, and vendor. Runtime enforcement is gated.',
        url: 'https://p402.io/control',
    },
};

const FAQ_ENTRIES: ReadonlyArray<{ q: string; a: string }> = [
    {
        q: 'Is runtime enforcement live?',
        a: 'No. Runtime enforcement is gated. The policy simulator is live and runs over the historical ledger to show what a policy would have done. The runtime flip ships when enforcement reconciliation lands.',
    },
    {
        q: 'What can the simulator do?',
        a: 'The simulator replays designed budget caps and policy boundaries against the recorded ledger. It reports which events would have been approved, warned, denied, or routed to review, with cost, owner, and outcome impact.',
    },
    {
        q: 'Does Control change my code?',
        a: 'No. Designing and simulating policy does not touch the runtime path. Your code keeps calling the same endpoint Meter already records.',
    },
    {
        q: 'When will runtime flip ship?',
        a: 'Runtime enforcement ships after the enforcement reconciliation track closes. Until then, the page surfaces simulator output only and labels gated state.',
    },
    {
        q: 'Can Control see prompts?',
        a: 'No. Control reads the same metadata-only events Meter records by default. Policy decisions in the simulator use owner, workflow, model, vendor, and budget metadata, not prompt content.',
    },
    {
        q: 'What is the first step?',
        a: 'Create a P402 key, send one metered event, then open the simulator and design a budget cap or policy boundary. The simulator runs over the events the ledger already holds.',
    },
];

const JSONLD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'SoftwareApplication',
            name: 'P402 Control',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://p402.io/control',
            description:
                'P402 Control lets teams design budget caps, policy boundaries, and review gates by team, workflow, model, and vendor. Runtime enforcement is gated.',
        },
        {
            '@type': 'Product',
            name: 'P402 Control',
            brand: { '@type': 'Brand', name: 'P402' },
            description:
                'AI spend controls and policy simulator. Design and simulate budget caps and policy boundaries against the recorded ledger. Runtime enforcement is gated.',
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

export default function ControlPage() {
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
                {'>'} _ P402 CONTROL
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
                Plan AI spend controls before<br />
                runtime <span className="text-primary">enforcement.</span>
            </h1>
            <p className="text-base font-mono text-neutral-300 leading-relaxed">
                P402 Control lets teams design budget caps, policy boundaries, and
                review gates by team, workflow, model, and vendor. Runtime flip is
                gated until enforcement reconciliation lands.
            </p>

            <div className="border-2 border-neutral-700 p-3 self-start">
                <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                    Status: simulator live. Runtime enforcement gated.
                </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/dashboard/control?demo=1"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    See policy simulator
                </Link>
                <Link
                    href="/docs"
                    className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
                >
                    Read docs
                </Link>
            </div>

            <p className="text-[11px] font-mono text-neutral-500 leading-relaxed pt-2">
                Runtime enforcement is gated. The simulator runs over historical
                events to show what a policy would have done.
            </p>
        </section>
    );
}

function Problem() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>The problem</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Budgets cannot live in a spreadsheet.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Static spend caps drift. Policy intents that exist in a doc but not
                in the ledger never reach the call. Control gives teams a place to
                design, simulate, and stage AI spend policy against the same event
                ledger Meter records.
            </p>
        </section>
    );
}

const RECORDS: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'Budget cap',    line: 'Cap designed and simulated against the recorded ledger.' },
    { name: 'Time window',   line: 'Rolling or fixed window the cap is designed to cover.' },
    { name: 'Owner scope',   line: 'Department, team, employee, or customer the policy targets.' },
    { name: 'Model scope',   line: 'Models the designed policy applies to.' },
    { name: 'Vendor scope',  line: 'Providers the designed policy applies to.' },
    { name: 'Workflow scope', line: 'Workflows the designed policy applies to.' },
    { name: 'Policy result', line: 'Simulator label: would approve, warn, deny, or route to review.' },
    { name: 'Review gate',   line: 'Designed human review step for events that need a second pair of eyes.' },
    { name: 'Status',        line: 'Draft, simulated, staged. Runtime flip remains gated.' },
];

function Records() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>What Control captures</SectionLabel>
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
        title: 'Define budget and policy boundaries.',
        body: 'Set a cap, a time window, and the policy boundary you want to test. Designs live in the dashboard, not in runtime.',
    },
    {
        n: '02',
        title: 'Pick scope: team, workflow, model, vendor.',
        body: 'Constrain the design to a department, workflow, model, or vendor, or any combination of the four.',
    },
    {
        n: '03',
        title: 'Simulate over the historical ledger.',
        body: 'The simulator replays the design against recorded events and reports the would-be policy result, cost impact, and owners affected.',
    },
    {
        n: '04',
        title: 'Stage the policy. Runtime enforcement remains gated.',
        body: 'Stage the design once the simulation looks right. The runtime flip ships when enforcement reconciliation lands.',
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
                Simulate on economics, not content.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Control reads the same metadata-only events Meter records. The
                simulator runs on owner, workflow, model, vendor, and budget
                metadata. Prompt and response storage stay off by default.
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
                Stage budget rules without touching production.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Design budget caps and policy boundaries in the dashboard. The
                simulator replays them against the recorded ledger and reports the
                would-be result on every event. Production runtime keeps running on
                the existing path.
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
                Design AI spend policy before it ships.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Give finance, procurement, and engineering one place to design
                budget caps, scope rules, and review gates. The simulator shows what
                the policy would have done on the recorded ledger. Runtime
                enforcement remains gated until reconciliation lands.
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
                Design the policy. Simulate the result.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Design a budget cap or policy boundary, run it against the recorded
                ledger, and stage it. Runtime enforcement ships when reconciliation
                lands.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/dashboard/control?demo=1"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    See policy simulator
                </Link>
                <Link
                    href="/docs"
                    className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
                >
                    Read docs
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
