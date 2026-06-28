import type { Metadata } from 'next';
import Link from 'next/link';
import { MeterBrand } from '../meter/_components/MeterBrand';

/* eslint-disable react/no-unescaped-entities */

export const metadata: Metadata = {
    title: 'x402 Receipts for Payable AI Work | P402',
    description:
        'Issue receipts and settlement records for payable AI work using x402 schemes on Base.',
    alternates: { canonical: 'https://p402.io/receipts' },
    openGraph: {
        title: 'x402 Receipts for Payable AI Work | P402',
        description:
            'Issue receipts and settlement records for payable AI work using x402 schemes on Base.',
        url: 'https://p402.io/receipts',
    },
};

const FAQ_ENTRIES: ReadonlyArray<{ q: string; a: string }> = [
    {
        q: 'What schemes are supported?',
        a: 'Three x402 schemes: exact uses EIP-3009 TransferWithAuthorization so the facilitator pays gas, onchain has the client submit and the facilitator verify, and receipt reuses a prior settlement record for the same event class.',
    },
    {
        q: 'Do receipts require Base?',
        a: 'Receipts target x402 schemes on Base. Base is the on-chain network for the settlement record. Meter records the underlying economic event regardless of payment.',
    },
    {
        q: 'Can receipts be reused?',
        a: 'Yes. The receipt scheme reuses a prior settlement record for the same event class within the policy window. The transaction hash and authorization stay attached to the original settlement.',
    },
    {
        q: 'Does this require holding USDC on chain?',
        a: 'Receipts records the settlement that happened. The buyer needs USDC on Base to authorize the transfer under the exact or onchain scheme. Receipt scheme reuses prior settlement and does not require new funds.',
    },
    {
        q: 'How does this differ from a Stripe invoice?',
        a: 'A Stripe invoice batches usage and arrives later. A receipt is a per-event settlement record at the moment of payment, with x402 scheme details, transaction hash, and authorization attached to the metered event.',
    },
    {
        q: 'What is the first step?',
        a: 'Create a P402 key, route an event through P402 with a payable price, and the buyer authorizes payment under an x402 scheme. The settlement record attaches to the event in the ledger.',
    },
];

const JSONLD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'SoftwareApplication',
            name: 'P402 Receipts',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://p402.io/receipts',
            description:
                'P402 Receipts attaches a settlement record to every payable AI economic event using x402 schemes on Base.',
        },
        {
            '@type': 'Product',
            name: 'P402 Receipts',
            brand: { '@type': 'Brand', name: 'P402' },
            description:
                'Receipts and settlement records for payable AI work. x402 schemes on Base. Per-event proof for finance, audit, and the customer.',
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

export default function ReceiptsPage() {
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
                {'>'} _ P402 RECEIPTS
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
                Issue receipts for every<br />
                payable <span className="text-primary">AI work item.</span>
            </h1>
            <p className="text-base font-mono text-neutral-300 leading-relaxed">
                P402 Receipts attaches a settlement record to every payable AI
                economic event using x402 schemes on Base, so finance, audit, and the
                customer all see the same proof.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/dashboard/receipts?demo=1"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    See receipts
                </Link>
                <Link
                    href="/docs"
                    className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
                >
                    Read docs
                </Link>
            </div>

            <p className="text-[11px] font-mono text-neutral-500 leading-relaxed pt-2">
                Receipts work on top of Meter. Metered events without payment do not
                generate a settlement record.
            </p>
        </section>
    );
}

function Problem() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>The problem</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Payable AI work needs proof, not invoices.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                When AI work is payable, both sides need an artifact that finance and
                audit can verify. Provider invoices arrive late and merge events.
                Receipts emits a per-event settlement record at the moment of payment,
                with x402 scheme details on Base.
            </p>
        </section>
    );
}

const RECORDS: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'Receipt id',      line: 'Stable identifier for the settlement record attached to the event.' },
    { name: 'Event id',        line: 'The metered economic event the receipt settles.' },
    { name: 'Scheme',          line: 'x402 scheme used: exact, onchain, or receipt.' },
    { name: 'Network',         line: 'Settlement network for the record. Base for the on-chain schemes.' },
    { name: 'Asset',           line: 'Asset address used for settlement under the scheme.' },
    { name: 'Amount',          line: 'Amount settled, matched against maxAmountRequired for the event.' },
    { name: 'Authorization',   line: 'EIP-3009 TransferWithAuthorization signature for exact, or the equivalent under the scheme.' },
    { name: 'Transaction hash', line: 'On-chain transaction hash that settled the event under exact or onchain.' },
    { name: 'Status',          line: 'Verified, settled, replay-protected, or failed under x402 verification.' },
];

function Records() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>What Receipts emits</SectionLabel>
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
        title: 'Meter records the AI economic event.',
        body: 'Owner, workflow, model, tokens, cost, budget, policy result, and outcome are recorded for the call.',
    },
    {
        n: '02',
        title: 'The payable event triggers an x402 challenge.',
        body: 'The endpoint returns the x402 payment requirement with scheme, network, asset, and maxAmountRequired.',
    },
    {
        n: '03',
        title: 'The buyer authorizes payment using exact (EIP-3009), onchain, or receipt scheme.',
        body: 'exact carries a TransferWithAuthorization signature, onchain carries a client-submitted transaction, receipt reuses a prior settlement record.',
    },
    {
        n: '04',
        title: 'Receipts attaches the settlement record to the event and exposes it to finance, audit, and the customer.',
        body: 'The record lands in the ledger alongside the metered event, with scheme, network, asset, amount, authorization, transaction hash, and status.',
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
                Settle economics, not content.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Receipts attaches settlement records to metadata-only events. Prompt
                content stays out of the receipt. The settlement record carries
                scheme, network, asset, amount, authorization, transaction hash, and
                status, not prompt or response content.
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
                Wire payable AI work into your existing AI stack.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Mark an endpoint payable, set the x402 scheme and amount, and the
                buyer authorizes payment. Receipts attaches the settlement record to
                the metered event. Your code keeps calling the same endpoint Meter
                already records.
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
                Give finance per-event proof of payable AI work.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Finance, audit, and the customer all see the same settlement record
                attached to the same metered event. Scheme, network, asset, amount,
                authorization, transaction hash, and status are exported alongside the
                event metadata, without exposing prompts.
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
                Give every payable event a receipt.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Mark an endpoint payable, pick the x402 scheme, and the settlement
                record attaches to the metered event. Finance, audit, and the
                customer share the same proof.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/dashboard/receipts?demo=1"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    See receipts
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
