'use client';
/**
 * Slice 3L — Optimize Readiness Boundary and Empty-State Productization.
 *
 * Read-only surface. Backed by /api/v2/outcomes/coverage (the 3K readiness
 * engine). This page exists to explain WHY Optimize recommendations are
 * blocked, WHAT data is required, and WHICH readiness gaps must close.
 *
 * It does not generate recommendations, propose policy changes, claim
 * savings, or imply that any thresholds being met will trigger automated
 * actions. Readiness analysis only.
 */

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import {
    Badge,
    Button,
    Card,
    ErrorState,
    Skeleton,
} from '../_components/ui';

import { getDemoScenario, withDemoQs } from '@/lib/demo/scenarios';

// ─────────────────────────────────────────────────────────────────────────
// Coverage envelope (mirrors lib/prove/coverage.ts)
// ─────────────────────────────────────────────────────────────────────────

type ReadinessStatus =
    | 'blocked'
    | 'not_ready'
    | 'observing'
    | 'ready_for_optimize_analysis';

interface Verdict {
    status: ReadinessStatus;
    reason: string;
    explainer: string;
}

interface StatusCounts {
    accepted: number;
    rejected: number;
    revised: number;
    escalated: number;
    failed: number;
    pending_review: number;
    unknown: number;
}

interface Totals {
    total_events: number;
    events_with_outcome: number;
    events_without_outcome: number;
    coverage_pct: number;
    status: StatusCounts;
    total_spend_usd: number;
    accepted_spend_usd: number;
    cost_per_accepted_output_usd: number | null;
    cost_per_accepted_insufficient_data: boolean;
    window_days: number;
    most_recent_outcome_at: string | null;
    outcome_freshness_seconds: number | null;
}

interface Thresholds {
    min_coverage_pct: number;
    min_accepted_count: number;
    min_baseline_days: number;
}

interface SegmentRow {
    key: string;
    total_events: number;
    coverage_pct: number;
    accepted_count: number;
    insufficient_data: boolean;
    status: ReadinessStatus;
    reason: string;
}

