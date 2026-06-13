import type { Metadata } from 'next';
import { SeoLanding } from '@/components/landing/SeoLanding';

export const metadata: Metadata = {
    title: 'AI COGS Dashboard | Cost-of-goods-sold for AI, finance-ready | P402',
    description:
        'Treat AI like a line of COGS. Cost basis, attribution, evidence, exports: formatted for the controller and the auditor, not just the SRE.',
    alternates: { canonical: 'https://p402.io/ai-cogs-dashboard' },
    openGraph: {
        title: 'AI COGS Dashboard | P402',
        description:
            'Cost-of-goods-sold visibility for AI. Per-event evidence, finance-ready exports, audit trail.',
        url: 'https://p402.io/ai-cogs-dashboard',
        type: 'website',
    },
    robots: { index: true, follow: true },
};

export default function AiCogsDashboardPage() {
    return (
        <SeoLanding
            eyebrow="AI COGS"
            h1="AI is a line of COGS. Most companies don't book it that way."
            subhead="P402 records cost basis, attribution, and verifiable evidence per AI call. Built for the controller closing the books, not the engineer chasing a bug."
            audience="For controllers, accounting leads, and finance ops in companies booking AI spend against revenue."
            problem={{
                headline: 'AI spend should be COGS. The data does not support it.',
                paragraphs: [
                    'Cost-of-goods-sold accounting requires per-unit cost attribution. AI provider invoices give you a monthly total: no SKU, no unit, no traceable basis. The CFO can\'t book it as COGS without a defensible audit trail.',
                    'Without a per-unit cost basis, the engineering team and the finance team disagree about what AI actually costs. The disagreement is structural: they\'re looking at two different data sources.',
                ],
            }}
            features={[
                {
                    label: 'Per-event cost basis',
                    description:
                        'direct_cost_usd, route_savings_usd, cache_savings_usd, retry_cost_usd, broken out per event so the basis is reconstructable from the ledger.',
                },
                {
                    label: 'Evidence bundles',
                    description:
                        'Every event ships with a downloadable evidence bundle: model, provider, tokens, cost, policy, outcome, retention, fingerprints. Audit-ready.',
                },
                {
                    label: 'Finance-ready exports',
                    description:
                        'CSV and JSON exports keyed on department, project, customer, feature. Joinable in the GL tool of your choice.',
                },
                {
                    label: 'GAAP-aware retention',
                    description:
                        'Retention windows are per-tenant, configurable, and stamped on every event. The auditor sees what was kept, why, and for how long.',
                },
            ]}
            proof={[
                { label: '4 cost fields',  description: 'direct, route_savings, cache_savings, retry: each a column, each a row in evidence.' },
                { label: 'Per-row',        description: 'Evidence bundle is generated per event, not per batch.' },
                { label: 'Sub-cent',       description: 'Cost recorded to four decimal places. No floor, no truncation.' },
            ]}
            primaryCta={{ label: 'See COGS dashboard', href: '/dashboard/prove' }}
            secondaryCta={{ label: 'Sample export', href: '/api/v1/analytics/evidence-bundle?download=true' }}
            faq={[
                {
                    q: 'Is the evidence bundle a signed document?',
                    a: 'It is a verifiable artifact tied to your tenant\'s ledger. Cryptographic signing is on the roadmap (Phase 7); current bundles already carry tenant-scoped row IDs and retention metadata sufficient for most audit reviews.',
                },
                {
                    q: 'How do we map cost to revenue?',
                    a: 'Bind revenue_usd to the same event the cost lands on (e.g., when your billing system processes the customer charge). Margin is computed in the ledger, not in a downstream join.',
                },
                {
                    q: 'Can we use this for transfer pricing?',
                    a: 'Yes. department_id and project_id are first-class. Intra-group transfers can be modeled by tagging events with the consuming entity.',
                },
                {
                    q: 'Is the data GAAP-compliant out of the box?',
                    a: 'P402 produces audit-ready data; GAAP compliance depends on how your accounting team books it. Bring your controller. Most map to either COGS, R&D, or G&A based on attribution.',
                },
                {
                    q: 'What about consumption tax / VAT on AI spend?',
                    a: 'Provider VAT lands on the provider invoice, not on the per-event cost. Use the evidence bundle as the unit ledger; reconcile against the provider invoice quarterly.',
                },
            ]}
        />
    );
}
