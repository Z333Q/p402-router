import type { Metadata } from 'next'
import './globals.css'
import GoogleAnalytics from './components/GoogleAnalytics'

export const metadata: Metadata = {
    title: 'P402 | The Agentic Economy Operating System',
    description:
        'P402 is the sovereign routing and payment layer for Agent-to-Agent (A2A) and Agent-to-Passenger (A2P) commerce. Powered by Gemini 3 for autonomous policy governance and x402 settlement.',
    metadataBase: new URL('https://p402.io'),
    keywords: [
        'AI Agents', 'A2A Protocol', 'A2P Commerce', 'x402 Payment Required',
        'Agentic Web', 'Autonomous Agents', 'LLM Routing', 'Agent Payments',
        'Base Blockchain', 'Google A2A', 'Agentic Economy', 'AI Governance'
    ],
    authors: [{ name: 'P402 Protocol Research' }],
    openGraph: {
        title: 'P402 | Infrastructure for the Agentic Economy',
        description:
            'The sovereign routing and settlement layer for the Agentic Web. Secure, Intelligent, and A2A-Native.',
        url: 'https://p402.io',
        siteName: 'P402',
        type: 'website',
        locale: 'en_US',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'P402 Protocol',
        description: 'The Agent-to-Agent (A2A) Commerce Infrastructure.',
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
    }
}

// JSON-LD Structured Data for SEO & LLMs
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'P402',
    url: 'https://p402.io',
    logo: 'https://p402.io/favicon.png',
    description: 'A sovereign infrastructure layer for Agent-to-Agent (A2A) commerce and autonomous policy governance.',
    knowsAbout: ['AI Agents', 'Agentic Web', 'Blockchain Payments', 'A2A Protocol', 'HTTP 402'],
    hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'P402 Services',
        itemListElement: [
            {
                '@type': 'Offer',
                itemOffered: {
                    '@type': 'SoftwareApplication',
                    name: 'P402 Router',
                    description: 'Autonomous A2A payment routing and policy enforcement.'
                }
            },
            {
                '@type': 'Offer',
                itemOffered: {
                    '@type': 'SoftwareApplication',
                    name: 'x402 Protocol',
                    description: 'The standard for Agent-to-Agent payment requests.'
                }
            }
        ]
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
