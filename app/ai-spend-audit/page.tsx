import type { Metadata } from 'next';
import { SeoLanding } from '@/components/landing/SeoLanding';

export const metadata: Metadata = {
    title: 'AI Spend Audit | One-time CFO audit of token usage and budget leakage | P402',
    description:
        'Find where AI spend is leaking before it hits the next invoice. P402 audits every AI call against owner, workflow, model, and budget so finance can attribute and recover.',
    alternates: { canonical: 'https://p402.io/ai-spend-audit' },
    openGraph: {
        title: 'AI Spend Audit | P402',
        description:
            'One-time CFO audit of AI token usage. Find the leaks, attribute every call to an owner, recover what was missed.',
        url: 'https://p402.io/ai-spend-audit',
        type: 'website',
    },
    robots: { index: true, follow: true },
};

export default function AiSpendAuditPage() {
    return (
        <SeoLanding
            eyebrow="AI Spend Audit"
            h1="The AI invoice arrived. You don't know who spent what."
            subhead="P402 runs a one-time audit of every AI call your organization made: owner, workflow, model, provider, tokens, cost, so finance can finally tie spend to ownership."
            audience="For CFOs, controllers, and FinOps leads who need to attribute AI spend before the next quarterly close."
            problem={{
                headline: "Provider invoices show totals. They don't show ownership.",
                paragraphs: [
                    'OpenAI, Anthropic, and Gemini bills arrive as a monthly aggregate. There is no department, no employee, no workflow, no project ID. Finance has the number but not the story.',
                    'Engineering teams paste API keys into shared services. Customer-facing features call models on behalf of customers who never see the underlying token cost. Both flows show up in the same total.',
                ],
            }}
            features={[
                {
                    label: 'Per-event attribution',
                    description:
                        'Owner, department, employee, customer, workflow, project, feature: recorded at the moment of the call. Not reconstructed from invoices weeks later.',
                },
                {
                    label: 'Metadata-only by default',
                    description:
                        'P402 audits the economic event, not the prompt. No PHI, no PII, no source code leaves your environment. Audit safe for regulated industries.',
                },
                {
                    label: 'Evidence per row',
                    description:
                        'Every event ships with a verifiable receipt: model, tokens, cost basis, policy decision, retention window. Exportable as a finance-ready bundle.',
                },
                {
                    label: 'Cross-provider',
                    description:
                        'Audits OpenAI, Anthropic, Gemini, Bedrock, OpenRouter, and any HTTP-callable model behind one ledger. One report, every provider.',
                },
            ]}
            proof={[
                { label: '~5 min',  description: 'From first API key to first attributed event in the ledger.' },
                { label: '0 prompts', description: 'Metadata-only mode persists no prompt or response content.' },
                { label: '30 days',  description: 'Default retention; configurable by tenant.' },
            ]}
            primaryCta={{ label: 'Start audit →', href: '/dashboard' }}
            secondaryCta={{ label: 'Read the spec', href: '/docs/meter-only' }}
            faq={[
                {
                    q: 'How long does an audit take to set up?',
                    a: 'Routing audits start when you point your existing OpenAI-compatible client at P402. Meter-only audits start when your backend POSTs economic events. First event lands in the ledger within minutes.',
                },
                {
                    q: 'Do we have to give P402 our prompts?',
                    a: 'No. Metadata-only is the default. P402 receives owner, workflow, model, tokens, cost, policy decision, outcome, and evidence status. Never prompt or response content.',
                },
                {
                    q: 'Can we audit historical usage?',
                    a: 'Yes for any provider that exposes usage exports (OpenAI, Anthropic). We import the historical events into the same ledger and apply current attribution rules retroactively.',
                },
                {
                    q: 'Is the audit a one-time engagement or ongoing?',
                    a: "Either. The one-time AI Spend Audit produces a delivered report. Same plumbing left running becomes a live ledger for the Meter / Monitor / Optimize surfaces.",
                },
                {
                    q: 'Who owns the data?',
                    a: 'You do. P402 is the recorder, not the owner. Export the full ledger at any time; delete a tenant\'s data on request.',
                },
            ]}
        />
    );
}
