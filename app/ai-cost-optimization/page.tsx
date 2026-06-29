import type { Metadata } from 'next';
import Link from 'next/link';
import { MeterBrand } from '../meter/_components/MeterBrand';

/* eslint-disable react/no-unescaped-entities */

/**
 * 3S-13: SEO landing rewritten onto the canonical /meter dark-theme buyer
 * surface. Head term: "AI Cost Optimization Readiness". Parent product:
 * /optimize. Recommendations are gated. Same status posture as /optimize.
 */

export const metadata: Metadata = {
    title: 'AI Cost Optimization Readiness | P402',
    description:
        'Prepare AI spend for measured savings across models, cache, retries, and context with P402 Optimize. Recommendations are gated until proof is ready.',
    alternates: { canonical: 'https://p402.io/ai-cost-optimization' },
    openGraph: {
        title: 'AI Cost Optimization Readiness | P402',
        description:
            'Prepare AI spend for measured savings across models, cache, retries, and context with P402 Optimize. Recommendations are gated until proof is ready.',
        url: 'https://p402.io/ai-cost-optimization',
    },
};

const FAQ_ENTRIES: ReadonlyArray<{ q: string; a: string }> = [
    {
        q: 'Are recommendations live today?',
        a: 'No. Recommendations are gated. Readiness checks are live and run continuously over the recorded ledger. A recommendation ships only after baseline and outcome data measured on the ledger back the claim.',
    },
    {
        q: 'What does the readiness page show?',
        a: 'The set of readiness checks across models, cache, retries, and context, with the data the check still needs before a recommendation can ship. The page is a prep surface, not a runtime optimizer.',
    },
    {
        q: 'Does this change the runtime path?',
        a: 'No. Preparing the data plane does not change how your code calls the model. Readiness checks run over events the ledger already records.',
    },
    {
        q: 'What is the relationship between readiness and the AI Spend Audit?',
        a: 'Both run on the same metering ledger. The AI Spend Audit produces a one-time delivered report. The optimization readiness page is the ongoing surface that shows which checks have enough data to produce a recommendation.',
    },
    {
        q: 'What is the first integration step?',
        a: 'Create a P402 key, send metered events, then open the optimization readiness page. The readiness checks run on the events the ledger already holds.',
    },
    {
        q: 'Does the readiness surface require sharing prompts?',
        a: 'No. Default privacy mode is metadata-only. Readiness checks read owner, model, tokens, cost, outcome, and evidence status. Prompt content stays out unless tenant policy opts in.',
    },
];

const JSONLD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'SoftwareApplication',
            name: 'P402 AI Cost Optimization Readiness',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://p402.io/ai-cost-optimization',
            description:
                'AI cost optimization readiness. Readiness checks run over the recorded ledger. Recommendations are gated until measured baseline and outcome data are available.',
        },
        {
            '@type': 'Product',
            name: 'P402 AI Cost Optimization Readiness',
            brand: { '@type': 'Brand', name: 'P402' },
            description:
                'Prepare AI spend for measured savings across models, cache, retries, and context. Recommendations are gated until baseline and outcome data back the claim.',
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

export default function AiCostOptimizationPage() {
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
                {'>'} _ AI COST OPTIMIZATION READINESS
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
                AI cost optimization<br />
                <span className="text-primary">readiness.</span>
            </h1>
            <p className="text-base font-mono text-neutral-300 leading-relaxed">
                P402 Optimize prepares AI spend for measured savings across models, cache,
                retries, and context. Recommendations are gated until baseline and outcome
                data prove the recommendation.
            </p>

            <div className="inline-flex self-start border-2 border-primary px-3 py-1.5 text-[10px] font-mono font-bold text-primary uppercase tracking-wider">
                Status: readiness checks live. Recommendations gated.
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/dashboard/optimize?demo=1" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
                    See optimization readiness
                </Link>
                <Link href="/docs" className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors">
                    Read docs
                </Link>
            </div>

            <p className="text-[11px] font-mono text-neutral-500 leading-relaxed pt-2">
                Built on the P402 Optimize surface. Parent product page: <Link href="/optimize" className="text-primary hover:underline">/optimize</Link>.
            </p>
        </section>
    );
}

function Problem() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>The problem</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                AI cost claims without proof do not survive review.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Recommendations like switch this model, raise that cache, cut this retry,
                or trim that context only matter if a baseline and an outcome back them.
                The readiness page makes the data the recommendation needs explicit, and
                gates the recommendation until that data is in the ledger.
            </p>
        </section>
    );
}

const RECORDS: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'Model readiness',     line: 'Per workflow, do we have enough outcomes on two models to compare cost at equal quality.' },
    { name: 'Cache readiness',     line: 'Per feature, is there a repeated-input signature with measurable hit potential against current cache.' },
    { name: 'Retry readiness',     line: 'Per feature, are retries tagged and is their no-new-outcome share large enough to act on.' },
    { name: 'Context readiness',   line: 'Per feature, is there context that does not change the outcome of the call across enough events.' },
    { name: 'Baseline coverage',   line: 'Share of events with cost, tokens, outcome, and owner attached, by feature and workflow.' },
    { name: 'Outcome coverage',    line: 'Share of events with outcome accepted, rejected, revised, escalated, or failed recorded.' },
    { name: 'Owner coverage',      line: 'Share of events with customer, feature, workflow, and department attached.' },
    { name: 'Gate reasons',        line: 'Why each readiness check has not yet released a recommendation, with the missing data named.' },
    { name: 'Privacy posture',     line: 'Privacy mode per workflow. Readiness checks honor the same posture as Meter.' },
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
        title: 'Send metered events for the AI calls you want to optimize later.',
        body: 'Use the OpenAI-compatible endpoint or post a meter-only event from your backend. The readiness checks run on the events the ledger holds.',
    },
    {
        n: '03',
        title: 'Open the optimization readiness page.',
        body: 'The page lists each readiness check with the data still missing before a recommendation can ship. No claim is made before the underlying data is in.',
    },
    {
        n: '04',
        title: 'Watch checks turn ready as data accumulates.',
        body: 'A check stays gated until baseline and outcome data are measured. When a check goes ready, the recommendation it backs becomes available.',
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
                Readiness checks read economic metadata. Prompt and response storage are
                off by default. Workflows that need stronger privacy can run under private
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
                them to see baseline coverage, outcome coverage, and owner coverage on
                concrete workflows readiness checks would run against.
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
                See what data a recommendation still needs.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Each readiness check states the data it needs. Add the missing owner
                tags, outcome labels, or context flags on the metered events you already
                emit. A recommendation ships only after the check it depends on goes
                ready.
            </p>
            <div>
                <Link href="/docs" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
                    Read docs
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
                Gated claims survive finance review.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Recommendations are gated. No claim ships before measured baseline and
                outcome data back it. Finance and audit can read the same ledger the
                readiness checks run on.
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
                Prepare the data plane first. The claim comes after.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Readiness checks are live. Recommendations are gated. Start with the
                Optimize surface, or read the docs to see what data each readiness check
                needs.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/optimize" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
                    See optimize
                </Link>
                <Link href="/docs" className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors">
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
