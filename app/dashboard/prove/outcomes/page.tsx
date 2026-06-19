'use client';

// Per-user auth-gated content; never statically cacheable. Marking
// force-dynamic also satisfies Next 15's useSearchParams CSR-bailout
// requirement without an explicit Suspense wrapper.
export const dynamic = 'force-dynamic';

/**
 * Slice 3K — Outcome Coverage and Optimize Readiness dashboard.
 *
 * Read-only. Reads /api/v2/outcomes/coverage and renders a readiness
 * verdict, status distribution, segment readiness tables, a
 * provider/model readiness matrix, and a missing-outcome leaderboard
 * that deep-links into Prove search.
 *
 * This page does NOT make recommendations. The disclaimer card at the
 * top makes that explicit; the explainer copy under each tile repeats
 * the contract. Optimize work remains blocked until you explicitly
 * approve a recommendation slice.
 */

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { Button, Card, Input } from '../../_components/ui';
import {
    ColorLegend,
    MetricCard,
    SemanticBadge,
    StackedBreakdownBar,
    type SemanticTone,
} from '../../_components/semantic';
import { PageHeader } from '../../_components/PageHeader';
import { Breadcrumbs } from '../../_components/Breadcrumbs';
import {
    DISCLAIMER_METADATA_ONLY,
    DISCLAIMER_OPTIMIZE_BLOCKED,
    DISCLAIMER_READINESS_NOT_RECOMMENDATION,
} from '@/lib/dashboard/language';
import {
    buildDemoOutcomeCoverage,
    isDemoMode,
} from '@/lib/demo/accountability-story';
import { getDemoScenario } from '@/lib/demo/scenarios';
import { DemoDataDisclaimer, DemoPreviewBanner } from '../../_components/DemoPreview';

// ─────────────────────────────────────────────────────────────────────────
// Mirror the API types locally so the client bundle does not import
// server-only modules.
// ─────────────────────────────────────────────────────────────────────────

type ReadinessStatus =
    | 'blocked'
    | 'not_ready'
    | 'observing'
    | 'ready_for_optimize_analysis';

interface CoverageThresholds {
    min_coverage_pct: number;
    min_accepted_count: number;
    min_baseline_days: number;
}

interface ReadinessVerdict {
    status: ReadinessStatus;
    reason: string;
    explainer: string;
}

interface OutcomeStatusCounts {
    accepted: number;
    rejected: number;
    revised: number;
    escalated: number;
    failed: number;
    pending_review: number;
    unknown: number;
}

interface CoverageTotals {
    total_events: number;
    events_with_outcome: number;
    events_without_outcome: number;
    coverage_pct: number;
    status: OutcomeStatusCounts;
    total_spend_usd: number;
    accepted_spend_usd: number;
    cost_per_accepted_output_usd: number | null;
    cost_per_accepted_insufficient_data: boolean;
    window_days: number;
    most_recent_outcome_at: string | null;
    outcome_freshness_seconds: number | null;
}

interface SegmentReadinessRow {
    key: string;
    total_events: number;
    events_with_outcome: number;
    accepted_count: number;
    coverage_pct: number;
    cost_per_accepted_output_usd: number | null;
    insufficient_data: boolean;
    status: ReadinessStatus;
    reason: string;
}

interface ProviderModelReadinessRow extends Omit<SegmentReadinessRow, 'key'> {
    provider: string;
    model_used: string;
}

interface MissingOutcomeRow {
    label: string;
    dimension: 'department' | 'workflow' | 'customer' | 'provider_model';
    key: string;
    missing_count: number;
    total_events: number;
    coverage_pct: number;
    sample_request_id: string | null;
}

interface CoverageResponse {
    ok: true;
    generated_at: string;
    filters_applied: Record<string, string>;
    thresholds: CoverageThresholds;
    readiness: ReadinessVerdict;
    totals: CoverageTotals;
    segments: {
        by_department: SegmentReadinessRow[];
        by_workflow:   SegmentReadinessRow[];
        by_customer:   SegmentReadinessRow[];
        by_feature:    SegmentReadinessRow[];
    };
    provider_model_matrix: ProviderModelReadinessRow[];
    missing_outcome_leaderboard: MissingOutcomeRow[];
    disclaimers: {
        readiness_not_recommendation: boolean;
        no_savings_claim: boolean;
        content_displayed: boolean;
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────────────────

function fmtUsd(n: number | null, digits = 4): string {
    if (n == null || !Number.isFinite(n)) return 'n/a';
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: digits })}`;
}
function fmtInt(n: number): string { return n.toLocaleString('en-US'); }
function fmtPct(n: number | null, digits = 1): string {
    if (n == null || !Number.isFinite(n)) return 'n/a';
    return `${n.toFixed(digits)}%`;
}
function fmtAge(seconds: number | null): string {
    if (seconds == null) return 'never';
    if (seconds < 60)         return `${seconds}s ago`;
    if (seconds < 3600)       return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86_400)     return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86_400)}d ago`;
}

