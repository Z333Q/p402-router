import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Spend Controls and Policy Simulator | P402',
  description:
    'Set budgets and policy boundaries for AI usage by team, workflow, model, and vendor. Runtime enforcement is gated.',
  openGraph: {
    title: 'AI Spend Controls and Policy Simulator | P402',
    description:
      'Set budgets and policy boundaries for AI usage by team, workflow, model, and vendor. Runtime enforcement is gated.',
    url: 'https://p402.io/control',
  },
  alternates: { canonical: 'https://p402.io/control' },
};

export default function ControlLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 font-ui">
      {children}
    </div>
  );
}
