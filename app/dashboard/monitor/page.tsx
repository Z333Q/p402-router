'use client';

// Per-user auth-gated content; never statically cacheable. Marking
// force-dynamic also satisfies Next 15's useSearchParams CSR-bailout
// requirement without an explicit Suspense wrapper.
export const dynamic = 'force-dynamic';

/**
 * Slice 3A — Monitor foundation dashboard.
 *
 * Read-only operational surface over `ai_economic_events` and `request_outcomes`.
 * Eleven panels, one /api/v2/monitor/overview call, filters URL-driven.
 *
 * No recommendations. No savings claims. No policy proposals. Optimize is
 * untouched.
 */

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import {
    Badge,
    Button,
    Card,
    EmptyState,
    ErrorState,
    MetricBox,
    ProgressBar,
    Skeleton,
} from '../_components/ui';

import {
    EMPTY_FILTERS,
    FilterBar,
    type MonitorFilterValues,
    buildMonitorQs,
} from './_components/FilterBar';
import type { MonitorOverviewResponse } from '@/lib/monitor/types';

function fmtUsd(n: number, digits = 2): string {
    if (!Number.isFinite(n)) return '$0.00';
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function fmtPct(n: number | null | undefined, digits = 1): string {
    if (n == null || !Number.isFinite(n)) return 'n/a';
    return `${n.toFixed(digits)}%`;
}

function readFilters(params: URLSearchParams): MonitorFilterValues {
    const get = (k: string) => params.get(k) ?? '';
    return {
        since: get('since'),
        until: get('until'),
        department_id: get('department_id'),
        employee_id: get('employee_id'),
        workflow_id: get('workflow_id'),
        customer_id: get('customer_id'),
        feature_id: get('feature_id'),
        provider: get('provider'),
        model_used: get('model_used'),
    };
}

export default function MonitorPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialFilters = React.useMemo(
        () => readFilters(new URLSearchParams(searchParams?.toString() ?? '')),
        [searchParams],
    );
    const [draft, setDraft] = React.useState<MonitorFilterValues>(initialFilters);

    React.useEffect(() => {
        setDraft(initialFilters);
    }, [initialFilters]);

    const qs = buildMonitorQs(initialFilters);

    const { data, isLoading, isFetching, error, refetch } = useQuery<MonitorOverviewResponse>({
        queryKey: ['monitor-overview', qs],
        queryFn: async () => {
            const res = await fetch(`/api/v2/monitor/overview${qs}`);
            if (!res.ok) throw new Error(`Failed to load Monitor overview (${res.status})`);
            return res.json();
        },
    });

    const apply = () => router.push(`/dashboard/monitor${buildMonitorQs(draft)}`);
    const reset = () => {
        setDraft(EMPTY_FILTERS);
        router.push('/dashboard/monitor');
    };

    return (
        <div className="space-y-8 max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-end gap-4 border-b-2 border-black/5 pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Monitor</h1>
                        <Badge variant="default">Read-only</Badge>
                    </div>
                    <p className="text-neutral-600 font-medium max-w-[640px]">
                        Spend visibility over your AI economic events. Read-only — no policy
                        changes, no recommendations, no savings claims on this surface.
                    </p>
                    <p className="text-[11px] font-mono text-neutral-500">
                        Monitor reads metadata fields only. No prompt or response content is used.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={() => refetch()} variant="secondary" size="sm" loading={isFetching}>
                        Refresh
                    </Button>
                </div>
            </div>

            <FilterBar value={draft} onChange={setDraft} onApply={apply} onReset={reset} isFetching={isFetching} />

            {isLoading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
                    </div>
                    <Skeleton className="h-48" />
                </div>
            ) : error ? (
                <ErrorState title="Failed to load Monitor overview" message={String(error)} />
            ) : !data ? null : data.totals.request_count === 0 ? (
                <EmptyState
                    title="No events in this window"
                    body="No ai_economic_events rows match the current filters. Send a metered request, or widen the time range."
                />
            ) : (
                <>
                    {/* Totals strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        <MetricBox label="Spend" value={fmtUsd(data.totals.spend_usd, 2)} subtext={`window ${data.period.window_days}d`} />
                        <MetricBox label="Requests" value={data.totals.request_count.toLocaleString()} />
                        <MetricBox label="Tokens" value={data.totals.total_tokens.toLocaleString()} />
                        <MetricBox
                            label="Avg latency"
                            value={data.totals.avg_latency_ms == null ? 'n/a' : `${Math.round(data.totals.avg_latency_ms)} ms`}
                        />
                        <MetricBox
                            label="Success rate"
                            value={data.totals.success_rate_available
                                ? fmtPct(data.totals.success_rate_pct)
                                : 'not available'}
                            subtext={data.totals.success_rate_source
                                ? `source: ${data.totals.success_rate_source}`
                                : 'no signal in window'}
                        />
                    </div>

                    {/* Cost per accepted output */}
                    <Card title="Cost per accepted output" body="outcome-based; requires real coverage">
                        {data.cost_per_accepted_output.status === 'insufficient_outcome_data' ? (
                            <div className="space-y-2">
                                <p className="text-sm text-neutral-700 font-mono">Insufficient outcome data.</p>
                                <p className="text-[11px] font-mono text-neutral-500">
                                    Need outcome coverage ≥ {data.cost_per_accepted_output.thresholds.min_outcome_coverage_pct}%
                                    {' '}AND accepted count ≥ {data.cost_per_accepted_output.thresholds.min_accepted_count}.{' '}
                                    Current: coverage {fmtPct(data.cost_per_accepted_output.outcome_coverage_pct)},{' '}
                                    accepted {data.cost_per_accepted_output.accepted_count.toLocaleString()}.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-baseline gap-4">
                                <span className="text-3xl font-black font-mono">
                                    {fmtUsd(data.cost_per_accepted_output.cost_per_accepted_output_usd ?? 0, 6)}
                                </span>
                                <span className="text-[11px] font-bold uppercase text-neutral-500">
                                    across {data.cost_per_accepted_output.accepted_count.toLocaleString()} accepted outputs
                                </span>
                                <span className="text-[11px] font-mono text-neutral-500">
                                    coverage {fmtPct(data.cost_per_accepted_output.outcome_coverage_pct)}
                                </span>
                            </div>
                        )}
                    </Card>

                    {/* Attribution + Evidence + Outcome completeness */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card title="Attribution completeness" body={`${data.attribution_completeness.total_events.toLocaleString()} events`}>
                            <div className="space-y-3">
                                {data.attribution_completeness.fields.map((f) => (
                                    <div key={f.field}>
                                        <div className="flex justify-between text-[11px] font-bold uppercase mb-1">
                                            <span>{f.field}</span>
                                            <span className="font-mono">
                                                {fmtPct(f.present_pct)} · {f.missing.toLocaleString()} missing
                                            </span>
                                        </div>
                                        <ProgressBar value={f.present_pct} max={100} showValue={false} />
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card title="Evidence coverage" body={`${data.evidence_coverage.with_evidence_bundle.toLocaleString()} events with evidence bundle`}>
                            <div className="space-y-2">
                                <div className="text-3xl font-black font-mono">
                                    {fmtPct(data.evidence_coverage.with_evidence_bundle_pct)}
                                </div>
                                <p className="text-[11px] font-mono text-neutral-500">
                                    Events with evidence bundle: {data.evidence_coverage.with_evidence_bundle.toLocaleString()} ·
                                    Events missing evidence bundle: {data.evidence_coverage.missing_evidence_bundle.toLocaleString()}.
                                </p>
                            </div>
                        </Card>

                        <Card title="Outcome completeness" body={`${data.outcome_completeness.events_with_outcome.toLocaleString()} of ${data.outcome_completeness.total_events.toLocaleString()} events`}>
                            <div className="space-y-2">
                                <div className="text-3xl font-black font-mono">
                                    {fmtPct(data.outcome_completeness.outcome_coverage_pct)}
                                </div>
                                <p className="text-[11px] font-mono text-neutral-500">
                                    Recorded via <code className="bg-neutral-100 px-1">POST /api/v2/outcomes</code>.
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Spend by department / employee / workflow / customer / feature */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <GroupSpendCard title="Spend by department" rows={data.spend_by_department} />
                        <GroupSpendCard title="Spend by employee"   rows={data.spend_by_employee} />
                        <GroupSpendCard title="Spend by workflow"   rows={data.spend_by_workflow} />
                        <GroupSpendCard title="Spend by customer"   rows={data.spend_by_customer} />
                        <GroupSpendCard title="Spend by feature"    rows={data.spend_by_feature} />
                        <Card title="Spend by model / provider" body={`${data.spend_by_provider_model.length} combinations`}>
                            {data.spend_by_provider_model.length === 0 ? (
                                <p className="text-sm text-neutral-500 py-4">No spend in this window.</p>
                            ) : (
                                <table className="w-full text-sm font-mono">
                                    <thead>
                                        <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b-2 border-black">
                                            <th className="text-left py-2">Provider</th>
                                            <th className="text-left py-2">Model</th>
                                            <th className="text-right py-2">Reqs</th>
                                            <th className="text-right py-2">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.spend_by_provider_model.map((r, i) => (
                                            <tr key={`${r.provider}:${r.model_used}:${i}`} className="border-b border-neutral-100">
                                                <td className="py-2 font-bold text-black">{r.provider}</td>
                                                <td className="py-2 text-neutral-700">{r.model_used}</td>
                                                <td className="text-right py-2">{r.request_count.toLocaleString()}</td>
                                                <td className="text-right py-2">{fmtUsd(r.total_cost_usd, 4)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </Card>
                    </div>

                    {/* Privacy mode distribution */}
                    <Card title="Privacy mode distribution" body={`${data.privacy_mode_distribution.reduce((s, r) => s + r.count, 0).toLocaleString()} events`}>
                        {data.privacy_mode_distribution.length === 0 ? (
                            <p className="text-sm text-neutral-500 py-4">No events in this window.</p>
                        ) : (
                            <div className="space-y-3">
                                {data.privacy_mode_distribution.map((p) => (
                                    <div key={p.privacy_mode}>
                                        <div className="flex justify-between text-[11px] font-bold uppercase mb-1">
                                            <span>{p.privacy_mode}</span>
                                            <span className="font-mono">
                                                {fmtPct(p.pct)} · {p.count.toLocaleString()}
                                            </span>
                                        </div>
                                        <ProgressBar value={p.pct} max={100} showValue={false} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}

function GroupSpendCard({ title, rows }: { title: string; rows: MonitorOverviewResponse['spend_by_department'] }) {
    return (
        <Card title={title} body={`${rows.length} groups`}>
            {rows.length === 0 ? (
                <p className="text-sm text-neutral-500 py-4">No spend in this window.</p>
            ) : (
                <table className="w-full text-sm font-mono">
                    <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b-2 border-black">
                            <th className="text-left py-2">Key</th>
                            <th className="text-right py-2">Reqs</th>
                            <th className="text-right py-2">Total</th>
                            <th className="text-right py-2">Avg</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.key} className="border-b border-neutral-100">
                                <td className="py-2 font-bold text-black">{r.key}</td>
                                <td className="text-right py-2">{r.request_count.toLocaleString()}</td>
                                <td className="text-right py-2">{fmtUsd(r.total_cost_usd, 4)}</td>
                                <td className="text-right py-2 text-neutral-500">{fmtUsd(r.avg_cost_usd, 6)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Card>
    );
}
