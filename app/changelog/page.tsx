import { Metadata } from 'next'
import { TopNav } from '@/components/TopNav'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
    title: 'Changelog | P402 Platform & Protocol Updates',
    description: 'Track the latest updates, launches, and improvements to the P402 infrastructure, SDKs, Smart Contracts, and developer tools.',
    openGraph: {
        title: 'Changelog | P402 Platform',
        description: 'Track the latest updates, routing improvements, and smart contract launches for P402.',
        url: 'https://p402.io/changelog',
        siteName: 'P402',
        images: [{
            url: 'https://p402.io/og-image.png',
            width: 1200,
            height: 630,
            alt: 'P402 Infrastructure Changelog'
        }],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'P402 Changelog',
        description: 'Latest updates to the P402 AI Agent monetization protocol.',
        images: ['https://p402.io/og-image.png'],
    },
    alternates: {
        canonical: 'https://p402.io/changelog'
    }
}

export default function ChangelogPage() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'P402 Changelog',
        description: 'Latest updates and releases for the P402 Protocol and platform.',
        url: 'https://p402.io/changelog',
        mainEntity: {
            '@type': 'SoftwareApplication',
            name: 'P402 API Router & Protocol',
            applicationCategory: 'DeveloperApplication',
            operatingSystem: 'Any',
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD'
            }
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <TopNav />

            <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px', flex: 1 }}>
                <h1 className="title-1" style={{ marginBottom: 8 }}><span className="heading-accent">Changelog.</span></h1>
                <p className="mono-id" style={{ marginBottom: 48 }}>Platform and protocol release history.</p>

                {/* ── May 6, 2026 ─────────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">P402 Meter — Industry Demos</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">May 6, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Three Live Industry Demos — Healthcare, Legal, Real Estate</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                P402 Meter now runs across three industries, each with a fully interactive demo that processes real documents, settles every AI token on Tempo mainnet, and produces an on-chain audit trail. Cost per run is under $0.001.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li><strong>Healthcare — Prior Authorization Review</strong>: Gemini Flash classifies the packet; Gemini Pro writes the UM determination. Every token settles as a USDC.e event on Tempo. Cost per case: $0.00035 — versus $25–100 for manual review. URAC-aligned audit trail included.</li>
                                <li><strong>Legal — M&A Due Diligence</strong>: Eight contracts reviewed with intelligent model routing — simpler documents go to Flash, complex MSAs and merger agreements go to Pro. Cross-document conflict detection runs after all reviews complete. Total matter cost: under $0.0015, versus $200–800 for paralegal equivalent. ABA Formal Opinion 512 compliant.</li>
                                <li><strong>Real Estate — Tenant Screening</strong>: Three applicant scenarios (clean, conditional, escalation) across four documents each. Fraud score 0–100 with a configurable escalation threshold. Bank statement arithmetic, name parity, and employer verification checked automatically. HUD fair-housing audit trail on every decision.</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Buyer Economics — Interactive ROI</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                The healthcare demo gains three new surfaces focused on communicating value to enterprise buyers and their implementation partners.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li><strong>Buyer Story Card</strong>: sets the scene before the demo runs — who the buyer is, what their current cost structure looks like line by line, and what the demo will prove.</li>
                                <li><strong>Settlement Proof redesign</strong>: when the Tempo transaction confirms, the settlement is treated as the reveal — large headline, buyer-language explanation (&ldquo;your auditor can verify this in 10 seconds&rdquo;), then technical details. In Proof Replay mode the same structure renders against the pre-recorded session.</li>
                                <li><strong>Interactive ROI Panel</strong>: volume selector (5K–500K cases per year), adjustable per-case cost, and a live calculation of current spend vs P402 spend vs annual savings. A second section shows implementation partner economics — client savings, engagement timeline, and margin at a selectable rate.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── May 5, 2026 ─────────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">Meter — Tempo Mainnet & Multi-Demo Platform</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">May 5, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Settlement Migrated to Tempo Mainnet</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                P402 Meter settlement moves from Arc testnet to Tempo mainnet (chain 4217). All on-chain proofs are now live — USDC.e TIP-20 transfers, block explorer links at explore.tempo.xyz, and a new wallet health endpoint that checks signer balance before each session.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>Settlement uses Tempo&apos;s ERC-20 transfer interface — no native gas token, no msg.value. Gas is paid via FeeAMM in stablecoin.</li>
                                <li>Explorer links on every ledger event — click any settlement to verify the exact amount, block, and timestamp on the public Tempo explorer.</li>
                                <li>Wallet endpoint added: returns signer address, USDC.e balance, and readiness status before a session starts.</li>
                                <li>Health endpoint added: checks Tempo RPC connectivity and signer balance — surfaced in the infrastructure status strip.</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">P402 Meter Restructured as Multi-Industry Platform</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">/meter</code> is now a platform hub rather than a single demo. Healthcare, Legal, and Real Estate each have dedicated pages, deep-dive case studies, and independent state — switching between demos does not affect session data. The about page is redesigned as an industry-agnostic P402 story with links to each vertical.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>Hub at <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">/meter</code> — three industry cards, each linking to its full demo and case study.</li>
                                <li>About page at <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">/meter/about</code> — economics problem, four technology pillars (Gemini / Tempo / MPP / P402), and per-industry proof points.</li>
                                <li>Case studies at <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">/meter/about/healthcare</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">/meter/about/legal</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">/meter/about/real-estate</code> — workflow, unit economics, compliance standard, and sample data for each industry.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── May 4, 2026 ─────────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">Dual-Rail AI Micropayment Gate</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">May 4, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Pay Per Request — Base and Tempo Rails</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                The chat completions endpoint now accepts payment directly in the request header. Clients can pay per inference in USDC on Base or USDC.e on Tempo — no account registration, no API key, no monthly invoice. Payment is verified and settled before the response is returned.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li><strong>Base rail</strong>: EIP-3009 USDC and EURC. The client signs a transfer authorization offline; P402 verifies the signature, prevents replay, and executes the on-chain transfer atomically.</li>
                                <li><strong>Tempo rail</strong>: TIP-20 USDC.e. Same authorization model adapted for Tempo&apos;s system contract interface.</li>
                                <li>Existing API key billing is unchanged. Payment header access is an additional path — both can be active on the same endpoint simultaneously.</li>
                                <li>Every paid request is tagged with rail, amount, and a structured log entry. Settlement failures are logged at CRITICAL and never silently swallowed.</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Settlement Precision & Regression Coverage</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                All settlement amount handling is now integer-exact. Floating-point arithmetic has been removed from every settlement path — amounts are parsed and formatted using the token&apos;s declared decimal precision throughout. Five regression tests cover the scenarios that previously caused silent rounding errors.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>Sub-cent amounts and amounts above JavaScript&apos;s safe integer limit both round-trip correctly.</li>
                                <li>The onchain settlement scheme passes the raw integer amount directly — no conversion through floating-point at any point in the call stack.</li>
                                <li>Tempo currency list is now type-checked and tested for drift against the database — if a supported stablecoin is added to the DB but missing from the constants, a test fails at CI time.</li>
                                <li>The <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">0xef</code> bytecode returned by Tempo system contracts (TIP-20 stablecoins) is correctly identified as deployed code — tools that expect EVM bytecode will not work on these addresses.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── April 22–25, 2026 ────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">P402 Meter — Initial Release</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">April 22–25, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Per-Token AI Billing, Settled On-Chain</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                P402 Meter is the first end-to-end demonstration of per-token AI billing with on-chain proof. Every token consumed by Gemini Flash and Gemini Pro is a discrete settlement event — not an estimate, not a batch, not a monthly invoice. The ledger, cost, and settlement proof are visible from the first token to the last.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>55+ on-chain settlement events per prior authorization run — each AI action is a separate, verifiable ledger entry.</li>
                                <li>Every ledger event links directly to the block explorer. The payer, amount, and timestamp are publicly verifiable for every settlement.</li>
                                <li>Proof Replay mode uses pre-recorded stream data for air-gapped presentations. The UX is identical to Live mode — the only difference is the data source.</li>
                                <li>Auto-fallback to Proof Replay on API quota limits — the demo never stops working.</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Settlement Proof, KPI Instrumentation & Compliance</h3>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li><strong>Settlement Proof card</strong>: full-width confirmation shown after stream completion — confirmed tx hash, block number, and a direct &ldquo;Verify →&rdquo; link to the block explorer. In Proof Replay mode the signer wallet address page is linked instead, so the balance and history are always independently verifiable.</li>
                                <li><strong>Session KPI rail</strong>: total cost, event count, settlement count, and a live proof status badge (VERIFIED / LIVE / PARTIAL / READY) visible throughout the session.</li>
                                <li><strong>Ledger Panel</strong>: full AI / Payment / Settlement event taxonomy with per-event block explorer links.</li>
                                <li><strong>Economics panel</strong>: every cost figure is derived from actual settlement events — no estimates or hardcoded values.</li>
                                <li><strong>Compliance banner</strong>: synthetic data, no PHI, human approval required — visible on every session.</li>
                                <li>Light and dark presentation modes selectable from the utility bar.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── April 20, 2026 ───────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">Partner Program</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">April 20, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Three Partner Tracks — Full Attribution Stack</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                The P402 Partner Program is live at <code className="bg-black/10 border border-black/20 px-1 py-0.5">/partner</code>. Developer Affiliates earn 20% recurring for 12 months. Agencies earn 25% recurring for 12 months. Enterprise partners earn 10% on year-one deal value with deal registration.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>Partner dashboard: real-time commission tracking, referral link management, lead registration, deal pipeline, payout history, and a full content library.</li>
                                <li>Attribution precedence: deal registration beats registered lead, which beats last-touch cookie. 90-day attribution window. Multi-touch credit splitting across touchpoints.</li>
                                <li>Commission lifecycle: pending → approved → in-payout → paid. 30-day hold on SaaS commissions, 60-day hold on Enterprise.</li>
                                <li>Dynamic referral link builder with UTM parameters, vanity slugs, click history, and per-link conversion rates.</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">24-Article Partner Documentation</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                Every stage of the partner lifecycle has a dedicated reference article. Technical partners get working code. Agency partners get production-ready campaign copy, FTC/ASA disclosure guidance, and a brand use policy.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li><strong>Positioning (4)</strong> — P402 in one sentence, ideal customer profile, approved claims, prohibited language.</li>
                                <li><strong>Product (4)</strong> — How x402 works, why AP2 mandates matter, Bazaar distribution model, Router vs. direct API.</li>
                                <li><strong>Campaigns (4)</strong> — Newsletter templates, X/Twitter threads, YouTube descriptions, email sequences.</li>
                                <li><strong>Compliance (4)</strong> — FTC/ASA disclosure guide, brand guidelines, prohibited methods, brand bidding policy.</li>
                                <li><strong>Technical (4)</strong> — SDK quickstart, x402 integration walkthrough, building a paid agent, MCP integration guide.</li>
                                <li><strong>Payouts (4)</strong> — Commission calculation, hold period rules, tax form requirements, payout timeline.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── April 16, 2026 ───────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">Documentation</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">April 16, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">12 Production Documentation Pages</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                The P402 documentation is rebuilt using the Diataxis framework — four modes, four distinct jobs: Tutorials (learning by doing), How-To Guides (completing a specific task), Reference (lookup), and Explanation (understanding the system). All placeholder pages are replaced with production content.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li><strong>Tutorial</strong>: five-step budget agent guide — the agent submits a task, P402 routes it, settles in USDC, checks balance. Working Python and TypeScript.</li>
                                <li><strong>How-To (7)</strong>: MCP server setup (Claude Desktop, Cursor, SSE host), session lifecycle, USDC funding, routing mode selection, semantic cache management, API key rotation.</li>
                                <li><strong>Reference (3)</strong>: full CLI command reference, Billing Guard error codes, complete API error table with retry guidance.</li>
                                <li><strong>Explanation (2)</strong>: system architecture (routing engine, cache, x402, intelligence layer, ERC-8004), security model (EIP-3009, replay protection, gas limits, key hashing, threat model).</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── April 7, 2026 ────────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">Test Suite & Traffic Instrumentation</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">April 7, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">65 End-to-End Tests — Full Golden Path Coverage</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                A complete Playwright test suite covers the core product surfaces: public pages, routing playground, session creation, provider failover, SSE trace stream, and the full EIP-2612 wallet billing flow. Web3 wallet interactions are mocked — no browser extension required in CI.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>Smoke tests: public page load, navigation, health endpoint, footer links.</li>
                                <li>Functional tests: routing playground, provider comparison, session creation.</li>
                                <li>Resilience tests: provider failover, API error surfaces, SSE reconnection behavior.</li>
                                <li>PLG funnel tests: SSE trace stream mocked end-to-end to prevent flakiness.</li>
                                <li>Wallet billing tests: EIP-2612 permit flow mocked at the browser level — no on-chain transactions in CI.</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Per-Request Traffic Events</h3>
                            <p className="text-neutral-700 leading-relaxed">
                                Every routed request now writes a structured event — provider selected, routing mode, latency, cost, cache hit status, settlement outcome. The Requests and Savings dashboard pages now show real per-request data rather than aggregates. Event writes are non-blocking and never delay the API response.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ── March 31, 2026 ───────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">Admin Console</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">March 31, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">RBAC Admin Dashboard — 10 Pages, 5 Roles</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                A dedicated admin console replaces ad-hoc database access for platform operations. Five roles — super admin, ops, analytics, safety, finance — each with scoped permissions. Separate authentication from the user-facing product with IP allowlist enforcement.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>10 pages: Overview (KPI command center with sparklines and growth chart), Users, Analytics, Health, Safety, Intelligence, Bazaar, Admins, Audit Log, System.</li>
                                <li>Every admin action is written to an immutable audit log with before/after diff — nothing is changed without a traceable record.</li>
                                <li>Safety page: quarantined sessions, flagged agents, anomaly alerts — with inline approve, escalate, and dismiss controls.</li>
                                <li>Intelligence page: Gemini economist and sentinel outputs visible to ops without touching the database.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── March 27, 2026 ───────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">Sessions, Policy Visibility & Memory</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">March 27, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Full Execution Visibility — Policy, Cache, and Route Decisions</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                Every surface that was previously opaque — why a request was denied, whether the cache served it, what knowledge sources were used, how the route was selected — is now visible in the dashboard without leaving the UI.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li><strong>Sessions page</strong>: budget utilization, lifecycle status, policy detail, AP2 mandate linkage, and direct links to the request log and trace view for each session.</li>
                                <li><strong>Policy checks</strong>: per-check pass/fail shown inline in the trace — including the exact denial reason for any blocked request.</li>
                                <li><strong>Context &amp; Memory</strong>: semantic cache hits shown explicitly (LLM skipped, cost $0.00). Knowledge retrieval nodes show source name, latency, and status.</li>
                                <li><strong>Route decision block</strong>: winner selection reason, rejected alternatives with scores, and a dry-run preview showing how the decision would change under a different routing mode.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── March 26, 2026 ───────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">Intelligence Layer Dashboard</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">March 26, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">6 New Dashboard Surfaces — Requests, Traces, Savings, Evals, Knowledge, Tools</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                Every request P402 routes, every trace it records, every dollar it saves, and every quality score it evaluates is now navigable from the dashboard — without touching the database.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li><strong>Requests</strong>: paginated execution log with routing mode, actual cost, savings vs baseline, and one-click trace navigation. Keyboard-navigable.</li>
                                <li><strong>Traces</strong>: per-request graph of every execution node — model, tool, retrieval, verify, settle, cache — with latency, cost, and evaluation scores.</li>
                                <li><strong>Savings</strong>: period analytics (7d / 30d / 90d) with daily bar chart, routing mode breakdown, and provider spend distribution.</li>
                                <li><strong>Evals</strong>: response quality scores per request (relevance, completeness, groundedness, coherence). Failed evals surface a direct re-run path.</li>
                                <li><strong>Knowledge</strong>: RAG source registry with trust levels, chunk counts, and add/remove controls.</li>
                                <li><strong>Tools</strong>: registered tool catalog with parameter schemas and execution history.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── March 23, 2026 ───────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">Conditional Settlement — P402Escrow</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">March 23, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">P402Escrow — Live on Base Mainnet</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                Conditional USDC escrow is live on Base mainnet. Funds lock on-chain at job creation and release only when the payer confirms delivery — or P402 resolves a dispute. Protocol fee: 1% on settlement. Dispute window: 48 hours after the provider marks delivery.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>Seven-state lifecycle: Created → Funded → Accepted → In Progress → Delivered → Settled, with Disputed → Resolved and Expired / Cancelled exit paths.</li>
                                <li>Full REST API: create, fund, accept, start, deliver, release, dispute — all via a single escrow endpoint.</li>
                                <li>Bazaar auto-escrow: any A2A task with a price at or above $1.00 and a provider wallet automatically creates an escrow — no extra API calls required.</li>
                                <li>Dashboard: live escrow state with action buttons at each lifecycle stage. My Escrows panel in the Bazaar view.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── March 22, 2026 ───────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">World ID, Credits & Model Catalog</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">March 22, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Human-Verified Free Trial — World ID</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                World ID verification unlocks 500 free credits ($5.00) on first verification. Credits are a first-class billing primitive — 1 credit equals $0.01 USD, consumed atomically. When credits are exhausted, sessions continue on standard USDC billing with no interruption.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>Credit balance, spend, and human-verified status returned on every chat completion response.</li>
                                <li>Credit API: balance check, purchase (test and paid modes), transaction history.</li>
                                <li>World Mini App at world.p402.io: Chat, Agents, Credits, and Settings tabs. Credit purchases handled natively through the World App payment flow.</li>
                                <li>Base Mini App updated: verified badge, credit balance indicator, and tri-state funding status (free trial / credits / USDC) visible inline throughout.</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Model Catalog — 300+ Models, Live Pricing</h3>
                            <p className="text-neutral-700 leading-relaxed">
                                Live model comparison page at <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">/models</code>. Pricing syncs from OpenRouter hourly — always current. Filter by provider and capability, sort by cost or context window. Cost calculator: input your token volumes and daily request count to see direct API cost vs P402 cost side by side.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ── March 18, 2026 ────────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">VS Code Extension</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">March 18, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">P402 for VS Code — Embedded MCP Server</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                Install the P402 extension and all six routing and settlement tools are immediately available in Copilot agent mode — no config file editing, no manual server start, no Node version dependency. The MCP server is bundled into the extension at build time.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>Status bar: current routing mode with one-click switch via quick-pick.</li>
                                <li>Sidebar: three views — active sessions with budget remaining, recent requests with cost and latency, provider health per integration.</li>
                                <li>Commands: configure API key, switch routing mode, create budget session, open dashboard.</li>
                                <li>Published to VS Code Marketplace and Open VSX simultaneously.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── March 17, 2026 ────────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">MCP Server</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">March 17, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">@p402/mcp-server — P402 Routing via MCP</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                Agent runtimes that speak MCP — Claude Desktop, Cursor, Windsurf, or any custom host — can now route LLM requests across 300+ models and settle per-call in USDC without managing provider credentials, implementing an HTTP client, or handling wallet signing. Requires only a P402 API key.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>Six tools: route and complete a prompt, create a budget session, check session balance, list available models, compare providers on a specific model, check router health.</li>
                                <li>Budget enforcement is identical to the REST API — a session with a $5.00 cap cannot be exceeded regardless of tool call volume.</li>
                                <li>Zero-install: <code className="bg-black/10 border border-black/20 px-1 py-0.5">npx -y @p402/mcp-server</code>. Listed on the official MCP Registry.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── March 6, 2026 ─────────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">Progressive Authorization</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">March 6, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Four-State Authorization Model</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                Authorization is now a clearly defined progression: Visitor → Identity Only → Wallet Linked → Payment Ready. Each state is computed server-side and surfaced throughout the product with a direct, low-friction path to the next step.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>CDP email users reach Wallet Linked state immediately on first login — no separate linking step.</li>
                                <li>Google OAuth users see a wallet activation prompt in onboarding. The CDP email field is pre-filled from the Google session. Skippable — dashboard and API access are unaffected; payment routes return 402 until a wallet is linked.</li>
                                <li>Dashboard banner renders contextually per state — no banner when payment-ready, no noise when there is nothing to do.</li>
                                <li>Builders using CDP server wallets get role-specific onboarding: no personal wallet required, sessions use CDP server wallets funded by clients.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── March 4, 2026 ─────────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">CDP Wallet Integration</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">March 4, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Email OTP — Self-Custody Wallet on First Login</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                Sign in with an email address. A self-custody Base wallet is provisioned automatically via Coinbase Developer Platform Embedded Wallet — no browser extension, no seed phrase, no prior crypto experience required. OTP delivery and wallet creation complete in under 500ms.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>Private keys are generated and stored inside a Coinbase Nitro Enclave (TEE) — never transmitted to the P402 server.</li>
                                <li>The wallet address is the primary session identity token — no separate linking step after login.</li>
                                <li>The facilitator signing wallet also supports TEE mode: private key never touches the Node.js process. Active mode is visible at the facilitator health endpoint.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── March 2, 2026 ─────────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">Protocol, SDK & CLI</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">March 2, 2026</span>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">P402 Protocol — Open Source</h3>
                            <p className="text-neutral-700 mb-4 leading-relaxed">
                                The core P402 protocol specification and reference implementations are open source — x402 payment extension schema, AP2 mandate format, A2A JSON-RPC method definitions, and the ERC-8004 agent identity registry interface.
                            </p>
                            <a href="https://github.com/z333q/p402-protocol" target="_blank" rel="noopener noreferrer" className="text-sm font-black uppercase tracking-widest bg-primary px-4 py-2 border-2 border-black inline-block hover:bg-black hover:text-white transition-colors">
                                github.com/z333q/p402-protocol ↗
                            </a>
                        </div>
                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Developer SDK</h3>
                            <p className="text-neutral-700 leading-relaxed">
                                <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">@p402/sdk</code> provides typed wrappers for routing requests, issuing AP2 mandates, verifying x402 payment payloads, and interacting with the A2A task API. TypeScript-first; ships ESM and CJS.
                            </p>
                        </div>
                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">CLI</h3>
                            <p className="text-neutral-700 leading-relaxed">
                                Manage facilitators, inspect routing decisions, check wallet balances, and tail live traffic from the terminal. Uses your existing API key — no separate auth flow.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ── Feb 24 – Mar 2, 2026 ──────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-6 border-b-2 border-black pb-2 gap-2">
                        <h2 className="title-2 m-0 text-2xl">Infrastructure & Smart Contracts</h2>
                        <span className="mono-id text-sm border-2 border-black px-2 py-1 bg-neutral-100">Feb 24 – Mar 2, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-lg mb-3">Base Mainnet Smart Contracts</h3>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>P402Settlement deployed on Base mainnet — marketplace settlement with 1% protocol fee.</li>
                                <li>SubscriptionFacilitator deployed on Base mainnet — EIP-2612 recurring billing. Gasless for subscribers after month one. Month two onwards draws from the original permit with no new user signature required.</li>
                                <li>Treasury: <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6</code></li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-lg mb-3">Billing Hardening</h3>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>All billing events are idempotent — duplicate webhook delivery never results in double-charging.</li>
                                <li>Environment validation enforced at startup — missing required configuration aborts boot rather than surfacing at runtime.</li>
                                <li>Edge middleware rewritten to be compatible with Vercel Edge Runtime.</li>
                            </ul>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    )
}
