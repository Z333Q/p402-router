import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Developers | P402',
    description:
        'Build AI features with cost ownership using P402 Meter, workflow attribution, outcomes, and optional settlement.',
    alternates: { canonical: 'https://p402.io/developers' },
    openGraph: {
        title: 'Developers | P402',
        description:
            'Build AI features with cost ownership using P402 Meter, workflow attribution, outcomes, and optional settlement.',
        url: 'https://p402.io/developers',
    },
};

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-neutral-900 text-neutral-50 font-ui">
            {children}
        </div>
    );
}
