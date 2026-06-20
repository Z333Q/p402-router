import type { Metadata } from 'next'
import './globals.css'
import GoogleAnalytics from './components/GoogleAnalytics'

export const metadata: Metadata = {
    title: 'P402 | AI Payment Processing, Token Metering & Intelligent Routing',
    description:
        'P402 is production AI infrastructure for payment processing, per-token metering, intelligent multi-provider routing, distributed tracing, compliance auditing, and spend optimization. OpenAI-compatible. Settles micropayments on Base and Tempo.',
    metadataBase: new URL('https://p402.io'),
    keywords: [
        // Core product
        'AI payment processing', 'token metering', 'LLM routing', 'AI cost optimization',
        'per-token billing', 'AI spend management', 'AI audit trail',
        // Technical
        'x402 payment protocol', 'EIP-3009', 'OpenAI-compatible API', 'AI gateway',
        'multi-provider routing', 'semantic cache', 'distributed tracing',
        // Protocols
        'A2A protocol', 'AP2 mandates', 'x402', 'ERC-8004',
        // Business
        'AI metering', 'AI compliance', 'department AI budgets', 'AI observability',
        'agentic payments', 'AI agent governance', 'autonomous agent spending',
        // Blockchain
        'Base blockchain', 'Tempo mainnet', 'USDC micropayments', 'gasless payments',
    ],
    authors: [{ name: 'P402 Protocol Research' }],
    openGraph: {
        title: 'P402 | AI Payment Processing, Token Metering & Intelligent Routing',
        description:
            'Production AI infrastructure: per-token metering, intelligent routing across 300+ models, on-chain micropayment settlement, compliance auditing, and spend optimization.',
        url: 'https://p402.io',
        siteName: 'P402',
        type: 'website',
        locale: 'en_US',
        images: [
            {
                url: '/opengraph-image',
                width: 1200,
                height: 630,
                alt: 'P402 — AI Payment Processing and Token Metering Infrastructure',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'P402 — AI Payment Processing & Token Metering',
        description: 'Per-token AI billing, intelligent routing, on-chain settlement, compliance auditing. OpenAI-compatible.',
        site: '@p402io',
        images: ['/opengraph-image'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    alternates: {
        canonical: 'https://p402.io',
    },
    icons: {
        icon: '/favicon.png',
        apple: '/favicon.png',
    },
    other: {
        'talentapp:project_verification': '40df97d439212fe62ca4cdda435f46a7f0aa749026e971d62fb274535da77606ca5b6b53a5734cd1c81b8cd192a03efc133660fb2cb8f9808a114cb1c1f56e70',
    },
}

// JSON-LD Structured Data for SEO & LLMs
const jsonLd = [
    {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'P402',
        url: 'https://p402.io',
        logo: 'https://p402.io/favicon.png',
        description: 'Production AI infrastructure for payment processing, per-token metering, intelligent routing, distributed tracing, compliance auditing, and spend optimization.',
        knowsAbout: [
            'AI Payment Processing', 'Token Metering', 'LLM Routing', 'x402 Protocol',
            'EIP-3009 Gasless Payments', 'A2A Protocol', 'AI Compliance Auditing',
            'Agent-to-Agent Commerce', 'Micropayment Settlement', 'AI Cost Optimization',
        ],
        sameAs: ['https://x.com/p402io', 'https://github.com/Z333Q/p402-router'],
        hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'P402 Products',
            itemListElement: [
                {
                    '@type': 'Offer',
                    itemOffered: {
                        '@type': 'SoftwareApplication',
                        name: 'P402 Meter',
                        applicationCategory: 'BusinessApplication',
                        description: 'Per-token AI billing with department attribution, budget enforcement, and on-chain settlement on Tempo mainnet.',
                        url: 'https://p402.io/meter',
                    }
                },
                {
                    '@type': 'Offer',
                    itemOffered: {
                        '@type': 'SoftwareApplication',
                        name: 'P402 Router',
                        applicationCategory: 'DeveloperApplication',
                        description: 'Intelligent multi-provider LLM routing across 300+ models with cost/speed/quality optimization and semantic cache.',
                        url: 'https://p402.io/docs/router',
                    }
                },
                {
                    '@type': 'Offer',
                    itemOffered: {
                        '@type': 'SoftwareApplication',
                        name: 'x402 Payment Protocol',
                        applicationCategory: 'FinanceApplication',
                        description: 'EIP-3009 gasless USDC micropayment settlement on Base L2. HTTP 402 as a machine-native payment primitive.',
                        url: 'https://p402.io/docs/facilitator',
                    }
                },
                {
                    '@type': 'Offer',
                    itemOffered: {
                        '@type': 'SoftwareApplication',
                        name: 'P402 Enterprise Dashboard',
                        applicationCategory: 'BusinessApplication',
                        description: 'CFO-grade AI spend analytics: department budgets, employee attribution, model mix, optimization findings.',
                        url: 'https://p402.io/meter/enterprise',
                    }
                },
            ]
        }
    },
    {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'P402',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Any',
        url: 'https://p402.io',
        description: 'AI payment processor and token metering platform. OpenAI-compatible API with intelligent routing, on-chain micropayment settlement, compliance auditing, and enterprise spend management.',
        featureList: [
            'Per-token AI billing on Tempo mainnet',
            'Intelligent routing across 300+ LLM models',
            'EIP-3009 gasless USDC micropayments on Base L2',
            'Department and project attribution for AI spend',
            'Real-time distributed tracing and audit trail',
            'Semantic cache reducing LLM costs 15–40%',
            'AP2 mandate governance for autonomous agents',
            'Google A2A JSON-RPC with x402 payment extension',
            'OpenAI-compatible drop-in replacement',
            'Enterprise budget caps and overage alerts',
        ],
        offers: {
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: '0',
            description: 'Free tier available. Metered billing per token processed.',
        }
    }
]

import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';

const sans = IBM_Plex_Sans({
    weight: ['400', '500', '700'],
    subsets: ['latin'],
    variable: '--font-sans',
});

const mono = IBM_Plex_Mono({
    weight: ['400', '500', '700'],
    subsets: ['latin'],
    variable: '--font-mono',
});

import { Providers } from './providers'

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={`${sans.variable} ${mono.variable}`}>
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd[0]) }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd[1]) }}
                />
            </head>
            <body>
                <Providers>
                    <GoogleAnalytics gaId="G-RMCHPDM6CP" />
                    {children}
                </Providers>
            </body>
        </html>
    )
}
