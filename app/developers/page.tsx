import type { Metadata } from 'next';
import Link from 'next/link';
import { MeterBrand } from '../meter/_components/MeterBrand';

/* eslint-disable react/no-unescaped-entities */

/**
 * 3S-4: developers audience hub. Forked from the canonical /meter
 * template and /enterprise hub. Section order preserved. Persona
 * sections cut to developer concerns (build, ship, attribute).
 */

export const metadata: Metadata = {
    title: 'Developers | P402',
    description:
        'Build AI features with cost ownership using P402 Meter, workflow attribution, outcomes, and optional settlement.',
    alternates: { canonical: 'https://p402.io/developers' },
    openGraph: {
        title: 'Developers | P402',
        description:
            'Build AI features with cost ownership using P402 Meter, workflow attribution, outcomes, and optional settlement.',
        url: 'https://p402.io/developers',
    },
};

const FAQ_ENTRIES: ReadonlyArray<{ q: string; a: string }> = [
    {
        q: 'Does P402 require a wallet?',
        a: 'No. Meter works without a wallet. Wallet and USDC are only for receipts on payable AI work.',
    },
    {
        q: 'Is the endpoint OpenAI-compatible?',
        a: 'Yes. Point baseURL to https://p402.io/v1 and use the OpenAI SDK as-is.',
    },
    {
        q: 'What metadata can I attach?',
        a: 'workflow_id, customer_id, feature_id, department, employee, model, vendor, and free-form tags within the documented vocabulary.',
    },
    {
        q: 'Does P402 store prompts?',
        a: 'Not by default. Metadata-only mode keeps prompts and responses inside your environment.',
    },
    {
        q: 'Can I migrate from OpenRouter?',
        a: 'Yes. P402 wraps OpenRouter and any provider. Same OpenAI SDK pattern.',
    },
    {
        q: 'What does the first metered event require?',
        a: 'A P402 key and one wrapped call. Workflow and outcome metadata are optional but recommended for attribution.',
    },
];

const JSONLD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'SoftwareApplication',
            name: 'P402 Developers',
            applicationCategory: 'DeveloperApplication',
            operatingSystem: 'Web',
            url: 'https://p402.io/developers',
            description:
                'P402 gives developers an OpenAI-compatible meter for AI usage, margin, workflow attribution, outcomes, and optional settlement.',
        },
        {
            '@type': 'Product',
            name: 'P402 Developers',
            brand: { '@type': 'Brand', name: 'P402' },
            description:
                'OpenAI-compatible meter for AI usage, margin, workflow attribution, outcomes, and optional settlement.',
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

export default function DevelopersPage() {
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
                <Paths />
                <FirstEvent />
                <CodeExample />
                <Privacy />
                <Plans />
                <OptionalSettlement />
                <Resources />
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
                {'>'} _ P402 DEVELOPERS
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
                Build AI features with<br />
                <span className="text-primary">cost ownership.</span>
            </h1>
            <p className="text-base font-mono text-neutral-300 leading-relaxed">
                P402 gives developers an OpenAI-compatible meter for AI usage, margin,
                workflow attribution, outcomes, and optional settlement.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/login"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    Start free
                </Link>
                <Link
                    href="/developers/quickstart"
                    className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
                >
                    Read quickstart
                </Link>
            </div>

            <p className="text-[11px] font-mono text-neutral-500 leading-relaxed pt-2">
                Metadata-only by default. No prompt storage required. Settlement is
                optional.
            </p>
        </section>
    );
}

function Problem() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>The developer problem</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                AI cost is invisible until it bites margin.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Engineering ships AI features without per-call attribution. Finance sees
                the invoice. The team cannot tell which feature, which customer, which
                workflow, or which retry caused the cost. P402 records that attribution
                at the moment of the call.
            </p>
        </section>
    );
}

const PATHS: ReadonlyArray<{ name: string; line: string }> = [
    {
        name: 'Meter AI calls',
        line: 'OpenAI-compatible endpoint. Wrap your existing client. Every call becomes an economic event with owner, tokens, cost, and outcome.',
    },
    {
        name: 'Track AI feature margin',
        line: 'Record cost per feature, per customer, per workflow. See where margin lands and where it leaks.',
    },
    {
        name: 'Add workflow attribution',
        line: 'Pass workflow_id, customer_id, feature_id on every call. Filter the ledger by any owner dimension.',
    },
    {
        name: 'Record outcomes',
        line: 'Report whether the output was accepted, revised, escalated, or failed. P402 ties outcome to cost.',
    },
    {
        name: 'Enable settlement later',
        line: 'Meter works without settlement. Add x402 receipts when AI work becomes payable. No lock-in.',
    },
];

