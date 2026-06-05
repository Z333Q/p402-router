'use client';
/**
 * Slice 3D — Runtime flip readiness panel.
 *
 * Read-only. Calls GET /api/v2/control/flip-readiness. Renders the assessment
 * status, the criteria list, and the supporting metrics. No mutations, no
 * recommendations, no copy that implies optimization.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { Badge, Button, Card } from '../../_components/ui';

type FlipStatus = 'ready_to_flip' | 'observing' | 'not_ready' | 'blocked';

interface CriterionVerdict {
    criterion: string;
    status: 'pass' | 'fail' | 'observing';
    detail: Record<string, unknown>;
}

interface WindowSpec { kind: string; since: string; until: string; complete: boolean; }

interface FlipReadinessAssessment {
    status: FlipStatus;
    reason: string;
    generated_at: string;
    windows: { month_to_date: WindowSpec; previous_calendar_month: WindowSpec };
    thresholds: Record<string, unknown>;
    criteria: CriterionVerdict[];
    metrics: {
        coverage: {
            month_to_date: { coverage_pct: number; hosted_requests: number; economic_events: number };
            previous_calendar_month: { coverage_pct: number; hosted_requests: number; economic_events: number };
        };
        outbox: { pending: number; abandoned: number; oldest_pending_age_seconds: number | null };
    };
}

function statusTone(s: FlipStatus): 'success' | 'warning' | 'danger' | 'default' {
    if (s === 'ready_to_flip') return 'success';
    if (s === 'observing') return 'default';
    if (s === 'not_ready') return 'warning';
    return 'danger';
}

function statusLabel(s: FlipStatus): string {
    if (s === 'ready_to_flip') return 'READY TO FLIP';
    if (s === 'observing') return 'OBSERVING';
    if (s === 'not_ready') return 'NOT READY';
    return 'BLOCKED';
}

function criterionTone(s: CriterionVerdict['status']): 'success' | 'warning' | 'danger' | 'default' {
    if (s === 'pass') return 'success';
    if (s === 'observing') return 'default';
    return 'danger';
}

export function FlipReadinessPanel() {
    const { data, isLoading, error, refetch, isFetching } = useQuery<FlipReadinessAssessment>({
        queryKey: ['control', 'flip-readiness'],
        queryFn: async () => {
            const res = await fetch('/api/v2/control/flip-readiness', { credentials: 'include' });
            if (!res.ok) throw new Error(`flip-readiness ${res.status}`);
            return res.json();
        },
        staleTime: 30_000,
    });

    return (
        <Card>
            <div className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-mono uppercase text-neutral-500">
                                Runtime flip readiness
                            </h2>
                            <Badge variant="default">Read-only</Badge>
                        </div>
                        <p className="text-neutral-600 font-medium max-w-[720px]">
                            Runtime flip readiness checks whether budget enforcement can safely use
                            the economic-event ledger without weakening spend controls. Payment-grade
                            gate, no mutations.
                        </p>
                    </div>
                    <Button onClick={() => refetch()} variant="secondary" size="sm" loading={isFetching}>
                        Refresh
                    </Button>
                </div>

                {isLoading ? (
                    <div className="text-sm text-neutral-500">Loading.</div>
                ) : error ? (
                    <div className="text-sm text-red-600">Failed to load: {String(error)}</div>
                ) : !data ? null : (
                    <>
                        <div className="flex items-center gap-3">
                            <Badge tone={statusTone(data.status)}>{statusLabel(data.status)}</Badge>
                            <span className="text-xs font-mono text-neutral-500">{data.reason}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <CoverageBox
                                label="Current month-to-date"
                                window={data.windows.month_to_date}
                                snap={data.metrics.coverage.month_to_date}
                            />
                            <CoverageBox
                                label="Previous calendar month"
                                window={data.windows.previous_calendar_month}
                                snap={data.metrics.coverage.previous_calendar_month}
                            />
                        </div>

                        <OutboxBox outbox={data.metrics.outbox} />

                        <div className="flex flex-col gap-2">
                            <div className="text-xs font-mono uppercase text-neutral-500">Criteria</div>
                            <ul className="flex flex-col gap-1">
                                {data.criteria.map((c) => (
                                    <li key={c.criterion} className="flex items-center justify-between gap-3 py-1 border-b border-neutral-200">
                                        <span className="font-mono text-xs">{c.criterion}</span>
                                        <Badge tone={criterionTone(c.status)}>{c.status.toUpperCase()}</Badge>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <p className="text-[11px] font-mono text-neutral-500">
                            Generated at {data.generated_at}. Metadata only; no prompt or response content.
                        </p>
                    </>
                )}
            </div>
        </Card>
    );
}

function CoverageBox({ label, window, snap }: {
    label: string;
    window: WindowSpec;
    snap: { coverage_pct: number; hosted_requests: number; economic_events: number };
}) {
    return (
        <div className="flex flex-col gap-1 p-3 border border-neutral-200">
            <div className="text-[11px] font-mono uppercase text-neutral-500">{label}</div>
            <div className="text-2xl font-extrabold tabular-nums">{snap.coverage_pct.toFixed(2)}%</div>
            <div className="text-xs text-neutral-600">
                {snap.economic_events.toLocaleString()} of {snap.hosted_requests.toLocaleString()} requests
            </div>
            <div className="text-[11px] font-mono text-neutral-500">
                {window.since.slice(0, 10)} → {window.until.slice(0, 10)} {window.complete ? '(complete)' : '(in progress)'}
            </div>
        </div>
    );
}

function OutboxBox({ outbox }: {
    outbox: { pending: number; abandoned: number; oldest_pending_age_seconds: number | null };
}) {
    return (
        <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1 p-3 border border-neutral-200">
                <div className="text-[11px] font-mono uppercase text-neutral-500">Outbox pending</div>
                <div className="text-xl font-extrabold tabular-nums">{outbox.pending.toLocaleString()}</div>
            </div>
            <div className="flex flex-col gap-1 p-3 border border-neutral-200">
                <div className="text-[11px] font-mono uppercase text-neutral-500">Outbox abandoned</div>
                <div className="text-xl font-extrabold tabular-nums">{outbox.abandoned.toLocaleString()}</div>
            </div>
            <div className="flex flex-col gap-1 p-3 border border-neutral-200">
                <div className="text-[11px] font-mono uppercase text-neutral-500">Oldest pending age</div>
                <div className="text-xl font-extrabold tabular-nums">
                    {outbox.oldest_pending_age_seconds == null ? 'none' : `${outbox.oldest_pending_age_seconds}s`}
                </div>
            </div>
        </div>
    );
}
