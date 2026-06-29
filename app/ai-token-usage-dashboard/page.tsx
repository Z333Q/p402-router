import type { Metadata } from 'next';
import Link from 'next/link';
import { MeterBrand } from '../meter/_components/MeterBrand';

/* eslint-disable react/no-unescaped-entities */

/**
 * 3S-13: SEO landing rewritten onto the canonical /meter dark-theme buyer
 * surface. Head term: "AI Token Usage Dashboard". Parent product: /monitor.
 */

export const metadata: Metadata = {
    title: 'AI Token Usage Dashboard for Teams and Models | P402',
    description:
        'Track AI token usage across teams, workflows, models, and vendors with P402 Monitor. Per-event attribution, no prompt storage required.',
    alternates: { canonical: 'https://p402.io/ai-token-usage-dashboard' },
    openGraph: {
        title: 'AI Token Usage Dashboard for Teams and Models | P402',
        description:
            'Track AI token usage across teams, workflows, models, and vendors with P402 Monitor. Per-event attribution, no prompt storage required.',
        url: 'https://p402.io/ai-token-usage-dashboard',
    },
};

const FAQ_ENTRIES: ReadonlyArray<{ q: string; a: string }> = [
    {
        q: 'What dimensions does the AI token usage dashboard group by?',
        a: 'Owner (customer, feature, department, employee, API key), workflow, model, vendor, budget, policy result, outcome, and evidence status. Token usage is recorded per event and rolled up under any of these dimensions.',
    },
    {
        q: 'Does the dashboard require storing prompts?',
        a: 'No. Default privacy mode is metadata-only. The dashboard reads owner, model, tokens, cost, budget, policy result, outcome, and evidence status. Prompt and response content stay out unless tenant policy opts in.',
    },
    {
        q: 'Which providers feed the dashboard?',
        a: 'OpenAI, Anthropic, Gemini, Bedrock, OpenRouter, and any HTTP-callable model. Calls routed through P402 and calls reported as meter-only events from your backend both land in the same ledger.',
    },
    {
        q: 'How does this differ from a provider-side usage dashboard?',
        a: 'Provider dashboards show usage per API key on that provider. The P402 token usage dashboard shows tokens across every provider under one owner taxonomy, with budget, policy result, outcome, and evidence already attached.',
    },
    {
        q: 'What is the first integration step?',
        a: 'Create a P402 key, then either route an existing OpenAI-compatible request through P402 or send a meter-only event from your backend. The first event lands in the ledger and the token usage dashboard renders with real data.',
    },
    {
        q: 'Can engineers and finance read the same dashboard?',
        a: 'Yes. Engineering reads tokens by feature, workflow, and model. Finance reads tokens and cost by department, employee, vendor, and budget. The same metering events drive both views.',
    },
];

const JSONLD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'SoftwareApplication',
            name: 'P402 AI Token Usage Dashboard',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://p402.io/ai-token-usage-dashboard',
            description:
                'Dashboard for AI token usage across teams, workflows, models, and vendors. Per-event attribution with no prompt storage required.',
        },
        {
            '@type': 'Product',
            name: 'P402 AI Token Usage Dashboard',
            brand: { '@type': 'Brand', name: 'P402' },
            description:
                'AI token usage dashboard. Records every AI call with owner, workflow, model, vendor, tokens, cost, and outcome.',
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

export default function AiTokenUsageDashboardPage() {
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
                {'>'} _ AI TOKEN USAGE DASHBOARD
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
                AI token usage<br />
                <span className="text-primary">dashboard.</span>
            </h1>
            <p className="text-base font-mono text-neutral-300 leading-relaxed">
                P402 Monitor records every AI call with owner, workflow, model, vendor,
                tokens, cost, and outcome. The dashboard groups token usage by any
                dimension.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/dashboard?demo=1" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
                    See dashboard
                </Link>
                <Link href="/docs" className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors">
                    Read docs
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
                Token usage scattered across provider consoles.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Each provider console shows tokens per API key on that provider. Nothing
                shows tokens per customer, per feature, per workflow, per department across
                every provider at once. An AI token usage dashboard needs one ledger and
                one owner taxonomy.
            </p>
        </section>
    );
}

const RECORDS: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'Owner',         line: 'Customer, feature, workflow, department, employee, or API key.' },
    { name: 'Workflow',      line: 'The task or process the call served, tokens rolled up per workflow.' },
    { name: 'Model',         line: 'Requested and used. Tokens per model, provider, and version.' },
    { name: 'Vendor',        line: 'Share of tokens per vendor, with single-vendor concentration flagged.' },
    { name: 'Tokens',        line: 'Input, output, and total token counts, per event and aggregated.' },
    { name: 'Cost',          line: 'Direct cost in USD next to token counts. Retry and context waste flagged.' },
    { name: 'Budget',        line: 'Budget the event drew from and remaining balance per owner.' },
    { name: 'Outcome',       line: 'Accepted, rejected, revised, escalated, or failed, alongside token usage.' },
    { name: 'Evidence',      line: 'Receipt and evidence bundle status per event for audit and finance review.' },
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
        body: 'Use the OpenAI-compatible endpoint, or post metadata-only events from your backend. Both produce token counts in the dashboard.',
    },
    {
        n: '03',
        title: 'Attach owner, workflow, vendor, and customer metadata.',
        body: 'Events are tagged under the taxonomy your organization already uses. Tokens roll up per owner without rebuilding a billing pipeline.',
    },
    {
        n: '04',
        title: 'Read tokens by any dimension.',
        body: 'The Monitor surface groups tokens by team, workflow, model, vendor, customer, budget, outcome, and evidence status. Drill from a roll-up into the underlying event.',
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
                The token usage dashboard reads token counts, owners, models, and outcomes.
                Prompt and response storage are off by default. Privacy modes are
                selectable per workflow.
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
                them to see how tokens roll up under owner, workflow, model, and outcome
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
                Know tokens per feature without rebuilding billing.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Wrap AI calls once. The dashboard groups tokens by customer, feature,
                workflow, model, and outcome. Retry waste and context waste are flagged so
                engineering can act on real numbers.
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
                Token usage rolled up for finance.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Tokens and cost grouped by department, employee, vendor, and budget at
                event time. Outcome and evidence status attached. Finance, engineering, and
                audit read the same record.
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
                One ledger for every token your organization spends.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Start with the Monitor surface, or sign in to send the first metered event.
                Tokens roll up under any owner you supply.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/monitor" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
                    See monitor
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
