import type { Metadata } from 'next';
import Link from 'next/link';
import { MeterBrand } from '../meter/_components/MeterBrand';

/* eslint-disable react/no-unescaped-entities */

/**
 * 3S-7: partners buyer-surface hub. Forked from the canonical /meter
 * template and the /trust hub. Preserves the three-track structure
 * (developer affiliate, agency, enterprise referral) from the prior
 * partner page, reframed under V5 AI spend accountability positioning.
 */

export const metadata: Metadata = {
    title: 'P402 Partner Program | AI Spend Accountability',
    description:
        'Refer, implement, and advise teams adopting AI spend accountability with the P402 partner program.',
    alternates: { canonical: 'https://p402.io/partners' },
    openGraph: {
        title: 'P402 Partner Program | AI Spend Accountability',
        description:
            'Refer, implement, and advise teams adopting AI spend accountability with the P402 partner program.',
        url: 'https://p402.io/partners',
    },
};

const FAQ_ENTRIES: ReadonlyArray<{ q: string; a: string }> = [
    {
        q: 'Who is the program for?',
        a: 'Developers writing AI content or SDK integrations; agencies implementing P402 for clients; enterprise contacts referring budget owners.',
    },
    {
        q: 'How are commissions reconciled?',
        a: 'Monthly reconciliation tied to client P402 usage, with payout via the selected channel.',
    },
    {
        q: 'Do partners see client prompts?',
        a: 'No. P402 records metadata-only economic events. Partner attribution stays at the tenant boundary.',
    },
    {
        q: 'Is there a sub-affiliate program?',
        a: 'Partners can refer other partners. The referring partner sees override credit per the partner agreement.',
    },
    {
        q: 'Do I need to be technical?',
        a: 'No for referrers. Yes for implementers. The three tracks reflect that split.',
    },
    {
        q: 'What does the application require?',
        a: 'Identification, the referral channel you plan to use, and any client context. The form is on the apply page.',
    },
];

const JSONLD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'SoftwareApplication',
            name: 'P402 Partner Program',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://p402.io/partners',
            description:
                'Partner program for developers, agencies, and enterprise referrers introducing P402 AI spend accountability to teams.',
        },
        {
            '@type': 'Product',
            name: 'P402 Partner Program',
            brand: { '@type': 'Brand', name: 'P402' },
            description:
                'Three-track partner program: developer affiliate, agency integration, and enterprise referral.',
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

export default function PartnersPage() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
            />

            <TopBar />

            <main className="max-w-5xl mx-auto px-6 py-16 flex flex-col gap-20">
                <Hero />
                <WhyNow />
                <Tracks />
                <ClientOutcomes />
                <HowItWorks />
                <Privacy />
                <Related />
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
                {'>'} _ P402 PARTNERS
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
                Help clients deploy AI spend <span className="text-primary">accountability.</span>
            </h1>
            <p className="text-base font-mono text-neutral-300 leading-relaxed">
                The P402 partner program is for developers, agencies, and enterprise
                referrers introducing AI spend accountability infrastructure to teams
                that need attribution, evidence, and margin control.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/partners/apply"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    Apply as partner
                </Link>
                <Link
                    href="/docs"
                    className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
                >
                    Read docs
                </Link>
            </div>

            <p className="text-[11px] font-mono text-neutral-500 leading-relaxed pt-2">
                Partners are part of the funnel, not a side page.
            </p>
        </section>
    );
}

const WHY_NOW: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'Buyer demand', line: 'Finance, procurement, and engineering all want AI spend ownership.' },
    { name: 'Adoption path', line: 'Meter, Monitor, Control, Optimize, Receipts, Prove. Six entry points.' },
    { name: 'Privacy floor', line: 'Metadata-only by default. Audit-safe for regulated clients.' },
];

