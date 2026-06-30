import Link from 'next/link';
import { MeterBrand } from '../meter/_components/MeterBrand';

/* eslint-disable react/no-unescaped-entities */

/**
 * First-party SEO landing for the head term "AI Cost Management on Reddit".
 *
 * Positioning: this page is original first-party analysis of the questions
 * teams discuss publicly when AI spend hits production budgets. The page
 * does not scrape Reddit, does not quote Reddit users, does not use Reddit
 * brand styling, and makes no affiliation claim. The word "Reddit"
 * frames search intent only.
 *
 * Dark-theme layout mirrors the other /ai-* SEO landings. JSON-LD covers
 * WebPage, Article, FAQPage, BreadcrumbList, Organization, SoftwareApplication.
 *
 * Clean of em dashes, save-N percent claims, unsupported savings copy,
 * unsupported compliance posture, and Stripe checkout claims.
 */

const PAGE_URL = 'https://p402.io/ai-cost-management-reddit';
const PAGE_TITLE = 'AI Cost Management on Reddit | P402';
const PAGE_LAST_MODIFIED = '2026-06-30';

const COMMON_QUESTIONS: ReadonlyArray<string> = [
    'Why did our OpenAI bill jump this month?',
    'Which workflow caused the spend?',
    'Which customer or feature is expensive?',
    'Are retries and long context windows wasting budget?',
    'Which models are driving COGS?',
    'How do we separate product usage from employee experimentation?',
    'How do we show finance an audit-ready view?',
    'How do we control AI spend without storing prompts?',
];

const PRODUCT_PILLARS: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'Meter AI usage',     line: 'Every metered AI event is recorded as a ledger row with cost, tokens, owner, model, outcome, and evidence status. One row per AI action.' },
    { name: 'Monitor spend',      line: 'Workflow, model, customer, feature, and department views read off the same ledger. No spreadsheet reconciliation against the provider invoice.' },
    { name: 'Control budgets',    line: 'Per-customer, per-feature, per-workflow caps. Cap reached returns a structured 402 response. Sessions can carry an AP2 spending mandate.' },
    { name: 'Prove with receipts',line: 'Outcomes attached to economic events. Procurement and finance read the same evidence the dashboards do.' },
    { name: 'Optimize on evidence', line: 'Readiness checks for model substitution, cache, retries, and context. Recommendations are gated until the baseline and outcome data back the claim.' },
];

const DEV_POINTS: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'OpenAI-compatible metering', line: 'Point your existing OpenAI-compatible SDK base URL at the P402 endpoint and keep your code as-is. Cost, tokens, and routing all land in the ledger.' },
    { name: 'workflow_id',                line: 'Tag each request with a workflow id. Multi-step agent flows are attributed end to end, not just the leaf call.' },
    { name: 'customer_id',                line: 'Attribute spend to the customer the call served. Per-customer rollups inherit automatically.' },
    { name: 'feature_id',                 line: 'Attribute spend to the product feature that triggered the call. Margin reports filter on it.' },
    { name: 'Metadata-only mode',         line: 'Default privacy mode records owner, cost, tokens, budget, policy, outcome, and evidence status. Prompts and responses are not retained.' },
    { name: 'First metered event',        line: 'Sign in, create a key, send one request. The first metered event lands in the dashboard with cost, tokens, owner, model, and outcome.' },
    { name: 'Dashboard visibility',       line: 'Plan, usage, monitor, optimize readiness, and prove surfaces share the same ledger. The numbers reconcile because they share a source.' },
];

