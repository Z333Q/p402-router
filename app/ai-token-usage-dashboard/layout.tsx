import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Token Usage Dashboard for Teams and Models | P402',
  description:
    'Track AI token usage across teams, workflows, models, and vendors with P402 Monitor. Per-event attribution, no prompt storage required.',
  alternates: { canonical: 'https://p402.io/ai-token-usage-dashboard' },
  openGraph: {
    title: 'AI Token Usage Dashboard for Teams and Models | P402',
    description:
      'Track AI token usage across teams, workflows, models, and vendors with P402 Monitor. Per-event attribution, no prompt storage required.',
    url: 'https://p402.io/ai-token-usage-dashboard',
  },
};

export default function AiTokenUsageDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 font-ui">
      {children}
    </div>
  );
}
