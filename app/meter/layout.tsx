import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'P402 Meter · Per-Token AI Billing, Metering & Spend Optimization',
  description:
    'Per-token AI billing infrastructure. Metered at request granularity. Department attribution. Budget enforcement. On-chain settlement proofs on Tempo mainnet. Healthcare, legal, real estate, and enterprise demos live.',
  keywords: [
    'per-token AI billing', 'AI metering', 'AI spend management', 'token billing',
    'AI payment processing', 'LLM cost tracking', 'department AI budgets',
    'on-chain AI settlement', 'Tempo mainnet billing', 'AI compliance metering',
  ],
  openGraph: {
    title: 'P402 Meter · Per-Token AI Billing & Spend Optimization',
    description: 'Metered AI billing at token granularity. Department attribution, budget caps, on-chain proofs, optimization. Healthcare, legal, real estate, and enterprise.',
    url: 'https://p402.io/meter',
  },
  alternates: { canonical: 'https://p402.io/meter' },
};

export default function MeterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 font-ui">
      {children}
    </div>
  );
}
