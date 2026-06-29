import type { Metadata } from 'next';
import Link from 'next/link';
import { MeterBrand } from '../meter/_components/MeterBrand';

/* eslint-disable react/no-unescaped-entities */

/**
 * 3S-13: SEO landing rewritten onto the canonical /meter dark-theme buyer
 * surface. Head term: "Enterprise AI Budget Dashboard". Parent product:
 * /enterprise. Replaces the prior SeoLanding-based page.
 */

export const metadata: Metadata = {
    title: 'Enterprise AI Budget Dashboard | P402',
    description:
        'Give finance a dashboard for AI spend by department, employee, workflow, model, vendor, budget, outcome, and evidence status with P402 Monitor.',
    alternates: { canonical: 'https://p402.io/enterprise-ai-budget-dashboard' },
    openGraph: {
        title: 'Enterprise AI Budget Dashboard | P402',
        description:
            'Give finance a dashboard for AI spend by department, employee, workflow, model, vendor, budget, outcome, and evidence status with P402 Monitor.',
        url: 'https://p402.io/enterprise-ai-budget-dashboard',
    },
};

const FAQ_ENTRIES: ReadonlyArray<{ q: string; a: string }> = [
    {
        q: 'What dimensions does the enterprise AI budget dashboard cover?',
        a: 'Department, employee, workflow, model, vendor, customer, budget, policy result, outcome, and evidence status. Each AI call is recorded under every owner it belongs to and rolled up into the dashboard view finance reads from.',
    },
    {
        q: 'Does the dashboard require sharing prompts?',
        a: 'No. The default privacy mode is metadata-only. The dashboard reads owner, model, tokens, cost, budget, policy result, outcome, and evidence status. Prompt and response content stay out unless the tenant explicitly opts in.',
    },
    {
        q: 'Does this work with our existing AI providers?',
        a: 'Yes. OpenAI, Anthropic, Gemini, Bedrock, OpenRouter, and any HTTP-callable model land in the same ledger under a consistent owner taxonomy. Calls routed through P402 and calls reported as meter-only events both appear in the dashboard.',
    },
    {
        q: 'How is this different from an LLM observability dashboard?',
        a: 'LLM observability shows prompts, responses, latency, and errors. The P402 enterprise AI budget dashboard shows the economic event around each call: owner, budget drawn from, policy result, outcome, and evidence status. Finance and engineering read from the same record.',
    },
    {
        q: 'How long does it take to see the dashboard with real data?',
        a: 'Once a P402 key is created, the first metered event lands in the ledger and the dashboard renders against real data. Two weeks of metering is usually enough to surface attribution and leakage patterns finance acts on.',
    },
    {
        q: 'What is the relationship between the dashboard and the AI Spend Audit?',
        a: 'The AI Spend Audit is a one-time engagement that produces a delivered report on top of the same metering layer the dashboard reads from. The dashboard is the live surface. The audit is the discrete deliverable.',
    },
];

const JSONLD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'SoftwareApplication',
            name: 'P402 Enterprise AI Budget Dashboard',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://p402.io/enterprise-ai-budget-dashboard',
            description:
                'Dashboard for AI spend by department, employee, workflow, model, vendor, budget, outcome, and evidence status.',
        },
        {
            '@type': 'Product',
            name: 'P402 Enterprise AI Budget Dashboard',
            brand: { '@type': 'Brand', name: 'P402' },
            description:
                'Enterprise AI budget dashboard. Groups AI spend by department, employee, workflow, model, vendor, budget, outcome, and evidence status.',
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

export default function EnterpriseAiBudgetDashboardPage() {
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
                <Link href="/docs" className="text-[10px] font-mono text-neutral-400 hover:text-primary uppercase tracking-wider transition-colors">Docs</Link>
                <Link href="/pricing" className="text-[10px] font-mono text-neutral-400 hover:text-primary uppercase tracking-wider transition-colors">Pricing</Link>
                <Link href="/dashboard" className="text-[10px] font-mono text-neutral-400 hover:text-primary uppercase tracking-wider transition-colors">Dashboard</Link>
            </div>
        </div>
    );
}

function Hero() {
    return (
        <section className="flex flex-col gap-6 max-w-3xl">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                {'>'} _ ENTERPRISE AI BUDGET DASHBOARD
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
                Enterprise AI budget<br />
                <span className="text-primary">dashboard.</span>
            </h1>
            <p className="text-base font-mono text-neutral-300 leading-relaxed">
                P402 Monitor turns the metering ledger into a dashboard for AI spend by
                department, employee, workflow, model, vendor, budget, outcome, and
                evidence status.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/ai-spend-audit" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
                    Run AI Spend Audit
                </Link>
                <Link href="/dashboard?demo=1" className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors">
                    See dashboard
                </Link>
            </div>

            <p className="text-[11px] font-mono text-neutral-500 leading-relaxed pt-2">
                Built on the P402 Monitor surface. Parent product page: <Link href="/enterprise" className="text-primary hover:underline">/enterprise</Link>.
            </p>
        </section>
    );
}

function Problem() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>The problem</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Finance owns the AI line item without the AI breakout.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Provider invoices show monthly totals. They do not show which department,
                employee, workflow, vendor, or customer the spend belonged to. An
                enterprise AI budget dashboard needs that breakout at event time, not at
                month-end.
            </p>
        </section>
    );
}

