import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Embedded AI Margin Control for Developers | P402',
  description:
    'Track AI feature margin, customer cost, retry waste, context waste, and cost per accepted output with P402 Meter.',
  alternates: { canonical: 'https://p402.io/embedded-ai-margin-control' },
  openGraph: {
    title: 'Embedded AI Margin Control for Developers | P402',
    description:
      'Track AI feature margin, customer cost, retry waste, context waste, and cost per accepted output with P402 Meter.',
    url: 'https://p402.io/embedded-ai-margin-control',
  },
};

export default function EmbeddedAiMarginControlLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 font-ui">
      {children}
    </div>
  );
}