function readinessTone(status: ReadinessStatus): SemanticTone {
    switch (status) {
        case 'ready_for_optimize_analysis': return 'green';
        case 'observing':                   return 'amber';
        case 'not_ready':                   return 'red';
        case 'blocked':                     return 'gray';
    }
}
function readinessLabel(status: ReadinessStatus): string {
    switch (status) {
        case 'ready_for_optimize_analysis': return 'analysis-ready';
        case 'observing':                   return 'observing';
        case 'not_ready':                   return 'not ready';
        case 'blocked':                     return 'blocked';
    }
}
function readinessGlyph(status: ReadinessStatus): string {
    switch (status) {
        case 'ready_for_optimize_analysis': return '✓';
        case 'observing':                   return '~';
        case 'not_ready':                   return '!';
        case 'blocked':                     return '·';
    }
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

interface FilterUI {
    since: string; until: string;
    department_id: string; workflow_id: string;
    customer_id: string; feature_id: string;
    provider: string; model: string;
}
const EMPTY: FilterUI = {
    since: '', until: '', department_id: '', workflow_id: '',
    customer_id: '', feature_id: '', provider: '', model: '',
};
function toQs(s: FilterUI): URLSearchParams {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(s)) if (v) qs.set(k, v);
    return qs;
}

export default function CoveragePage() {
    const [filters, setFilters] = useState<FilterUI>(EMPTY);
    const [runToken, setRunToken] = useState(0);
    const set = <K extends keyof FilterUI>(k: K, v: string) => setFilters((p) => ({ ...p, [k]: v }));
    const qs = useMemo(() => toQs(filters).toString(), [runToken]); // eslint-disable-line react-hooks/exhaustive-deps
    const searchParams = useSearchParams();
    const demoActive = isDemoMode(searchParams);
    const scenario = getDemoScenario(searchParams);

    const data = useQuery<CoverageResponse>({
        queryKey: ['outcomes/coverage', qs],
        enabled: !demoActive,
        queryFn: async () => {
            const r = await fetch(`/api/v2/outcomes/coverage?${qs}`);
            if (!r.ok) throw new Error(`coverage ${r.status}`);
            return r.json();
        },
    });

    const d: CoverageResponse | undefined = demoActive
        ? (buildDemoOutcomeCoverage(scenario) as unknown as CoverageResponse)
        : data.data;

    if (!demoActive && data.isLoading) return <div className="p-8 text-sm text-neutral-500">Loading readiness…</div>;
    if (!demoActive && (data.error || !d)) return (
        <div className="p-8">
            <Card title="Could not load coverage"><p className="text-sm">Try again or widen filters.</p></Card>
        </div>
    );
    if (!d) return null;

    const t = d.totals;
    const v = d.readiness;

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
            {demoActive && (
                <DemoPreviewBanner
                    exitHref="/dashboard/prove/outcomes"
                    scenario={scenario}
                    pathname="/dashboard/prove/outcomes"
                />
            )}
            {demoActive && (
                <div className="flex justify-end">
                    <DemoDataDisclaimer />
                </div>
            )}
            {/* ── Header + filters ──────────────────────────────────────── */}
            <PageHeader
                area="Outcomes"
                title="Outcome coverage & Optimize readiness"
                purpose="Read-only readiness layer. Tells you whether the tenant has enough outcome data for trustworthy Optimize ANALYSIS."
                disclaimers={[
                    DISCLAIMER_METADATA_ONLY,
                    DISCLAIMER_READINESS_NOT_RECOMMENDATION,
                    DISCLAIMER_OPTIMIZE_BLOCKED,
                ]}
                primary={[
                    { label: 'Activation kit',     href: '/dashboard/prove/outcomes/setup' },
                    { label: 'Prove search',       href: '/dashboard/prove' },
                ]}
                secondary={[
                    { label: 'Accountability', href: '/dashboard/accountability' },
                ]}
                breadcrumbs={
                    <Breadcrumbs items={[
                        { label: 'Prove',    href: '/dashboard/prove' },
                        { label: 'Outcomes' },
                    ]} />
                }
            />
            <header className="space-y-3">
                <div className="flex flex-wrap gap-3 items-end">
                    <Input label="Since (UTC)" placeholder="2026-05-01T00:00:00Z" value={filters.since} onChange={(v) => set('since', v)} />
                    <Input label="Until (UTC)" placeholder="2026-05-31T23:59:59Z" value={filters.until} onChange={(v) => set('until', v)} />
                    <Input label="Department"  value={filters.department_id} onChange={(v) => set('department_id', v)} />
                    <Input label="Workflow"    value={filters.workflow_id}   onChange={(v) => set('workflow_id', v)} />
                    <Input label="Customer"    value={filters.customer_id}   onChange={(v) => set('customer_id', v)} />
                    <Input label="Feature"     value={filters.feature_id}    onChange={(v) => set('feature_id', v)} />
                    <Input label="Provider"    value={filters.provider}      onChange={(v) => set('provider', v)} />
                    <Input label="Model"       value={filters.model}         onChange={(v) => set('model', v)} />
                    <Button onClick={() => setRunToken((x) => x + 1)}>Apply</Button>
                    <Button onClick={() => { setFilters(EMPTY); setRunToken((x) => x + 1); }}>Reset</Button>
                    <Link
                        href="/dashboard/prove/outcomes/setup"
                        className="px-3 h-11 inline-flex items-center border-2 border-black font-bold uppercase text-[11px] hover:bg-neutral-100"
                    >
                        Activation kit →
                    </Link>
                </div>
            </header>

            {/* ── Readiness verdict ─────────────────────────────────────── */}
            <Card title="Readiness verdict">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                    <SemanticBadge descriptor={{
                        tone: readinessTone(v.status),
                        label: readinessLabel(v.status),
                        glyph: readinessGlyph(v.status),
                    }} />
                    <span className="font-mono text-[11px] text-neutral-500">reason: {v.reason || '—'}</span>
                </div>
                <p className="text-base text-neutral-900 leading-relaxed">{v.explainer}</p>
                <p className="mt-3 text-xs text-neutral-600">
                    This is readiness analysis, not a savings claim. Recommendations stay blocked.
                    Outcome readiness does not unlock automatic recommendations.
                </p>
                <div className="mt-4">
                    <ColorLegend
                        title="Readiness tones"
                        items={[
                            { tone: 'green', label: 'analysis-ready' },
                            { tone: 'amber', label: 'observing / not yet' },
                            { tone: 'red',   label: 'not ready' },
                            { tone: 'gray',  label: 'blocked / unknown' },
                        ]}
                    />
                </div>
            </Card>

            {/* ── KPI strip ─────────────────────────────────────────────── */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                    label="Total events"
                    value={fmtInt(t.total_events)}
                    explain="Economic events recorded in this window."
                />
                <MetricCard
                    label="Events with outcome"
                    value={fmtInt(t.events_with_outcome)}
                    explain="Events that have a row in request_outcomes."
                    tone={t.events_with_outcome > 0 ? 'blue' : 'gray'}
                />
                <MetricCard
                    label="Outcome coverage"
                    value={fmtPct(t.coverage_pct)}
                    explain={`Coverage = events_with_outcome / total_events. Threshold ${d.thresholds.min_coverage_pct}%.`}
                    tone={
                        t.coverage_pct >= d.thresholds.min_coverage_pct ? 'green'
                        : t.coverage_pct > 0 ? 'amber' : 'red'
                    }
                />
                <MetricCard
                    label="Outcome freshness"
                    value={fmtAge(t.outcome_freshness_seconds)}
                    explain="Time since the most recent request_outcomes.updated_at observed in this window."
                />
                <MetricCard
                    label="Accepted outcomes"
                    value={fmtInt(t.status.accepted)}
                    explain={`Outcomes with canonical V5 status 'accepted'. Threshold ${d.thresholds.min_accepted_count}.`}
                    tone={t.status.accepted >= d.thresholds.min_accepted_count ? 'green' : 'amber'}
                />
                <MetricCard
                    label="Cost / accepted output"
                    value={t.cost_per_accepted_output_usd == null ? 'insufficient data' : fmtUsd(t.cost_per_accepted_output_usd)}
                    explain="Total accepted-event cost divided by accepted-event count. Shown only when both thresholds are met."
                    tone={t.cost_per_accepted_output_usd == null ? 'gray' : 'blue'}
                />
                <MetricCard
                    label="Window length"
                    value={`${t.window_days} days`}
                    explain={`Baseline window must be at least ${d.thresholds.min_baseline_days} days for trend analysis.`}
                    tone={t.window_days >= d.thresholds.min_baseline_days ? 'green' : 'amber'}
                />
                <MetricCard
                    label="Without outcome"
                    value={fmtInt(t.events_without_outcome)}
                    explain="Events that have no row in request_outcomes."
                    tone={t.events_without_outcome > 0 ? 'amber' : 'green'}
                />
            </section>

            {/* ── Outcome status distribution ───────────────────────────── */}
            <Card title="Outcome status distribution">
                <p className="text-xs text-neutral-700 mb-3">
                    Status counts use the V5 canonical vocabulary. Legacy values (<span className="font-mono">retried</span>,
                    <span className="font-mono"> human_reviewed</span>) are normalized on read.
                </p>
                <StackedBreakdownBar segments={[
                    { tone: 'green',  label: 'accepted',       value: t.status.accepted },
                    { tone: 'amber',  label: 'revised',        value: t.status.revised },
                    { tone: 'amber',  label: 'escalated',      value: t.status.escalated },
                    { tone: 'amber',  label: 'pending_review', value: t.status.pending_review },
                    { tone: 'red',    label: 'rejected',       value: t.status.rejected },
                    { tone: 'red',    label: 'failed',         value: t.status.failed },
                    { tone: 'gray',   label: 'unknown',        value: t.status.unknown },
                ]} />
                <ul className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {(['accepted','rejected','revised','escalated','failed','pending_review','unknown'] as const).map((k) => (
                        <li key={k} className="flex justify-between border-2 border-black p-2">
                            <span className="font-mono">{k}</span>
                            <span className="font-mono font-bold tabular-nums">{fmtInt(t.status[k])}</span>
                        </li>
                    ))}
                </ul>
            </Card>

            {/* ── Segments ──────────────────────────────────────────────── */}
            <section className="space-y-6">
                <SegmentTable title="Coverage by department" rows={d.segments.by_department} />
                <SegmentTable title="Coverage by workflow"   rows={d.segments.by_workflow} />
                <SegmentTable title="Coverage by customer"   rows={d.segments.by_customer} />
                <SegmentTable title="Coverage by feature"    rows={d.segments.by_feature} />
            </section>

            {/* ── Provider/model matrix ─────────────────────────────────── */}
            <Card title="Provider / model readiness matrix">
                <p className="text-xs text-neutral-700 mb-3">
                    Per provider+model pair. Cost-per-accepted-output is shown only when both
                    thresholds are met for the pair. Thin segments are intentionally NOT averaged
                    into a tenant-wide number.
                </p>
                <div className="overflow-auto border-2 border-black">
                    <table className="w-full text-[12px]">
                        <thead className="bg-neutral-100 border-b-2 border-black">
                            <tr>
                                <Th>Provider</Th><Th>Model</Th><Th right>Events</Th>
                                <Th right>With outcome</Th><Th right>Coverage</Th>
                                <Th right>Accepted</Th><Th right>Cost / accepted</Th>
                                <Th>Status</Th><Th>Reason</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {d.provider_model_matrix.length === 0 && (
                                <tr><td colSpan={9} className="p-2 text-neutral-500">No data.</td></tr>
                            )}
                            {d.provider_model_matrix.map((row) => (
                                <tr key={`${row.provider}/${row.model_used}`} className="border-b border-neutral-200">
                                    <Td mono>{row.provider}</Td>
                                    <Td mono>{row.model_used}</Td>
                                    <Td right>{fmtInt(row.total_events)}</Td>
                                    <Td right>{fmtInt(row.events_with_outcome)}</Td>
                                    <Td right>{fmtPct(row.coverage_pct)}</Td>
                                    <Td right>{fmtInt(row.accepted_count)}</Td>
                                    <Td right mono>
                                        {row.insufficient_data ? 'insufficient' : fmtUsd(row.cost_per_accepted_output_usd)}
                                    </Td>
                                    <Td>
                                        <SemanticBadge descriptor={{
                                            tone: readinessTone(row.status),
                                            label: readinessLabel(row.status),
                                            glyph: readinessGlyph(row.status),
                                        }} />
                                    </Td>
                                    <Td>
                                        <span className="font-mono text-[10px] text-neutral-500">{row.reason || '—'}</span>
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* ── Missing-outcome leaderboard ───────────────────────────── */}
            <Card title="Top missing-outcome segments">
                <p className="text-xs text-neutral-700 mb-3">
                    Segments with the most events lacking a recorded outcome. Each row links into
                    Prove search pre-filtered so you can find the missing events and triage them.
                </p>
                <div className="overflow-auto border-2 border-black">
                    <table className="w-full text-[12px]">
                        <thead className="bg-neutral-100 border-b-2 border-black">
                            <tr>
                                <Th>Dimension</Th><Th>Key</Th>
                                <Th right>Missing</Th><Th right>Total</Th><Th right>Coverage</Th>
                                <Th>Sample event</Th><Th>Drill into Prove</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {d.missing_outcome_leaderboard.length === 0 && (
                                <tr><td colSpan={7} className="p-2 text-neutral-500">No segments with missing outcomes.</td></tr>
                            )}
                            {d.missing_outcome_leaderboard.map((r) => (
                                <tr key={`${r.dimension}-${r.key}`} className="border-b border-neutral-200">
                                    <Td mono>{r.dimension}</Td>
                                    <Td mono>{r.key}</Td>
                                    <Td right mono>{fmtInt(r.missing_count)}</Td>
                                    <Td right mono>{fmtInt(r.total_events)}</Td>
                                    <Td right>{fmtPct(r.coverage_pct)}</Td>
                                    <Td>
                                        {r.sample_request_id ? (
                                            <Link href={`/dashboard/prove/event/${encodeURIComponent(r.sample_request_id)}`} className="font-mono underline">
                                                {r.sample_request_id.slice(0, 12)}…
                                            </Link>
                                        ) : '—'}
                                    </Td>
                                    <Td>
                                        <Link
                                            href={`/dashboard/prove?${searchQsFor(r)}`}
                                            className="underline text-[11px]"
                                        >
                                            search Prove
                                        </Link>
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <footer className="text-[10px] text-neutral-500 border-t-2 border-black pt-3">
                Optimize recommendations remain blocked.
                Coverage source: <span className="font-mono">request_outcomes</span> LEFT JOIN
                <span className="font-mono"> ai_economic_events</span>.
                Generated {d.generated_at.slice(0, 19)}.
            </footer>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function SegmentTable({ title, rows }: { title: string; rows: SegmentReadinessRow[] }) {
    return (
        <Card title={title}>
            <div className="overflow-auto border-2 border-black">
                <table className="w-full text-[12px]">
                    <thead className="bg-neutral-100 border-b-2 border-black">
                        <tr>
                            <Th>Key</Th>
                            <Th right>Events</Th>
                            <Th right>With outcome</Th>
                            <Th right>Coverage</Th>
                            <Th right>Accepted</Th>
                            <Th right>Cost / accepted</Th>
                            <Th>Status</Th>
                            <Th>Reason</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr><td colSpan={8} className="p-2 text-neutral-500">No data.</td></tr>
                        )}
                        {rows.map((r) => (
                            <tr key={r.key} className="border-b border-neutral-200">
                                <Td mono>{r.key}</Td>
                                <Td right mono>{fmtInt(r.total_events)}</Td>
                                <Td right mono>{fmtInt(r.events_with_outcome)}</Td>
                                <Td right>{fmtPct(r.coverage_pct)}</Td>
                                <Td right mono>{fmtInt(r.accepted_count)}</Td>
                                <Td right mono>
                                    {r.insufficient_data ? 'insufficient' : fmtUsd(r.cost_per_accepted_output_usd)}
                                </Td>
                                <Td>
                                    <SemanticBadge descriptor={{
                                        tone: readinessTone(r.status),
                                        label: readinessLabel(r.status),
                                        glyph: readinessGlyph(r.status),
                                    }} />
                                </Td>
                                <Td>
                                    <span className="font-mono text-[10px] text-neutral-500">{r.reason || '—'}</span>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
    return (
        <th className={`p-2 font-bold uppercase tracking-wide text-[10px] whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
            {children}
        </th>
    );
}
function Td({ children, right, mono }: { children: React.ReactNode; right?: boolean; mono?: boolean }) {
    return (
        <td className={[
            'p-2',
            right ? 'text-right' : '',
            mono ? 'font-mono tabular-nums' : '',
        ].join(' ')}>
            {children}
        </td>
    );
}

/**
 * Build a Prove-search query string pre-filtered for the missing-outcome
 * segment plus evidence_status (we surface evidence in Prove, not outcome,
 * but department/workflow/customer/provider+model are the actionable
 * filters for triage).
 */
function searchQsFor(row: MissingOutcomeRow): string {
    const qs = new URLSearchParams();
    if (row.dimension === 'department')      qs.set('department_id', row.key);
    else if (row.dimension === 'workflow')   qs.set('workflow_id', row.key);
    else if (row.dimension === 'customer')   qs.set('customer_id', row.key);
    else if (row.dimension === 'provider_model') {
        const [provider, model] = row.key.split(' / ');
        if (provider) qs.set('provider', provider);
        if (model)    qs.set('model', model);
    }
    return qs.toString();
}
