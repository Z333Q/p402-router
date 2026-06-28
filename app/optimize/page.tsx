import type { Metadata } from 'next';
import Link from 'next/link';
import { MeterBrand } from '../meter/_components/MeterBrand';

/* eslint-disable react/no-unescaped-entities */

export const metadata: Metadata = {
    title: 'AI Cost Optimization Readiness | P402',
    description:
        'Prepare AI spend for measured savings across models, cache, retries, and context. Recommendations are gated until proof is ready.',
    alternates: { canonical: 'https://p402.io/optimize' },
    openGraph: {
        title: 'AI Cost Optimization Readiness | P402',
        description:
            'Prepare AI spend for measured savings across models, cache, retries, and context. Recommendations are gated until proof is ready.',
        url: 'https://p402.io/optimize',
    },
};

const FAQ_ENTRIES: ReadonlyArray<{ q: string; a: string }> = [
    {
        q: 'Are recommendations live?',
        a: 'No. Recommendations are gated. Readiness checks are live and run continuously over the historical ledger. A recommendation ships only after the underlying check has measured baseline and outcome data sufficient to back the claim.',
    },
    {
        q: 'What does readiness mean?',
        a: 'Readiness means a check has gathered baseline and outcome data over enough events to back a savings claim. Each check tracks its own readiness state. The page surfaces those states without inventing a savings number.',
    },
    {
        q: 'Does Optimize change my code?',
        a: 'No. Preparing the data plane does not touch the runtime path. Your code keeps calling the same endpoint Meter already records. The readiness checks run on the recorded ledger.',
    },
    {
        q: 'When do recommendations ship?',
        a: 'A recommendation ships when its readiness check has measured baseline and outcome data sufficient to support the claim. Until then, the page reports check state, not a savings figure.',
    },
    {
        q: 'Can Optimize see prompts?',
        a: 'No. Optimize reads the same metadata-only events Meter records by default. Readiness checks use owner, workflow, model, vendor, tokens, cost, and outcome metadata, not prompt content.',
    },
    {
        q: 'What is the first step?',
        a: 'Create a P402 key, send metered events, then open the optimization readiness page. The readiness checks run over the events the ledger already holds.',
    },
];

const JSONLD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'SoftwareApplication',
            name: 'P402 Optimize',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://p402.io/optimize',
            description:
                'P402 Optimize prepares AI spend for measured savings across models, cache, retries, and context. Recommendations are gated until baseline and outcome data prove the recommendation.',
        },
        {
            '@type': 'Product',
            name: 'P402 Optimize',
            brand: { '@type': 'Brand', name: 'P402' },
            description:
                'AI cost optimization readiness. Readiness checks run over the recorded ledger. Recommendations are gated until measured baseline and outcome data are available.',
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

export default function OptimizePage() {
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
                {'>'} _ P402 OPTIMIZE
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
                Prepare AI spend for<br />
                measured <span className="text-primary">savings.</span>
            </h1>
            <p className="text-base font-mono text-neutral-300 leading-relaxed">
                P402 Optimize prepares AI spend for measured savings across models,
                cache, retries, and context. Recommendations are gated until baseline
                and outcome data prove the recommendation.
            </p>

            <div className="border-2 border-neutral-700 p-3 self-start">
                <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                    Status: readiness checks live. Recommendations gated.
                </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/dashboard/optimize?demo=1"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    See optimization readiness
                </Link>
                <Link
                    href="/docs"
                    className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
                >
                    Read docs
                </Link>
            </div>

            <p className="text-[11px] font-mono text-neutral-500 leading-relaxed pt-2">
                Recommendations are gated. No savings claim ships before measured
                baseline and outcome data are available.
            </p>
        </section>
    );
}

function Problem() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>The problem</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Savings claims without proof are noise.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Generic savings claims without measured baseline and outcome data are
                unverifiable. Optimize prepares the data plane that makes a savings
                claim verifiable: model substitution opportunities, cache hit ratios,
                retry waste, context waste, and accepted output rate per dollar.
            </p>
        </section>
    );
}

const RECORDS: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'Model substitution',     line: 'Check for workflows where a cheaper model would meet the accepted outcome rate.' },
    { name: 'Cache hit ratio',        line: 'Check for cache hit ratio per workflow and the share of cost served from cache.' },
    { name: 'Retry waste',            line: 'Check for retried calls and the cost spent on attempts that did not produce an accepted output.' },
    { name: 'Context waste',          line: 'Check for input tokens that did not contribute to the accepted output.' },
    { name: 'Prompt redundancy',      line: 'Check for repeated prompt structure across events that could share a cached prefix.' },
    { name: 'Provider drift',         line: 'Check for cost and outcome drift between providers and models over time.' },
    { name: 'Cost per accepted output', line: 'Check for cost per accepted output, segmented by workflow, model, and owner.' },
    { name: 'Outcome drift',          line: 'Check for outcome rate change against the recorded baseline per workflow.' },
    { name: 'Readiness score',        line: 'Check for whether each underlying check has enough baseline and outcome data to back a recommendation.' },
];

function Records() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>What Optimize checks</SectionLabel>
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
        body: 'Route AI calls through P402 or send meter-only events. Optimize reads the same recorded ledger Meter writes.',
    },
    {
        n: '02',
        title: 'Optimize collects baseline and outcome data over the historical ledger.',
        body: 'Baseline cost, outcome rate, cache hit ratio, retry rate, and context use are gathered per workflow, model, and owner.',
    },
    {
        n: '03',
        title: 'Readiness checks run continuously over the data plane.',
        body: 'Each check tracks its own readiness state against the baseline and outcome data the ledger holds.',
    },
    {
        n: '04',
        title: 'Recommendations remain gated until each check has sufficient proof.',
        body: 'A recommendation surfaces only when its readiness check has measured baseline and outcome data sufficient to back the claim.',
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
                Check economics, not content.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Optimize reads the same metadata-only events Meter records. Readiness
                checks run on owner, workflow, model, vendor, tokens, cost, and
                outcome metadata. Prompt and response storage stay off by default.
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
                Find the workflow that quietly eats your margin.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Optimize segments cost per accepted output by workflow, model, and
                owner. Readiness checks surface retry waste, context waste, and cache
                misses against the recorded ledger. Your code keeps calling the same
                endpoint Meter already records.
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
                Build the proof finance needs before changing model choice.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Give finance, procurement, and engineering one place to see baseline
                cost, outcome rate, and readiness state per workflow. A model change
                or routing decision ships with measured baseline and outcome data, not
                a generic savings number.
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
                Prepare the proof. Then change the model.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Connect P402 metering, let the readiness checks gather baseline and
                outcome data, and review readiness state per check. Recommendations
                ship when the proof is ready.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/dashboard/optimize?demo=1"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    See optimization readiness
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
