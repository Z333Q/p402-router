import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Spend Dashboard for Teams and Models | P402',
  description:
    'See where AI spend goes by department, workflow, model, vendor, and customer, with outcome and evidence status.',
  openGraph: {
    title: 'AI Spend Dashboard for Teams and Models | P402',
    description:
      'See where AI spend goes by department, workflow, model, vendor, and customer, with outcome and evidence status.',
    url: 'https://p402.io/monitor',
  },
  alternates: { canonical: 'https://p402.io/monitor' },
};

export default function MonitorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 font-ui">
      {children}
    </div>
  );
}
