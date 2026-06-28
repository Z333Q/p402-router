import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'P402 Meter · Enterprise AI Spend Dashboard: Department Budgets & Optimization',
    description:
        'CFO-grade AI spend management. Department budget caps, employee attribution, project-level cost breakdown, model mix analytics, spend forecasting, and AI-generated optimization findings. Connect your tenant and see live data.',
    keywords: [
        'enterprise AI spend management', 'AI department budgets', 'CFO AI dashboard',
        'AI cost attribution', 'enterprise LLM metering', 'AI spend analytics',
        'department AI billing', 'AI budget enforcement', 'P402 Meter enterprise',
        'AI spend optimization', 'model mix analytics', 'AI governance dashboard',
    ],
    openGraph: {
        title: 'P402 Meter · Enterprise CFO AI Spend Dashboard',
        description: 'Department budgets, employee attribution, model mix analytics, spend forecasting. Connect your tenant for live data.',
        url: 'https://p402.io/meter/enterprise',
    },
    alternates: { canonical: 'https://p402.io/meter/enterprise' },
}

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
