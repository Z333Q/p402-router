import type { Metadata } from 'next';
import { SeoLanding } from '@/components/landing/SeoLanding';

export const metadata: Metadata = {
    title: 'AI Token Usage Dashboard | Live per-workflow token + cost ledger | P402',
    description:
        'See input and output tokens, cost, latency, cache hits, and retry waste per workflow, per model, per provider, in real time. One dashboard, every provider.',
    alternates: { canonical: 'https://p402.io/ai-token-usage-dashboard' },
    openGraph: {
        title: 'AI Token Usage Dashboard | P402',
        description:
            'Live token + cost visibility per workflow and model. Cross-provider, cross-team, one ledger.',
        url: 'https://p402.io/ai-token-usage-dashboard',
        type: 'website',
    },
    robots: { index: true, follow: true },
};

export default function AiTokenUsageDashboardPage() {
    return (
        <SeoLanding
            eyebrow="AI Token Usage"
            h1="Tokens per workflow. Tokens per model. Live."
            subhead="P402 records input tokens, output tokens, cost, latency, cache hit, and retry waste for every AI call, attributed to a workflow, customer, feature, or employee."
            audience="For platform engineers and SRE teams shipping AI-backed features who need per-workflow token visibility without bolting on a vendor SDK."
            problem={{
                headline: 'Token usage is invisible until the bill lands.',
                paragraphs: [
                    'Each provider exposes its own usage UI, at its own granularity, on its own delay. The dashboards do not federate. Engineers ship features without knowing the per-call cost.',
                    'A retry storm in one workflow can quietly burn through a department\'s budget. The signal lives in the application logs nobody reads, not in the cost ledger finance reviews.',
                ],
            }}
            features={[
                {
                    label: 'Token + cost per event',
                    description:
                        'input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, cache_hit: bound to every event. Filter, group, export.',
                },
                {
                    label: 'Retry-waste surfaced',
                    description:
                        'retry_cost_usd and context_waste_usd are first-class fields. The retry storm shows up as a row in Optimize, not in your SRE pager.',
                },
                {
                    label: 'Cache savings ledger',
                    description:
                        'Semantic cache hits are recorded with cache_savings_usd. Finance sees the savings, not just the cost.',
                },
                {
                    label: 'Cross-provider',
                    description:
                        'OpenAI, Anthropic, Gemini, Bedrock, OpenRouter: one schema. ai_economic_events has the same shape regardless of who served the request.',
                },
            ]}
            proof={[
                { label: '15 fields',  description: 'Per-event usage and economics columns. Not 3. Not 60.' },
                { label: 'Live',       description: 'Events land in the ledger in seconds, not on the next billing cycle.' },
                { label: '1 schema',   description: 'ai_economic_events is the canonical row. Every dashboard reads it.' },
            ]}
            primaryCta={{ label: 'Open Meter', href: '/dashboard/meter/events' }}
            secondaryCta={{ label: 'See API spec', href: '/docs/api' }}
            faq={[
                {
                    q: 'How does this differ from LLM observability tools?',
                    a: 'Observability records traces of prompts, responses, latency, and errors. P402 records the economic event around each call: owner, budget, policy decision, retry waste, cache savings, in a finance-ready ledger.',
                },
                {
                    q: 'Do we have to send prompts to P402?',
                    a: 'No. Meter-only mode persists token counts and economics with zero prompt content. Default for regulated workflows.',
                },
                {
                    q: 'Can we send our own custom attribution fields?',
                    a: 'Yes. action_type, task_type, workflow_id, project_id, feature_id, customer_id, employee_id, department_id are all standard. metadata is a JSONB column for anything custom.',
                },
                {
                    q: 'Does P402 support streaming responses?',
                    a: 'Yes. Output tokens are accumulated through the stream; the economic event is finalized when the stream closes.',
                },
                {
                    q: 'How do we filter by retry waste?',
                    a: 'The /dashboard/optimize surface ranks workflows by retry_cost_usd + context_waste_usd. Click through to a workflow to see the contributing events.',
                },
            ]}
        />
    );
}
