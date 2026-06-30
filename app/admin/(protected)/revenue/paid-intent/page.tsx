'use client';

/**
 * Phase 1A: paid-intent queue (admin).
 *
 * Read-only list of leads whose resolved intent maps to a paid plan or paid
 * bridge offer. Each row carries a suggested next action. Unknown free-only
 * intents are excluded.
 */

import { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader, AdminCard, AdminButton } from '../../../_components/AdminUI';

interface PaidLead {
    email: string | null;
    company: string | null;
    role: string | null;
    resolvedIntent: string | null;
    planId: string | null;
    offerId: string | null;
    rpd: string | null;
    createdAt: string | null;
    suggestedNextAction: string;
}

function shortDate(iso: string | null): string {
    if (!iso) return '—';
    return iso.slice(0, 10);
}

export default function PaidIntentPage() {
    const [leads, setLeads] = useState<PaidLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/admin/revenue/paid-intent?limit=100');
            if (!res.ok) throw new Error(await res.text());
            const json = await res.json();
            setLeads(Array.isArray(json.leads) ? json.leads : []);
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
                title="Paid intent queue"
                subtitle="Leads with paid resolved intent. Free-only and unknown intents are excluded."
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
                                <th className="text-left p-2">When</th>
                                <th className="text-left p-2">Email</th>
                                <th className="text-left p-2">Company</th>
                                <th className="text-left p-2">Role</th>
                                <th className="text-left p-2">RPD</th>
                                <th className="text-left p-2">Resolved intent</th>
                                <th className="text-left p-2">Plan</th>
                                <th className="text-left p-2">Offer</th>
                                <th className="text-left p-2">Suggested next action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.length === 0 && !loading && (
                                <tr><td colSpan={9} className="p-4 text-center text-neutral-500">No paid-intent leads.</td></tr>
                            )}
                            {leads.map((l, i) => (
                                <tr key={i} className="border-b border-white/10">
                                    <td className="p-2">{shortDate(l.createdAt)}</td>
                                    <td className="p-2">{l.email ?? '—'}</td>
                                    <td className="p-2">{l.company ?? '—'}</td>
                                    <td className="p-2">{l.role ?? '—'}</td>
                                    <td className="p-2">{l.rpd ?? '—'}</td>
                                    <td className="p-2">{l.resolvedIntent ?? '—'}</td>
                                    <td className="p-2">{l.planId ?? '—'}</td>
                                    <td className="p-2">{l.offerId ?? '—'}</td>
                                    <td className="p-2">{l.suggestedNextAction}</td>
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
