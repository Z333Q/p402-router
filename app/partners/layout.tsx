import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'P402 Partner Program | AI Spend Accountability',
    description:
        'Refer, implement, and advise teams adopting AI spend accountability with the P402 partner program.',
    alternates: { canonical: 'https://p402.io/partners' },
    openGraph: {
        title: 'P402 Partner Program | AI Spend Accountability',
        description:
            'Refer, implement, and advise teams adopting AI spend accountability with the P402 partner program.',
        url: 'https://p402.io/partners',
    },
};

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-neutral-900 text-neutral-50 font-ui">
            {children}
        </div>
    );
}
