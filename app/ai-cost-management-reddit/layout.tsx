import type { Metadata } from 'next';

const TITLE = 'AI Cost Management on Reddit | P402';
const DESCRIPTION =
    'Teams are asking how to track AI costs, token usage, model spend, and AI feature margins. P402 turns AI usage into accountable spend by workflow, customer, model, policy, and outcome.';
const URL = 'https://p402.io/ai-cost-management-reddit';

export const metadata: Metadata = {
    title: TITLE,
    description: DESCRIPTION,
    keywords: [
        'AI cost management',
        'AI cost control',
        'AI cost optimization',
        'AI spend tracking',
        'AI token cost tracking',
        'LLM cost management',
        'OpenAI cost tracking',
        'AI usage tracking',
        'AI COGS',
        'AI feature margin',
        'P402',
    ],
    alternates: { canonical: URL },
    openGraph: {
        title: TITLE,
        description: DESCRIPTION,
        url: URL,
        type: 'article',
        siteName: 'P402',
    },
    twitter: {
        card: 'summary_large_image',
        title: TITLE,
        description: DESCRIPTION,
    },
    robots: {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    },
};

export default function AiCostManagementRedditLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-neutral-900 text-neutral-50 font-ui">
            {children}
        </div>
    );
}
