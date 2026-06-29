import type { Metadata } from 'next';
import Link from 'next/link';
import { MeterBrand } from '../meter/_components/MeterBrand';

/* eslint-disable react/no-unescaped-entities */

/**
 * 3S-13: SEO landing rewritten onto the canonical /meter dark-theme buyer
 * surface. Head term: "Embedded AI Margin Control". Parent product:
 * /developers.
 */

export const metadata: Metadata = {
    title: 'Embedded AI Margin Control for Developers | P402',
    description:
        'Track AI feature margin, customer cost, retry waste, context waste, and cost per accepted output with P402 Meter.',
    alternates: { canonical: 'https://p402.io/embedded-ai-margin-control' },
    openGraph: {
        title: 'Embedded AI Margin Control for Developers | P402',
        description:
            'Track AI feature margin, customer cost, retry waste, context waste, and cost per accepted output with P402 Meter.',
        url: 'https://p402.io/embedded-ai-margin-control',
    },
};

const FAQ_ENTRIES: ReadonlyArray<{ q: string; a: string }> = [
    {
        q: 'What does embedded AI margin control mean here?',
        a: 'Cost per feature, per customer, per workflow, and per accepted output recorded at the moment of each AI call. Margin equals price charged to the customer minus AI cost attributed to that customer. P402 Meter provides the cost side.',
    },
    {
        q: 'Does it require switching providers?',
        a: 'No. P402 wraps OpenAI, Anthropic, Gemini, Bedrock, OpenRouter, and any HTTP-callable model. Existing provider relationships stay in place. Margin is computed against whichever provider served the call.',
    },
    {
        q: 'Does it require storing prompts?',
        a: 'No. Default privacy mode is metadata-only. Owner, model, tokens, cost, budget, policy result, outcome, and evidence status are recorded. Prompts and responses stay out unless the tenant explicitly opts in.',
    },
    {
        q: 'How is retry waste measured?',
        a: 'Tokens spent on retried calls that produced no new outcome are flagged on the event. Retry waste is rolled up per feature and per customer, so engineering can see which features carry retry tax.',
    },
    {
        q: 'How is context waste measured?',
        a: 'Tokens spent on context that did not change the outcome of the call are flagged. The rollup shows which features carry context that does not earn its keep.',
    },
    {
        q: 'What is the cost per accepted output?',
        a: 'Total AI cost for a feature, divided by the count of events with outcome accepted. The dashboard surfaces it per feature and per customer so margin work targets the right place.',
    },
];

const JSONLD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'SoftwareApplication',
            name: 'P402 Embedded AI Margin Control',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://p402.io/embedded-ai-margin-control',
            description:
                'Embedded AI margin control. Cost per feature, per customer, per workflow, with retry waste, context waste, and cost per accepted output.',
        },
        {
            '@type': 'Product',
            name: 'P402 Embedded AI Margin Control',
            brand: { '@type': 'Brand', name: 'P402' },
            description:
                'Track AI feature margin, customer cost, retry waste, context waste, and cost per accepted output.',
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

export default function EmbeddedAiMarginControlPage() {
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
                {'>'} _ EMBEDDED AI MARGIN CONTROL
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
                Embedded AI margin<br />
                <span className="text-primary">control.</span>
            </h1>
            <p className="text-base font-mono text-neutral-300 leading-relaxed">
                P402 Meter records cost per feature, per customer, per workflow. Track AI
                COGS, retry waste, context waste, and cost per accepted output.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/login" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
                    Start free
                </Link>
                <Link href="/developers/quickstart" className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors">
                    Read quickstart
                </Link>
            </div>

            <p className="text-[11px] font-mono text-neutral-500 leading-relaxed pt-2">
                Built on the P402 Meter surface. Parent product page: <Link href="/developers" className="text-primary hover:underline">/developers</Link>.
            </p>
        </section>
    );
}

function Problem() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>The problem</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                AI cost lands on the wrong line of the P&L.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Provider invoices are a lump sum. Without per-feature and per-customer
                attribution, embedded AI cost shows up under infrastructure instead of
                cost of goods sold, and feature margin stays a guess.
            </p>
        </section>
    );
}

const RECORDS: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'Per feature',         line: 'AI cost rolled up under the product feature the call served.' },
    { name: 'Per customer',        line: 'AI cost rolled up under the paying customer the call served.' },
    { name: 'Per workflow',        line: 'AI cost grouped by the task the call ran inside.' },
    { name: 'Per accepted output', line: 'Total AI cost divided by count of events with outcome accepted, per feature and per customer.' },
    { name: 'Retry waste',         line: 'Tokens spent on retried calls that produced no new outcome, flagged on the event.' },
    { name: 'Context waste',       line: 'Tokens spent on context that did not change the outcome, flagged for review.' },
    { name: 'Model and vendor',    line: 'Cost split by model and vendor for the same feature, with concentration flagged.' },
    { name: 'Budget',              line: 'Budget the event drew from and remaining balance per customer and feature.' },
    { name: 'Evidence',            line: 'Receipt and evidence bundle status per event for downstream finance and audit.' },
];

function Records() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>What this surface shows</SectionLabel>
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
        title: 'Wrap the AI call once.',
        body: 'Use the OpenAI-compatible endpoint or post a meter-only event from your backend. The call returns a normal completion plus an event id.',
    },
    {
        n: '03',
        title: 'Attach customer, feature, and workflow on the request.',
        body: 'Owners are free-form within the documented vocabulary. The same event can roll up under customer, feature, workflow, and budget at once.',
    },
    {
        n: '04',
        title: 'Read margin numbers.',
        body: 'Cost per feature, per customer, per accepted output, with retry and context waste. The rollup is available in the Meter dashboard and via the events API.',
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
                Margin numbers come from token counts and cost, not prompts. Prompt and
                response storage are off by default. Sensitive customer features can run
                under private gateway mode, where the inference stays in your environment
                and P402 records the economic event over a signed channel.
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
                them to see cost per feature, per customer, and per accepted output
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
                Margin numbers without a billing rewrite.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Wrap the AI call once. P402 attributes every token to a customer, feature,
                workflow, and budget. Cost per accepted output, retry waste, and context
                waste are surfaced on the same events your code already emits.
            </p>
            <div>
                <Link href="/developers/quickstart" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
                    Read quickstart
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
                Same events feed finance.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                The same metered events back the enterprise budget dashboard. Engineering
                works the margin lever, finance reads attribution and evidence from the
                same ledger.
            </p>
            <div>
                <Link href="/enterprise" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
                    See enterprise
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
                Track margin per feature, not per invoice.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Wrap one AI call. The first metered event lands in the ledger and the
                feature, customer, and workflow rollups render with real numbers.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/developers" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
                    See developers
                </Link>
                <Link href="/login" className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors">
                    Sign in
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
