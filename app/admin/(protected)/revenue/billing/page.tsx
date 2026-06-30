'use client';

/**
 * Phase 1A: admin read-only billing tenant list.
 *
 * Pulls /api/admin/revenue/billing (admin-gated). No PATCH. No tenant plan
 * edits. No Stripe calls. No checkout enablement.
 */

import { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader, AdminCard, AdminButton } from '../../../_components/AdminUI';

interface BillingTenant {
    tenantId: string;
    name: string | null;
    ownerEmail: string | null;
    plan: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    subscriptionStatus: string | null;
    subscriptionProvider: string | null;
    subscriptionPlanId: string | null;
    subscriptionCurrentPeriodEnd: string | null;
    monthEventCount: number;
    lastEventAt: string | null;
    accessRequestIntent: string | null;
    accessRequestResolvedIntent: string | null;
    accessRequestPlanId: string | null;
    accessRequestOfferId: string | null;
    accessRequestCreatedAt: string | null;
    tenantCreatedAt: string | null;
}

function shortId(id: string | null): string {
    if (!id) return '—';
    return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

function shortDate(iso: string | null): string {
    if (!iso) return '—';
    return iso.slice(0, 10);
}

export default function RevenueBillingPage() {
    const [tenants, setTenants] = useState<BillingTenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/admin/revenue/billing?limit=100');
            if (!res.ok) throw new Error(await res.text());
            const json = await res.json();
            setTenants(Array.isArray(json.tenants) ? json.tenants : []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <div>
            <AdminPageHeader
                title="Billing tenants (read-only)"
                subtitle="Tenant, plan, Stripe ids, subscription status, current month events, latest access-request intent."
                action={
                    <AdminButton onClick={load} disabled={loading} variant="secondary" size="sm">
                        {loading ? 'Loading…' : '↻ Refresh'}
                    </AdminButton>
                }
            />
            {error && (
                <div className="border-2 border-[#FF3B30] bg-[#FF3B30]/10 p-4 font-mono text-[#FF3B30] text-sm mb-4">
                    {error}
                </div>
            )}
            <AdminCard>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs font-mono">
                        <thead>
                            <tr className="border-b-2 border-white/20 text-[10px] uppercase tracking-widest text-neutral-400">
                                <th className="text-left p-2">Tenant</th>
                                <th className="text-left p-2">Owner</th>
                                <th className="text-left p-2">Plan</th>
                                <th className="text-left p-2">Sub status</th>
                                <th className="text-left p-2">Stripe cus</th>
                                <th className="text-left p-2">Stripe sub</th>
                                <th className="text-right p-2">Month events</th>
                                <th className="text-left p-2">Last event</th>
                                <th className="text-left p-2">AR intent</th>
                                <th className="text-left p-2">AR resolved</th>
                                <th className="text-left p-2">AR plan</th>
                                <th className="text-left p-2">AR offer</th>
                                <th className="text-left p-2">AR at</th>
                                <th className="text-left p-2">Tenant at</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenants.length === 0 && !loading && (
                                <tr><td colSpan={14} className="p-4 text-center text-neutral-500">No tenants.</td></tr>
                            )}
                            {tenants.map((t) => (
                                <tr key={t.tenantId} className="border-b border-white/10">
                                    <td className="p-2">{shortId(t.tenantId)}</td>
                                    <td className="p-2">{t.ownerEmail ?? '—'}</td>
                                    <td className="p-2">{t.plan ?? '—'}</td>
                                    <td className="p-2">{t.subscriptionStatus ?? '—'}</td>
                                    <td className="p-2">{shortId(t.stripeCustomerId)}</td>
                                    <td className="p-2">{shortId(t.stripeSubscriptionId)}</td>
                                    <td className="p-2 text-right">{t.monthEventCount.toLocaleString('en-US')}</td>
                                    <td className="p-2">{shortDate(t.lastEventAt)}</td>
                                    <td className="p-2">{t.accessRequestIntent ?? '—'}</td>
                                    <td className="p-2">{t.accessRequestResolvedIntent ?? '—'}</td>
                                    <td className="p-2">{t.accessRequestPlanId ?? '—'}</td>
                                    <td className="p-2">{t.accessRequestOfferId ?? '—'}</td>
                                    <td className="p-2">{shortDate(t.accessRequestCreatedAt)}</td>
                                    <td className="p-2">{shortDate(t.tenantCreatedAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </AdminCard>
            <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mt-4">
                Read-only. Upgrade path is controlled by the billing rollout.
            </p>
        </div>
    );
}
