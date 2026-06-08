import type { Metadata } from 'next';
import Link from 'next/link';
import { MeterBrand } from './_components/MeterBrand';

/* eslint-disable react/no-unescaped-entities */

/**
 * 3S-1A: canonical buyer-page template for the public marketing surface.
 *
 * This page is the source of structure for the forked vertical buyer
 * pages in 3S-1B (/monitor, /control, /prove) and 3S-1C (/optimize,
 * /settle). When forking, copy this file, swap the section copy, and
 * keep the section order constant.
 *
 * Page-level metadata only. Parent layout (app/meter/layout.tsx)
 * provides the dark theme surface and is intentionally left in place
 * to avoid touching the preserved vertical demos.
 */

export const metadata: Metadata = {
    title: 'AI Usage Metering for Token Spend | P402',
    description:
        'Turn every AI call into an economic event with owner, workflow, model, provider, tokens, cost, budget, policy result, outcome, and evidence.',
    alternates: { canonical: 'https://p402.io/meter' },
    openGraph: {
        title: 'AI Usage Metering for Token Spend | P402',
        description:
            'Turn every AI call into an economic event with owner, workflow, model, provider, tokens, cost, budget, policy result, outcome, and evidence.',
        url: 'https://p402.io/meter',
    },
};

const FAQ_ENTRIES: ReadonlyArray<{ q: string; a: string }> = [
    {
        q: 'Does P402 need prompt content?',
        a: 'No. The default privacy mode is metadata-only. P402 records owner, workflow, model, provider, tokens, cost, budget, policy result, outcome, and evidence status, without storing prompts or responses.',
    },
    {
        q: 'Does Meter require settlement?',
        a: 'No. Meter works before settlement. Settlement is added when AI work becomes payable. You can run P402 as a metadata-only ledger and add receipts or settlement later.',
    },
    {
        q: 'Is P402 a replacement for OpenRouter?',
        a: 'No. OpenRouter is an execution route for LLM calls. P402 wraps any provider, including OpenRouter, and adds attribution, budgets, policy, outcomes, and evidence around each event.',
    },
    {
        q: 'How is this different from LLM observability?',
        a: 'LLM observability records traces of prompts, responses, latency, and errors. P402 records the economic event around each call: who owned it, which budget it drew from, which policy result it produced, and what evidence exists for it.',
    },
    {
        q: 'How is this different from FinOps?',
        a: 'FinOps reports cloud spend after the fact. P402 records cost and attribution at the moment of the AI call, so finance, engineering, and compliance see the same event in the same ledger.',
    },
    {
        q: 'What is the first integration step?',
        a: 'Create a P402 key, then either route an existing OpenAI-compatible request through P402 or send a meter-only event from your backend. The first event lands in the ledger and the page renders with real data.',
    },
];

const JSONLD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'SoftwareApplication',
            name: 'P402 Meter',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://p402.io/meter',
            description:
                'P402 Meter turns every AI request into an economic event with owner, workflow, model, provider, tokens, cost, budget, policy result, outcome, and evidence.',
        },
        {
            '@type': 'Product',
            name: 'P402 Meter',
            brand: { '@type': 'Brand', name: 'P402' },
            description:
                'AI usage metering for token spend. Records owner, workflow, model, provider, tokens, cost, budget, policy result, outcome, and evidence on every AI call.',
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

export default function MeterPage() {
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

/* ── 0. Top bar ─────────────────────────────────────────────────────── */

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

/* ── 1. Hero ────────────────────────────────────────────────────────── */

function Hero() {
    return (
        <section className="flex flex-col gap-6 max-w-3xl">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                {'>'} _ P402 METER
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
                Meter every AI call before it<br />
                becomes <span className="text-primary">budget leakage.</span>
            </h1>
            <p className="text-base font-mono text-neutral-300 leading-relaxed">
                P402 turns each AI request into an economic event with owner, workflow,
                model, provider, tokens, cost, budget, policy result, outcome, and
                evidence status.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/docs/meter-only"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    Install Meter
                </Link>
                <Link
                    href="/dashboard"
                    className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
                >
                    See dashboard
                </Link>
            </div>

            <p className="text-[11px] font-mono text-neutral-500 leading-relaxed pt-2">
                No prompt storage required. Metadata-only mode is available from the first
                event.
            </p>
        </section>
    );
}

/* ── 2. Problem ─────────────────────────────────────────────────────── */

function Problem() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>The problem</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                AI spend arrives too late.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Provider invoices show totals after usage happens. They do not show which
                customer, feature, workflow, department, employee, model, or retry caused
                the cost. P402 records that ownership when the event happens.
            </p>
        </section>
    );
}

