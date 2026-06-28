import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'P402 Meter · Real Estate AI Billing: Deal Pipeline Cost Tracking',
    description:
        'Per-token AI billing for real estate firms. Property-contextual AI metering, MLS enrichment cost tracking, deal pipeline attribution, and on-chain settlement. Know exactly what every AI interaction costs per listing and transaction.',
    keywords: [
        'real estate AI billing', 'property AI metering', 'MLS AI costs',
        'real estate LLM billing', 'deal pipeline AI tracking', 'property tech AI metering',
        'real estate AI compliance', 'P402 Meter real estate', 'proptech AI billing',
    ],
    openGraph: {
        title: 'P402 Meter · Real Estate AI: Per-Token Deal Pipeline Billing',
        description: 'Property-contextual AI metering. MLS enrichment costs, deal pipeline attribution, on-chain settlement proofs.',
        url: 'https://p402.io/meter/real-estate',
    },
    alternates: { canonical: 'https://p402.io/meter/real-estate' },
}

export default function RealEstateLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
