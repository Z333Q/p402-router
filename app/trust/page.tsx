import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
    title: 'Trust Center | P402',
    description: 'Verify P402 data boundary, privacy modes, subprocessors, retention, on-chain contracts, custody model, replay protection, and evidence artifacts. No sales call required.',
    alternates: { canonical: 'https://p402.io/trust' },
};

const PRIVACY_MODES = [
    {
        id: 'metadata-only',
        name: 'Metadata-only',
        default: true,
        bestFor: 'CFOs, regulated teams, healthcare, finance, legal, privacy-sensitive SaaS',
        receives: ['request_id', 'tenant_id', 'api_key_id', 'department_id', 'employee_id', 'customer_id', 'feature_id', 'workflow_id', 'task_type', 'action_type', 'model', 'provider', 'input_tokens', 'output_tokens', 'cost_usd', 'latency_ms', 'cache_hit', 'budget_id', 'policy_id', 'governance_decision', 'deny_code', 'output_status', 'quality_score', 'evidence_status'],
        neverReceives: ['prompt text', 'response text', 'files', 'documents', 'chat history', 'PHI', 'PII', 'secrets', 'source code'],
        supports: ['Meter', 'Monitor', 'Control', 'budget enforcement', 'department/employee/feature/customer margin', 'forecasting', 'basic optimization', 'evidence exports'],
        limits: ['Semantic cache is opt-in and privacy-mode dependent', 'Limited prompt-level optimization', 'Limited context-bloat analysis', 'Limited duplicate-work detection'],
    },
    {
        id: 'fingerprint-only',
        name: 'Fingerprint-only',
        default: false,
        bestFor: 'Teams that want duplicate detection without exposing content',
        receives: ['metadata above, plus:', 'HMAC prompt fingerprint (tenant-secret HMAC, not plain SHA-256)', 'HMAC response fingerprint', 'token shape', 'optional prompt length bands', 'optional document hash'],
        neverReceives: ['raw prompt or response content', 'embeddings (treated as sensitive — opt-in only)'],
        supports: ['Duplicate request detection', 'Retry loop detection', 'Repeated task detection', 'Cache opportunity estimates', 'Same-input cost analysis'],
        limits: ['No prompt-level rewrite suggestions', 'No semantic similarity grouping unless embeddings explicitly enabled'],
    },
    {
        id: 'redacted-trace',
        name: 'Redacted trace',
        default: false,
        bestFor: 'Developers and enterprises wanting stronger optimization with bounded exposure',
        receives: ['redacted prompt sample', 'redacted response sample', 'trace summary', 'tool-call summary', 'retrieval summary', 'policy summary'],
        neverReceives: ['unredacted PII, PHI, secrets, API keys, emails, phone numbers, addresses, or custom-regex-matched content (redacted client-side before send)'],
        supports: ['Context waste detection', 'Prompt compression recommendations', 'Retry-loop diagnosis', 'Tool-call waste analysis', 'Quality review', 'Better model selection by action'],
        limits: ['Redaction is your responsibility before send', 'Opt-in per tenant/project/key/workflow'],
    },
    {
        id: 'private-gateway',
        name: 'Private Gateway',
        default: false,
        bestFor: 'Large enterprise, regulated enterprise, high-value customers',
        receives: ['economic events', 'recommendation summaries', 'savings proofs', 'policy results', 'evidence hashes', 'aggregate analytics'],
        neverReceives: ['raw prompts (planned to stay in customer VPC)', 'raw responses (planned to stay in customer VPC)', 'embeddings unless explicitly exported'],
        supports: ['Customer-controlled routing path', 'Deeper optimization scope', 'Tenant-scoped semantic cache (opt-in)', 'Tenant-scoped trace inspection', 'Tenant-scoped redaction', 'Tenant-scoped policy enforcement', 'Enterprise evidence export'],
        limits: ['Enterprise deployment path; availability subject to agreement and deployment scope', 'Operational responsibilities defined per engagement'],
    },
    {
        id: 'full-trace',
        name: 'Full trace, opt-in',
        default: false,
        bestFor: 'Small developer teams wanting maximum debugging and optimization',
        receives: ['prompt', 'response', 'tool calls', 'trace', 'retrieval context', 'output status', 'quality score'],
        neverReceives: ['data the customer does not send'],
        supports: ['Deepest optimization', 'Full trace replay', 'Per-request quality review'],
        limits: ['Never the default; must be explicitly enabled', 'Short retention required', 'Project-level enablement (planned for enterprise deployment)', 'Role-gated access (planned for enterprise deployment)', 'Audit log of access (planned for enterprise deployment)', 'Delete/export controls (planned for enterprise deployment, subject to agreement)'],
    },
] as const;

