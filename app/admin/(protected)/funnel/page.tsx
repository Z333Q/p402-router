'use client';

/**
 * 3AZ-3 — admin funnel view.
 *
 * Read-only dashboard for the V5 onboarding/conversion funnel. Pulls
 * /api/admin/funnel/rollup (server-side admin-gated). The table is
 * the 7-row stage progression with per-stage totals, uniques, and
 * transition rates so the operator can read the funnel without
 * dropping into Neon SQL.
 */

import { useCallback, useEffect, useState } from 'react';
import { AdminCard, AdminPageHeader } from '../../_components/AdminUI';

interface Stage {
    stage: string;
    event: string;
    total: number;
    uniques: number;
    from_prev_pct: number | null;
}

interface Rollup {
    window_days: number;
    since: string;
    stages: Stage[];
    errors: { total: number };
    degraded?: boolean;
}

const PERIOD_OPTIONS = [
    { label: '7d',  value: '7'  },
    { label: '30d', value: '30' },
    { label: '90d', value: '90' },
];

const STAGE_LABELS: Record<string, string> = {
    'funnel.login_view':           'Login view',
    'funnel.signin_started':       'Sign-in started',
    'funnel.signin_success':       'Sign-in success',
    'funnel.onboarding_view':      'Onboarding view',
    'funnel.api_key_issued':       'API key issued',
    'funnel.onboarding_completed': 'Onboarding completed',
    'funnel.dashboard_view':       'Dashboard view',
    'funnel.dashboard_meaningful': 'Meaningful interaction',
};

function pctClass(pct: number | null): string {
    if (pct === null) return 'text-neutral-500';
    if (pct >= 80) return 'text-[var(--primary)]';
    if (pct >= 50) return 'text-white';
    if (pct >= 25) return 'text-yellow-400';
    return 'text-red-400';
}

export default function AdminFunnelPage() {
    const [data, setData] = useState<Rollup | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState('30');
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (d: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/funnel/rollup?days=${encodeURIComponent(d)}`, {
                credentials: 'same-origin',
                cache: 'no-store',
            });
            if (!res.ok) {
                setError(`Request failed (${res.status})`);
                setData(null);
                return;
            }
            const json = (await res.json()) as Rollup;
            setData(json);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Network error');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load(days);
    }, [days, load]);

    return (
        <div>
            <AdminPageHeader
                title="Funnel"
                subtitle="V5 onboarding and conversion rates from funnel_events"
                action={
                    <div className="flex border-2 border-neutral-700">
                        {PERIOD_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setDays(opt.value)}
                                className={`h-8 px-4 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                    days === opt.value
                                        ? 'bg-[#FF3B30] text-white'
                                        : 'text-neutral-500 hover:text-white'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                }
            />

            {error && (
                <AdminCard title="Error">
                    <p className="text-red-400 text-sm font-mono">{error}</p>
                </AdminCard>
            )}

            {data?.degraded && (
                <AdminCard title="Degraded">
                    <p className="text-yellow-400 text-sm font-mono">
                        Funnel query returned an error. Showing zeros. Check server logs.
                    </p>
                </AdminCard>
            )}

            <AdminCard title="Stage progression">
                {loading && !data ? (
                    <p className="text-neutral-500 text-sm font-mono">Loading&hellip;</p>
                ) : data ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-800">
                                    <th className="text-left py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Stage</th>
                                    <th className="text-left py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Event</th>
                                    <th className="text-right py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Total</th>
                                    <th className="text-right py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Uniques</th>
                                    <th className="text-right py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">From prev</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.stages.map((row) => (
                                    <tr key={row.stage} className="border-b border-neutral-900">
                                        <td className="py-3 font-mono text-[11px] text-neutral-400">{row.stage}</td>
                                        <td className="py-3 font-mono text-[11px] text-white">{STAGE_LABELS[row.event] ?? row.event}</td>
                                        <td className="py-3 font-mono text-[11px] text-right text-neutral-300">{row.total.toLocaleString('en-US')}</td>
                                        <td className="py-3 font-mono text-[11px] text-right text-white">{row.uniques.toLocaleString('en-US')}</td>
                                        <td className={`py-3 font-mono text-[11px] text-right ${pctClass(row.from_prev_pct)}`}>
                                            {row.from_prev_pct === null ? '—' : `${row.from_prev_pct.toFixed(1)}%`}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-neutral-500 text-sm font-mono">No data</p>
                )}
            </AdminCard>

            {data && (
                <AdminCard title="Funnel errors">
                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-black text-white">{data.errors.total.toLocaleString('en-US')}</span>
                        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                            funnel.error emits in the last {data.window_days} days
                        </span>
                    </div>
                </AdminCard>
            )}
        </div>
    );
}
