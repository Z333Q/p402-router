import type { Metadata } from 'next'
import './globals.css'
import GoogleAnalytics from './components/GoogleAnalytics'

export const metadata: Metadata = {
    title: 'P402 Router | x402 Payment Infrastructure',
    description:
        'The Payment-Aware AI Orchestration Layer. Route LLM requests, enable Agent-to-Agent (A2A) communication, and settle x402 payments with AP2 Mandates on Base.',
    metadataBase: new URL('https://p402.io'),
    keywords: ['AI Agents', 'A2A Protocol', 'x402', 'Payment Mandates', 'LLM Routing', 'Agentic Web', 'USDC', 'Base blockchain'],
    authors: [{ name: 'P402' }],
    openGraph: {
        title: 'P402 Router - x402 Payment Infrastructure',
        description:
            'Routing control plane for x402 payments. Policies, traces, and Bazaar overlays. Accept USDC/USDT on Base.',
        url: 'https://p402.io',
        siteName: 'P402',
        type: 'website',
        locale: 'en_US',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'P402 Router',
        description: 'x402 payment routing infrastructure. USDC/USDT on Base.',
    },
    robots: { index: true, follow: true },
    alternates: {
        canonical: 'https://p402.io',
    },
    icons: {
        icon: '/favicon.png',
        apple: '/favicon.png',
    }
}

// JSON-LD Structured Data for SEO
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'P402 Router',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    description: 'Payment routing infrastructure for HTTP 402 protocol. Accept USDC and USDT stablecoin payments on Base blockchain.',
    url: 'https://p402.io',
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: '1% fee on settled transactions'
    },
    author: {
        '@type': 'Organization',
        name: 'P402',
        url: 'https://p402.io'
    }
}

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
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