const FINANCE_POINTS: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'AI spend by owner',     line: 'Per-customer, per-feature, per-workflow, per-department spend rollups. Finance reads the same rows the dashboards do.' },
    { name: 'AI spend by workflow',  line: 'Workflow-level cost analysis with model mix, token mix, and outcome coverage. Margin equals revenue minus AI cost on accepted outcomes.' },
    { name: 'Department visibility', line: 'Department id on the event row. Chargeback or cost-center reporting is a query, not a quarter-end reconciliation.' },
    { name: 'Outcome coverage',      line: 'Share of events with outcome accepted, rejected, revised, escalated, or failed recorded. Cost claims without an outcome do not ship.' },
    { name: 'Policy and budget evidence', line: 'Budget caps, denial events, and AP2 mandates are recorded with the event they constrain. Audit reads the same trail.' },
    { name: 'AI Spend Audit path',   line: 'One-time enterprise diagnostic: vendor invoice review, usage import, workflow scan, executive report. Fixed fee, credited toward a paid pilot if signed within thirty days.' },
];

const COMPARISON: ReadonlyArray<{ category: string; what: string; why: string }> = [
    { category: 'Provider invoice',   what: 'Shows total spend per provider per month.',          why: 'No owner, no workflow, no outcome. The bill arrives after the budget is gone.' },
    { category: 'LLM observability',  what: 'Shows traces, prompts, retries, latency.',           why: 'Tracing is for debugging, not for finance. Owner, workflow, and outcome fields are not first-class.' },
    { category: 'Gateway logs',       what: 'Routes requests and records request metadata.',     why: 'Logs are for ops. They do not reconcile into a margin number or a procurement-ready report.' },
    { category: 'P402 accountability', what: 'Connects spend to owner, workflow, customer, policy, outcome, and proof.', why: 'One ledger. Dashboards, budget guards, margin reports, and audit exports all read the same rows.' },
];

const FAQ_ENTRIES: ReadonlyArray<{ q: string; a: string }> = [
    {
        q: 'What is AI cost management?',
        a: 'AI cost management is the practice of recording, attributing, and governing the cost of AI calls so the business can answer who caused the spend, which workflow produced it, and which outcome it served. It is broader than monitoring and broader than gateway routing. The standard fields are owner, workflow, model, tokens, cost, outcome, and evidence.',
    },
    {
        q: 'How is AI cost control different from AI observability?',
        a: 'Observability records traces for debugging. Cost control records economic events for accountability. Both can exist on the same call, but the field shape differs. P402 records the economic event with stable owner and outcome fields the rest of the business needs.',
    },
    {
        q: 'Why are teams discussing AI costs in public threads and on Reddit?',
        a: 'AI spend has moved from an experimentation line item into a production budget. Finance asks for product margin, procurement asks for an evidence trail, and engineering teams notice that provider invoices do not answer either question. The discussion thread is the same in every team: where is AI spend going and who caused it.',
    },
    {
        q: 'Does P402 store prompts or responses?',
        a: 'No. Default mode is metadata only. Owner, cost, tokens, budget, policy, outcome, and evidence status are recorded. Prompts and responses are not retained unless tenant policy opts in for a specific workflow.',
    },
    {
        q: 'Can P402 track OpenAI and OpenRouter usage?',
        a: 'Yes. P402 routes across more than 300 models from major providers including OpenAI, Anthropic, Google, Mistral, Meta, Cohere, and OpenRouter. The OpenAI-compatible chat completions endpoint accepts existing SDKs after a base URL change. Meter-only events can also be posted from your backend without changing the inference path.',
    },
    {
        q: 'Can P402 show cost by customer or feature?',
        a: 'Yes. Set customer_id and feature_id on the request. P402 records the fields with the metered event and every downstream surface inherits the attribution. The Growth plan adds customer-level cost attribution and feature-level margin reporting on top of the same ledger.',
    },
    {
        q: 'Is settlement required to use P402?',
        a: 'No. Settlement is optional. P402 can be used as a metering and accountability layer alone. Teams that want gasless stablecoin micropayments for AI usage can opt into x402 settlement on Base or Tempo, but it is not a prerequisite for metering, monitoring, control, or proof.',
    },
    {
        q: 'Does P402 guarantee savings?',
        a: 'No. P402 helps teams identify spend patterns, attribution gaps, retry waste, and optimization opportunities against a measured baseline. A savings number that does not have a measured baseline and outcome behind it does not survive finance review, and P402 will not ship a claim that does not have the data behind it.',
    },
    {
        q: 'How does P402 handle budgets and runaway agents?',
        a: 'Budget guards stop work that would exceed a per-customer, per-feature, or per-workflow cap. The guard is fail-closed: when the cap is reached, the next call returns a 402 with a structured payment-required response. Sessions can carry an AP2 spending mandate that defines who is allowed to spend how much for what.',
    },
    {
        q: 'What is the fastest path from zero to first metered event?',
        a: 'Sign in, create a key, paste the base URL into your existing OpenAI-compatible SDK, send one request. The event lands in the ledger with cost, owner, model, tokens, and outcome status if your call recorded one. From there the dashboard, the margin report, and the audit exports all read off the same row.',
    },
];