interface CoverageResponse {
    ok: boolean;
    generated_at: string;
    thresholds: Thresholds;
    readiness: Verdict;
    totals: Totals;
    segments: {
        by_department: SegmentRow[];
        by_workflow: SegmentRow[];
        by_customer: SegmentRow[];
        by_feature: SegmentRow[];
    };
    provider_model_matrix: SegmentRow[];
    missing_outcome_leaderboard: Array<{ label: string; missing_count: number }>;
    disclaimers: {
        readiness_not_recommendation: boolean;
        no_savings_claim: boolean;
        content_displayed: boolean;
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Status display
// ─────────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ReadinessStatus, string> = {
    blocked: 'Blocked',
    not_ready: 'Not ready',
    observing: 'Observing',
    ready_for_optimize_analysis: 'Ready for analysis',
};

const STATUS_TONE: Record<ReadinessStatus, string> = {
    blocked: 'bg-red-100 text-red-900 border-red-300',
    not_ready: 'bg-amber-100 text-amber-900 border-amber-300',
    observing: 'bg-blue-100 text-blue-900 border-blue-300',
    ready_for_optimize_analysis: 'bg-emerald-100 text-emerald-900 border-emerald-300',
};

function StatusPill({ status }: { status: ReadinessStatus }) {
    return (
        <span className={`border-2 ${STATUS_TONE[status]} text-[10px] font-black uppercase tracking-widest px-2 py-1`}>
            {STATUS_LABEL[status]}
        </span>
    );
}

function CheckRow({
    label,
    value,
    met,
    detail,
}: {
    label: string;
    value: string;
    met: boolean;
    detail: string;
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-3 border-b border-neutral-100 last:border-b-0">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-black uppercase tracking-wide ${met ? 'text-emerald-700' : 'text-neutral-500'}`}>
                        {met ? 'MET' : 'GAP'}
                    </span>
                    <span className="text-sm font-bold text-black">{label}</span>
                </div>
                <p className="text-[11px] font-mono text-neutral-500 mt-1">{detail}</p>
            </div>
            <div className="text-sm font-mono font-bold text-black whitespace-nowrap">{value}</div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function OptimizePage() {
    const searchParams = useSearchParams();
    const demoActive = (searchParams?.get('demo') ?? '') === '1';
    const scenario = getDemoScenario(searchParams ?? null);
    const outcomesHref = withDemoQs('/dashboard/prove/outcomes', demoActive, scenario);
    const proveHref = withDemoQs('/dashboard/prove', demoActive, scenario);
    const monitorHref = withDemoQs('/dashboard/monitor', demoActive, scenario);
    const setupHref = withDemoQs('/dashboard/prove/outcomes/setup', demoActive, scenario);

    const { data, isLoading, isFetching, error, refetch } = useQuery<CoverageResponse>({
        queryKey: ['optimize-readiness'],
        queryFn: async () => {
            const res = await fetch('/api/v2/outcomes/coverage');
            if (!res.ok) throw new Error(`Failed to load outcome coverage (${res.status})`);
            return res.json();
        },
    });

    const t = data?.totals;
    const th = data?.thresholds;
    const segmentDimensions = data
        ? [
              { name: 'department', rows: data.segments.by_department },
              { name: 'workflow',   rows: data.segments.by_workflow },
              { name: 'customer',   rows: data.segments.by_customer },
              { name: 'feature',    rows: data.segments.by_feature },
              { name: 'provider/model', rows: data.provider_model_matrix },
          ]
        : [];
    const segmentReadyCount = segmentDimensions.filter((d) =>
        d.rows.some((r) => r.status === 'ready_for_optimize_analysis'),
    ).length;
    const missingCount = data?.missing_outcome_leaderboard.length ?? 0;

    return (
        <div className="space-y-8 max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-end gap-4 border-b-2 border-black/5 pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Optimize</h1>
                        <Badge variant="default">Read-only</Badge>
                    </div>
                    <p className="text-neutral-600 font-medium max-w-[680px]">
                        Optimize recommendations are not active yet. P402 needs enough outcome data
                        before it can compare cost and quality. This page shows readiness only.
                        It does not claim savings.
                    </p>
                    <p className="text-[11px] font-mono text-neutral-500">
                        P402 meters economics, not content. Optimize will follow the same privacy posture
                        when it ships.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={() => refetch()} variant="secondary" size="sm" loading={isFetching}>
                        Refresh
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-48" />
                </div>
            ) : error ? (
                <ErrorState title="Failed to load readiness" message={String(error)} />
            ) : !data || !t || !th ? null : (
                <>
                    {/* Verdict */}
                    <Card title="Readiness verdict" body="from /api/v2/outcomes/coverage">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <StatusPill status={data.readiness.status} />
                                <span className="text-[11px] font-mono text-neutral-500">
                                    reason: {data.readiness.reason || 'all_thresholds_met'}
                                </span>
                            </div>
                            <p className="text-sm text-neutral-700 max-w-[720px]">
                                {data.readiness.explainer}
                            </p>
                            <p className="text-[11px] font-mono text-neutral-500">
                                This is readiness analysis, not a savings claim. Recommendations stay blocked
                                until they are explicitly enabled.
                            </p>
                        </div>
                    </Card>

                    {/* Readiness checklist */}
                    <Card title="Readiness checklist" body={`window ${t.window_days}d`}>
                        <div className="divide-y divide-neutral-100">
                            <CheckRow
                                label="Outcome coverage"
                                value={`${t.coverage_pct.toFixed(1)}%`}
                                met={t.coverage_pct >= th.min_coverage_pct}
                                detail={`Outcome coverage shows how many AI events have a recorded business result. Threshold: ≥ ${th.min_coverage_pct}%.`}
                            />
                            <CheckRow
                                label="Accepted outcome count"
                                value={t.status.accepted.toLocaleString()}
                                met={t.status.accepted >= th.min_accepted_count}
                                detail={`Accepted outcomes feed cost-per-accepted-output. Threshold: ≥ ${th.min_accepted_count}.`}
                            />
                            <CheckRow
                                label="Baseline window"
                                value={`${t.window_days} days`}
                                met={t.window_days >= th.min_baseline_days}
                                detail={`Trend analysis needs a baseline window. Threshold: ≥ ${th.min_baseline_days} days.`}
                            />
                            <CheckRow
                                label="Cost per accepted output"
                                value={t.cost_per_accepted_output_usd == null
                                    ? 'insufficient data'
                                    : `$${t.cost_per_accepted_output_usd.toFixed(6)}`}
                                met={t.cost_per_accepted_output_usd != null}
                                detail="Cost per accepted output divides spend by accepted outcomes only. Reported only when coverage AND accepted thresholds are both met."
                            />
                            <CheckRow
                                label="Segment readiness"
                                value={`${segmentReadyCount} / ${segmentDimensions.length} dimensions`}
                                met={segmentReadyCount === segmentDimensions.length && segmentDimensions.length > 0}
                                detail="Each of department, workflow, customer, feature, and provider/model is evaluated separately. Thin segments do not get averaged away."
                            />
                            <CheckRow
                                label="Attribution completeness"
                                value="track in Monitor"
                                met={false}
                                detail="Attribution fields drive segment readiness. Inspect missing department, workflow, customer, feature, and provider/model fields in Monitor."
                            />
                            <CheckRow
                                label="Evidence coverage"
                                value="track in Prove"
                                met={false}
                                detail="Evidence coverage is the share of events that link to an evidence bundle. Inspect in Prove."
                            />
                        </div>
                    </Card>

                    {/* Recommendations card — honest empty state */}
                    <Card title="Recommendations" body="blocked until readiness gates close">
                        <div className="space-y-4">
                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl font-black font-mono">0</span>
                                <span className="text-[10px] font-bold uppercase text-neutral-500">
                                    open recommendations
                                </span>
                            </div>
                            <p className="text-sm text-neutral-700 max-w-[640px]">
                                Optimize recommendations are not active yet. P402 needs enough outcome data
                                before it can compare cost and quality. Recommendations stay blocked even
                                when the readiness verdict reads ready_for_analysis, because analysis is
                                not the same as a proposed change.
                            </p>
                            <p className="text-[11px] font-mono text-neutral-500 max-w-[640px]">
                                When recommendations ship, they will surface here with projected cost,
                                quality risk, confidence interval, rollback rules, and an explicit approval
                                step. Nothing applies automatically.
                            </p>
                            {missingCount > 0 ? (
                                <p className="text-[11px] font-mono text-neutral-600">
                                    {missingCount} segment{missingCount === 1 ? '' : 's'} on the missing-outcome leaderboard.
                                    Close those gaps to move toward analysis-ready state.
                                </p>
                            ) : null}
                            <div className="flex flex-wrap gap-3 pt-2">
                                <Link href={outcomesHref} className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-primary bg-primary px-3 py-1.5 hover:bg-black hover:text-white hover:border-black transition-colors">
                                    View outcome readiness
                                </Link>
                                <Link href={proveHref} className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-black px-3 py-1.5 hover:bg-neutral-50 transition-colors">
                                    View Prove dashboard
                                </Link>
                                <Link href={`${outcomesHref}#missing-outcomes`} className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-black px-3 py-1.5 hover:bg-neutral-50 transition-colors">
                                    View missing outcomes
                                </Link>
                                <Link href={proveHref} className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-black px-3 py-1.5 hover:bg-neutral-50 transition-colors">
                                    View event detail examples
                                </Link>
                                <Link href={monitorHref} className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-black px-3 py-1.5 hover:bg-neutral-50 transition-colors">
                                    View Monitor
                                </Link>
                                <Link href={setupHref} className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-black px-3 py-1.5 hover:bg-neutral-50 transition-colors">
                                    Activation kit
                                </Link>
                            </div>
                        </div>
                    </Card>

                    {/* Optimize add-ons — reframed without savings claims */}
                    <Card title="Optimize add-ons" body="Coming soon">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                {
                                    name: 'Optimize Starter',
                                    price: '$499',
                                    period: '/month',
                                    bullets: [
                                        'Weekly readiness reports',
                                        'Model and route analysis surfaces',
                                        'Cache and retry waste detection',
                                        'Manual approval workflow for any change',
                                        'No automated route changes',
                                    ],
                                },
                                {
                                    name: 'Optimize Scale',
                                    price: '$1,499',
                                    period: '/month',
                                    bullets: [
                                        'Daily readiness reports',
                                        'Recommendation queue when readiness gates close',
                                        'Route and cache rule analysis',
                                        'Apply-and-rollback rules',
                                        'Slack / Teams notifications',
                                    ],
                                },
                                {
                                    name: 'Optimize Enterprise',
                                    price: 'Custom',
                                    period: '',
                                    bullets: [
                                        'Department and team efficiency analysis',
                                        'Agent loop detection',
                                        'Policy-linked optimization review',
                                        'Procurement and compliance exports',
                                        'Dedicated optimization review',
                                    ],
                                },
                            ].map((tier) => (
                                <div key={tier.name} className="border-2 border-black p-4 space-y-2 bg-white">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                                        {tier.name}
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black tracking-tighter">{tier.price}</span>
                                        <span className="text-[11px] font-bold text-neutral-500">{tier.period}</span>
                                    </div>
                                    <ul className="space-y-1 text-[12px] font-medium text-neutral-700">
                                        {tier.bullets.map((b, i) => (
                                            <li key={i} className="flex items-start gap-1.5">
                                                <span className="text-primary font-black mt-0.5">·</span>
                                                <span>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        disabled
                                        className="w-full mt-3 text-[10px] font-black uppercase tracking-widest border-2 border-neutral-300 text-neutral-400 px-3 py-2 cursor-not-allowed"
                                    >
                                        Contact sales
                                    </button>
                                </div>
                            ))}
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}
