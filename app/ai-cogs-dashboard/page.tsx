import type { Metadata } from 'next';
import Link from 'next/link';
import { MeterBrand } from '../meter/_components/MeterBrand';

/* eslint-disable react/no-unescaped-entities */

/**
 * 3S-13: SEO landing rewritten onto the canonical /meter dark-theme buyer
 * surface. Head term: "AI COGS Dashboard". Parent product: /monitor.
 */

export const metadata: Metadata = {
    title: 'AI COGS Dashboard for Embedded AI Teams | P402',
    description:
        'Track AI cost of goods sold per feature, per customer, per workflow with P402 Monitor. Cost, retry waste, context waste, and accepted output rate.',
    alternates: { canonical: 'https://p402.io/ai-cogs-dashboard' },
    openGraph: {
        title: 'AI COGS Dashboard for Embedded AI Teams | P402',
        description:
            'Track AI cost of goods sold per feature, per customer, per workflow with P402 Monitor. Cost, retry waste, context waste, and accepted output rate.',
        url: 'https://p402.io/ai-cogs-dashboard',
    },
};

const FAQ_ENTRIES: ReadonlyArray<{ q: string; a: string }> = [
    {
        q: 'What does AI COGS mean in this dashboard?',
        a: 'AI cost of goods sold. The direct AI cost attributable to a feature, customer, or workflow. The dashboard rolls cost up under each of those owners at event time, alongside accepted-output rate and waste.',
    },
    {
        q: 'How is AI COGS different from infrastructure cost?',
        a: 'Infrastructure cost is shared platform spend. AI COGS is the per-call cost tied to delivering a unit of product to a paying customer. The dashboard records that attribution at the moment of the AI call.',
    },
    {
        q: 'Does the dashboard require sharing prompts?',
        a: 'No. Default privacy mode is metadata-only. Owner, model, tokens, cost, budget, policy result, outcome, and evidence status are recorded. Prompts and responses stay out unless tenant policy opts in.',
    },
    {
        q: 'How are retry waste and context waste flagged?',
        a: 'Retry waste flags tokens spent on retried calls that produced no new outcome. Context waste flags tokens spent on context that did not change the outcome. Both roll up per feature, per customer, and per workflow.',
    },
    {
        q: 'What is the accepted-output rate?',
        a: 'Share of events with outcome accepted out of all events for that feature, customer, or workflow. Read alongside cost per accepted output to find where AI COGS earns its keep and where it does not.',
    },
    {
        q: 'How does this relate to the AI Spend Audit?',
        a: 'The AI Spend Audit is a one-time delivered report on top of the same metering layer. The AI COGS dashboard is the live surface. The audit gives finance a discrete deliverable, the dashboard gives engineering and finance an ongoing read.',
    },
];

const JSONLD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'SoftwareApplication',
            name: 'P402 AI COGS Dashboard',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://p402.io/ai-cogs-dashboard',
            description:
                'AI cost-of-goods-sold dashboard. Cost per feature, per customer, per workflow, and per accepted output.',
        },
        {
            '@type': 'Product',
            name: 'P402 AI COGS Dashboard',
            brand: { '@type': 'Brand', name: 'P402' },
            description:
                'Track AI cost of goods sold per feature, per customer, per workflow. Cost, retry waste, context waste, and accepted output rate.',
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

export default function AiCogsDashboardPage() {
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
                {'>'} _ AI COGS DASHBOARD
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
                AI COGS<br />
                <span className="text-primary">dashboard.</span>
            </h1>
            <p className="text-base font-mono text-neutral-300 leading-relaxed">
                P402 Monitor turns the metering ledger into an AI cost-of-goods-sold
                dashboard with cost per feature, per customer, per workflow, and per
                accepted output.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/dashboard?demo=1" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
                    See dashboard
                </Link>
                <Link href="/ai-spend-audit" className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors">
                    Run AI Spend Audit
                </Link>
            </div>

            <p className="text-[11px] font-mono text-neutral-500 leading-relaxed pt-2">
                Built on the P402 Monitor surface. Parent product page: <Link href="/monitor" className="text-primary hover:underline">/monitor</Link>.
            </p>
        </section>
    );
}

function Problem() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>The problem</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                AI cost is a lump sum, not a unit cost.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Provider invoices show a total. Embedded AI teams need cost per unit of
                product delivered, per customer served, per workflow executed. Without
                that attribution at event time, AI COGS stays a guess.
            </p>
        </section>
    );
}

const RECORDS: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'Per feature',         line: 'AI cost grouped under each product feature the call served.' },
    { name: 'Per customer',        line: 'AI cost grouped under each paying customer the call served.' },
    { name: 'Per workflow',        line: 'AI cost grouped under the task or process the call ran inside.' },
    { name: 'Per accepted output', line: 'Total AI cost divided by count of events with outcome accepted.' },
    { name: 'Retry waste',         line: 'Tokens spent on retried calls that produced no new outcome.' },
    { name: 'Context waste',       line: 'Tokens spent on context that did not change the outcome of the call.' },
    { name: 'Model and vendor',    line: 'Cost split by model and vendor for the same feature, with concentration flagged.' },
    { name: 'Budget',              line: 'Budget the event drew from and remaining balance per customer and feature.' },
    { name: 'Evidence',            line: 'Receipt and evidence bundle status per event for audit and finance review.' },
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
        body: 'Use the OpenAI-compatible endpoint, or post metadata-only events from your backend. Both land in the same ledger.',
    },
    {
        n: '03',
        title: 'Attach customer, feature, and workflow on each call.',
        body: 'Events are indexed under every owner you supply. The same event rolls up under customer, feature, and workflow at once.',
    },
    {
        n: '04',
        title: 'Read AI COGS.',
        body: 'The Monitor surface groups AI cost per feature, per customer, per workflow, with accepted-output rate and waste flagged.',
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
                AI COGS numbers come from token counts and cost, not from prompts. Prompt
                and response storage are off by default. Sensitive customer workflows can
                run under private gateway mode.
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
                them to see AI COGS per feature, per customer, and per accepted output
                against a concrete workflow.
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

function ForDevelopers() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>For developers</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Read AI COGS per feature, not per invoice.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Wrap AI calls once. The dashboard groups cost per feature, customer,
                workflow, and accepted output. Retry waste and context waste are flagged so
                engineering can act on real numbers, not estimates.
            </p>
            <div>
                <Link href="/login" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
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
                AI COGS rolled up for finance.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                AI COGS grouped by department, customer, vendor, and budget at event
                time, with outcome and evidence attached. Finance and engineering read
                from the same ledger.
            </p>
            <div>
                <Link href="/ai-spend-audit" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
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
                Read AI cost as a unit cost, not a lump sum.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Start with the Monitor surface, or run the one-time AI Spend Audit to get
                a delivered report on top of the same metering layer.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/monitor" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
                    See monitor
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
