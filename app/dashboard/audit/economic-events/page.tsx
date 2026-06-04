'use client';
/**
 * Economic event durability + coverage audit panel — Slice 2E.
 *
 * Surfaces three things:
 *  1. Coverage = ai_economic_events / traffic_events for the chat
 *     completions path. CFO answer to "does the ledger match billed activity?"
 *  2. Outbox depth (pending + abandoned) so ops can spot a backlog.
 *  3. Recent failures (last 50) with error_code, retry_count, status, and
 *     the short safe message. No prompt or response content here by
 *     construction.
 *
 * Read-only. Linked from /dashboard/audit and /dashboard/optimize.
 */

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, MetricBox, Badge, Skeleton, ErrorState, Button } from '../../_components/ui';

interface RecentFailure {
    id: string;
    request_id: string;
    source: string;
    route: string | null;
    error_code: string;
    error_message_safe: string | null;
    retry_count: number;
    status: 'pending' | 'resolved' | 'abandoned';
    created_at: string;
    next_retry_at: string;
}

interface CoverageResponse {
    period: { since: string; until: string };
    hosted_requests: number;
    economic_events: number;
    coverage_pct: number;
    outbox: {
        pending: number;
        abandoned: number;
        oldest_pending_age_seconds: number | null;
    };
    recent_failures: RecentFailure[];
}

function fmtPct(n: number): string {
    return `${n.toFixed(2)}%`;
}

function fmtDuration(s: number | null): string {
    if (s === null) return '—';
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
}

