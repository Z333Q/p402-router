import type { Metadata } from 'next';
import Link from 'next/link';
import { MeterBrand } from '../meter/_components/MeterBrand';

/* eslint-disable react/no-unescaped-entities */

/**
 * 3S-5: trust audience hub. Forked from the canonical /meter
 * template and /developers hub. Preserves the technical content
 * from the prior Trust Center: five privacy modes, on-chain
 * contract addresses on Base, custody roles, and security checks.
 */

export const metadata: Metadata = {
    title: 'Trust | P402',
    description:
        'P402 records AI spend, attribution, outcomes, and evidence without requiring prompt or response storage.',
    alternates: { canonical: 'https://p402.io/trust' },
    openGraph: {
        title: 'Trust | P402',
        description:
            'P402 records AI spend, attribution, outcomes, and evidence without requiring prompt or response storage.',
        url: 'https://p402.io/trust',
    },
};

const FAQ_ENTRIES: ReadonlyArray<{ q: string; a: string }> = [
    {
        q: 'Do you store prompts?',
        a: 'No prompt storage is required. Metadata-only mode is the default.',
    },
    {
        q: 'Do you store responses?',
        a: 'No response storage is required. Metadata-only mode is the default.',
    },
    {
        q: 'Can we use metadata-only mode?',
        a: 'Yes. It is the default. The economic event lands in the ledger without prompt or response content.',
    },
    {
        q: 'Can we complete a security review?',
        a: 'Yes. Request a security review through the access route. DPA path is available on request.',
    },
    {
        q: 'Is settlement required?',
        a: 'No. Meter works without settlement. Receipts are added when AI work is payable.',
    },
    {
        q: 'Is P402 SOC 2 certified?',
        a: 'SOC 2 is a roadmap item until an audit report exists. P402 does not claim certification before audit.',
    },
    {
        q: 'Does P402 support HIPAA workloads?',
        a: 'BAA path is available after security and contracting review. Healthcare buyers should request the path before production use.',
    },
    {
        q: 'Can we use P402 in healthcare or finance?',
        a: 'Yes. Use metadata-only or private-gateway mode. Request the regulated-buyer review path.',
    },
    {
        q: 'Can we export audit evidence?',
        a: 'Yes. Evidence bundles, finance reports, and per-event proof are exportable. See /prove for the surface.',
    },
];

const JSONLD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'SoftwareApplication',
            name: 'P402 Trust',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://p402.io/trust',
            description:
                'P402 records AI spend, attribution, outcomes, and evidence without requiring prompt or response storage.',
        },
        {
            '@type': 'Product',
            name: 'P402 Trust',
            brand: { '@type': 'Brand', name: 'P402' },
            description:
                'Privacy posture, on-chain settlement contracts, custody model, and procurement paths for P402.',
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

export default function TrustPage() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
            />

            <TopBar />

            <main className="max-w-5xl mx-auto px-6 py-16 flex flex-col gap-20">
                <Hero />
                <DataBoundary />
                <Records />
                <PrivacyModes />
                <SecurityPosture />
                <Procurement />
                <Evidence />
                <BillingBoundary />
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
                {'>'} _ P402 TRUST
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
                Trust for AI spend<br />
                <span className="text-primary">accountability.</span>
            </h1>
            <p className="text-base font-mono text-neutral-300 leading-relaxed">
                P402 records the economic facts of AI work, not the private content
                behind it.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/docs"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    Read docs
                </Link>
                <Link
                    href="/get-access?intent=security-review"
                    className="border-2 border-neutral-700 text-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:border-primary hover:text-primary transition-colors"
                >
                    Request security review
                </Link>
            </div>

            <p className="text-[11px] font-mono text-neutral-500 leading-relaxed pt-2">
                Metadata-only by default. No prompt storage required.
            </p>
        </section>
    );
}