const JSONLD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'WebPage',
            '@id': `${PAGE_URL}#webpage`,
            url: PAGE_URL,
            name: PAGE_TITLE,
            isPartOf: { '@id': 'https://p402.io#website' },
            datePublished: PAGE_LAST_MODIFIED,
            dateModified: PAGE_LAST_MODIFIED,
            inLanguage: 'en',
            description:
                'First-party analysis of the AI cost management questions teams are asking. P402 turns AI usage into accountable spend by workflow, customer, model, policy, and outcome.',
        },
        {
            '@type': 'Article',
            '@id': `${PAGE_URL}#article`,
            headline: 'AI Cost Management on Reddit: What Teams Are Asking About AI Spend',
            datePublished: PAGE_LAST_MODIFIED,
            dateModified: PAGE_LAST_MODIFIED,
            mainEntityOfPage: { '@id': `${PAGE_URL}#webpage` },
            author: { '@type': 'Organization', name: 'P402', url: 'https://p402.io' },
            publisher: {
                '@type': 'Organization',
                name: 'P402',
                url: 'https://p402.io',
                logo: { '@type': 'ImageObject', url: 'https://p402.io/opengraph-image' },
            },
            articleSection: 'AI Cost Management',
            keywords:
                'AI cost management, AI cost control, AI cost optimization, AI spend tracking, AI token cost tracking, LLM cost management, OpenAI cost tracking, AI usage tracking, AI COGS, AI feature margin, P402',
        },
        {
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://p402.io/' },
                { '@type': 'ListItem', position: 2, name: 'Pricing', item: 'https://p402.io/pricing' },
                { '@type': 'ListItem', position: 3, name: 'AI Cost Management on Reddit', item: PAGE_URL },
            ],
        },
        {
            '@type': 'Organization',
            '@id': 'https://p402.io#organization',
            name: 'P402',
            url: 'https://p402.io',
            description:
                'P402 is the AI payment and accountability layer: metered AI event ledger, multi-provider routing, per-customer cost attribution, per-feature margin reporting, budget guards, and procurement-ready evidence.',
            sameAs: ['https://p402.io'],
        },
        {
            '@type': 'SoftwareApplication',
            name: 'P402 AI Cost Management',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://p402.io',
            description:
                'P402 records every metered AI event with cost, tokens, owner, outcome, and evidence status. Dashboards, budget guards, margin reports, and audit exports all read off the same ledger.',
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

export default function AiCostManagementRedditPage() {
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
                <CommonQuestions />
                <P402Answer />
                <ForDevelopers />
                <ForFinance />
                <Privacy />
                <Comparison />
                <Faq />
                <FinalCta />
                <Footer />
            </main>
        </>
    );
}

function TopBar() {
    return (
        <div className="border-b-2 border-neutral-700 px-6 py-3 flex items-center justify-between">
            <MeterBrand />
            <nav aria-label="Primary" className="flex items-center gap-4">
                <Link href="/pricing" className="text-[10px] font-mono text-neutral-400 hover:text-primary uppercase tracking-wider transition-colors">Pricing</Link>
                <Link href="/developers" className="text-[10px] font-mono text-neutral-400 hover:text-primary uppercase tracking-wider transition-colors">Developers</Link>
                <Link href="/trust" className="text-[10px] font-mono text-neutral-400 hover:text-primary uppercase tracking-wider transition-colors">Trust</Link>
                <Link href="/dashboard" className="text-[10px] font-mono text-neutral-400 hover:text-primary uppercase tracking-wider transition-colors">Dashboard</Link>
            </nav>
        </div>
    );
}

