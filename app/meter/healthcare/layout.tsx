import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'P402 Meter · Healthcare AI Billing & HIPAA Audit Trail',
    description:
        'Per-token AI billing for healthcare organizations. HIPAA-grade audit trail, department cost allocation, clinical AI compliance, and on-chain settlement proofs. Every AI interaction metered, attributed, and auditable.',
    keywords: [
        'healthcare AI billing', 'HIPAA AI compliance', 'clinical AI metering',
        'per-token healthcare billing', 'AI audit trail HIPAA', 'medical AI cost tracking',
        'healthcare AI governance', 'clinical LLM compliance', 'P402 Meter healthcare',
    ],
    openGraph: {
        title: 'P402 Meter · Healthcare AI — HIPAA Audit Trail & Per-Token Billing',
        description: 'HIPAA-grade AI metering for healthcare. Department attribution, clinical AI compliance, on-chain proof of settlement.',
        url: 'https://p402.io/meter/healthcare',
    },
    alternates: { canonical: 'https://p402.io/meter/healthcare' },
}

export default function HealthcareLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