function WhyNow() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>Why now</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                AI spend is moving from invisible to attributed.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed max-w-3xl">
                Enterprise teams are looking for AI cost attribution, budget control,
                policy result tracking, and evidence per call. P402 ships that
                infrastructure. Partners help clients adopt it.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {WHY_NOW.map((w) => (
                    <div
                        key={w.name}
                        className="border-2 border-neutral-700 p-4 flex flex-col gap-1"
                    >
                        <div className="text-primary text-[10px] font-mono font-bold uppercase tracking-wider">
                            {w.name}
                        </div>
                        <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                            {w.line}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

const TRACKS: ReadonlyArray<{
    id: string;
    badge: string;
    name: string;
    audience: string;
    outcome: string;
    commissions: ReadonlyArray<string>;
    requirements: ReadonlyArray<string>;
}> = [
    {
        id: 'affiliate',
        badge: 'Track A',
        name: 'Developer Affiliate',
        audience: 'AI builders, educators, SDK tutorial writers, technical content creators.',
        outcome: 'Help developer audiences ship cost ownership on every AI feature they build.',
        commissions: [
            '20% recurring for 12 months on referred Pro subscriptions',
            'Share of P402 net platform fee from referred usage',
            'Bonus bounty for referred publisher activations',
        ],
        requirements: [
            'A technical audience or channel (newsletter, blog, video, SDK docs)',
            'Disclosure of the partner relationship in referral content',
            'Use of the approved attribution link and partner kit',
        ],
    },
    {
        id: 'agency',
        badge: 'Track B',
        name: 'Integration Partner',
        audience: 'Agencies, consultant networks, AI automation firms, implementation shops.',
        outcome: 'Deploy P402 for client teams that need attribution, budget control, and evidence.',
        commissions: [
            '25% recurring on referred Pro subscriptions',
            'Fixed bounty per launched client workspace',
            'Optional implementation rebate for onboarding assets',
        ],
        requirements: [
            'Capability to deploy P402 for client teams end-to-end',
            'Named accounts registered through the partner portal',
            'Implementation case write-up after each launch',
        ],
    },
    {
        id: 'enterprise',
        badge: 'Track C',
        name: 'Enterprise Referral Partner',
        audience: 'Ecosystem connectors, investors, advisors, enterprise consultants.',
        outcome: 'Introduce enterprise budget owners to AI spend accountability and evidence reporting.',
        commissions: [
            '5 to 10% of year-one net software revenue',
            'Fixed bounty for accepted and closed-won deals',
            'Deal registration required, no cookie-only attribution',
        ],
        requirements: [
            'Direct contact with an enterprise budget owner or sponsor',
            'Deal registration submitted before introduction',
            'Compliance with the enterprise partner agreement',
        ],
    },
];

function Tracks() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>Partner tracks</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Three tracks, one outcome.
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {TRACKS.map((t) => (
                    <div
                        key={t.id}
                        className="border-2 border-neutral-700 p-5 flex flex-col gap-3"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono font-bold text-neutral-900 bg-primary px-2 py-0.5 uppercase tracking-widest">
                                {t.badge}
                            </span>
                        </div>
                        <div className="text-sm font-bold uppercase tracking-tight text-neutral-50">
                            {t.name}
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500">
                                For
                            </div>
                            <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                                {t.audience}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
                                Outcome
                            </div>
                            <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                                {t.outcome}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
                                Commissions
                            </div>
                            <ul className="flex flex-col gap-1">
                                {t.commissions.map((c) => (
                                    <li
                                        key={c}
                                        className="text-[11px] font-mono text-neutral-300 leading-relaxed"
                                    >
                                        {c}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500">
                                Requirements
                            </div>
                            <ul className="flex flex-col gap-1">
                                {t.requirements.map((r) => (
                                    <li
                                        key={r}
                                        className="text-[11px] font-mono text-neutral-400 leading-relaxed"
                                    >
                                        {r}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

const CLIENT_OUTCOMES: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'AI cost attribution', line: 'Per workflow, customer, department, employee, model, vendor.' },
    { name: 'Budget control', line: 'Plan and simulate budgets and policy boundaries.' },
    { name: 'Margin control', line: 'Track AI feature margin and cost per accepted output.' },
    { name: 'Outcome reporting', line: 'Accepted, revised, escalated, failed: tied to cost.' },
    { name: 'Evidence bundles', line: 'Exportable proof for finance, audit, and compliance.' },
    { name: 'Optional settlement', line: 'x402 receipts for payable AI work, only when needed.' },
];

function ClientOutcomes() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>Client outcomes</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Help clients ship attribution, control, and evidence.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {CLIENT_OUTCOMES.map((o) => (
                    <div
                        key={o.name}
                        className="border-2 border-neutral-700 p-4 flex flex-col gap-1"
                    >
                        <div className="text-primary text-[10px] font-mono font-bold uppercase tracking-wider">
                            {o.name}
                        </div>
                        <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                            {o.line}
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
        title: 'Apply.',
        body: 'Submit the partner application form.',
    },
    {
        n: '02',
        title: 'Get onboarded.',
        body: 'Receive partner portal access, attribution links, and resources.',
    },
    {
        n: '03',
        title: 'Refer or implement.',
        body: 'Use your tracked link, or deploy P402 for clients directly.',
    },
    {
        n: '04',
        title: 'Earn payouts.',
        body: 'Commissions reconcile monthly. Payouts via the selected channel.',
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

function Privacy() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>Privacy boundary</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Partner attribution at the tenant boundary.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Partners do not access client prompt content. P402 records
                metadata-only economic events by default. Partner attribution lives at
                the tenant boundary, not inside client AI workflows.
            </p>
            <div>
                <Link
                    href="/trust"
                    className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
                >
                    Read the trust posture
                </Link>
            </div>
        </section>
    );
}

const RELATED: ReadonlyArray<{ name: string; href: string; line: string }> = [
    {
        name: 'AI Spend Audit',
        href: '/ai-spend-audit',
        line: 'One-time engagement that produces an AI Spend Accountability Report.',
    },
    {
        name: 'Developers',
        href: '/developers',
        line: 'OpenAI-compatible meter for AI usage, margin, and outcomes.',
    },
    {
        name: 'Enterprise',
        href: '/enterprise',
        line: 'Department, employee, workflow, and vendor spend in one ledger.',
    },
    {
        name: 'Apply',
        href: '/partners/apply',
        line: 'Submit the partner application.',
    },
];

function Related() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>Related</SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {RELATED.map((r) => (
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
            <SectionLabel>Apply</SectionLabel>
            <h2 className="text-3xl lg:text-4xl font-bold uppercase tracking-tight">
                Bring AI spend accountability to your clients.
            </h2>
            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/partners/apply"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    Apply as partner
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