function Hero() {
    return (
        <section className="flex flex-col gap-6 max-w-3xl">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                {'>'} _ AI COST MANAGEMENT ON REDDIT
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
                AI Cost Management on <span className="text-primary">Reddit</span>:
                <br />
                What Teams Are Asking About AI Spend
            </h1>
            <p className="text-base font-mono text-neutral-300 leading-relaxed">
                Developers, founders, finance teams, and AI product owners are asking the same question:
                where is AI spend going, who caused it, and which workflows need better controls? This page
                is a first-party analysis of those questions and how P402 turns AI usage into accountable
                spend by workflow, customer, model, policy, and outcome.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/get-access?intent=build" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
                    Start free
                </Link>
                <Link href="/developers" className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors">
                    Read the developer guide
                </Link>
            </div>
        </section>
    );
}

function Problem() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>The problem</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                AI cost questions are getting harder as production usage grows.
            </h2>
            <ul className="flex flex-col gap-3 text-sm font-mono text-neutral-300 leading-relaxed">
                <li className="border-l-2 border-primary pl-3">AI token spend is moving from experiments into production budgets, and the line item is now visible to finance.</li>
                <li className="border-l-2 border-primary pl-3">Provider invoices show how much was spent. They do not show product margin, workflow ownership, or outcome.</li>
                <li className="border-l-2 border-primary pl-3">Teams lack workflow, customer, department, and feature attribution on the AI events that produced the spend.</li>
                <li className="border-l-2 border-primary pl-3">Finance sees the spend total. They do not see owner or outcome at the row level.</li>
                <li className="border-l-2 border-primary pl-3">Developers see usage in provider dashboards. They do not see business impact, customer attribution, or margin.</li>
            </ul>
        </section>
    );
}

function CommonQuestions() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>Common questions teams are asking</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                The recurring questions in AI cost discussions.
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {COMMON_QUESTIONS.map((q) => (
                    <li key={q} className="border-2 border-neutral-700 p-4">
                        <p className="text-[11px] font-mono text-neutral-300 leading-relaxed">{q}</p>
                    </li>
                ))}
            </ul>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed max-w-3xl">
                These questions share a root cause: AI events were emitted without the owner fields the business
                needs. P402 fixes the row first. The dashboards, alerts, budgets, and reports follow from clean rows.
            </p>
        </section>
    );
}

function P402Answer() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>The P402 answer</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                One ledger. Five things finance and engineering can do with it.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {PRODUCT_PILLARS.map((p) => (
                    <div key={p.name} className="border-2 border-neutral-700 p-4 flex flex-col gap-1">
                        <div className="text-primary text-[10px] font-mono font-bold uppercase tracking-wider">{p.name}</div>
                        <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">{p.line}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function ForDevelopers() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>For developers</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                AI cost control without rewriting your inference path.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DEV_POINTS.map((d) => (
                    <div key={d.name} className="border-2 border-neutral-700 p-4 flex flex-col gap-1">
                        <code className="text-primary text-[11px] font-mono font-bold">{d.name}</code>
                        <span className="text-[11px] font-mono text-neutral-300 leading-relaxed">{d.line}</span>
                    </div>
                ))}
            </div>
            <div>
                <Link href="/developers/quickstart" className="inline-block border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
                    Read quickstart
                </Link>
            </div>
        </section>
    );
}