const SUBPROCESSORS = [
    { name: 'Google (Gemini)', purpose: 'Sentinel anomaly detection (aggregate cost metadata only in default mode). Forensic analysis available by enterprise agreement and opt-in deployment scope.', region: 'US / multi-region', dataSeen: 'Aggregate spend metadata by default. Prompt content only in Full-trace opt-in mode.' },
    { name: 'OpenRouter', purpose: 'Upstream model provider aggregator for hosted routing', region: 'US', dataSeen: 'Prompt + response in Hosted Router mode. Not used in Meter-Only SDK or Private Gateway modes.' },
    { name: 'Neon (PostgreSQL)', purpose: 'Primary database for economic events, sessions, billing, mandates, audit', region: 'US-hosted managed Postgres', dataSeen: 'Whatever the active privacy mode persists. Metadata-only by default. Region documented during onboarding.' },
    { name: 'Cloudflare', purpose: 'CDN, WAF, optional Cloudflare-based facilitator endpoint', region: 'Global edge', dataSeen: 'HTTP request metadata. Request bodies are not persisted at the CDN/WAF edge. Optional facilitator flows process settlement payloads only.' },
    { name: 'Stripe', purpose: 'Fiat subscription billing only', region: 'US', dataSeen: 'Customer billing identity and card metadata. Never sees AI prompt or response content.' },
    { name: 'Coinbase Developer Platform (CDP)', purpose: 'Optional server wallets for agent custody flows', region: 'US', dataSeen: 'Wallet addresses, signed authorizations. No prompt content.' },
] as const;

const CONTRACTS = [
    {
        label: 'USDC (USD Coin)',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        role: 'ERC-20 asset used for all settlements. Circle-issued. Audited.',
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
        role: 'Marketplace settlement contract. Applies 1% platform fee on settlement.',
        network: 'Base Mainnet',
    },
    {
        label: 'SubscriptionFacilitator',
        address: '0xc64747651e977464af5bce98895ca6018a3e26d7',
        role: 'Handles recurring subscription billing via EIP-2612 permit. Month 1 sets allowance; months 2+ draw without new signatures.',
        network: 'Base Mainnet',
    },
    {
        label: 'ERC-8004 Identity Registry',
        address: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
        role: 'On-chain agent identity registration and DID resolution.',
        network: 'Base Mainnet',
    },
    {
        label: 'ERC-8004 Reputation Registry',
        address: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
        role: 'On-chain agent reputation scoring. Read by routing engine for trust-weighted decisions.',
        network: 'Base Mainnet',
    },
] as const;

