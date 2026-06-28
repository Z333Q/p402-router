import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Trust | P402',
    description:
        'P402 records AI spend, attribution, outcomes, and evidence without requiring prompt or response storage.',
    alternates: { canonical: 'https://p402.io/trust' },
    openGraph: {
        title: 'Trust | P402',
        description:
            'P402 records AI spend, attribution, outcomes, and evidence without requiring prompt or response storage.',
        url: 'https://p402.io/trust',
    },
};

export default function TrustLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-neutral-900 text-neutral-50 font-ui">
            {children}
        </div>
    );
}