/* ── 3. What Meter records ──────────────────────────────────────────── */

const RECORDS: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'Owner',         line: 'Customer, feature, workflow, department, employee, or API key.' },
    { name: 'Workflow',      line: 'The task or process the call served.' },
    { name: 'Model',         line: 'Requested and used. Provider and model.' },
    { name: 'Tokens',        line: 'Input, output, and total token counts.' },
    { name: 'Cost',          line: 'Direct cost in USD, plus retry and context waste.' },
    { name: 'Budget',        line: 'Budget the event drew from and remaining balance.' },
    { name: 'Policy result', line: 'Approved, warned, denied, or requires review.' },
    { name: 'Outcome',       line: 'Accepted, rejected, revised, escalated, or failed.' },
    { name: 'Evidence',      line: 'Receipt and evidence bundle status for audit and finance.' },
];

function Records() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>What Meter records</SectionLabel>
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

/* ── 4. How it works ────────────────────────────────────────────────── */

const STEPS: ReadonlyArray<{ n: string; title: string; body: string }> = [
    {
        n: '01',
        title: 'Create a P402 key.',
        body: 'Sign in, generate a key. The key is returned once. P402 stores only a hash.',
    },
    {
        n: '02',
        title: 'Send a request through the OpenAI-compatible endpoint, or report a meter-only event.',
        body: 'Use the existing OpenAI SDK pattern, or post a metadata-only event from your backend if you call the provider directly.',
    },
    {
        n: '03',
        title: 'Attach customer, feature, department, employee, workflow, or task metadata.',
        body: 'P402 indexes the event under each owner you supply. Owners are free-form within the documented vocabulary.',
    },
    {
        n: '04',
        title: 'See the event in the ledger.',
        body: 'The event appears in /dashboard/meter/events with owner, workflow, model, tokens, cost, budget, policy result, outcome, and evidence status.',
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

/* ── 5. Privacy ─────────────────────────────────────────────────────── */

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
                P402 records economic metadata by default. Prompt and response storage are
                off by default. Customers choose the privacy mode. Meter-only mode lets
                your backend call the model provider directly and report the economic
                event.
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

/* ── 6. Proof ───────────────────────────────────────────────────────── */

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

/* ── 7. For developers ──────────────────────────────────────────────── */

function ForDevelopers() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>For developers</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Know the cost and margin of every AI feature.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Wrap your AI calls once. P402 attributes every token to a customer,
                feature, workflow, and budget, with cost, outcome, and evidence on every
                event. Track AI COGS per feature without rebuilding your billing pipeline.
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

/* ── 8. For enterprise ──────────────────────────────────────────────── */

function ForEnterprise() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>For enterprise</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Give finance a real AI usage ledger.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                See AI spend by department, employee, workflow, model, vendor, customer,
                outcome, and evidence status. Export evidence for finance, procurement,
                and audit review without exposing prompts.
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

/* ── 9. FAQ ─────────────────────────────────────────────────────────── */

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

/* ── 10. Final CTA ──────────────────────────────────────────────────── */

function FinalCta() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>Get started</SectionLabel>
            <h2 className="text-3xl lg:text-4xl font-bold uppercase tracking-tight">
                Give every token an owner.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Start with one metered event. Metadata-only by default. Add receipts and
                settlement when the work becomes payable.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/docs/meter-only"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    Install Meter
                </Link>
                <Link
                    href="/dashboard"
                    className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
                >
                    See dashboard
                </Link>
            </div>
        </section>
    );
}

/* ── helpers ────────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            {children}
        </div>
    );
}