const RECORDS: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'Department',     line: 'Spend grouped by the department the event drew its budget from.' },
    { name: 'Employee',       line: 'Spend grouped by the employee or API key that produced the event.' },
    { name: 'Workflow',       line: 'Spend grouped by the task or process the call served.' },
    { name: 'Model',          line: 'Spend grouped by requested and used model. Provider and model both surfaced.' },
    { name: 'Vendor',         line: 'Share of spend per vendor across the organization, with single-vendor risk flagged.' },
    { name: 'Budget',         line: 'Budget the event drew from, remaining balance, and breach status.' },
    { name: 'Policy result',  line: 'Approved, warned, denied, or requires review, per event and rolled up.' },
    { name: 'Outcome',        line: 'Accepted, rejected, revised, escalated, or failed, with accepted-output share.' },
    { name: 'Evidence',       line: 'Receipt and evidence bundle coverage per workflow for audit and finance review.' },
];

function Records() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>What this dashboard shows</SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {RECORDS.map((r) => (
                    <div key={r.name} className="border-2 border-neutral-700 p-4 flex flex-col gap-1">
                        <div className="text-primary text-[10px] font-mono font-bold uppercase tracking-wider">{r.name}</div>
                        <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">{r.line}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}

const STEPS: ReadonlyArray<{ n: string; title: string; body: string }> = [
    {
        n: '01',
        title: 'Create a P402 key.',
        body: 'Sign in, generate a key. The key is returned once. P402 stores only a hash.',
    },
    {
        n: '02',
        title: 'Route AI calls through P402 or report meter-only events.',
        body: 'Use the OpenAI-compatible endpoint, or post metadata-only events from your backend if you call the provider directly. Both land in the same ledger.',
    },
    {
        n: '03',
        title: 'Attach department, employee, workflow, vendor, and customer owners.',
        body: 'Events are tagged with the owner taxonomy finance already uses. P402 indexes the event under every owner you supply.',
    },
    {
        n: '04',
        title: 'Read the dashboard.',
        body: 'The Monitor surface groups AI spend by department, employee, workflow, model, vendor, budget, outcome, and evidence status. Finance and engineering read the same record.',
    },
];

function HowItWorks() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>How it works</SectionLabel>
            <ol className="flex flex-col gap-4">
                {STEPS.map((s) => (
                    <li key={s.n} className="border-2 border-neutral-700 p-5 flex flex-col md:flex-row gap-4">
                        <div className="text-3xl font-bold font-mono tabular-nums text-primary shrink-0 md:w-16">{s.n}</div>
                        <div className="flex flex-col gap-2">
                            <div className="text-sm font-bold uppercase tracking-tight text-neutral-50">{s.title}</div>
                            <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">{s.body}</div>
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
                The enterprise AI budget dashboard reads metadata. Prompt and response
                storage are off by default. Sensitive workflows can run under private
                gateway mode, where the inference stays in your environment and P402
                records the economic event over a signed channel.
            </p>

            <ul className="flex flex-col gap-2">
                {MODES.map((m) => (
                    <li key={m.name} className="border-2 border-neutral-700 p-3 flex flex-col gap-1">
                        <code className="text-primary text-[11px] font-mono font-bold">{m.name}</code>
                        <span className="text-[11px] font-mono text-neutral-400 leading-relaxed">{m.line}</span>
                    </li>
                ))}
            </ul>

            <Link href="/trust" className="self-start border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors">
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
                them to see how event detail, ownership attribution, policy result, and
                evidence status feed the dashboard.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PROOF.map((p) => (
                    <Link key={p.href} href={p.href} className="border-2 border-neutral-700 p-4 flex flex-col gap-2 hover:border-primary transition-colors">
                        <div className="text-primary text-[10px] font-mono font-bold uppercase tracking-wider">{p.name}</div>
                        <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">{p.line}</div>
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
                Read AI spend by department, not by invoice.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Spend lands in the dashboard with department, employee, workflow, model,
                vendor, and customer attribution at event time. Outcome and evidence
                status are already attached. Reconciliation moves from monthly invoice to
                event-time ledger.
            </p>
            <div>
                <Link href="/dashboard?demo=1" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
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
                Audit-grade evidence per AI call.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                The dashboard exposes evidence readiness per workflow, with privacy mode,
                policy result, and receipt coverage on every event. Audit and legal can
                review the same record finance reports from, without exposing prompts.
            </p>
            <div>
                <Link href="/trust" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
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
                    <details key={e.q} className="border-2 border-neutral-700 p-4 group">
                        <summary className="text-sm font-bold uppercase tracking-tight text-neutral-50 cursor-pointer list-none flex items-center justify-between gap-4">
                            <span>{e.q}</span>
                            <span className="text-primary text-xs font-mono shrink-0 group-open:hidden">{'+'}</span>
                            <span className="text-primary text-xs font-mono shrink-0 hidden group-open:inline">{'−'}</span>
                        </summary>
                        <p className="mt-3 text-[12px] font-mono text-neutral-300 leading-relaxed">{e.a}</p>
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
                Give finance the AI ledger they already report from.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Start with the enterprise surface, or run the one-time AI Spend Audit to
                produce a delivered report on top of the same metering layer.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/enterprise" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
                    See enterprise
                </Link>
                <Link href="/ai-spend-audit" className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors">
                    Run AI Spend Audit
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