function Paths() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>What you get</SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {PATHS.map((p) => (
                    <div
                        key={p.name}
                        className="border-2 border-neutral-700 p-4 flex flex-col gap-1"
                    >
                        <div className="text-primary text-[10px] font-mono font-bold uppercase tracking-wider">
                            {p.name}
                        </div>
                        <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                            {p.line}
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
        title: 'Create a P402 key.',
        body: 'Sign in, generate the key. The key returns exactly once.',
    },
    {
        n: '02',
        title: 'Wrap your AI call through the OpenAI-compatible endpoint.',
        body: 'Point baseURL to https://p402.io/v1 and use the existing OpenAI SDK pattern.',
    },
    {
        n: '03',
        title: 'Attach workflow_id, customer_id, feature_id metadata.',
        body: 'Owner taxonomy is indexed on every event. Filter the ledger by any dimension.',
    },
    {
        n: '04',
        title: 'Report the outcome. View the event in the spend ledger.',
        body: 'Send accepted, revised, escalated, or failed. The event lands in the dashboard with cost and attribution attached.',
    },
];

function FirstEvent() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>Your first metered event</SectionLabel>
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

const CODE_EXAMPLE = `import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.P402_API_KEY,
  baseURL: 'https://p402.io/v1',
});

const completion = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Summarize Q3 revenue.' }],
  // Attribution travels with the call.
  metadata: {
    workflow_id: 'finance.summary',
    customer_id: 'cust_123',
    feature_id: 'q3_brief',
  },
});

const eventId = completion.id;

// Report the outcome once your app accepts or rejects the output.
await fetch(\`https://p402.io/api/v2/meter/events/\${eventId}/outcome\`, {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.P402_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ outcome: 'accepted' }),
});
`;

function CodeExample() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>Example</SectionLabel>
            <pre className="border-2 border-neutral-700 p-5 overflow-x-auto text-[11px] font-mono text-neutral-300 leading-relaxed bg-neutral-950">
                <code>{CODE_EXAMPLE}</code>
            </pre>
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
                P402 meters economics, not content.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Metadata-only mode is the default. Prompts, files, documents, source
                code, and responses stay inside your environment. P402 records the
                owner, cost, tokens, budget, policy result, outcome, and evidence
                status of the call. Choose a different mode only when the tenant
                policy allows it.
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

function Plans() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>Sandbox and Build</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Start in Sandbox. Move to Build when you ship.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Sandbox is free. Build is $49 per month. Build checkout is controlled by
                the billing rollout. Start free or request access.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/login"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    Start free
                </Link>
                <Link
                    href="/get-access?intent=build"
                    className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
                >
                    Get access
                </Link>
            </div>
        </section>
    );
}

function OptionalSettlement() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>Optional settlement</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Add settlement only when AI work is payable.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Meter works without settlement. USDC and wallets are only required for
                x402 receipts when AI work is sold to an end user or billed across a
                boundary. Build and ship the meter first. Add receipts when the work
                becomes payable.
            </p>
            <div>
                <Link
                    href="/receipts"
                    className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
                >
                    Read about receipts
                </Link>
            </div>
        </section>
    );
}

const RESOURCES: ReadonlyArray<{ name: string; href: string; line: string }> = [
    { name: 'Quickstart',   href: '/developers/quickstart', line: 'Six-step path from key generation to receipt reuse.' },
    { name: 'API reference',href: '/docs/api',              line: 'Endpoints, request shapes, and error codes.' },
    { name: 'SDK',          href: '/docs/sdk',              line: 'TypeScript and Python clients with OpenAI compatibility.' },
    { name: 'Claude Skill', href: '/docs/skill',            line: 'P402 skill for Claude Code agents.' },
    { name: 'MCP server',   href: '/docs/mcp',              line: 'Model Context Protocol server for agent integrations.' },
    { name: 'Meter',        href: '/meter',                 line: 'Canonical product page for the metering layer.' },
    { name: 'Monitor',      href: '/monitor',               line: 'Read-only dashboards for AI spend and attribution.' },
    { name: 'Control',      href: '/control',               line: 'Budgets, policy results, and review gates.' },
    { name: 'Receipts',     href: '/receipts',              line: 'x402 settlement and receipt reuse for payable AI work.' },
    { name: 'Prove',        href: '/prove',                 line: 'Evidence bundles for finance, audit, and legal review.' },
];

function Resources() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>Developer resources</SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {RESOURCES.map((r) => (
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
                Send the first event.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Start in Sandbox with one wrapped call. Add settlement when AI work
                becomes payable.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/login"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    Start free
                </Link>
                <Link
                    href="/developers/quickstart"
                    className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
                >
                    Read quickstart
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
