import type { Metadata } from 'next';
import { SeoLanding } from '@/components/landing/SeoLanding';

export const metadata: Metadata = {
    title: 'Embedded AI Margin Control | Per-customer gross margin for AI-backed SaaS | P402',
    description:
        'Charging customers for an AI-backed feature? P402 attributes token cost to the customer who triggered the call so you see gross margin per customer in real time.',
    alternates: { canonical: 'https://p402.io/embedded-ai-margin-control' },
    openGraph: {
        title: 'Embedded AI Margin Control | P402',
        description:
            'Per-customer AI cost attribution. Gross margin per account, per feature, per workflow. Live.',
        url: 'https://p402.io/embedded-ai-margin-control',
        type: 'website',
    },
    robots: { index: true, follow: true },
};

export default function EmbeddedAiMarginControlPage() {
    return (
        <SeoLanding
            eyebrow="Embedded AI Margin"
            h1="Your AI feature has a cost per customer. Now you can see it."
            subhead="P402 binds every AI call to the customer who triggered it. Revenue, cost, gross margin, and quality-adjusted unit economics: live, per customer, per feature."
            audience="For product and finance leaders at SaaS companies whose product calls AI models on behalf of paying customers."
            problem={{
                headline: 'Per-seat pricing, per-token cost. The math is hiding.',
                paragraphs: [
                    'You charge $99/mo per seat. One customer sends 12x the traffic of the median. Their token bill is eating the contribution margin and you find out at quarter-close, when finance does the math.',
                    'Without per-customer attribution, the team flying blind has only two responses: raise prices for everyone or cut model quality for everyone. Both are wrong. The right answer is to find the one customer whose unit economics are upside-down.',
                ],
            }}
            features={[
                {
                    label: 'Per-customer attribution',
                    description:
                        'customer_id is a first-class field on every event. Filter, group, export by customer across all your AI-backed features.',
                },
                {
                    label: 'Revenue + cost in one row',
                    description:
                        'revenue_usd and gross_margin_pct live next to cost_usd. The finance team sees the margin without joining three systems.',
                },
                {
                    label: 'Feature-level margin',
                    description:
                        'feature_id groups events by the SaaS feature that triggered the call. Compare margins across features to know which ones to invest in.',
                },
                {
                    label: 'Quality-adjusted economics',
                    description:
                        'Outcome status and quality_score bind to each event. Optimize ranks by cost per accepted output, not raw cost.',
                },
            ]}
            proof={[
                { label: 'Per-customer', description: 'Margin tile drills from tenant to customer to feature to workflow.' },
                { label: '$0.0001',      description: 'Smallest cost unit recorded. No truncation, no aggregation loss.' },
                { label: '< 1s',          description: 'Lag from event to margin tile refresh.' },
            ]}
            primaryCta={{ label: 'See margin dashboard', href: '/dashboard/optimize' }}
            secondaryCta={{ label: 'See pricing', href: '/pricing' }}
            faq={[
                {
                    q: 'How does customer_id get attached to a call?',
                    a: 'Pass it as a header (x-p402-customer-id), in the OpenAI-compatible body extension, or in the meter-only POST. It lands on the economic event and propagates through every downstream view.',
                },
                {
                    q: 'Can we attribute to a customer who is not on the request?',
                    a: 'Yes. Server-side workflows that batch process customer data pass customer_id in the meter-only event.',
                },
                {
                    q: 'Does revenue tracking require Stripe integration?',
                    a: 'Stripe is one source. The revenue_usd field is independent; you can also push revenue from your own billing system or a CRM webhook.',
                },
                {
                    q: 'What about customers we can\'t name (PII)?',
                    a: 'customer_id is opaque. Use a stable hash or a tenant-side surrogate. P402 never resolves it back to a name.',
                },
                {
                    q: 'How is this different from a usage-based-pricing tool?',
                    a: 'UBP tools price your product. P402 attributes your AI cost. Most teams need both: P402 feeds the cost basis into the UBP tool.',
                },
            ]}
        />
    );
}
