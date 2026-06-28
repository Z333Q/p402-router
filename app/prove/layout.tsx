import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Spend Evidence and Audit Reports | P402',
  description:
    'Export evidence bundles, finance reports, and event proof for every AI economic event.',
  openGraph: {
    title: 'AI Spend Evidence and Audit Reports | P402',
    description:
      'Export evidence bundles, finance reports, and event proof for every AI economic event.',
    url: 'https://p402.io/prove',
  },
  alternates: { canonical: 'https://p402.io/prove' },
};

export default function ProveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 font-ui">
      {children}
    </div>
  );
}
