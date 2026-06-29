import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI COGS Dashboard for Embedded AI Teams | P402',
  description:
    'Track AI cost of goods sold per feature, per customer, per workflow with P402 Monitor. Cost, retry waste, context waste, and accepted output rate.',
  alternates: { canonical: 'https://p402.io/ai-cogs-dashboard' },
  openGraph: {
    title: 'AI COGS Dashboard for Embedded AI Teams | P402',
    description:
      'Track AI cost of goods sold per feature, per customer, per workflow with P402 Monitor. Cost, retry waste, context waste, and accepted output rate.',
    url: 'https://p402.io/ai-cogs-dashboard',
  },
};

export default function AiCogsDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 font-ui">
      {children}
    </div>
  );
}
