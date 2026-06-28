import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Enterprise AI Budget Dashboard | P402',
  description:
    'Give finance a dashboard for AI spend by department, employee, workflow, model, vendor, budget, outcome, and evidence status.',
  alternates: { canonical: 'https://p402.io/enterprise' },
  openGraph: {
    title: 'Enterprise AI Budget Dashboard | P402',
    description:
      'Give finance a dashboard for AI spend by department, employee, workflow, model, vendor, budget, outcome, and evidence status.',
    url: 'https://p402.io/enterprise',
  },
};

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 font-ui">
      {children}
    </div>
  );
}
