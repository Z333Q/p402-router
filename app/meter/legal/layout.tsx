import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'P402 Meter · Legal AI Billing — Matter-Level Cost Tracking',
    description:
        'Per-token AI billing for law firms. Matter-level cost attribution, privilege log, multi-jurisdictional LLM routing, per-token invoicing to clients, and immutable audit trail. Compliance-grade metering for legal AI.',
    keywords: [
        'legal AI billing', 'law firm AI metering', 'matter-level AI billing',
        'per-token legal invoicing', 'legal AI compliance', 'privilege log AI',
        'law firm LLM costs', 'legal AI audit trail', 'P402 Meter legal',
    ],
    openGraph: {
        title: 'P402 Meter · Legal AI — Matter Billing & Per-Token Invoicing',
        description: 'Per-token AI billing for law firms. Matter attribution, privilege log, multi-jurisdictional routing, client invoicing.',
        url: 'https://p402.io/meter/legal',
    },
    alternates: { canonical: 'https://p402.io/meter/legal' },
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
