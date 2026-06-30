'use client';

/**
 * Phase 1A: admin revenue index.
 *
 * Read-only overview that links to the four revenue-visibility surfaces:
 *   - Billing (tenants + plan + Stripe ids + subscription status + events)
 *   - Access intent reporting
 *   - Signup → first-event funnel visibility
 *   - Paid intent queue
 *
 * No PATCH. No tenant plan edits. No Stripe.
 */

import Link from 'next/link';
import { AdminPageHeader, AdminCard } from '../../_components/AdminUI';

const SECTIONS = [
    {
        href: '/admin/revenue/billing',
        title: 'Billing tenants',
        body: 'Tenant, plan, Stripe ids, subscription status, current month events, last event timestamp, and the latest access-request intent fields.',
    },
    {
        href: '/admin/revenue/access-requests',
        title: 'Access intent reporting',
        body: 'Aggregates over access_requests: by resolved intent, plan id, offer id, plus the unknown-intent count and the recent rows list.',
    },
    {
        href: '/admin/revenue/funnel',
        title: 'Signup to first-event funnel',
        body: 'Read-only rollup over the access-request, tenant, API key, first metered event, attribution, and dashboard view stages. Missing schema is reported, not assumed.',
    },
    {
        href: '/admin/revenue/paid-intent',
        title: 'Paid intent queue',
        body: 'Leads whose resolved intent maps to a paid plan or paid bridge offer. Each row carries a suggested next action. Unknown free-only intents are excluded.',
    },
];

export default function RevenueIndexPage() {
    return (
        <div>
            <AdminPageHeader
                title="Revenue visibility"
                subtitle="Read-only revenue and funnel surfaces for the Phase 1A rollout."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SECTIONS.map((s) => (
                    <AdminCard key={s.href}>
                        <h3 className="text-sm font-black uppercase tracking-wide mb-2">{s.title}</h3>
                        <p className="text-xs font-mono text-neutral-400 mb-3">{s.body}</p>
                        <Link
                            href={s.href}
                            className="inline-block text-[10px] font-black uppercase tracking-widest border-2 border-white px-3 py-1.5 hover:bg-white hover:text-black transition-colors"
                        >
                            Open
                        </Link>
                    </AdminCard>
                ))}
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mt-6">
                Read-only revenue visibility. Upgrade path is controlled by the billing rollout.
            </p>
        </div>
    );
}