const NOT_REQUIRED: ReadonlyArray<string> = [
    'Prompts',
    'Responses',
    'Messages',
    'Raw traces',
    'Files',
    'Documents',
    'Source code',
    'Transcripts',
    'Chat history',
];

function DataBoundary() {
    return (
        <section className="flex flex-col gap-6 max-w-3xl">
            <SectionLabel>Data boundary</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Meter economics, not content.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                P402 records the economic facts of each AI call. Prompts, responses,
                files, documents, and source code stay inside the customer
                environment by default.
            </p>
            <div className="border-2 border-neutral-700 p-5 flex flex-col gap-3">
                <div className="text-primary text-[10px] font-mono font-bold uppercase tracking-wider">
                    Not required
                </div>
                <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {NOT_REQUIRED.map((item) => (
                        <li
                            key={item}
                            className="text-[11px] font-mono text-neutral-300 leading-relaxed"
                        >
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

const RECORDED_FIELDS: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'tenant', line: 'Owning tenant for the AI call. Indexed on every event.' },
    { name: 'workflow_id', line: 'The workflow that produced the call. Filterable in the ledger.' },
    { name: 'customer_id', line: 'The end customer associated with the AI work, when applicable.' },
    { name: 'feature_id', line: 'The product feature that initiated the call.' },
    { name: 'model', line: 'The model that served the call.' },
    { name: 'provider', line: 'The upstream provider behind the model.' },
    { name: 'tokens', line: 'Input and output token counts for the call.' },
    { name: 'cost', line: 'Cost in USD, computed at the moment of the call.' },
    { name: 'budget result', line: 'Whether the call passed, capped, or was denied by budget.' },
    { name: 'policy result', line: 'Whether the call passed, was rewritten, or was denied by policy.' },
    { name: 'outcome status', line: 'Accepted, revised, escalated, or failed once reported.' },
    { name: 'receipt or evidence status', line: 'Whether a receipt or evidence bundle was issued for the call.' },
];

function Records() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>What P402 records</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Per-event economic facts.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {RECORDED_FIELDS.map((f) => (
                    <div
                        key={f.name}
                        className="border-2 border-neutral-700 p-4 flex flex-col gap-1"
                    >
                        <code className="text-primary text-[11px] font-mono font-bold uppercase tracking-wider">
                            {f.name}
                        </code>
                        <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                            {f.line}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

const PRIVACY_MODES: ReadonlyArray<{
    id: string;
    name: string;
    default?: boolean;
    bestFor: string;
    receives: ReadonlyArray<string>;
    neverReceives: ReadonlyArray<string>;
    supports: ReadonlyArray<string>;
    limits: ReadonlyArray<string>;
}> = [
    {
        id: 'metadata-only',
        name: 'metadata_only',
        default: true,
        bestFor: 'CFOs, regulated teams, healthcare, finance, legal, privacy-sensitive SaaS',
        receives: ['request_id', 'tenant_id', 'api_key_id', 'department_id', 'employee_id', 'customer_id', 'feature_id', 'workflow_id', 'task_type', 'action_type', 'model', 'provider', 'input_tokens', 'output_tokens', 'cost_usd', 'latency_ms', 'cache_hit', 'budget_id', 'policy_id', 'governance_decision', 'deny_code', 'output_status', 'quality_score', 'evidence_status'],
        neverReceives: ['prompt text', 'response text', 'files', 'documents', 'chat history', 'PHI', 'PII', 'secrets', 'source code'],
        supports: ['Meter', 'Monitor', 'Control', 'budget enforcement', 'department, employee, feature, customer margin', 'forecasting', 'basic optimization', 'evidence exports'],
        limits: ['Semantic cache is off in P402 cloud for metadata_only', 'Limited prompt-level optimization', 'Limited context-bloat analysis', 'Limited duplicate-work detection'],
    },
    {
        id: 'fingerprint-only',
        name: 'fingerprint_only',
        bestFor: 'Teams that want duplicate detection without exposing content',
        receives: ['metadata above, plus:', 'HMAC prompt fingerprint, tenant-secret HMAC, not plain SHA-256', 'HMAC response fingerprint', 'token shape', 'optional prompt length bands', 'optional document hash'],
        neverReceives: ['raw prompt or response content', 'embeddings, treated as sensitive, opt-in only'],
        supports: ['Duplicate request detection', 'Retry loop detection', 'Repeated task detection', 'Cache opportunity estimates', 'Same-input cost analysis'],
        limits: ['Semantic cache is off in P402 cloud for fingerprint_only', 'No prompt-level rewrite suggestions', 'No semantic similarity grouping unless embeddings explicitly enabled'],
    },
    {
        id: 'redacted-trace',
        name: 'redacted_trace',
        bestFor: 'Developers and enterprises wanting stronger optimization with bounded exposure',
        receives: ['redacted prompt sample', 'redacted response sample', 'trace summary', 'tool-call summary', 'retrieval summary', 'policy summary'],
        neverReceives: ['unredacted PII, PHI, secrets, API keys, emails, phone numbers, addresses, or custom-regex-matched content, redacted client-side before send'],
        supports: ['Context waste detection', 'Prompt compression recommendations', 'Retry-loop diagnosis', 'Tool-call waste analysis', 'Quality review', 'Better model selection by action'],
        limits: ['Redaction is the tenant responsibility before send', 'Opt-in per tenant, project, key, or workflow', 'Semantic cache is off unless the tenant explicitly opts in'],
    },
    {
        id: 'private-gateway',
        name: 'private_gateway',
        bestFor: 'Large enterprise, regulated enterprise, high-value customers',
        receives: ['economic events', 'recommendation summaries', 'savings proofs', 'policy results', 'evidence hashes', 'aggregate analytics'],
        neverReceives: ['raw prompts, planned to stay in customer VPC', 'raw responses, planned to stay in customer VPC', 'embeddings unless explicitly exported'],
        supports: ['Customer-controlled routing path', 'Deeper optimization scope', 'Tenant-scoped trace inspection', 'Tenant-scoped redaction', 'Tenant-scoped policy enforcement', 'Enterprise evidence export'],
        limits: ['Enterprise deployment path, availability subject to agreement and deployment scope', 'Operational responsibilities defined per engagement', 'No P402-cloud semantic cache for private_gateway'],
    },
    {
        id: 'full-trace',
        name: 'full_trace',
        bestFor: 'Small developer teams wanting maximum debugging and optimization',
        receives: ['prompt', 'response', 'tool calls', 'trace', 'retrieval context', 'output status', 'quality score'],
        neverReceives: ['data the customer does not send'],
        supports: ['Deepest optimization', 'Full trace replay', 'Per-request quality review'],
        limits: ['Never the default, must be explicitly enabled', 'Short retention required', 'Semantic cache is off unless the tenant explicitly opts in', 'Project-level enablement, planned for enterprise deployment', 'Role-gated access, planned for enterprise deployment', 'Audit log of access, planned for enterprise deployment'],
    },
];

function PrivacyModes() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>Privacy modes</SectionLabel>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed max-w-3xl">
                Five modes. Metadata-only is the default. full_trace is opt-in and
                requires explicit tenant policy.
            </p>
            <div className="flex flex-col gap-3">
                {PRIVACY_MODES.map((m) => (
                    <details
                        key={m.id}
                        className="border-2 border-neutral-700 p-4 group"
                        open={m.default}
                    >
                        <summary className="text-sm font-bold uppercase tracking-tight text-neutral-50 cursor-pointer list-none flex items-center justify-between gap-4">
                            <span className="flex items-center gap-3">
                                <code className="text-primary font-mono text-[12px]">{m.name}</code>
                                {m.default ? (
                                    <span className="text-[9px] font-mono font-bold text-neutral-900 bg-primary px-2 py-0.5 uppercase tracking-widest">
                                        Default
                                    </span>
                                ) : null}
                            </span>
                            <span className="text-primary text-xs font-mono shrink-0 group-open:hidden">{'+'}</span>
                            <span className="text-primary text-xs font-mono shrink-0 hidden group-open:inline">{'−'}</span>
                        </summary>
                        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <div className="lg:col-span-2 text-[11px] font-mono text-neutral-400 leading-relaxed">
                                Best for: <span className="text-neutral-200">{m.bestFor}</span>
                            </div>
                            <div>
                                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary mb-2">
                                    P402 receives
                                </div>
                                <ul className="flex flex-col gap-1">
                                    {m.receives.map((f) => (
                                        <li key={f} className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400 mb-2">
                                    P402 never receives
                                </div>
                                <ul className="flex flex-col gap-1">
                                    {m.neverReceives.map((f) => (
                                        <li key={f} className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary mb-2">
                                    Supports
                                </div>
                                <ul className="flex flex-col gap-1">
                                    {m.supports.map((f) => (
                                        <li key={f} className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400 mb-2">
                                    Limits
                                </div>
                                <ul className="flex flex-col gap-1">
                                    {m.limits.map((f) => (
                                        <li key={f} className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </details>
                ))}
            </div>
        </section>
    );
}

const POSTURE: ReadonlyArray<{ name: string; line: string }> = [
    { name: 'Server-side tenant resolution', line: 'Tenant identity is resolved on the server. The client never decides which tenant a call belongs to.' },
    { name: 'API key scoping', line: 'Keys are returned exactly once at creation. Only the SHA-256 hash is stored. P402 cannot recover a lost key.' },
    { name: 'Audit logs', line: 'Sensitive operations write structured audit records. Findings use INSERT ... ON CONFLICT for idempotency.' },
    { name: 'No client-trusted plan state', line: 'Plan and entitlement state is read on the server. The client cannot promote a session.' },
    { name: 'No prompt storage by default', line: 'Metadata-only is the default mode. Prompt and response content stay inside the customer environment.' },
    { name: 'No Stripe secrets in the client bundle', line: 'Payment provider secrets remain server-side. The client bundle ships no provider keys.' },
    { name: 'Webhook signature verification where billing applies', line: 'Billing webhooks read the raw body and verify the provider signature before any state change.' },
    { name: 'Least-privilege defaults', line: 'New keys, sessions, and tenants start with the smallest scope that allows the documented use.' },
];

const CONTRACTS: ReadonlyArray<{ label: string; address: string; role: string; network: string }> = [
    {
        label: 'USDC',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        role: 'ERC-20 asset used for settlements. Circle-issued.',
        network: 'Base Mainnet',
    },
    {
        label: 'P402 Treasury',
        address: '0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6',
        role: 'Receives USDC from settled payments. Platform fee destination.',
        network: 'Base Mainnet',
    },
    {
        label: 'P402Settlement',
        address: '0xd03c7ab9a84d86dbc171367168317d6ebe408601',
        role: 'Marketplace settlement contract. Applies a platform fee on settlement.',
        network: 'Base Mainnet',
    },
    {
        label: 'SubscriptionFacilitator',
        address: '0xc64747651e977464af5bce98895ca6018a3e26d7',
        role: 'Recurring subscription billing via EIP-2612 permit. Month 1 sets allowance, months 2+ draw without new signatures.',
        network: 'Base Mainnet',
    },
    {
        label: 'ERC-8004 Identity',
        address: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
        role: 'On-chain agent identity registration and DID resolution.',
        network: 'Base Mainnet',
    },
    {
        label: 'ERC-8004 Reputation',
        address: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
        role: 'On-chain agent reputation scoring. Read by the routing engine for trust-weighted decisions.',
        network: 'Base Mainnet',
    },
];

const CUSTODY_ROLES: ReadonlyArray<{ actor: string; controls: string; risk: string }> = [
    {
        actor: 'User and payer',
        controls: 'Signs the EIP-3009 authorization. Controls validAfter, validBefore, nonce, and value. The user never submits a transaction, the facilitator does.',
        risk: 'User sets authorization bounds. Once signed, the facilitator can execute within those bounds before validBefore.',
    },
    {
        actor: 'P402 Facilitator',
        controls: 'Hot wallet that executes transferWithAuthorization on USDC. Pays gas on behalf of the user. Does not hold user funds.',
        risk: 'If compromised, could execute valid but not-yet-settled authorizations. Mitigated by short validBefore windows and replay protection.',
    },
    {
        actor: 'Treasury',
        controls: 'Receives settled USDC. Read-only from the protocol perspective, receives only, never sends.',
        risk: 'Separate from the facilitator wallet. Compromise of the facilitator does not affect treasury funds.',
    },
    {
        actor: 'Resource server',
        controls: 'Defines paymentRequirements: amount, payTo, asset, resource URL. Calls verify then settle through the P402 facilitator API.',
        risk: 'Must validate the verify response before serving content. Failure to check valid: true results in serving without confirmed payment.',
    },
];

function AddressRow({ label, address, role, network }: { label: string; address: string; role: string; network: string }) {
    return (
        <div className="border-2 border-neutral-700 p-4 flex flex-col lg:flex-row lg:items-start gap-3">
            <div className="lg:w-48 shrink-0 flex flex-col gap-1">
                <div className="text-primary text-[10px] font-mono font-bold uppercase tracking-wider">{label}</div>
                <div className="text-[10px] font-mono text-neutral-500">{network}</div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-2">
                <a
                    href={`https://basescan.org/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[11px] text-primary hover:text-neutral-50 break-all transition-colors"
                >
                    {address}
                </a>
                <p className="text-[11px] font-mono text-neutral-300 leading-relaxed">{role}</p>
            </div>
        </div>
    );
}

function SecurityPosture() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>Security posture</SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {POSTURE.map((p) => (
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

            <div className="flex flex-col gap-4 pt-6">
                <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                    Verifiable on-chain
                </div>
                <p className="text-sm font-mono text-neutral-300 leading-relaxed max-w-3xl">
                    Settlement and identity contracts on Base Mainnet, chain ID 8453.
                    Verify independently on Basescan.
                </p>
                <div className="flex flex-col gap-3">
                    {CONTRACTS.map((c) => (
                        <AddressRow key={c.address} {...c} />
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-4 pt-6">
                <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                    Custody model
                </div>
                <p className="text-sm font-mono text-neutral-300 leading-relaxed max-w-3xl">
                    P402 never holds user funds. The facilitator executes signed
                    authorizations, it does not custody assets.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {CUSTODY_ROLES.map((r) => (
                        <div
                            key={r.actor}
                            className="border-2 border-neutral-700 p-4 flex flex-col gap-2"
                        >
                            <div className="text-primary text-[10px] font-mono font-bold uppercase tracking-wider">
                                {r.actor}
                            </div>
                            <p className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                                {r.controls}
                            </p>
                            <div className="border-l-2 border-neutral-700 pl-3">
                                <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-500 mb-1">
                                    Risk boundary
                                </div>
                                <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                                    {r.risk}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

const PROCUREMENT_PATHS: ReadonlyArray<{ name: string; line: string; tag: string }> = [
    { name: 'Security review path', line: 'Walkthrough of the data boundary, privacy modes, on-chain contracts, and custody model.', tag: 'available on request' },
    { name: 'DPA path', line: 'Data processing agreement covering subprocessor list, retention, and tenant-level deletion.', tag: 'available on request' },
    { name: 'BAA path', line: 'Business associate agreement scoped to metadata-only or private-gateway mode.', tag: 'available after security and contracting review' },
    { name: 'MSA path', line: 'Master services agreement for enterprise deployment, including support and SLA terms.', tag: 'available for enterprise' },
    { name: 'Audit export path', line: 'Evidence bundles, finance reports, and per-event proof exports for audit and dispute review.', tag: 'available' },
    { name: 'Data retention review', line: 'Review and configuration of retention windows for economic events and any opt-in trace data.', tag: 'available' },
    { name: 'Private deployment review', line: 'Customer-hosted inference path. Economic events recorded over a signed channel.', tag: 'available for regulated buyers' },
];

function Procurement() {
    return (
        <section className="flex flex-col gap-6">
            <SectionLabel>Procurement</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Enterprise review paths.
            </h2>
            <ul className="flex flex-col gap-3">
                {PROCUREMENT_PATHS.map((p) => (
                    <li
                        key={p.name}
                        className="border-2 border-neutral-700 p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3"
                    >
                        <div className="flex flex-col gap-1">
                            <div className="text-primary text-[11px] font-mono font-bold uppercase tracking-wider">
                                {p.name}
                            </div>
                            <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                                {p.line}
                            </div>
                        </div>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-900 bg-primary px-2 py-1 self-start shrink-0">
                            {p.tag}
                        </span>
                    </li>
                ))}
            </ul>
            <div>
                <Link
                    href="/get-access?intent=security-review"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    Request security review
                </Link>
            </div>
        </section>
    );
}

function Evidence() {
    return (
        <section className="flex flex-col gap-6 max-w-3xl">
            <SectionLabel>Evidence</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Proof without prompt storage.
            </h2>
            <ul className="flex flex-col gap-3">
                <li className="border-2 border-neutral-700 p-4 flex flex-col gap-1">
                    <div className="text-primary text-[10px] font-mono font-bold uppercase tracking-wider">
                        Receipts
                    </div>
                    <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                        x402 settlement records on Base. See <Link href="/receipts" className="text-primary hover:text-neutral-50 transition-colors">/receipts</Link> for the surface.
                    </div>
                </li>
                <li className="border-2 border-neutral-700 p-4 flex flex-col gap-1">
                    <div className="text-primary text-[10px] font-mono font-bold uppercase tracking-wider">
                        Outcome records
                    </div>
                    <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                        Accepted, revised, escalated, or failed status tied to the event. See <Link href="/prove" className="text-primary hover:text-neutral-50 transition-colors">/prove</Link> for the surface.
                    </div>
                </li>
                <li className="border-2 border-neutral-700 p-4 flex flex-col gap-1">
                    <div className="text-primary text-[10px] font-mono font-bold uppercase tracking-wider">
                        Audit exports
                    </div>
                    <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                        Structured exports of events and decisions for finance, audit, and legal review.
                    </div>
                </li>
                <li className="border-2 border-neutral-700 p-4 flex flex-col gap-1">
                    <div className="text-primary text-[10px] font-mono font-bold uppercase tracking-wider">
                        Proof bundles
                    </div>
                    <div className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                        Per-event evidence bundle linking attribution, cost, policy, and settlement when applicable.
                    </div>
                </li>
            </ul>
            <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                Evidence does not require prompt storage.
            </p>
        </section>
    );
}

function BillingBoundary() {
    return (
        <section className="flex flex-col gap-4 max-w-3xl">
            <SectionLabel>Billing and trust boundary</SectionLabel>
            <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                Billing state is separate from prompt content.
            </h2>
            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                Billing state and plan state are stored separately from any AI event
                content. Payment providers are used only for subscription and invoice
                operations. Build checkout is controlled by the billing rollout.
                Enterprise billing remains sales-assisted.
            </p>
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
                Run the review. Read the docs.
            </h2>
            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/get-access?intent=security-review"
                    className="border-2 border-primary bg-primary text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-900 hover:text-primary transition-colors"
                >
                    Request security review
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
