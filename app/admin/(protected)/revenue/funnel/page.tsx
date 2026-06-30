'use client';

/**
 * Phase 1A: signup → first metered event funnel visibility.
 *
 * Read-only stage rollup over existing tables. Steps that do not have a
 * tracking source today render "not tracked yet" and are reported in the
 * missingSchema list at the bottom of the page so the operator can see
 * exactly what is and is not measured.
 */

import { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader, AdminCard, AdminButton } from '../../../_components/AdminUI';

interface FunnelStep {
    key: string;
    label: string;
    count: number | null;
    status: 'tracked' | 'not_tracked_yet';
    note: string;
}
interface FunnelVisibility {
    steps: FunnelStep[];
    missingSchema: string[];
}

export default function RevenueFunnelPage() {
    const [data, setData] = useState<FunnelVisibility | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/admin/revenue/funnel-visibility');
            if (!res.ok) throw new Error(await res.text());
            setData(await res.json());
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
                title="Signup to first-event funnel"
                subtitle="Read-only rollup. Missing schema is reported, not assumed."
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
            <AdminCard title="Funnel stages">
                <table className="min-w-full text-xs font-mono">
                    <thead>
                        <tr className="border-b-2 border-white/20 text-[10px] uppercase tracking-widest text-neutral-400">
                            <th className="text-left p-2">Stage</th>
                            <th className="text-right p-2">Count</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">Source</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data?.steps ?? []).map((s) => (
                            <tr key={s.key} className="border-b border-white/10">
                                <td className="p-2">{s.label}</td>
                                <td className="p-2 text-right">
                                    {s.count === null ? '—' : s.count.toLocaleString('en-US')}
                                </td>
                                <td className="p-2">
                                    {s.status === 'tracked'
                                        ? <span className="text-[#22C55E]">tracked</span>
                                        : <span className="text-[#F59E0B]">not tracked yet</span>}
                                </td>
                                <td className="p-2 text-neutral-400">{s.note}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </AdminCard>
            {data?.missingSchema && data.missingSchema.length > 0 && (
                <AdminCard title="Missing schema">
                    <ul className="text-xs font-mono list-disc pl-5">
                        {data.missingSchema.map((m, i) => (
                            <li key={i} className="text-[#F59E0B] py-0.5">{m}</li>
                        ))}
                    </ul>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mt-3">
                        No migration added in this slice. Listed for follow-up approval.
                    </p>
                </AdminCard>
            )}
            <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mt-4">
                Read-only. Upgrade path is controlled by the billing rollout.
            </p>
        </div>
    );
}
