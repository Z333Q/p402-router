'use client';
/**
 * Meter event list — /dashboard/meter/events
 *
 * Read-only browser for ai_economic_events. Rows link to the detail page.
 * Privacy posture (privacy_mode + storage flags) is shown on every row so the
 * list itself can be the start of an audit conversation.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
    Card, Input, Select, Button, Badge, Skeleton, ErrorState,
} from '../../_components/ui';

interface EventRow {
    id: string;
    request_id: string;
    event_time: string;
    source: string;
    provider: string | null;
    model_used: string | null;
    action_type: string | null;
    task_type: string | null;
    department_id: string | null;
    employee_id: string | null;
    customer_id: string | null;
    feature_id: string | null;
    workflow_id: string | null;
    cost_usd: string;
    total_tokens: number;
    latency_ms: number | null;
    cache_hit: boolean;
    status_code: number | null;
    success: boolean | null;
    governance_decision: string | null;
    output_status: string | null;
    privacy_mode: string;
    prompt_stored: boolean;
    response_stored: boolean;
    redaction_applied: boolean;
    retention_expires_at: string | null;
    evidence_bundle_id: string | null;
    receipt_id: string | null;
    metadata: Record<string, unknown>;
}

const PRIVACY_MODE_OPTIONS = [
    { value: '',                 label: 'Any privacy mode' },
    { value: 'metadata_only',    label: 'Metadata only' },
    { value: 'fingerprint_only', label: 'Fingerprint only' },
    { value: 'redacted_trace',   label: 'Redacted trace' },
    { value: 'private_gateway',  label: 'Private gateway' },
    { value: 'full_trace',       label: 'Full trace' },
];

const EVIDENCE_OPTIONS = [
    { value: '',        label: 'Any evidence status' },
    { value: 'present', label: 'Evidence present' },
    { value: 'missing', label: 'Evidence missing' },
];

interface Filters {
    privacy_mode: string;
    department_id: string;
    employee_id: string;
    customer_id: string;
    feature_id: string;
    workflow_id: string;
    provider: string;
    model_used: string;
    action_type: string;
    evidence_status: string;
    since: string;     // local datetime
}

const EMPTY_FILTERS: Filters = {
    privacy_mode: '', department_id: '', employee_id: '',
    customer_id: '', feature_id: '', workflow_id: '',
    provider: '', model_used: '', action_type: '',
    evidence_status: '', since: defaultSince(),
};

function defaultSince(): string {
    const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);  // datetime-local format
}

function buildQs(f: Filters): string {
    const sp = new URLSearchParams();
    sp.set('limit', '100');
    if (f.since) sp.set('since', new Date(f.since).toISOString());
    for (const k of Object.keys(f) as (keyof Filters)[]) {
        if (k === 'since') continue;
        const v = f[k];
        if (v) sp.set(k, v);
    }
    return sp.toString();
}

function fmtUsd(s: string | number): string {
    const n = Number(s);
    if (!Number.isFinite(n)) return '—';
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })}`;
}

function fmtTs(iso: string | null): string {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function PrivacyBadge({ mode }: { mode: string }) {
    const tone: Record<string, 'success' | 'default' | 'warning' | 'error'> = {
        metadata_only: 'success', fingerprint_only: 'success',
        redacted_trace: 'default', private_gateway: 'success', full_trace: 'warning',
    };
    return <Badge tone={tone[mode] ?? 'default'}>{mode.replace(/_/g, ' ').toUpperCase()}</Badge>;
}

export default function MeterEventListPage() {
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

    const { data, isLoading, isFetching, error, refetch } = useQuery<{
        ok: boolean; count: number; events: EventRow[];
    }>({
        queryKey: ['meter-events', applied],
        queryFn: async () => {
            const r = await fetch(`/api/v2/meter/events?${buildQs(applied)}`);
            if (!r.ok) throw new Error(`Failed to load events (${r.status})`);
            return r.json();
        },
    });

    function set<K extends keyof Filters>(k: K, v: Filters[K]) {
        setFilters((prev) => ({ ...prev, [k]: v }));
    }

    function apply(e?: React.FormEvent) {
        e?.preventDefault();
        setApplied(filters);
    }

    function clear() {
        setFilters(EMPTY_FILTERS);
        setApplied(EMPTY_FILTERS);
    }

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-end gap-4 border-b-2 border-black/5 pb-6">
                <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                        Meter · Events
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter">AI economic events</h1>
                    <p className="text-[12px] font-mono text-neutral-600 max-w-[640px]">
                        Every AI action becomes one row here. Privacy posture is enforced before
                        write; rows show what P402 stored. Click a row for full detail.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" size="sm" onClick={() => refetch()} loading={isFetching}>Refresh</Button>
                    <Link
                        href="/dashboard/settings/privacy"
                        className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-black px-3 py-1.5 hover:bg-neutral-50"
                    >
                        Privacy settings →
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <Card title="Filters" body="Tenant-scoped queries against ai_economic_events">
                <form onSubmit={apply} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <Select label="Privacy mode"  value={filters.privacy_mode}  options={PRIVACY_MODE_OPTIONS} onChange={(v) => set('privacy_mode', v)} />
                        <Select label="Evidence"      value={filters.evidence_status} options={EVIDENCE_OPTIONS}    onChange={(v) => set('evidence_status', v)} />
                        <Input  label="Department ID" value={filters.department_id} onChange={(v) => set('department_id', v)} placeholder="claims" />
                        <Input  label="Employee ID"   value={filters.employee_id}   onChange={(v) => set('employee_id', v)} placeholder="emp_42" />
                        <Input  label="Customer ID"   value={filters.customer_id}   onChange={(v) => set('customer_id', v)} placeholder="cust_123" />
                        <Input  label="Feature ID"    value={filters.feature_id}    onChange={(v) => set('feature_id', v)} placeholder="support_reply" />
                        <Input  label="Workflow ID"   value={filters.workflow_id}   onChange={(v) => set('workflow_id', v)} placeholder="prior_auth" />
                        <Input  label="Action type"   value={filters.action_type}   onChange={(v) => set('action_type', v)} placeholder="claims_summary" />
                        <Input  label="Provider"      value={filters.provider}      onChange={(v) => set('provider', v)} placeholder="openai" />
                        <Input  label="Model"         value={filters.model_used}    onChange={(v) => set('model_used', v)} placeholder="gpt-4o-mini" />
                        <Input  label="Since"         type="datetime-local" value={filters.since} onChange={(v) => set('since', v)} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" size="sm" onClick={clear}>Clear</Button>
                        <Button type="submit" size="sm">Apply</Button>
                    </div>
                </form>
            </Card>

            {/* Results */}
            <Card
                title={`Events ${data ? `(${data.count})` : ''}`}
                body="Ordered by event_time DESC · 100 row cap"
            >
                {isLoading ? (
                    <Skeleton className="h-48" />
                ) : error ? (
                    <ErrorState title="Could not load events" message={String(error)} />
                ) : !data || data.events.length === 0 ? (
                    <div className="py-8 text-center space-y-2">
                        <p className="text-sm text-neutral-500">No events in this window.</p>
                        <p className="text-[11px] font-mono text-neutral-400">
                            Try widening Since, or check that hosted-routing and meter-only paths are flowing.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[11px] font-mono">
                            <thead>
                                <tr className="text-[9px] uppercase tracking-widest text-neutral-500 border-b-2 border-black">
                                    <th className="text-left py-2 pl-1">Time</th>
                                    <th className="text-left py-2">Request</th>
                                    <th className="text-left py-2">Source</th>
                                    <th className="text-left py-2">Owner</th>
                                    <th className="text-left py-2">Action</th>
                                    <th className="text-left py-2">Model</th>
                                    <th className="text-right py-2">Cost</th>
                                    <th className="text-right py-2">Tokens</th>
                                    <th className="text-center py-2">Privacy</th>
                                    <th className="text-center py-2">Evidence</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.events.map((e) => {
                                    const owner =
                                        e.employee_id ? `emp ${e.employee_id}` :
                                        e.department_id ? `dept ${e.department_id}` :
                                        e.customer_id ? `cust ${e.customer_id}` :
                                        e.feature_id ? `feat ${e.feature_id}` :
                                        e.workflow_id ? `wf ${e.workflow_id}` :
                                        '—';
                                    return (
                                        <tr key={e.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                                            <td className="py-2 pl-1 text-neutral-600 whitespace-nowrap">{fmtTs(e.event_time)}</td>
                                            <td className="py-2">
                                                <Link className="text-black hover:underline break-all" href={`/dashboard/meter/events/${e.id}`}>
                                                    {e.request_id.slice(0, 16)}…
                                                </Link>
                                            </td>
                                            <td className="py-2 text-neutral-700">{e.source}</td>
                                            <td className="py-2 text-neutral-700">{owner}</td>
                                            <td className="py-2 text-neutral-700">{e.action_type ?? e.task_type ?? '—'}</td>
                                            <td className="py-2 text-neutral-700">{e.model_used ?? '—'}</td>
                                            <td className="py-2 text-right">{fmtUsd(e.cost_usd)}</td>
                                            <td className="py-2 text-right">{e.total_tokens.toLocaleString()}</td>
                                            <td className="py-2 text-center"><PrivacyBadge mode={e.privacy_mode} /></td>
                                            <td className="py-2 text-center">
                                                {e.evidence_bundle_id ? (
                                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 border-2 border-success bg-success/10 text-black">PRESENT</span>
                                                ) : (
                                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 border-2 border-neutral-200 bg-neutral-50 text-neutral-500">MISSING</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