function fmtTs(iso: string): string {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function StatusBadge({ status }: { status: RecentFailure['status'] }) {
    const tone: Record<RecentFailure['status'], 'default' | 'success' | 'warning' | 'error'> = {
        pending: 'warning',
        resolved: 'success',
        abandoned: 'error',
    };
    return <Badge tone={tone[status]}>{status.toUpperCase()}</Badge>;
}

export default function EconomicEventAuditPage() {
    const { data, isLoading, isFetching, error, refetch } = useQuery<CoverageResponse>({
        queryKey: ['ee-coverage'],
        queryFn: async () => {
            const r = await fetch('/api/v2/audit/economic-event-coverage');
            if (!r.ok) throw new Error(`Failed to load coverage (${r.status})`);
            return r.json();
        },
        refetchInterval: 60_000,
    });

    const coverageTone: 'success' | 'warning' | 'error' =
        !data ? 'warning'
        : data.coverage_pct >= 99 ? 'success'
        : data.coverage_pct >= 90 ? 'warning'
        : 'error';

    return (
        <div className="space-y-6 max-w-[1200px] mx-auto">
            <div className="flex flex-wrap justify-between items-end gap-4 border-b-2 border-black/5 pb-6">
                <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                        Audit · Economic Events
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter">Ledger durability + coverage</h1>
                    <p className="text-[12px] font-mono text-neutral-600 max-w-[640px]">
                        Does P402 have a canonical economic event for every billed AI request?
                        Coverage compares <code>ai_economic_events</code> to <code>traffic_events</code>
                        for the chat completions path. Outbox depth shows write failures awaiting
                        retry. Failures never contain prompt or response content by construction.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" size="sm" onClick={() => refetch()} loading={isFetching}>Refresh</Button>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
                    </div>
                    <Skeleton className="h-48" />
                </div>
            ) : error ? (
                <ErrorState title="Could not load coverage" message={String(error)} />
            ) : !data ? null : (
                <>
                    {/* ── Coverage strip ─────────────────────────────────── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className={`col-span-2 sm:col-span-2 border-2 border-black p-6 flex flex-col justify-between ${
                            coverageTone === 'success' ? 'bg-primary' :
                            coverageTone === 'warning' ? 'bg-warning/30' : 'bg-error/30'
                        }`}>
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/60">
                                Ledger coverage
                            </div>
                            <div>
                                <div className="text-5xl font-black tracking-tighter text-black mt-2">
                                    {fmtPct(data.coverage_pct)}
                                </div>
                                <div className="text-[11px] font-mono text-black/70 mt-2">
                                    {data.economic_events.toLocaleString()} of {data.hosted_requests.toLocaleString()} requests have economic events
                                </div>
                            </div>
                        </div>
                        <MetricBox
                            label="Outbox pending"
                            value={data.outbox.pending.toLocaleString()}
                            subtext={
                                data.outbox.oldest_pending_age_seconds === null
                                    ? 'no backlog'
                                    : `oldest ${fmtDuration(data.outbox.oldest_pending_age_seconds)}`
                            }
                        />
                        <MetricBox
                            label="Outbox abandoned"
                            value={data.outbox.abandoned.toLocaleString()}
                            subtext={data.outbox.abandoned > 0 ? 'manual review needed' : 'all clear'}
                        />
                    </div>

                    {/* ── Period + privacy note ──────────────────────────── */}
                    <Card title="Window" body="Last 24h (default) — adjust with ?since=ISO&until=ISO on the API">
                        <div className="grid grid-cols-2 gap-4 text-[12px] font-mono">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Since</div>
                                <div>{fmtTs(data.period.since)}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Until</div>
                                <div>{fmtTs(data.period.until)}</div>
                            </div>
                        </div>
                        <p className="text-[11px] font-mono text-neutral-500 mt-3 max-w-[640px]">
                            Failure rows carry only structured error_code + a short error_message_safe.
                            They contain no prompt, response, content, file, document, transcript,
                            chat_history, PHI, PII, secrets, or source code by construction
                            (privacy-contract test in <code>lib/economic-events/__tests__/outbox-privacy-contract.test.ts</code>).
                        </p>
                    </Card>

                    {/* ── Recent failures ────────────────────────────────── */}
                    <Card title="Recent failures" body={`Last ${data.recent_failures.length} rows · sanitized payload, content-free`}>
                        {data.recent_failures.length === 0 ? (
                            <p className="py-8 text-center text-sm text-neutral-500">
                                No write failures recorded. Coverage is operating cleanly.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-[11px] font-mono">
                                    <thead>
                                        <tr className="text-[9px] uppercase tracking-widest text-neutral-500 border-b-2 border-black">
                                            <th className="text-left py-2">Time</th>
                                            <th className="text-left py-2">Request</th>
                                            <th className="text-left py-2">Source</th>
                                            <th className="text-left py-2">Error</th>
                                            <th className="text-left py-2">Message (safe)</th>
                                            <th className="text-center py-2">Retries</th>
                                            <th className="text-center py-2">Status</th>
                                            <th className="text-left py-2">Next retry</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.recent_failures.map((f) => (
                                            <tr key={f.id} className="border-b border-neutral-100">
                                                <td className="py-2 text-neutral-600 whitespace-nowrap">{fmtTs(f.created_at)}</td>
                                                <td className="py-2 break-all">{f.request_id.slice(0, 24)}…</td>
                                                <td className="py-2 text-neutral-700">{f.source}</td>
                                                <td className="py-2 text-black font-bold">{f.error_code}</td>
                                                <td className="py-2 text-neutral-600 max-w-[280px] truncate" title={f.error_message_safe ?? ''}>
                                                    {f.error_message_safe ?? '—'}
                                                </td>
                                                <td className="text-center py-2">{f.retry_count}</td>
                                                <td className="text-center py-2"><StatusBadge status={f.status} /></td>
                                                <td className="py-2 text-neutral-500 whitespace-nowrap">
                                                    {f.status === 'pending' ? fmtTs(f.next_retry_at) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {/* ── Cross-links ────────────────────────────────────── */}
                    <div className="flex flex-wrap gap-3 pt-2 border-t-2 border-black/5">
                        <Link href="/dashboard/meter/events" className="text-[10px] font-black uppercase tracking-widest border-2 border-black px-3 py-2 hover:bg-neutral-50">
                            Browse events →
                        </Link>
                        <Link href="/dashboard/optimize" className="text-[10px] font-black uppercase tracking-widest border-2 border-black px-3 py-2 hover:bg-neutral-50">
                            Optimize
                        </Link>
                        <Link href="/dashboard/audit" className="text-[10px] font-black uppercase tracking-widest border-2 border-black px-3 py-2 hover:bg-neutral-50">
                            All audit
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}
