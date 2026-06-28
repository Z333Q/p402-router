import type { Metadata } from 'next';
import Link from 'next/link';
import { MeterBrand } from '../meter/_components/MeterBrand';

/* eslint-disable react/no-unescaped-entities */

export const metadata: Metadata = {
    title: 'AI Spend Evidence and Audit Reports | P402',
    description:
        'Export evidence bundles, finance reports, and event proof for every AI economic event.',
    alternates: { canonical: 'https://p402.io/prove' },
    openGraph: {
        title: 'AI Spend Evidence and Audit Reports | P402',
        description:
            'Export evidence bundles, finance reports, and event proof for every AI economic event.',
        url: 'https://p402.io/prove',
    },
};

const FAQ_ENTRIES: ReadonlyArray<{ q: string; a: string }> = [
    {
        q: 'What goes into an evidence bundle?',
        a: 'Event detail, owner, workflow, model, vendor, tokens, cost, budget, policy result, outcome, privacy posture, receipt status, and signature status. The bundle is exported as a signed package for audit and finance review.',
    },
    {
        q: 'Are prompts ever exported?',
        a: 'Only if the tenant policy opts in to a privacy mode that retains them. The default privacy mode is metadata-only, and evidence bundles render every economic field without prompt or response content.',
    },
    {
        q: 'Does Prove require settlement?',
        a: 'No. Prove emits evidence from the metering ledger directly. If receipts or settlement are present they appear on the event. If not, the bundle still carries owner, policy result, outcome, and evidence status.',
    },
    {
        q: 'Can the bundle be hash-verified?',
        a: 'Yes. Each bundle includes a signature over the event set and a manifest of the included rows. Auditors can verify integrity without contacting P402.',
    },
    {
        q: 'How does it differ from log retention?',
        a: 'Log retention stores traces. Prove emits the economic event around each call with owner, policy result, outcome, and evidence status attached, packaged for finance and audit review.',
    },
    {
        q: 'What is the first step?',
        a: 'Create a P402 key and send one metered event. Open Prove, filter the ledger, and export a sample evidence bundle, finance report, or CSV appendix.',
    },
];

const JSONLD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'SoftwareApplication',
            name: 'P402 Prove',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://p402.io/prove',
            description:
                'P402 Prove exports evidence bundles, finance reports, and event proof for every AI economic event recorded by Meter.',
        },
        {
            '@type': 'Product',
            name: 'P402 Prove',
            brand: { '@type': 'Brand', name: 'P402' },
            description:
                'AI spend evidence and audit reports. Exports evidence bundles, finance reports, and event proof for every AI call recorded by Meter.',
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

export default function ProvePage() {
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
                {'>'} _ P402 PROVE
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
                Prove every AI<br />
                economic <span className="text-primary">event.</span>
            </h1>
            <p className="text-base font-mono text-neutral-300 leading-relaxed">
                P402 Prove exports evidence bundles, finance reports, and event
                proof for every AI call recorded by Meter, with privacy mode, policy
                result, and outcome attached.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/dashboard/prove?demo=1"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    See evidence
                </Link>
                <Link
                    href="/dashboard/prove/sample"
                    className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
                >
                    Export sample evidence
                </Link>
            </div>

            <p className="text-[11px] font-mono text-neutral-500 leading-relaxed pt-2">
                Bundles render in the default metadata-only privacy mode. Prompt
                content stays out unless the tenant policy opts in.
            </p>
        </section>
    );
}

function Problem() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>The problem</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Audit cannot start from invoices.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Provider invoices show totals, not events. Compliance, finance, and
                procurement reviews need per-event proof with owner, privacy mode,
                policy result, outcome, and signature status. Prove emits those
                bundles directly from the ledger.
            </p>
        </section>
    );
}

const RECORDS: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'Event detail',     line: 'Per-event owner, workflow, model, vendor, tokens, and cost.' },
    { name: 'Privacy posture',  line: 'Privacy mode the event was recorded under, on every row.' },
    { name: 'Policy result',    line: 'Approved, warned, denied, or requires review at record time.' },
    { name: 'Outcome',          line: 'Accepted, rejected, revised, escalated, or failed.' },
    { name: 'Receipt',          line: 'Settlement receipt status when the event is payable.' },
    { name: 'Signature',        line: 'Signature over the event set, verifiable without P402.' },
    { name: 'Evidence bundle',  line: 'Signed package of events and manifest for audit review.' },
    { name: 'Finance report',   line: 'Finance-ready report grouped by owner, workflow, and vendor.' },
    { name: 'CSV appendix',     line: 'Row-level export for procurement and ad-hoc analysis.' },
];

function Records() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>What Prove emits</SectionLabel>
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
        title: 'Filter the ledger by owner, time window, or workflow.',
        body: 'Narrow the event set to the scope the reviewer needs. Owners, workflows, models, vendors, and customers are all available.',
    },
    {
        n: '02',
        title: 'Choose evidence bundle, finance report, or CSV appendix.',
        body: 'Three packages. Evidence bundles for audit, finance reports for the close, CSV appendices for procurement and ad-hoc analysis.',
    },
    {
        n: '03',
        title: 'Verify privacy mode and policy result on each event.',
        body: 'Every row reports the privacy mode at record time and the policy result the event produced. No event lacks attribution.',
    },
    {
        n: '04',
        title: 'Export the package for audit or finance review.',
        body: 'Signed package with manifest. Auditors can verify integrity without contacting P402.',
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
                Evidence over economics, not content.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Prove emits bundles from the same metadata-only events Meter records
                by default. Every row carries the privacy mode it was recorded
                under. Prompt content stays out unless the tenant policy opts in to
                a retaining mode.
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
                Hand audit a verifiable trail without giving up prompts.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Every event Meter records can be exported as a signed evidence
                bundle. Audit gets per-event owner, policy result, outcome, and
                signature status. Prompts stay in the privacy mode the tenant
                chose.
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
                Give compliance evidence finance can sign off on.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Finance reports group AI spend by owner, workflow, and vendor.
                Evidence bundles carry per-event policy result, outcome, and
                signature status. One package serves finance, procurement, and
                audit at once.
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
                Export evidence finance can sign off on.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Filter the ledger, pick the package, export the bundle. Audit,
                finance, and procurement work from the same evidence.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/dashboard/prove?demo=1"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    See evidence
                </Link>
                <Link
                    href="/dashboard/prove/sample"
                    className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
                >
                    Export sample evidence
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
