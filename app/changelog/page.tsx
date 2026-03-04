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
                <p className="mono-id" style={{ marginBottom: 48 }}>Track updates to P402 infrastructure and tools.</p>

                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">CDP Wallet Integration</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">March 4, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-[#B6FF2E]">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Email OTP Login — No Crypto Wallet Required</h3>
                            <p className="text-neutral-900 mb-3 leading-relaxed">
                                Sign in with just your email address. An embedded Base wallet is created automatically — no MetaMask, no seed phrases, no browser extensions.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li>Powered by Coinbase Developer Platform (CDP) Embedded Wallet</li>
                                <li>OTP sent to your email → wallet live in under 500 ms</li>
                                <li>Keys secured in Coinbase&apos;s TEE (AWS Nitro Enclave) — never exposed to the server</li>
                                <li>Wallet acknowledgment screen shows address and network on first login</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">CDP Server Wallet for Facilitator Signing</h3>
                            <p className="text-neutral-700 mb-3 leading-relaxed">
                                The x402 facilitator signing wallet can now run in CDP Server Wallet mode — private keys live in Coinbase&apos;s cloud HSM (AWS Nitro Enclave) and are never exposed to the Node.js process.
                            </p>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>Mode A (CDP TEE): recommended for production — zero key exposure</li>
                                <li>Mode B (raw private key): legacy fallback for local development</li>
                                <li>Live mode visible at <code className="bg-neutral-100 border border-neutral-300 px-1 py-0.5">/api/v1/facilitator/health</code> → <code className="bg-neutral-100 border border-neutral-300 px-1 py-0.5">&quot;mode&quot;: &quot;cdp-server-wallet&quot;</code></li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-neutral-50">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">4-Step Onboarding with Wallet Funding</h3>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>New guided onboarding: Role → API Key → Fund Wallet → Orientation</li>
                                <li>Fund Wallet step shows your connected wallet address with a one-click copy button</li>
                                <li>Step-by-step USDC deposit guide (copy address → send USDC on Base → continue)</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section style={{ marginBottom: 48 }}>
                    <div className="flex justify-between items-baseline mb-4 border-b-2 border-black pb-2">
                        <h2 className="title-2 m-0 text-2xl">Protocol, SDK, & CLI Launch</h2>
                        <span className="mono-id text-sm bg-black text-white px-2 py-1">March 2, 2026</span>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="card p-6 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">P402 Protocol Open Sourced</h3>
                            <p className="text-neutral-700 mb-4 leading-relaxed">
                                The core P402 protocol specification and reference implementations are now completely open source and available for the community.
                            </p>
                            <a href="https://github.com/z333q/p402-protocol" target="_blank" rel="noopener noreferrer" className="text-sm font-black uppercase tracking-widest bg-primary px-4 py-2 border-2 border-black inline-block hover:bg-black hover:text-white transition-colors">
                                View on GitHub ↗
                            </a>
                        </div>
                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Developer SDK Released</h3>
                            <p className="text-neutral-700 leading-relaxed">
                                Seamlessly integrate HTTP 402 payment routing into your agents and applications. The new SDK provides a type-safe, developer-friendly interface for the P402 network.
                            </p>
                        </div>
                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-xl mb-3">Command Line Interface (CLI)</h3>
                            <p className="text-neutral-700 leading-relaxed">
                                Manage your facilitators, check balances, and configure routes directly from your terminal. The CLI brings the power of the P402 dashboard to your local environment.
                            </p>
                        </div>
                    </div>
                </section>

                <section style={{ marginBottom: 48 }}>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-6 border-b-2 border-black pb-2 gap-2">
                        <h2 className="title-2 m-0 text-2xl">Recent Platform Updates</h2>
                        <span className="mono-id text-sm border-2 border-black px-2 py-1 bg-neutral-100">Feb 24 - Mar 2, 2026</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="card p-6 bg-[#B6FF2E] border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                            <h3 className="font-black uppercase tracking-tighter text-lg mb-3">🤖 P402 Claude Skill Launch</h3>
                            <ul className="list-disc pl-5 text-neutral-900 text-sm flex flex-col gap-2 font-medium">
                                <li><strong>Full Capability Released:</strong> Shipped the P402 Claude Skill with full website integration.</li>
                                <li><strong>Site-Wide Visibility:</strong> Surfaced across the footer, landing CTAs, and mobile navigation.</li>
                                <li><strong>Upgraded Intelligence:</strong> Targeted to Feb 2026 models with optimized funnel CTAs.</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-lg mb-3">⛓️ Base Mainnet Smart Contracts</h3>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li>Deployed <code className="bg-neutral-100 border border-neutral-300 px-1 py-0.5 whitespace-nowrap">P402Settlement</code> and <code className="bg-neutral-100 border border-neutral-300 px-1 py-0.5 whitespace-nowrap">SubscriptionFacilitator</code> to Base Mainnet.</li>
                                <li>Updated treasury addresses and finalized infrastructure documentation.</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white">
                            <h3 className="font-black uppercase tracking-tighter text-lg mb-3">✨ UX, Branding, & Discoverability</h3>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li><strong>UX Overhaul:</strong> Major improvements to navigation, Trust Center, Product pages, and Evidence Engine.</li>
                                <li><strong>SEO/LLM Discoverability:</strong> Comprehensive refactoring for rich structured data formatting.</li>
                                <li><strong>Copy Refinements:</strong> Enhanced enterprise fee clarity and improved provider strip.</li>
                            </ul>
                        </div>

                        <div className="card p-6 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-neutral-50">
                            <h3 className="font-black uppercase tracking-tighter text-lg mb-3">💳 Stripe & Infrastructure Hardening</h3>
                            <ul className="list-disc pl-5 text-neutral-700 text-sm flex flex-col gap-2">
                                <li><strong>Webhook Security:</strong> Added strict signature guards, secret guards, and idempotency checks.</li>
                                <li><strong>Environment Safety:</strong> Strictly enforced environment validations at build and startup time.</li>
                                <li><strong>Testing:</strong> Brought the test suite to a green status with comprehensive E2E billing tests.</li>
                            </ul>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    )
}