function ForFinance() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>For finance and governance</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                AI spend tracking that survives a quarterly review.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {FINANCE_POINTS.map((f) => (
                    <div key={f.name} className="border-2 border-neutral-700 p-4 flex flex-col gap-1">
                        <div className="text-primary text-[10px] font-mono font-bold uppercase tracking-wider">{f.name}</div>
                        <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">{f.line}</div>
                    </div>
                ))}
            </div>
            <div>
                <Link href="/ai-spend-audit" className="inline-block border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
                    Request AI Spend Audit
                </Link>
            </div>
        </section>
    );
}

function Privacy() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>Privacy posture</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                P402 meters economics, not content.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Prompts and responses are not required for metadata-only metering. Teams can keep private content
                inside their own environment while still tracking cost, model, workflow, policy, and outcome.
                Workflows that need stronger boundaries can run under private-gateway mode, where the inference
                stays in your environment and P402 records the economic event over a signed channel.
            </p>
            <Link href="/trust" className="self-start border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors">
                Read the trust posture
            </Link>
        </section>
    );
}

function Comparison() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>Category comparison</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Four AI cost management categories. One of them connects spend to outcome.
            </h2>
            <div className="border-2 border-neutral-700">
                <table className="w-full text-[11px] font-mono">
                    <thead>
                        <tr className="border-b-2 border-neutral-700 text-[10px] uppercase tracking-widest text-neutral-400">
                            <th className="text-left p-3">Category</th>
                            <th className="text-left p-3">What it shows</th>
                            <th className="text-left p-3">Where it stops</th>
                        </tr>
                    </thead>
                    <tbody>
                        {COMPARISON.map((c) => (
                            <tr key={c.category} className="border-b border-neutral-700 last:border-0">
                                <td className="p-3 text-neutral-100 font-bold align-top">{c.category}</td>
                                <td className="p-3 text-neutral-300 align-top">{c.what}</td>
                                <td className="p-3 text-neutral-300 align-top">{c.why}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function Faq() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                AI cost management questions, answered.
            </h2>
            <div className="flex flex-col gap-3">
                {FAQ_ENTRIES.map((e) => (
                    <details key={e.q} className="border-2 border-neutral-700 p-4 group">
                        <summary className="text-sm font-bold uppercase tracking-tight text-neutral-50 cursor-pointer list-none flex items-center justify-between gap-4">
                            <span>{e.q}</span>
                            <span aria-hidden="true" className="text-primary text-xs font-mono shrink-0 group-open:hidden">{'+'}</span>
                            <span aria-hidden="true" className="text-primary text-xs font-mono shrink-0 hidden group-open:inline">{'-'}</span>
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
                Make AI spend accountable before it becomes a budget problem.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Start free in Sandbox, or book the AI Spend Audit and let our team produce the executive report
                on a real invoice and a real workflow.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/get-access?intent=build" className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors">
                    Start free
                </Link>
                <Link href="/get-access?intent=ai-spend-audit" className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors">
                    Request AI Spend Audit
                </Link>
                <Link href="/pricing" className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors">
                    See pricing
                </Link>
            </div>
        </section>
    );
}

function Footer() {
    return (
        <footer className="border-t-2 border-neutral-700 pt-6 flex flex-col gap-2 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            <p>Last updated {PAGE_LAST_MODIFIED}. First-party analysis. Not affiliated with Reddit.</p>
            <p>
                Related: <Link href="/ai-cost-optimization" className="hover:text-primary">AI cost optimization readiness</Link>{' '}
                · <Link href="/ai-spend-audit" className="hover:text-primary">AI Spend Audit</Link>{' '}
                · <Link href="/enterprise-ai-budget-dashboard" className="hover:text-primary">Enterprise AI budget dashboard</Link>{' '}
                · <Link href="/ai-token-usage-dashboard" className="hover:text-primary">AI token usage dashboard</Link>{' '}
                · <Link href="/embedded-ai-margin-control" className="hover:text-primary">Embedded AI margin control</Link>{' '}
                · <Link href="/ai-cogs-dashboard" className="hover:text-primary">AI COGS dashboard</Link>
            </p>
        </footer>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            {children}
        </div>
    );
}
