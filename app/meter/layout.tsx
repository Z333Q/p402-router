import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'P402 Meter, Healthcare Payer-Ops on Arc',
  description:
    'De-identified prior authorization spend control. Gemini-governed. Circle-settled. Proof on Arc.',
};

export default function MeterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 font-ui">
      {children}
    </div>
  );
}
