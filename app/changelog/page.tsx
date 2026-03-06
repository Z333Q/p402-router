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
                <h1 className="title-1" style={{ marginBottom: 8 }}>Changelog</h1>
                <p className="mono-id" style={{ marginBottom: 48 }}>Platform and protocol release history.</p>

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
