import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'x402 Receipts for Payable AI Work | P402',
  description:
    'Issue receipts and settlement records for payable AI work using x402 schemes on Base.',
  alternates: { canonical: 'https://p402.io/receipts' },
  openGraph: {
    title: 'x402 Receipts for Payable AI Work | P402',
    description:
      'Issue receipts and settlement records for payable AI work using x402 schemes on Base.',
    url: 'https://p402.io/receipts',
  },
};

export default function ReceiptsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 font-ui">
      {children}
    </div>
  );
}
