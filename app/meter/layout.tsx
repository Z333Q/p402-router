import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'P402 Meter · Per-Token AI Billing on Tempo Mainnet',
  description:
    'Per-token AI settlement infrastructure. Gemini-powered. MPP-settled. Proof on Tempo mainnet.',
};

export default function MeterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 font-ui">
      {children}
    </div>
  );
}
