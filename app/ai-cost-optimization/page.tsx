import type { Metadata } from 'next';
import { SeoLanding } from '@/components/landing/SeoLanding';

export const metadata: Metadata = {
    title: 'AI Cost Optimization | Quality-adjusted recommendations for token spend | P402',
    description:
        'Cut AI cost without cutting model quality. P402 surfaces route, cache, and prompt-shape recommendations with projected savings, quality risk, and rollback plan.',
    alternates: { canonical: 'https://p402.io/ai-cost-optimization' },
    openGraph: {
        title: 'AI Cost Optimization | P402',
        description:
            'Quality-adjusted savings recommendations: route, cache, prompt shape, retry waste. Evidence-backed.',
        url: 'https://p402.io/ai-cost-optimization',
        type: 'website',
    },
    robots: { index: true, follow: true },
};

export default function AiCostOptimizationPage() {
    return (
        <SeoLanding
            eyebrow="AI Cost Optimization"
            h1="Optimize AI cost without breaking the product."
            subhead="P402 surfaces routing, caching, and prompt-shape recommendations grounded in your own outcome data, so the savings are real and the quality risk is named."
            audience="For engineering leaders and platform owners who need to cut AI cost without cutting accepted-output quality."
            problem={{
                headline: 'Optimization advice without outcome data is a guess.',
                paragraphs: [
                    'Every blog post says "switch to a smaller model for that workflow." None of them know your quality bar. The advice fits everyone and helps no one.',
                    'Real optimization needs a quality-adjusted view: cost per accepted output, not just cost per token. Without outcome status on the ledger, the smaller-model recommendation is a coin flip.',
                ],
            }}
            features={[
                {
                    label: 'Recommendation cards',
                    description:
                        'Each card answers nine questions: what found, where, current cost, suggested change, projected savings, quality risk, evidence, what-if-approved, rollback.',
                },
                {
                    label: 'Quality-adjusted ranking',
                    description:
                        'Optimize ranks workflows by cost per accepted output. Workflows with poor outcome attachment surface first as data gaps, not as fake wins.',
                },
                {
                    label: 'Retry-waste lens',
                    description:
                        'retry_cost_usd is treated as its own savings target. A workflow that costs $4k/mo with 30% retries is a $1.2k savings opportunity, evidence-attached.',
                },
                {
                    label: 'Cache-savings ledger',
                    description:
                        'Semantic-cache hits are recorded as savings against the would-be inference cost. Finance sees the savings, not just the cost.',
                },
            ]}
            proof={[
                { label: '9 questions',  description: 'Per recommendation card. No black-box advice.' },
                { label: 'Outcome-bound', description: 'Savings are gated on outcome attachment. No outcome data, no fake savings claim.' },
                { label: 'Rollback',      description: 'Every recommendation includes its undo path. Reversible by construction.' },
            ]}
            primaryCta={{ label: 'Open Optimize', href: '/dashboard/optimize' }}
            secondaryCta={{ label: 'Outcome setup', href: '/dashboard/prove/outcomes/setup' }}
            faq={[
                {
                    q: 'How does Optimize know my quality bar?',
                    a: 'You attach outcome status and quality_score to events as the work resolves. The ranking uses cost per accepted output computed from those values, not a universal threshold.',
                },
                {
                    q: 'Can we run recommendations without outcome data?',
                    a: 'You can see them, but they\'re labelled as low-confidence. Optimize will not project a savings number unless outcome attachment is above your minimum coverage threshold.',
                },
                {
                    q: 'Does P402 auto-apply recommendations?',
                    a: 'No. Auto-apply is intentionally off the table. Every recommendation is reviewed; rollback is one click. Engineering teams need to own the change.',
                },
                {
                    q: 'How are projected savings calculated?',
                    a: 'Counterfactual on the last N events: re-price the workflow under the recommended change, apply the cache or route delta, cap by quality risk. The math is in the card, not hidden.',
                },
                {
                    q: 'What about prompt-shape recommendations?',
                    a: 'Optimize identifies workflows with high context_waste_usd. The card names the redundant context shape; the change is for your team to ship.',
                },
            ]}
        />
    );
}
