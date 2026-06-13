import type { Metadata } from 'next';
import { SeoLanding } from '@/components/landing/SeoLanding';

export const metadata: Metadata = {
    title: 'Enterprise AI Budget Dashboard | Department + employee budgets with policy denies | P402',
    description:
        'Run AI like a real budget: per-department, per-employee, per-workflow. Set caps, route within them, deny over them, attribute every dollar.',
    alternates: { canonical: 'https://p402.io/enterprise-ai-budget-dashboard' },
    openGraph: {
        title: 'Enterprise AI Budget Dashboard | P402',
        description:
            'Department and employee budgets, real-time spend, policy-driven denies, evidence on every event.',
        url: 'https://p402.io/enterprise-ai-budget-dashboard',
        type: 'website',
    },
    robots: { index: true, follow: true },
};

export default function EnterpriseAiBudgetDashboardPage() {
    return (
        <SeoLanding
            eyebrow="Enterprise AI Budget"
            h1="Department budgets for AI. Enforced at request time."
            subhead="Set a dollar cap per department, per employee, per workflow. P402 denies the request that would breach it, before the provider is called."
            audience="For enterprise platform teams, FinOps leads, and IT governance owners managing AI spend across business units."
            problem={{
                headline: 'Annual budgets, monthly invoices, weekly surprises.',
                paragraphs: [
                    'Finance writes a number for the year. Engineering ships a feature. Two months later a $48k overage shows up on the AI line item. Nobody flagged it because nobody could see it in real time.',
                    'The denial decision needs to happen at the AI call, not at month-end. Otherwise the spend is already gone and the conversation is about who pays the variance, not how to prevent the next one.',
                ],
            }}
            features={[
                {
                    label: 'Multi-tier budgets',
                    description:
                        'Tenant, department, employee, workflow. Budgets compose. The smallest active cap wins. Audit trail logs every decision.',
                },
                {
                    label: 'Policy-driven denies',
                    description:
                        'Deny codes: BUDGET_EXCEEDED, MANDATE_INACTIVE, CATEGORY_DENIED, SIGNATURE_INVALID. Every denied event is a row in Prove with a reason and a recovery path.',
                },
                {
                    label: 'Live cost ledger',
                    description:
                        'Real-time spend tile per department, refreshed on every event. No 24-hour delay, no provider-side aggregation lag.',
                },
                {
                    label: 'AP2 mandates',
                    description:
                        'Sign a budget into an AP2 mandate. The mandate is enforceable on-chain via the protocol. Verifiable when the spend ledger is audited.',
                },
            ]}
            proof={[
                { label: '6 deny codes',  description: 'Distinct, machine-readable policy decisions. No silent failures.' },
                { label: '<50 ms',         description: 'Median policy-decision overhead added to a request.' },
                { label: 'AP2 + ERC-8004', description: 'Mandates, identity, and reputation. Protocol-grade governance.' },
            ]}
            primaryCta={{ label: 'See budget dashboard', href: '/dashboard/control' }}
            secondaryCta={{ label: 'Read spec', href: '/docs/mandates' }}
            faq={[
                {
                    q: 'How granular can budgets get?',
                    a: 'Tenant, department, employee, customer, project, feature, workflow. Any scope you attribute against can carry its own budget.',
                },
                {
                    q: 'What happens when an employee exceeds their cap?',
                    a: 'The request is denied with deny_code BUDGET_EXCEEDED. The denied event still lands in the ledger with full attribution so finance can see what was attempted.',
                },
                {
                    q: 'Can engineers override a deny?',
                    a: 'Only through an explicit policy bump signed by a budget owner. The override itself is logged as a policy event in Prove.',
                },
                {
                    q: 'Do mandates stop working if Stripe or our IdP is down?',
                    a: 'No. Policy is enforced in the request path against the policy table; payment rails and IdP are independent. The deny decision is a database read.',
                },
                {
                    q: 'How does this work across providers?',
                    a: 'P402 is the gateway. Every provider call (OpenAI, Anthropic, Gemini, Bedrock, OpenRouter) flows through the same policy engine and lands in the same ledger.',
                },
            ]}
        />
    );
}
