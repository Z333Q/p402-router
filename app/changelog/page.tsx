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

                {/* ── April 20, 2026 ───────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">Partner Program</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">April 20, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Affiliate Partner Portal — Three Tracks, Full Attribution</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                The P402 Partner Program is live. Three tracks — Developer Affiliate (20% recurring, 12 months), Agency (25% recurring, 12 months), and Enterprise (10% year-one with deal registration) — are managed through a dedicated partner portal at <code className="bg-black/10 border border-black/20 px-1 py-0.5">/partner</code>. Partners get real-time commission tracking, referral link management, lead registration, and a full content library covering positioning, campaigns, compliance, and technical integration.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>Partner portal: dashboard, commissions, conversions, leads, deals, payouts, links, settings — 9 pages with live data from 22 new DB tables</li>
                                <li>Attribution stack: deal registration wins over registered lead which wins over cookie last-touch; 90-day cookie window; multi-touch credit splitting across touchpoints</li>
                                <li>Commission lifecycle: <code className="bg-black/10 border border-black/20 px-1 py-0.5">pending → approved → in_payout → paid</code> with 30-day hold on SaaS commissions, 60-day hold on Enterprise</li>
                                <li>Dynamic referral link builder at <code className="bg-black/10 border border-black/20 px-1 py-0.5">/partner/links</code> — UTM parameters, vanity slugs, conversion-rate column, click history</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">24-Article Partner Docs</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                Every section of the partner lifecycle has a dedicated reference article at <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">/partner/docs/[slug]</code>. Articles are written for the partner audience — not internal docs, not marketing copy. Technical partners get real code; agency partners get full campaign templates with production-ready copy.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li><strong>Positioning (4)</strong> — P402 in one sentence, ideal customer profile, approved claims, prohibited language</li>
                                <li><strong>Product (4)</strong> — How x402 works, why AP2 mandates matter, Bazaar distribution model, Router vs. direct API</li>
                                <li><strong>Campaigns (4)</strong> — Newsletter templates (3 full editions), X/Twitter threads (4 complete threads), YouTube descriptions, email sequences</li>
                                <li><strong>Compliance (4)</strong> — FTC/ASA disclosure guide, brand guidelines, prohibited methods, brand bidding policy</li>
                                <li><strong>Technical (4)</strong> — SDK quickstart with code, x402 code walkthrough, building a paid agent, MCP integration guide</li>
                                <li><strong>Payouts (4)</strong> — Commission calculation, hold period rules, tax form requirements, payout timeline</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-neutral-50">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Admin Partner Management & Attribution API</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                Partner operations are managed from a new section of the admin console. Commission approval, payout batch processing, deal registration review, and fraud flags are all accessible without touching the database directly.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>Attribution tracking endpoint: <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">GET /api/partner/track</code> — records clicks, resolves partner from slug, sets 90-day cookie, redirects to destination</li>
                                <li>Referral conversion API: <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">POST /api/partner/conversions</code> — called on checkout completion, applies attribution precedence, auto-queues commission at the correct rate for the partner&apos;s track and tier</li>
                                <li>Migration: <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">v2_016_partner_core.sql</code> + <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">v2_017_partner_attribution.sql</code> — 22 tables including partner profiles, links, commissions, payouts, deal registrations, content assets, and attribution events</li>
                                <li>Footer updated with Partners column: Partner Program, Apply, Dashboard, Docs, Assets</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── April 16, 2026 ───────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">Diataxis Documentation System</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">April 16, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">12 Live Documentation Pages — Four-Quadrant IA</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                The P402 documentation system is rebuilt from scratch using the Diataxis framework: four distinct modes — Tutorials (learning), How-To Guides (task completion), Reference (lookup), and Explanation (understanding). All placeholder pages replaced with production-quality content. 25 Playwright smoke tests green across all three doc categories.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li><strong>Tutorials</strong> — <code className="bg-black/10 border border-black/20 px-1 py-0.5">/docs/guides/budget-agent</code>: five-step Python/TypeScript guide; agent submits task, P402 routes, settles in USDC, checks balance</li>
                                <li><strong>How-To (7)</strong> — MCP server setup (Claude Desktop, Cursor, SSE host), session lifecycle, USDC funding with EIP-3009 deposit + bridge options, routing mode decision guide, semantic cache enable/disable/monitor, API key create/rotate/revoke</li>
                                <li><strong>Reference (3)</strong> — full CLI command reference, Billing Guard 6-layer protection with every error code, complete error code table with retry guidance</li>
                                <li><strong>Explanation (2)</strong> — system architecture (routing engine, cache, x402, intelligence, ERC-8004), security model (EIP-3009, replay protection, gas limits, key hashing, threat model)</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Agent Quickstart & /docs Landing</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                The <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">/docs</code> landing page is redesigned as a four-quadrant navigation hub. A dedicated agent quickstart guide covers the A2A protocol from first principles — AgentCard, task lifecycle, x402 extension, and mandate-gated sessions — with complete code examples for both sending and receiving agents.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>All &ldquo;coming soon&rdquo; links activated — no dead ends in the docs navigation</li>
                                <li>Consistent component system: <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">SectionLabel</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">Callout</code> (lime/neutral/warn variants), <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">CodeBlock</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">TableBlock</code> across all 12 pages</li>
                                <li>SEO: each page has canonical URL, OpenGraph metadata, and structured breadcrumb</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── April 7, 2026 ────────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">E2E Test Suite & Traffic Instrumentation</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">April 7, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">65 Playwright Tests — Full Golden Path Coverage</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                A complete Playwright E2E suite ships covering the core product surfaces. 65 tests pass across smoke, functional, resilience, PLG funnel, and wallet billing scenarios. Web3 wallet interactions are mocked via <code className="bg-black/10 border border-black/20 px-1 py-0.5">page.addInitScript()</code> — no browser extension required in CI.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li><code className="bg-black/10 border border-black/20 px-1 py-0.5">smoke.spec.ts</code> — public page load, nav, health endpoint, footer links</li>
                                <li><code className="bg-black/10 border border-black/20 px-1 py-0.5">functional.spec.ts</code> — routing playground, provider comparison, session create</li>
                                <li><code className="bg-black/10 border border-black/20 px-1 py-0.5">error-resilience.spec.ts</code> — provider failover, API error surfaces, SSE reconnect</li>
                                <li><code className="bg-black/10 border border-black/20 px-1 py-0.5">audit-plg-funnel.spec.ts</code> — SSE trace stream mocked via <code className="bg-black/10 border border-black/20 px-1 py-0.5">route.fulfill()</code></li>
                                <li><code className="bg-black/10 border border-black/20 px-1 py-0.5">wallet-billing.spec.ts</code> — EIP-2612 permit flow mocked via <code className="bg-black/10 border border-black/20 px-1 py-0.5">eth_signTypedData_v4</code> override</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">traffic_events Instrumentation</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                Every routed request now writes a structured event to the <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">traffic_events</code> table — including provider selected, routing mode, latency, cost, cache hit status, and settlement outcome. This powers the Requests and Savings dashboard pages with real per-request data rather than aggregates.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>Write path is non-blocking — event insert never delays the API response</li>
                                <li><code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">.env.test.local</code> auto-loaded in Playwright config — test DB URL isolated from production Neon instance</li>
                                <li>Edge middleware re-written to remove <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">node:crypto</code> dependency — compatible with Vercel Edge Runtime</li>
                            </ul>
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
                                A dedicated admin console at <code className="bg-black/10 border border-black/20 px-1 py-0.5">/admin</code> replaces ad-hoc database access for platform operations. Separate auth stack from the user-facing product — DB sessions, scrypt password hashing, AES-256-GCM TOTP — with middleware IP allowlist enforcement.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>5 roles: <code className="bg-black/10 border border-black/20 px-1 py-0.5">super_admin</code>, <code className="bg-black/10 border border-black/20 px-1 py-0.5">ops_admin</code>, <code className="bg-black/10 border border-black/20 px-1 py-0.5">analytics</code>, <code className="bg-black/10 border border-black/20 px-1 py-0.5">safety</code>, <code className="bg-black/10 border border-black/20 px-1 py-0.5">finance</code> — each with scoped read/write permissions per page</li>
                                <li>10 pages: Overview (KPI command center), Users, Analytics, Health, Safety, Intelligence, Bazaar, Admins, Audit Log, System</li>
                                <li>Overview: KPI cards with sparklines, revenue and request growth chart (colorblind-safe, zero-baseline, tooltips), provider health pulse, recent anomaly feed</li>
                                <li>DB: migration <code className="bg-black/10 border border-black/20 px-1 py-0.5">v2_035_admin_system.sql</code> — admin_users, admin_sessions, admin_audit_log, permissions; bootstrap script seeds the first super_admin</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Audit Log & Safety Console</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                Every admin action is written to <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">admin_audit_log</code> with before/after JSONB diff. The Safety page exposes quarantined sessions, flagged agents, and anomaly alerts with inline approve/escalate/dismiss controls. The Intelligence page mirrors the Gemini economist and sentinel outputs for ops review.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>Audit log: filterable by admin, action type, and target entity; JSONB diff viewer shows exactly what changed</li>
                                <li>Admin component library: <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">DataTable</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">RoleBadge</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">HealthPulse</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">StatusBadge</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">GrowthChart</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">AdminButton</code> — shared across all 10 pages</li>
                                <li>Login page redesigned in Neo-Brutalist system — no white-on-white input text</li>
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
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">8 New Intelligence Layer Surfaces</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                The Intelligence Layer dashboard expands with session management, trace policy inspection, and memory visibility. Every surface that was previously opaque — why a request was denied, whether the cache served it, what knowledge sources were used — is now inspectable without leaving the dashboard.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li><strong>Sessions page</strong> — budget utilization bars, lifecycle status (active / expired / ended), expandable policy and wallet detail, end-session CTA, AP2 mandate linkage, deep-links to Requests + Traces per session</li>
                                <li><strong>Policy Checks panel</strong> (trace detail) — derives from verify/settle node outcomes + policy-error strings; per-check pass/fail with denial detail for denied requests</li>
                                <li><strong>Context &amp; Memory panel</strong> (trace detail) — semantic cache hit callout (LLM skipped, cost $0.00), knowledge retrieval nodes with source name, latency, and status</li>
                                <li><strong>Route Decision block</strong> (trace detail) — winner selection reason, rejected alternatives with scores, dry-run preview via <code className="bg-black/10 border border-black/20 px-1 py-0.5">POST /api/v1/execute/preview</code></li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Requests & Evals UX Improvements</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                Targeted UX hardening across the execution log and eval surfaces. Baseline updated from GPT-4o to <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">claude-sonnet-4-6</code> ($0.000003/token) across savings calculations, the hero card, and the daily bar chart.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>Requests table: keyboard navigation — <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">↑↓</code> select row, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">↵</code> open trace, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">R</code> refresh; double-click to trace; copyable <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">curl</code> in empty state</li>
                                <li>Evals: failed eval re-run CTA with pre-populated task URL; Knowledge page source-type grid empty state</li>
                                <li>AppSidebar: Sessions entry added (Layers icon); flex overflow scroll bug fixed</li>
                                <li><code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">POST /api/v1/execute/preview</code> — dry-run provider scoring endpoint, returns ranked providers and scores without making an LLM call</li>
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
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Execution Intelligence — 6 New Dashboard Surfaces</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                The Intelligence Layer now has a full dashboard presence. Every request P402 routes, every trace it records, every dollar it saves, and every quality score it evaluates is now visible, navigable, and actionable — without leaving the dashboard.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li><strong>Requests</strong> — paginated execution log with status, routing mode, actual cost, savings vs claude-sonnet-4-6 baseline, and one-click trace navigation; keyboard shortcuts: <code className="bg-black/10 border border-black/20 px-1 py-0.5">↑↓</code> to select rows, <code className="bg-black/10 border border-black/20 px-1 py-0.5">↵</code> to open trace, <code className="bg-black/10 border border-black/20 px-1 py-0.5">R</code> to refresh</li>
                                <li><strong>Traces</strong> — per-request execution graph showing every node (model, tool, retrieval, verify, settle, cache) with latency, cost, provider, and evaluation scores; task text and savings % shown in a hero block at the top</li>
                                <li><strong>Savings</strong> — period analytics (7d / 30d / 90d) with a hero card showing total saved and % below claude-sonnet-4-6 baseline; daily bar chart, breakdown by routing mode, provider spend distribution</li>
                                <li><strong>Evals</strong> — response quality evaluation log from verify nodes; per-eval scores for relevance, completeness, groundedness, and coherence; failed evals surface a direct fix path with a &ldquo;Re-run with Planned&rdquo; action</li>
                                <li><strong>Knowledge</strong> — RAG source registry (URL, file, API, plain text) with trust levels, chunk counts, and add/remove controls; used by retrieve nodes in planned executions</li>
                                <li><strong>Tools</strong> — registered tool catalog showing built-in and custom tools, parameter schemas, and execution history</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Mission Control: Intelligence Summary</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                The main dashboard now shows a live Intelligence Layer summary: total requests this week, total dollars saved (with % vs baseline), and eval pass rate — each linking directly to its drill-down page. Data refreshes automatically every 30–60 seconds.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>Powered by three new REST endpoints: <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">GET /api/v1/requests</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">GET /api/v1/savings?period=7d</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">GET /api/v1/evals</code> — each with pagination, filters, and aggregate stats</li>
                                <li>Savings computed server-side: baseline estimated from claude-sonnet-4-6 reference rate ($3/1M tokens) applied to task token count; actual cost vs baseline delta stored on <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">execute_requests.baseline_cost</code> at write time</li>
                                <li>DB: migration <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">v2_034</code> adds <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">baseline_cost</code> to <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">execute_requests</code> and <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">provider_id</code> / <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">model_id</code> to <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">execute_trace_nodes</code></li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Trace Enrichment — Single-Query JOIN</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">getTrace()</code> now returns full enrichment in a single round trip: plan node labels, tool execution I/O, evaluation scores, and originating task text are all resolved server-side. No N+1 queries at the API layer.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>Three LEFT JOINs added: <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">execute_plan_nodes</code> (label), <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">tool_executions</code> (I/O, latency, error), <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">execute_evaluations</code> (scores, pass/fail)</li>
                                <li>Trace detail page shows task text, cost savings %, provider, and model in a context hero block — the first thing visible before any node detail</li>
                                <li>Adaptive cost formatting: <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">formatCost()</code> renders 2 decimals ≥ $1, 4 decimals ≥ $0.01, 6 decimals below — no trailing noise at any scale</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-neutral-50">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Escrow Toggle & A2A Idempotency</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                Two targeted hardening changes ship alongside the Intelligence Layer.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li><strong>Escrow toggle in Settings</strong> — per-tenant control over auto-escrow on Bazaar tasks; when disabled, all tasks use direct x402 settlement at the plan-rate fee (no 2% escrow fee); migration <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">v2_024</code> adds <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">escrow_enabled</code> to <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">tenant_settings</code> (default: <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">TRUE</code> — existing behavior preserved)</li>
                                <li><strong>A2A idempotency keys</strong> — clients can now set an <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">Idempotency-Key</code> header on <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">tasks/send</code> requests; duplicate submissions within the same tenant return the original task rather than creating a second; constraint is scoped per <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">(tenant_id, idempotency_key)</code> with a partial unique index that excludes NULLs — backwards compatible</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── March 23, 2026 ───────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">P402Escrow — Conditional Settlement on Base</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">March 23, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">P402Escrow.sol — Live on Base Mainnet</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                Conditional USDC escrow contract deployed to Base mainnet at <code className="bg-black/10 border border-black/20 px-1 py-0.5">0x4596c0e69d08e4ca6f02c7a129fc2bff8a6905ac</code>. Funds lock on-chain at job creation and release only when the payer confirms delivery — or P402 resolves a dispute. Protocol fee: 1% to treasury on settlement. Dispute window: 48 hours after provider marks delivery.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>State machine: <code className="bg-black/10 border border-black/20 px-1 py-0.5">CREATED → FUNDED → ACCEPTED → IN_PROGRESS → DELIVERED → SETTLED</code> — with <code className="bg-black/10 border border-black/20 px-1 py-0.5">DISPUTED → RESOLVED</code> and <code className="bg-black/10 border border-black/20 px-1 py-0.5">EXPIRED / CANCELLED</code> exit paths</li>
                                <li>REST API: <code className="bg-black/10 border border-black/20 px-1 py-0.5">POST /api/v2/escrow</code> (create), <code className="bg-black/10 border border-black/20 px-1 py-0.5">GET /api/v2/escrow/[id]</code> (detail + event log), <code className="bg-black/10 border border-black/20 px-1 py-0.5">POST /api/v2/escrow/[id]</code> (transition: fund | accept | start | deliver | release | dispute)</li>
                                <li>DB: <code className="bg-black/10 border border-black/20 px-1 py-0.5">escrows</code> and <code className="bg-black/10 border border-black/20 px-1 py-0.5">escrow_events</code> tables via migration <code className="bg-black/10 border border-black/20 px-1 py-0.5">v2_020_escrow.sql</code>; evidence bundle endpoint at <code className="bg-black/10 border border-black/20 px-1 py-0.5">GET /api/v1/analytics/evidence-bundle/[escrow_id]</code></li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Bazaar Auto-Escrow — Phase 3.2</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                Any A2A task submitted via the Bazaar with <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">price_usd ≥ $1.00</code> and a <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">provider_address</code> automatically creates an escrow — no extra API calls required. The <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">escrow_id</code> is returned in task <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">metadata</code> and stored in task <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">configuration</code> JSONB. Escrow creation is non-blocking — task proceeds even if escrow fails.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>Dashboard: Bazaar SETTLE button now routes to escrow creation (≥$1 + provider wallet) or direct EIP-3009 settlement (&lt;$1)</li>
                                <li>My Escrows panel in <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">/dashboard/bazaar</code> — live state with action buttons (Fund → Accept → Start → Deliver → Release / Dispute)</li>
                                <li><code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">bazaar_resources.provider_wallet_address</code> added — populated from <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">payTo</code> in x402 manifests during ingest; powers escrow recipient resolution</li>
                                <li>New <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">useEscrow</code> hook — polls <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">/api/v2/escrow</code>, exposes <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">createEscrow()</code> and <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">transition()</code></li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Platform & Docs</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                Escrow surfaced across the full product surface. Models page now falls back to local registry (13 providers, all with live pricing) when OpenRouter is unavailable, eliminating the &ldquo;Error loading live prices&rdquo; state entirely.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>New <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">/docs/escrow</code> — state machine table, quick start code, full API reference, dispute window details</li>
                                <li>New <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">/product/escrow</code> — Lock / Deliver / Release overview with agent commerce, creative work, and API access use cases</li>
                                <li>Landing page updated to six capabilities: Routing, Payments, Escrow, Controls, Orchestration, Ecosystem</li>
                                <li><code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">GET /api/v2/models</code> falls back to <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">getProviderRegistry().getAllModels()</code> on OpenRouter failure — models page always renders</li>
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
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Human-Anchored Credits — World ID Free Trial</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                World ID verification now unlocks 500 free credits ($5.00) on the first verified request. Credits are a first-class billing primitive — 1 credit equals $0.01 USD, consumed atomically via <code className="bg-black/10 border border-black/20 px-1 py-0.5">UPDATE ... WHERE balance &gt;= amount</code> — no overdraft is possible. When credits are exhausted, sessions fall through to standard USDC billing with no disruption.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li><code className="bg-black/10 border border-black/20 px-1 py-0.5">p402_metadata</code> extended: <code className="bg-black/10 border border-black/20 px-1 py-0.5">human_verified</code>, <code className="bg-black/10 border border-black/20 px-1 py-0.5">human_usage_remaining</code>, <code className="bg-black/10 border border-black/20 px-1 py-0.5">reputation_score</code>, <code className="bg-black/10 border border-black/20 px-1 py-0.5">credits_spent</code>, <code className="bg-black/10 border border-black/20 px-1 py-0.5">credits_balance</code> — returned on every <code className="bg-black/10 border border-black/20 px-1 py-0.5">POST /api/v2/chat/completions</code> response</li>
                                <li>New credit API surface: <code className="bg-black/10 border border-black/20 px-1 py-0.5">GET /api/v2/credits/balance</code>, <code className="bg-black/10 border border-black/20 px-1 py-0.5">POST /api/v2/credits/purchase</code> (<code className="bg-black/10 border border-black/20 px-1 py-0.5">mode: &apos;test&apos; | &apos;paid&apos;</code>), <code className="bg-black/10 border border-black/20 px-1 py-0.5">GET /api/v2/credits/history</code></li>
                                <li>CLI: <code className="bg-black/10 border border-black/20 px-1 py-0.5">p402 credits balance</code> and <code className="bg-black/10 border border-black/20 px-1 py-0.5">p402 credits buy &lt;amount_usd&gt;</code></li>
                                <li>MCP: new <code className="bg-black/10 border border-black/20 px-1 py-0.5">p402_agent_status</code> tool — checks AgentBook registration and returns live <code className="bg-black/10 border border-black/20 px-1 py-0.5">credits_remaining</code> for any wallet address</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">World Mini App — world.p402.io</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                A standalone Next.js 15 mini app purpose-built for the World App ecosystem. Deployed separately from the Base Mini App at <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">world.p402.io</code> — different SDK, different store, same P402 backend linked via <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">human_id_hash</code>.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>Auth via <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">MiniKit.commandsAsync.walletAuth</code> — SIWE-style session, returns scoped HMAC bearer token tied to the World wallet address</li>
                                <li>Credit purchases via <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">MiniKit.commandsAsync.pay()</code> — four tiers ($5 / $10 / $50 / $100 USDC); World App handles the transaction, P402 credits the balance on confirmation</li>
                                <li>4 tabs: Chat (streaming, cost display), Agents (A2A registry browser), Credits (balance + history), Settings (routing mode, identity, reputation)</li>
                                <li>Session endpoint at <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">POST /api/v1/world-mini/session</code> — derives tenant from wallet address, auto-grants free trial credit for newly verified humans</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Base Mini App — World ID Integration</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                The existing Farcaster mini app at <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">mini.p402.io</code> is updated to surface World ID verification state and credit balance inline — no new screens, state flows in from <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">p402_metadata</code> on every chat response.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>Header: <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">[VERIFIED]</code> badge appears when <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">humanVerified</code> is true — shows free-uses remaining or credit count</li>
                                <li>Chat input: tri-state indicator — free trial active (lime), credit balance available (neutral), low USDC funds warning (amber) — each mutually exclusive</li>
                                <li>Settings modal: World ID section with deep link to <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">worldapp://verify</code> for unverified users; verified state shows FREE USES / CREDITS / REP SCORE grid</li>
                                <li>Agents panel: inline <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">VERIFIED</code> trust badge on agents where <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">human_verified: true</code></li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-neutral-50">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Model Catalog — /models</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                Live model comparison page added to the main nav. Pulls from <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">GET /api/v2/models</code> which is now backed by an hourly cron sync from OpenRouter into a <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">model_prices</code> table — pricing is current within 1 hour of provider changes.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>300+ models filterable by provider and capability; sortable by input cost, context window, or name</li>
                                <li>Cost calculator: input token count × output token count × daily requests → direct API cost vs P402 (22% blended savings via caching and routing)</li>
                                <li>DB: <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">model_prices</code> table with <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">model_price_history</code> for trend tracking; Redis cache key <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">p402:models:openrouter</code> (TTL 1hr)</li>
                                <li>Sync cron at <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">POST /api/internal/cron/models/sync</code> — marks models dropped by OpenRouter as <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">is_active = FALSE</code> rather than deleting them</li>
                            </ul>
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
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">p402-protocol.p402 — Embedded MCP Server in VS Code</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                The P402 VS Code extension ships an embedded MCP server registered via <code className="bg-black/10 border border-black/20 px-1 py-0.5">McpServerDefinitionProvider</code>. Installing the extension is the entire setup — no <code className="bg-black/10 border border-black/20 px-1 py-0.5">mcp.json</code> editing, no manual server start. VS Code spawns <code className="bg-black/10 border border-black/20 px-1 py-0.5">dist/mcp-server.mjs</code> as a child process when Copilot agent mode needs it, and all 6 P402 tools appear immediately.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>Install: Extensions panel → search <code className="bg-black/10 border border-black/20 px-1 py-0.5">P402</code> — or <code className="bg-black/10 border border-black/20 px-1 py-0.5">ext install p402-protocol.p402</code></li>
                                <li>Published simultaneously to VS Code Marketplace and Open VSX (Eclipse Theia, Gitpod, VSCodium)</li>
                                <li>The MCP server binary is bundled into the extension at build time via esbuild — no npm fetch at runtime, no Node version dependency</li>
                                <li>Requires only <code className="bg-black/10 border border-black/20 px-1 py-0.5">P402_API_KEY</code> set via the <code className="bg-black/10 border border-black/20 px-1 py-0.5">P402: Configure API Key</code> command</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Extension Surface</h3>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li><strong>Status bar</strong> — shows current router mode (<code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">⚡ P402: balanced</code>); click to switch modes via quick-pick</li>
                                <li><strong>Activity bar + sidebar</strong> — three tree views: Sessions (budget remaining, spend, request count), Recent requests (model, cost, latency), Provider status (healthy / degraded / down per provider)</li>
                                <li><strong>Command palette</strong> — <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">P402: Configure API Key</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">P402: Switch Router Mode</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">P402: Create Budget Session</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">P402: Open Dashboard</code></li>
                                <li><strong>Settings UI</strong> — <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">p402.apiKey</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">p402.routerMode</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">p402.showStatusBar</code></li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-neutral-50">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Distribution</h3>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>VS Code Marketplace: <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">marketplace.visualstudio.com/items?itemName=p402-protocol.p402</code></li>
                                <li>Open VSX: <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">open-vsx.org/extension/p402-protocol/p402</code></li>
                                <li>Source: <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">packages/vscode/</code> in the monorepo; CI publishes to both registries on <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">vscode/v*</code> tags</li>
                                <li>VS Code&apos;s <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">@mcp</code> gallery search also surfaces P402 via the MCP Registry listing (<code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">io.github.Z333Q/p402</code>) — the extension and registry listing are complementary, not redundant</li>
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
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">@p402/mcp-server — P402 as an MCP Tool Server</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                P402 routing and x402 settlement are now accessible via the Model Context Protocol stdio transport. Agent runtimes that speak MCP — Claude Desktop, Cursor, Windsurf, or any custom host — can route LLM requests across 300+ models and settle per-call in USDC on Base without implementing an HTTP client, managing wallet signing, or handling provider credentials directly.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>Spawned as a stdio subprocess — no open ports, no daemon process required</li>
                                <li>Requires only <code className="bg-black/10 border border-black/20 px-1 py-0.5">P402_API_KEY</code> — no wallet private key at the MCP layer</li>
                                <li>All routing logic, billing guard enforcement, and on-chain settlement run on the P402 backend unchanged; the MCP layer is a thin adapter over <code className="bg-black/10 border border-black/20 px-1 py-0.5">POST /api/v2/chat/completions</code> and <code className="bg-black/10 border border-black/20 px-1 py-0.5">POST /api/v2/sessions</code></li>
                                <li>Budget enforcement is identical to the REST API — a session with a $5.00 cap cannot be exceeded regardless of tool call volume</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">6 Tools</h3>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li><code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">p402_chat</code> — routes a prompt to the optimal provider by mode (cost / quality / speed / balanced); settles payment atomically if a session token is supplied; returns completion, provider used, cost in USD, and latency</li>
                                <li><code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">p402_create_session</code> — creates a budget session with a hard USD cap; returns a <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">session_token</code> scoped to that budget</li>
                                <li><code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">p402_get_session</code> — returns <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">balance_remaining</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">amount_spent_usd</code>, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">request_count</code>, and status</li>
                                <li><code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">p402_list_models</code> — enumerates all routable models with provider, context window, and per-token pricing; filterable by provider</li>
                                <li><code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">p402_compare_providers</code> — returns all providers serving a given model with cost and p95 latency side-by-side</li>
                                <li><code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">p402_health</code> — router uptime, facilitator settlement status, and active provider count</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-neutral-50">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Distribution</h3>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>Published to npm as <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">@p402/mcp-server</code> — zero-install via <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">npx -y @p402/mcp-server</code></li>
                                <li>Listed on the official MCP Registry as <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">io.github.Z333Q/p402</code> at <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">registry.modelcontextprotocol.io</code></li>
                                <li>Indexed in community directories: punkpeye/awesome-mcp-servers (Finance &amp; Fintech), wong2/awesome-mcp-servers, mcp.so, mcpindex.net, mcpserverfinder.com</li>
                                <li>Source in monorepo at <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">packages/mcp-server/</code> — TypeScript, <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">@modelcontextprotocol/sdk</code></li>
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
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">4-State Authorization Model</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                P402 now formalizes authorization as a progression: <strong>Visitor → Identity Only → Wallet Linked → Payment Ready</strong>.
                                Each state is computed server-side at <code className="bg-black/10 border border-black/20 px-1 py-0.5">GET /api/v2/auth/state</code> and
                                surfaced throughout the product with a clear, low-friction path to the next state.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>State is derived from the NextAuth session: CDP email users resolve to <code className="bg-black/10 px-1">wallet_linked</code> immediately; Google OAuth users are resolved against the account&apos;s linked wallet address</li>
                                <li>Dashboard banner renders contextually per state — amber for unactivated payments, dark for unfunded wallet, silent when payment-ready</li>
                                <li>Nav wallet indicator distinguishes Google-only sessions ("Activate Payments") from wallet-linked sessions (address chip) without triggering RainbowKit</li>
                                <li>Mobile nav no longer surfaces a wallet connect prompt for unauthenticated visitors</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Google OAuth → Wallet Activation Path</h3>
                            <p className="text-neutral-700 leading-relaxed">
                                Google OAuth users encounter a dedicated wallet activation pre-step in onboarding. The CDP email field is pre-filled from
                                the Google session. The step is skippable; deferred state is tracked in <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">localStorage</code> and
                                surfaces an inline activation prompt on the dashboard. Users who skip remain in <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">identity_only</code> state —
                                dashboard and API key access is unaffected; payment routes return a 402 until a wallet is linked.
                            </p>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-neutral-50">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Builder Onboarding Path</h3>
                            <p className="text-neutral-700 leading-relaxed">
                                Developers who select the <strong>Build &amp; Route</strong> role now receive targeted onboarding copy: no personal wallet required,
                                agent sessions use CDP server wallets funded by clients, with a direct reference to the <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">POST /api/v2/sessions</code> endpoint
                                and <code className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5">wallet_source: &quot;cdp&quot;</code> parameter.
                            </p>
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
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Email OTP — Embedded Wallet on First Login</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                Sign in with an email address. A self-custody Base wallet is provisioned automatically via Coinbase Developer Platform (CDP)
                                Embedded Wallet — no browser extension, no seed phrase, no prior crypto experience required.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>OTP delivery and wallet creation complete in under 500 ms end-to-end</li>
                                <li>Private keys are generated and stored inside Coinbase&apos;s AWS Nitro Enclave (TEE) — never transmitted to the P402 server</li>
                                <li>Session identity: wallet address is the primary identity token, no separate linking step</li>
                                <li>First login presents a wallet acknowledgment screen with address and network confirmation</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">CDP Server Wallet for Facilitator Signing</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                The x402 facilitator signing wallet supports two modes, selectable via environment variable:
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li><strong>Mode A — CDP TEE</strong> (<code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">CDP_SERVER_WALLET_ENABLED=true</code>): private key never touches the Node.js process; signing happens inside Coinbase&apos;s Nitro Enclave. Recommended for production.</li>
                                <li><strong>Mode B — raw key</strong>: legacy local-dev fallback using <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">P402_FACILITATOR_PRIVATE_KEY</code></li>
                                <li>Active mode is exposed at <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">GET /api/v1/facilitator/health</code> → <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">&quot;mode&quot;: &quot;cdp-server-wallet&quot; | &quot;raw-key&quot;</code></li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-neutral-50">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Guided Wallet Funding — Onboarding Step 3</h3>
                            <p className="text-neutral-700 mb-2 leading-relaxed">
                                Onboarding is now 4 steps: <strong>Role → API Key → Fund Wallet → Orientation</strong>.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>Fund Wallet step displays the connected wallet address with a one-click copy button</li>
                                <li>Instructions: copy address → send USDC on Base → the dashboard detects the deposit and transitions state automatically</li>
                                <li>Minimum deposit: $0.01 USDC. Contract: <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913</code></li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── March 2, 2026 ─────────────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">Protocol, SDK & CLI Launch</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">March 2, 2026</span>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">P402 Protocol — Open Source</h3>
                            <p className="text-neutral-700 mb-4 leading-relaxed">
                                The core P402 protocol specification and reference implementations are open source. Includes
                                the x402 payment extension schema, AP2 mandate format, A2A JSON-RPC method definitions, and
                                the ERC-8004 agent identity registry interface.
                            </p>
                            <a href="https://github.com/z333q/p402-protocol" target="_blank" rel="noopener noreferrer" className="text-sm font-black uppercase tracking-widest bg-primary px-4 py-2 border-2 border-black inline-block hover:bg-black hover:text-white transition-colors">
                                github.com/z333q/p402-protocol ↗
                            </a>
                        </div>
                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Developer SDK</h3>
                            <p className="text-neutral-700 leading-relaxed">
                                <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">@p402/sdk</code> provides typed wrappers for routing requests, issuing AP2 mandates,
                                verifying x402 payment payloads, and interacting with the A2A task API. TypeScript-first; ships ESM and CJS.
                            </p>
                        </div>
                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">CLI</h3>
                            <p className="text-neutral-700 leading-relaxed">
                                Manage facilitators, inspect routing decisions, check wallet balances, and tail live traffic from the terminal.
                                Wraps the same REST endpoints exposed by the dashboard — no separate auth flow required; uses your existing API key.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ── Feb 24 – Mar 2, 2026 ──────────────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-6 border-b-2 border-black pb-2 gap-2">
                        <h2 className="title-2 m-0 text-2xl">Infrastructure & Platform</h2>
                        <span className="mono-id text-sm border-2 border-black px-2 py-1 bg-neutral-100">Feb 24 – Mar 2, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 bg-[#B6FF2E] border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                            <h3 className="font-black uppercase tracking-tighter text-lg mb-3">P402 Claude Skill</h3>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>Claude skill released covering routing modes, billing guard limits, session lifecycle, x402 payment settlement, A2A protocol, and provider cost comparison</li>
                                <li>Skill surfaced in footer, landing CTAs, and mobile navigation</li>
                                <li>Trained on Feb 2026 models; includes concrete migration examples from direct OpenAI/Anthropic API calls</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-lg mb-3">Base Mainnet Smart Contracts</h3>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li><code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">P402Settlement</code> deployed at <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">0xd03c7ab9a84d86dbc171367168317d6ebe408601</code> — marketplace settlement with 1% protocol fee</li>
                                <li><code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">SubscriptionFacilitator</code> deployed at <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">0xc64747651e977464af5bce98895ca6018a3e26d7</code> — EIP-2612 recurring billing, gasless for subscribers after month 1</li>
                                <li>Treasury: <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6</code></li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-lg mb-3">Stripe & Billing Hardening</h3>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>Webhook handler uses <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">req.text()</code> before signature verification — required by Next.js 15 to prevent body pre-parsing from breaking HMAC validation</li>
                                <li>All billing events use <code className="bg-neutral-100 border border-neutral-200 px-1 py-0.5">INSERT ... ON CONFLICT</code> — idempotent against transient duplicate webhook delivery</li>
                                <li>Environment validation enforced at startup; missing required keys abort boot rather than surface at runtime</li>
                                <li>E2E billing suite green across Node 18 and 20</li>
                            </ul>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    )
}