const SECURITY_CHECKS = [
    {
        title: 'Replay protection',
        detail: 'Every EIP-3009 nonce is recorded in PostgreSQL and Redis before settlement executes. Reuse of any nonce returns REPLAY_DETECTED immediately — no second settlement occurs.',
    },
    {
        title: 'Expiry enforcement',
        detail: 'validBefore must be in the future at settlement time. Expired authorizations are rejected server-side before any chain interaction.',
    },
    {
        title: 'Amount matching',
        detail: 'The value field in the authorization must equal maxAmountRequired from the payment requirements. Mismatches are rejected.',
    },
    {
        title: 'Gas price guard',
        detail: 'Settlements are rejected if Base network gas exceeds a configured limit (default 50 gwei). This prevents facilitator drain during fee spikes.',
    },
    {
        title: 'Minimum floor',
        detail: '$0.01 USDC minimum per settlement. Sub-floor amounts are rejected before any signing occurs.',
    },
    {
        title: 'Stripe webhook integrity',
        detail: 'Billing webhooks use await req.text() before JSON parsing to preserve the raw body required for Stripe signature verification. Signatures are validated via stripe.webhooks.constructEvent before any state changes.',
    },
] as const;

const CUSTODY_ROLES = [
    {
        actor: 'User / Payer',
        controls: 'Signs EIP-3009 authorization. Controls validAfter, validBefore, nonce, and value. User never submits a transaction — the facilitator does.',
        risk: 'User sets authorization bounds. Once signed, the facilitator can execute within those bounds before validBefore.',
    },
    {
        actor: 'P402 Facilitator',
        controls: 'Hot wallet that executes transferWithAuthorization on USDC. Pays gas on behalf of the user. Does not hold user funds.',
        risk: 'If compromised, could execute valid but not-yet-settled authorizations. Mitigated by short validBefore windows and replay protection.',
    },
    {
        actor: 'Treasury',
        controls: 'Receives settled USDC. Read-only from protocol perspective — only receives, does not send.',
        risk: 'Separate from facilitator wallet. Compromise of facilitator does not affect treasury funds.',
    },
    {
        actor: 'Resource Server',
        controls: 'Defines paymentRequirements (amount, payTo, asset, resource URL). Calls verify then settle via P402 facilitator API.',
        risk: 'Must validate verify response before serving content. Failure to check valid: true results in serving without confirmed payment.',
    },
] as const;

