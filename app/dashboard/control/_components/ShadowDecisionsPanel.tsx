'use client';
/**
 * Slice 3AA-Impl — Shadow Decisions panel.
 *
 * Read-only. Calls GET /api/v2/control/shadow-decisions. Renders the
 * tenant's persisted shadow decisions over a window: axis x hour
 * counts, code breakdown, top configured-vs-observed gaps, and a recent
 * decisions table.
 *
 * No mutations. No PATCH. No buttons that imply enforcement. No copy
 * suggests product surfaces gated by the standing scope rules.
 *
 * When the underlying table is missing (migration_pending=true), the
 * panel renders an explicit migration-pending state so the dashboard
 * is safe to ship before the migration is applied.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { Badge, Card, EmptyState, ErrorState, Skeleton } from '../../_components/ui';

type ShadowAxis = 'monthly_budget_usd' | 'max_cost_per_request_usd' | 'allowed_models';
type ShadowCode =
    | 'TENANT_BUDGET_EXCEEDED'
    | 'MAX_COST_PER_REQUEST_EXCEEDED'
    | 'MODEL_NOT_ALLOWED';

interface AxisHourBucket { axis: ShadowAxis; hour: string; n: number }
interface CodeCount { code: ShadowCode; n: number }
interface GapRow {
    axis: ShadowAxis;
    code: ShadowCode;
    emitted_at: string;
    configured_value: unknown;
    observed_value: unknown;
    model_requested: string | null;
    request_id: string | null;
    ratio: number | null;
}
interface RecentRow {
    emitted_at: string;
    axis: ShadowAxis;
    code: ShadowCode;
    configured_value: unknown;
    observed_value: unknown;
    model_requested: string | null;
    request_id: string | null;
}
interface ShadowDecisionsSummary {
    migration_pending: boolean;
    window: { since: string; until: string };
    byAxis: AxisHourBucket[];
    byCode: CodeCount[];
    topGaps: GapRow[];
    recent: RecentRow[];
}

async function fetchSummary(): Promise<ShadowDecisionsSummary> {
    const res = await fetch('/api/v2/control/shadow-decisions', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as ShadowDecisionsSummary;
}

function fmt(v: unknown): string {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    return JSON.stringify(v);
}

function totalsByAxis(buckets: AxisHourBucket[]): Record<ShadowAxis, number> {
    const t: Record<ShadowAxis, number> = {
        monthly_budget_usd: 0,
        max_cost_per_request_usd: 0,
        allowed_models: 0,
    };
    for (const b of buckets) t[b.axis] += b.n;
    return t;
}

export function ShadowDecisionsPanel(): React.JSX.Element {
    const q = useQuery<ShadowDecisionsSummary>({
        queryKey: ['shadow-decisions'],
        queryFn: fetchSummary,
        refetchOnWindowFocus: false,
        staleTime: 15_000,
    });

    if (q.isLoading) {
        return (
            <Card title="Shadow decisions">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </Card>
        );
    }

    if (q.isError || !q.data) {
        return (
            <Card title="Shadow decisions">
                <ErrorState
                    title="Could not load shadow decisions"
                    message={q.error instanceof Error ? q.error.message : 'Unknown error'}
                />
            </Card>
        );
    }

    const s = q.data;

    if (s.migration_pending) {
        return (
            <Card title="Shadow decisions">
                <EmptyState
                    title="Persistence not yet enabled"
                    body="The runtime_control_shadow_decisions table is not present in this environment. Decisions still emit to the structured log; durable evidence will populate once the migration is applied."
                />
            </Card>
        );
    }

    const totalDecisions = s.byCode.reduce((a, c) => a + c.n, 0);
    const totals = totalsByAxis(s.byAxis);

    if (totalDecisions === 0) {
        return (
            <Card title="Shadow decisions">
                <EmptyState
                    title="No shadow decisions in window"
                    body="No tenant-control would-have-denied events were emitted in the selected window."
                />
            </Card>
        );
    }

    return (
        <Card title="Shadow decisions">
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-3 gap-3">
                    <AxisTotal label="Monthly budget"       n={totals.monthly_budget_usd} />
                    <AxisTotal label="Max cost per request" n={totals.max_cost_per_request_usd} />
                    <AxisTotal label="Allowed models"       n={totals.allowed_models} />
                </div>

                <section>
                    <h4 className="text-sm font-semibold mb-2">By code</h4>
                    <div className="flex flex-wrap gap-2">
                        {s.byCode.map((c) => (
                            <Badge key={c.code} variant="default">
                                {c.code}: {c.n}
                            </Badge>
                        ))}
                    </div>
                </section>

                {s.topGaps.length > 0 && (
                    <section>
                        <h4 className="text-sm font-semibold mb-2">Top gaps</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-left">
                                        <th className="pr-3 pb-1">When</th>
                                        <th className="pr-3 pb-1">Axis</th>
                                        <th className="pr-3 pb-1">Configured</th>
                                        <th className="pr-3 pb-1">Observed</th>
                                        <th className="pr-3 pb-1">Ratio</th>
                                        <th className="pr-3 pb-1">Model</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {s.topGaps.map((g) => (
                                        <tr key={`${g.request_id ?? g.emitted_at}-${g.axis}`}>
                                            <td className="pr-3 py-1">{g.emitted_at}</td>
                                            <td className="pr-3 py-1">{g.axis}</td>
                                            <td className="pr-3 py-1">{fmt(g.configured_value)}</td>
                                            <td className="pr-3 py-1">{fmt(g.observed_value)}</td>
                                            <td className="pr-3 py-1">{g.ratio === null ? '—' : g.ratio.toFixed(2)}</td>
                                            <td className="pr-3 py-1">{g.model_requested ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                <section>
                    <h4 className="text-sm font-semibold mb-2">Recent decisions</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-left">
                                    <th className="pr-3 pb-1">When</th>
                                    <th className="pr-3 pb-1">Axis</th>
                                    <th className="pr-3 pb-1">Code</th>
                                    <th className="pr-3 pb-1">Configured</th>
                                    <th className="pr-3 pb-1">Observed</th>
                                    <th className="pr-3 pb-1">Model</th>
                                </tr>
                            </thead>
                            <tbody>
                                {s.recent.map((r) => (
                                    <tr key={`${r.request_id ?? r.emitted_at}-${r.axis}`}>
                                        <td className="pr-3 py-1">{r.emitted_at}</td>
                                        <td className="pr-3 py-1">{r.axis}</td>
                                        <td className="pr-3 py-1">{r.code}</td>
                                        <td className="pr-3 py-1">{fmt(r.configured_value)}</td>
                                        <td className="pr-3 py-1">{fmt(r.observed_value)}</td>
                                        <td className="pr-3 py-1">{r.model_requested ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </Card>
    );
}

function AxisTotal({ label, n }: { label: string; n: number }): React.JSX.Element {
    return (
        <div className="border border-neutral-800 p-3">
            <div className="text-xs text-neutral-400">{label}</div>
            <div className="text-lg font-bold tabular-nums">{n}</div>
        </div>
    );
}
