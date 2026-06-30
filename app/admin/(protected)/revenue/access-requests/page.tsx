'use client';

/**
 * Phase 1A: access-intent reporting (admin).
 *
 * Read-only aggregates over access_requests grouped by resolved_intent,
 * plan_id, offer_id, plus the recent rows list. No PII processing beyond
 * the existing access_requests columns.
 */

import { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader, AdminCard, AdminButton } from '../../../_components/AdminUI';

interface CountRow { resolvedIntent?: string | null; planId?: string | null; offerId?: string | null; count: number }
interface RecentRow {
    email: string | null;
    company: string | null;
    role: string | null;
    rpd: string | null;
    intent: string | null;
    resolvedIntent: string | null;
    planId: string | null;
    offerId: string | null;
    createdAt: string | null;
}
interface Report {
    total: number;
    unknownIntentCount: number;
    byResolvedIntent: CountRow[];
    byPlanId: CountRow[];
    byOfferId: CountRow[];
    recent: RecentRow[];
}

function shortDate(iso: string | null): string {
    if (!iso) return '—';
    return iso.slice(0, 10);
}

export default function AccessRequestsPage() {
    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/admin/revenue/access-intent?recent=50');
            if (!res.ok) throw new Error(await res.text());
            setReport(await res.json());
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
                title="Access intent reporting"
                subtitle="Read-only aggregates over access_requests."
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <AdminCard title="Totals">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Total access requests</p>
                            <p className="text-3xl font-black mt-1 font-mono">{report?.total.toLocaleString('en-US') ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Unknown intent count</p>
                            <p className="text-3xl font-black mt-1 font-mono">{report?.unknownIntentCount.toLocaleString('en-US') ?? '—'}</p>
                        </div>
                    </div>
                </AdminCard>
                <AdminCard title="By resolved intent">
                    <ul className="text-xs font-mono">
                        {(report?.byResolvedIntent ?? []).map((r, i) => (
                            <li key={i} className="flex justify-between py-1 border-b border-white/10">
                                <span>{r.resolvedIntent ?? '(unknown)'}</span>
                                <span className="font-black">{r.count}</span>
                            </li>
                        ))}
                    </ul>
                </AdminCard>
                <AdminCard title="By plan id">
                    <ul className="text-xs font-mono">
                        {(report?.byPlanId ?? []).map((r, i) => (
                            <li key={i} className="flex justify-between py-1 border-b border-white/10">
                                <span>{r.planId ?? '(none)'}</span>
                                <span className="font-black">{r.count}</span>
                            </li>
                        ))}
                    </ul>
                </AdminCard>
                <AdminCard title="By offer id">
                    <ul className="text-xs font-mono">
                        {(report?.byOfferId ?? []).map((r, i) => (
                            <li key={i} className="flex justify-between py-1 border-b border-white/10">
                                <span>{r.offerId ?? '(none)'}</span>
                                <span className="font-black">{r.count}</span>
                            </li>
                        ))}
                    </ul>
                </AdminCard>
            </div>
            <AdminCard title="Recent access requests">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs font-mono">
                        <thead>
                            <tr className="border-b-2 border-white/20 text-[10px] uppercase tracking-widest text-neutral-400">
                                <th className="text-left p-2">When</th>
                                <th className="text-left p-2">Email</th>
                                <th className="text-left p-2">Company</th>
                                <th className="text-left p-2">Role</th>
                                <th className="text-left p-2">RPD</th>
                                <th className="text-left p-2">Intent</th>
                                <th className="text-left p-2">Resolved</th>
                                <th className="text-left p-2">Plan</th>
                                <th className="text-left p-2">Offer</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(report?.recent ?? []).length === 0 && !loading && (
                                <tr><td colSpan={9} className="p-4 text-center text-neutral-500">No requests.</td></tr>
                            )}
                            {(report?.recent ?? []).map((r, i) => (
                                <tr key={i} className="border-b border-white/10">
                                    <td className="p-2">{shortDate(r.createdAt)}</td>
                                    <td className="p-2">{r.email ?? '—'}</td>
                                    <td className="p-2">{r.company ?? '—'}</td>
                                    <td className="p-2">{r.role ?? '—'}</td>
                                    <td className="p-2">{r.rpd ?? '—'}</td>
                                    <td className="p-2">{r.intent ?? '—'}</td>
                                    <td className="p-2">{r.resolvedIntent ?? '—'}</td>
                                    <td className="p-2">{r.planId ?? '—'}</td>
                                    <td className="p-2">{r.offerId ?? '—'}</td>
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