function AddressRow({ label, address, role, network }: { label: string; address: string; role: string; network: string }) {
    return (
        <div className="border-b-2 border-neutral-100 last:border-b-0 py-5 px-6">
            <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                <div className="lg:w-52 shrink-0">
                    <div className="font-black text-xs uppercase tracking-wider text-black">{label}</div>
                    <div className="text-[10px] font-mono text-neutral-400 mt-0.5">{network}</div>
                </div>
                <div className="flex-1 min-w-0">
                    <a
                        href={`https://basescan.org/address/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-black hover:text-primary break-all border-b border-dashed border-neutral-300 hover:border-primary transition-colors"
                    >
                        {address}
                    </a>
                    <p className="text-xs text-neutral-500 font-medium mt-1.5 leading-relaxed">{role}</p>
                </div>
                <div className="shrink-0">
                    <a
                        href={`https://basescan.org/address/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-neutral-400 hover:text-black border border-neutral-200 hover:border-black px-2 py-1 transition-colors no-underline"
                    >
                        Verify on Basescan
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                            <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    );
}

export default function TrustPage() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main>

                {/* Header */}
                <section className="border-b-2 border-black py-16 bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3"><span className="font-mono">{">_"}</span> Trust Center</div>
                        <h1 className="text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none mb-5">
                            Data boundary<br />
                            <span className="heading-accent">by design.</span>
                        </h1>
                        <p className="text-lg font-medium text-neutral-600 max-w-2xl leading-relaxed border-l-4 border-black pl-5">
                            P402 meters economics, not content. Prompt and response storage are off by default. Every privacy mode, subprocessor, contract, custody role, and security check is documented here. No sales call required.
                        </p>

                        {/* Quick trust strip */}
                        <div className="mt-10 flex flex-wrap gap-4">
                            <a
                                href="#data-boundary"
                                className="inline-flex items-center gap-2 bg-primary border-2 border-black px-4 py-2 text-[11px] font-black uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline"
                            >
                                Privacy modes
                            </a>
                            <a
                                href="#subprocessors"
                                className="inline-flex items-center gap-2 border-2 border-black px-4 py-2 text-[11px] font-black uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline"
                            >
                                Subprocessors
                            </a>
                            <a
                                href="#posture"
                                className="inline-flex items-center gap-2 border-2 border-black px-4 py-2 text-[11px] font-black uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline"
                            >
                                Retention & encryption
                            </a>
                            <a
                                href="/status"
                                className="inline-flex items-center gap-2 border-2 border-black px-4 py-2 text-[11px] font-black uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline"
                            >
                                <span className="w-2 h-2 bg-green-500 inline-block" aria-label="Operational" />
                                System status
                            </a>
                            <a
                                href="https://basescan.org/address/0xd03c7ab9a84d86dbc171367168317d6ebe408601"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 border-2 border-black px-4 py-2 text-[11px] font-black uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline"
                            >
                                Settlement contract
                                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                                    <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                                </svg>
                            </a>
                            <Link
                                href="/docs/api"
                                className="inline-flex items-center gap-2 border-2 border-black px-4 py-2 text-[11px] font-black uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline"
                            >
                                API reference
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Data boundary by design — V5 §27.8 */}
                <section id="data-boundary" className="py-16 border-b-2 border-black bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="mb-8">
                            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Data boundary</div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Data boundary by design</h2>
                            <p className="text-sm text-neutral-600 font-medium mt-3 max-w-3xl leading-relaxed">
                                P402 separates economic metadata from content. Prompt and response storage are off by default. You choose retention, redaction, privacy mode, and deployment model. The five modes below describe exactly what each tier persists and what it does not.
                            </p>
                        </div>

                        <div className="space-y-px border-2 border-black bg-white">
                            {PRIVACY_MODES.map((m) => (
                                <details key={m.id} className="group bg-white border-b-2 border-black last:border-b-0" open={m.default}>
                                    <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none hover:bg-neutral-50">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="font-black text-lg uppercase tracking-tight text-black">{m.name}</span>
                                            {m.default && (
                                                <span className="inline-block bg-primary border-2 border-black px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">Default</span>
                                            )}
                                        </div>
                                        <span className="shrink-0 text-neutral-400 group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
                                    </summary>
                                    <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
                                        <div className="lg:col-span-2 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Best for: <span className="text-black normal-case font-medium tracking-normal">{m.bestFor}</span></div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-black mb-2">P402 receives</div>
                                            <ul className="space-y-1">
                                                {m.receives.map((f) => (
                                                    <li key={f} className="text-xs font-mono text-neutral-700 leading-relaxed flex gap-2"><span className="text-primary">▸</span>{f}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-warning mb-2">P402 never receives</div>
                                            <ul className="space-y-1">
                                                {m.neverReceives.map((f) => (
                                                    <li key={f} className="text-xs font-mono text-neutral-700 leading-relaxed flex gap-2"><span className="text-warning">✕</span>{f}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-black mb-2">Supports</div>
                                            <ul className="space-y-1">
                                                {m.supports.map((f) => (
                                                    <li key={f} className="text-xs text-neutral-600 leading-relaxed flex gap-2"><span className="text-primary">✓</span>{f}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Limits</div>
                                            <ul className="space-y-1">
                                                {m.limits.map((f) => (
                                                    <li key={f} className="text-xs text-neutral-500 leading-relaxed flex gap-2"><span className="text-neutral-400">·</span>{f}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </details>
                            ))}
                        </div>

                        <p className="text-[11px] font-medium text-neutral-500 mt-4 leading-relaxed max-w-3xl">
                            Privacy mode is recorded on every economic event and shown on every evidence bundle as <code className="font-mono bg-neutral-100 px-1">privacy_mode</code>, alongside <code className="font-mono bg-neutral-100 px-1">prompt_stored</code> and <code className="font-mono bg-neutral-100 px-1">response_stored</code> booleans. You can verify which mode applied to any specific call.
                        </p>
                    </div>
                </section>

                {/* Subprocessors */}
                <section id="subprocessors" className="py-16 border-b-2 border-black bg-neutral-50">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="mb-8">
                            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Subprocessors</div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Who else touches your data</h2>
                            <p className="text-sm text-neutral-500 font-medium mt-2 max-w-3xl">
                                These are the third parties P402 may share data with, what each is used for, and which privacy modes route data to them. We notify customers of material changes to this list.
                            </p>
                        </div>
                        <div className="border-2 border-black bg-white">
                            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b-2 border-black bg-neutral-100">
                                <div className="col-span-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Subprocessor</div>
                                <div className="col-span-4 text-[10px] font-black uppercase tracking-widest text-neutral-500">Purpose</div>
                                <div className="col-span-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">Region</div>
                                <div className="col-span-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Data exposure</div>
                            </div>
                            {SUBPROCESSORS.map((s, i) => (
                                <div key={s.name} className={`grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-5 ${i < SUBPROCESSORS.length - 1 ? 'border-b border-neutral-100' : ''}`}>
                                    <div className="md:col-span-3 font-black text-xs uppercase tracking-wider text-black">{s.name}</div>
                                    <div className="md:col-span-4 text-xs text-neutral-600 font-medium leading-relaxed">{s.purpose}</div>
                                    <div className="md:col-span-2 text-xs font-mono text-neutral-500">{s.region}</div>
                                    <div className="md:col-span-3 text-xs text-neutral-600 font-medium leading-relaxed">{s.dataSeen}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Retention, encryption, audit status — honest disclosures */}
                <section id="posture" className="py-16 border-b-2 border-black bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="mb-8">
                            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Posture</div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Retention, encryption, audit status</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-black border-2 border-black">
                            <div className="bg-white p-6">
                                <div className="text-[10px] font-black uppercase tracking-widest text-black mb-3">Retention</div>
                                <ul className="space-y-2 text-xs text-neutral-600 font-medium leading-relaxed">
                                    <li>Economic metadata: 30 days default, configurable per tenant.</li>
                                    <li>Trace / prompt logs (when opt-in is active): 30 days default, configurable down to 7.</li>
                                    <li>Evidence bundles and transaction receipts: retained per tenant policy, configurable, and documented during onboarding.</li>
                                    <li>Tenant-level data deletion: available on request. SLA documented during onboarding.</li>
                                </ul>
                            </div>
                            <div className="bg-white p-6">
                                <div className="text-[10px] font-black uppercase tracking-widest text-black mb-3">Encryption</div>
                                <ul className="space-y-2 text-xs text-neutral-600 font-medium leading-relaxed">
                                    <li>In transit: TLS 1.2+ on all endpoints; HSTS enforced on p402.io.</li>
                                    <li>At rest: AES-256 via managed Postgres (Neon) storage encryption.</li>
                                    <li>API keys: SHA-256 stored; raw key returned exactly once.</li>
                                    <li>Wallet signatures: EIP-712 typed data; no private key custody by P402.</li>
                                </ul>
                            </div>
                            <div className="bg-white p-6">
                                <div className="text-[10px] font-black uppercase tracking-widest text-black mb-3">Audit status</div>
                                <ul className="space-y-2 text-xs text-neutral-600 font-medium leading-relaxed">
                                    <li><span className="font-black">Smart contract audit:</span> P402Settlement, SubscriptionFacilitator — third-party audit not yet engaged. Source verifiable on Basescan. Status will be published here when audit is commissioned.</li>
                                    <li><span className="font-black">SOC 2:</span> not yet completed. Enterprise compliance roadmap available during procurement review.</li>
                                    <li><span className="font-black">HIPAA / BAA:</span> BAA path planned for enterprise deployment. Not available on hosted routing today. Public demos use synthetic data only.</li>
                                    <li><span className="font-black">Security disclosure:</span> security@p402.io. Acknowledgement timing documented during onboarding.</li>
                                </ul>
                            </div>
                        </div>
                        <p className="text-[11px] font-medium text-neutral-500 mt-4 leading-relaxed">
                            This section is intentionally honest. P402 is pre-SOC-2 and pre-third-party-audit. Buyers requiring those before deployment can engage on the Private Gateway path (enterprise deployment, subject to agreement) to scope data exposure to aggregates while those certifications are pursued.
                        </p>
                    </div>
                </section>

                {/* On-chain contracts */}
                <section className="py-16 border-b-2 border-black bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="mb-8">
                            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">On-chain verification</div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Deployed contracts</h2>
                            <p className="text-sm text-neutral-500 font-medium mt-2">
                                All contracts are deployed on Base Mainnet (Chain ID: 8453). Verify independently on Basescan.
                            </p>
                        </div>
                        <div className="border-2 border-black bg-white">
                            {CONTRACTS.map((c) => (
                                <AddressRow key={c.address} {...c} />
                            ))}
                        </div>

                        {/* EIP-712 domain */}
                        <div className="mt-8 border-2 border-black p-6 bg-neutral-50">
                            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">EIP-712 domain — USDC on Base</div>
                            <pre className="font-mono text-xs text-neutral-700 overflow-x-auto leading-relaxed whitespace-pre">{`{
  name: 'USD Coin',
  version: '2',
  chainId: 8453,
  verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
}`}</pre>
                            <p className="text-[10px] font-medium text-neutral-500 mt-3">
                                Used to produce the EIP-712 domain separator for TransferWithAuthorization signatures.
                                Verify against the USDC contract on Basescan.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Custody model */}
                <section className="py-16 border-b-2 border-black bg-neutral-50">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="mb-8">
                            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Custody model</div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Who controls what</h2>
                            <p className="text-sm text-neutral-500 font-medium mt-2">
                                P402 never holds user funds. The facilitator executes signed authorizations — it does not custody assets.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-black border-2 border-black">
                            {CUSTODY_ROLES.map((r) => (
                                <div key={r.actor} className="bg-white p-6">
                                    <div className="font-black text-sm uppercase tracking-tight text-black mb-3">{r.actor}</div>
                                    <p className="text-xs text-neutral-600 font-medium leading-relaxed mb-3">{r.controls}</p>
                                    <div className="border-l-2 border-warning pl-3">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-warning mb-1">Risk boundary</div>
                                        <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">{r.risk}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Security model */}
                <section className="py-16 border-b-2 border-black bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="mb-8">
                            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Security model</div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Checks before settlement</h2>
                            <p className="text-sm text-neutral-500 font-medium mt-2">
                                Every settlement attempt passes all six checks. Any failure returns an ApiError with a code and requestId — no partial state.
                            </p>
                        </div>
                        <div className="space-y-px border-2 border-black">
                            {SECURITY_CHECKS.map((check, i) => (
                                <div key={check.title} className={`flex gap-5 p-5 bg-white ${i < SECURITY_CHECKS.length - 1 ? 'border-b border-neutral-100' : ''}`}>
                                    <div className="shrink-0 w-6 h-6 bg-primary border-2 border-black flex items-center justify-center font-black text-[10px]">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <div className="font-black text-xs uppercase tracking-wider text-black mb-1">{check.title}</div>
                                        <p className="text-xs text-neutral-600 font-medium leading-relaxed">{check.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Settlement flow */}
                <section className="py-16 border-b-2 border-black bg-neutral-50">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="mb-8">
                            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Settlement flow</div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">What happens on each call</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-px bg-black border-2 border-black">
                            {[
                                { step: '01', label: 'Client signs', desc: 'EIP-3009 TransferWithAuthorization. Gas-free for the user.' },
                                { step: '02', label: 'POST /verify', desc: 'Checks amount, sig, nonce, expiry, gas price. Returns valid: true or error code.' },
                                { step: '03', label: 'POST /settle', desc: 'Facilitator calls transferWithAuthorization on USDC. Nonce recorded.' },
                                { step: '04', label: 'Chain confirms', desc: 'Base Mainnet confirms. Tx hash returned with payer metadata.' },
                                { step: '05', label: 'Receipt issued', desc: 'Receipt ID tied to settled tx. Reusable for repeat access.' },
                            ].map((s) => (
                                <div key={s.step} className="bg-white p-5 flex flex-col gap-2">
                                    <span className="font-black text-3xl text-primary leading-none">{s.step}</span>
                                    <div className="font-black text-[11px] uppercase tracking-tight text-black">{s.label}</div>
                                    <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Evidence bundle */}
                <section className="py-16 border-b-2 border-black bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="flex flex-col lg:flex-row gap-12">
                            <div className="lg:w-1/2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Evidence & audit</div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Evidence bundles</h2>
                                <p className="text-sm text-neutral-600 font-medium leading-relaxed mb-6">
                                    Every transaction produces a structured evidence bundle. Export it from the dashboard or via API for risk review, compliance, or dispute resolution.
                                </p>
                                <div className="space-y-2">
                                    {[
                                        'requestId — unique per call',
                                        'payer address + payTo address',
                                        'asset contract + amount + chainId',
                                        'txHash — on-chain reference',
                                        'receiptId, mandateId, policyId',
                                        'deny code (if rejected)',
                                        'timestamps (initiated, settled, expired)',
                                        'trace events summary',
                                        'audit findings summary',
                                    ].map(field => (
                                        <div key={field} className="flex items-start gap-2 text-xs font-medium text-neutral-600">
                                            <span className="shrink-0 w-1.5 h-1.5 mt-1.5 bg-primary inline-block" />
                                            <code className="font-mono">{field}</code>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="lg:w-1/2">
                                <div className="border-2 border-black bg-[#0D0D0D] p-5">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-3">Export endpoint</div>
                                    <pre className="font-mono text-xs text-neutral-300 overflow-x-auto leading-relaxed whitespace-pre">{`GET /api/v1/analytics/evidence-bundle
Authorization: Bearer $P402_API_KEY

# Query by request ID:
?requestId=req_01HX...

# Or by date range:
?from=2025-01-01&to=2025-01-31

# Response:
{
  "requestId": "req_01HX...",
  "payer": "0x...",
  "txHash": "0xabc...",
  "receiptId": "rcpt_...",
  "denyCode": null,
  "timestamps": { ... },
  "auditFindings": [ ... ]
}`}</pre>
                                </div>
                                <p className="text-[10px] font-medium text-neutral-500 mt-3">
                                    Also available from the Transactions page and Audit page in the dashboard. Bulk export supported via date range.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Procurement FAQ */}
                <section className="py-16 bg-neutral-50">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="mb-8">
                            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Procurement FAQ</div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Common questions</h2>
                        </div>
                        <div className="space-y-px border-2 border-black">
                            {[
                                {
                                    q: 'Does P402 see our prompts?',
                                    a: 'Not by default. The default privacy mode is Metadata-only: P402 receives token counts, costs, owner attribution, model, latency, and policy results, and does not store prompt or response content. Prompt content reaches P402 cloud only if you explicitly enable Redacted-trace or Full-trace mode. Private Gateway is the enterprise deployment path for customer-controlled routing, where prompt content stays within the customer-controlled boundary defined by the engagement; availability is subject to enterprise agreement and deployment scope.',
                                },
                                {
                                    q: 'Does the Sentinel (Gemini) inspect every prompt?',
                                    a: 'No. The Sentinel runs cost-anomaly detection on aggregate spend metadata (cost_usd, timestamps, model, tenant) — not on prompt content. Prompt-level jailbreak inspection is an opt-in capability available only when you select a privacy mode that sends content. In Metadata-only mode, no prompt or response content is sent to Google.',
                                },
                                {
                                    q: 'What does each evidence bundle record about privacy?',
                                    a: 'Every evidence bundle records privacy_mode (the mode that applied to this call), prompt_stored (boolean), and response_stored (boolean). You can audit any specific request to verify which mode was active and whether any content was retained.',
                                },
                                {
                                    q: 'How long is data retained?',
                                    a: 'Economic metadata: 30 days default, configurable per tenant. Trace/prompt logs (only when opt-in modes are active): 30 days default, configurable down to 7. Evidence bundles and transaction receipts are retained per tenant policy, configurable, and documented during onboarding. Tenant-level data deletion is available on request. SLA documented during onboarding.',
                                },
                                {
                                    q: 'Is the settlement contract third-party audited?',
                                    a: 'Not yet. P402Settlement and SubscriptionFacilitator source is verifiable on Basescan. A third-party audit has not yet been engaged; status will be published on this page when commissioned. Customers requiring a completed audit before deployment can engage on the Private Gateway path (enterprise deployment, subject to agreement) or wait for audit completion.',
                                },
                                {
                                    q: 'Is there a BAA / HIPAA path?',
                                    a: 'BAA path planned for enterprise deployment. Not available on hosted routing today. Public demos use synthetic data only.',
                                },
                                {
                                    q: 'Does P402 hold user funds at any point?',
                                    a: 'No. The facilitator wallet executes transferWithAuthorization on the USDC contract. Funds move directly from the user\'s wallet to the treasury or resource server. The facilitator is never in the custody chain.',
                                },
                                {
                                    q: 'What happens if a settlement fails mid-flight?',
                                    a: 'All billing events use INSERT ... ON CONFLICT to prevent duplicate charges. If the chain call fails after nonce recording, the nonce is consumed — the user must re-sign with a fresh nonce. No double charge can occur.',
                                },
                                {
                                    q: 'How are API keys stored?',
                                    a: 'Raw API keys (p402_live_...) are returned exactly once at creation. Only the SHA-256 hash is stored. P402 cannot recover a lost key — the user must generate a new one.',
                                },
                                {
                                    q: 'Can we verify the contracts ourselves?',
                                    a: 'Yes. All contract addresses are listed above with direct Basescan links. Source code is verifiable on-chain. Chain ID 8453 (Base Mainnet).',
                                },
                                {
                                    q: 'What is the platform fee?',
                                    a: '1% of each settled payment, taken at settlement time by the P402Settlement contract. See /pricing for plan-level fees and limits.',
                                },
                                {
                                    q: 'Where do I report a security issue?',
                                    a: 'Email security@p402.io. Include reproduction steps, affected endpoint, and requestId if available. Acknowledgement timing documented during onboarding.',
                                },
                            ].map((faq, i, arr) => (
                                <details key={faq.q} className={`group bg-white ${i < arr.length - 1 ? 'border-b border-neutral-100' : ''}`}>
                                    <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none hover:bg-neutral-50">
                                        <span className="font-black text-sm text-black">{faq.q}</span>
                                        <span className="shrink-0 text-neutral-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                                    </summary>
                                    <div className="px-6 pb-5">
                                        <p className="text-sm text-neutral-600 font-medium leading-relaxed border-l-2 border-black pl-4">{faq.a}</p>
                                    </div>
                                </details>
                            ))}
                        </div>

                        <div className="mt-8 flex flex-wrap gap-4">
                            <Link
                                href="/docs/api"
                                className="inline-flex items-center gap-2 border-2 border-black px-5 py-3 font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline"
                            >
                                API reference
                            </Link>
                            <Link
                                href="/developers/quickstart"
                                className="inline-flex items-center gap-2 bg-primary border-2 border-black px-5 py-3 font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline"
                            >
                                Run quickstart
                            </Link>
                        </div>
                    </div>
                </section>

            </main>
            <Footer />
        </div>
    );
}
