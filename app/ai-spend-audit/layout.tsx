import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Spend Audit for Enterprise Teams | P402',
  description:
    'A one-time engagement that produces an AI Spend Accountability Report covering attribution, leakage, and evidence readiness.',
  alternates: { canonical: 'https://p402.io/ai-spend-audit' },
  openGraph: {
    title: 'AI Spend Audit for Enterprise Teams | P402',
    description:
      'A one-time engagement that produces an AI Spend Accountability Report covering attribution, leakage, and evidence readiness.',
    url: 'https://p402.io/ai-spend-audit',
  },
};

export default function AiSpendAuditLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 font-ui">
      {children}
    </div>
  );
}
