'use client';
/**
 * Event detail page for ai_economic_events (v2_052).
 *
 * Privacy is the first-class element of this surface. Every event page
 * shows: privacy_mode, prompt_stored, response_stored, redaction_applied,
 * retention_expires_at, and evidence privacy status.
 *
 * Read-only.
 */

import React, { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
    Card, Badge, ErrorState, Skeleton, MetricBox,
} from '../../../_components/ui';

interface EconomicEvent {
    id: string;
    request_id: string;
    tenant_id: string;
    api_key_id: string | null;
    source: string;
    event_time: string;

    owner_type: string | null;
    owner_id: string | null;
    department_id: string | null;
    employee_id: string | null;
    customer_id: string | null;
    project_id: string | null;
    feature_id: string | null;
    workflow_id: string | null;

    task_type: string | null;
    action_type: string | null;

    provider: string | null;
    model_requested: string | null;
    model_used: string | null;

    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cost_usd: string;
    direct_cost_usd: string;
    route_savings_usd: string;
    cache_savings_usd: string;
    latency_ms: number | null;
    cache_hit: boolean;
    status_code: number | null;
    success: boolean | null;

    revenue_usd: string | null;
    gross_margin_pct: string | null;

    budget_id: string | null;
    policy_id: string | null;
    mandate_id: string | null;
    governance_decision: string | null;
    deny_code: string | null;

    receipt_id: string | null;
    evidence_bundle_id: string | null;

    output_status: string | null;
    quality_score: string | null;
    human_review_status: string | null;

    privacy_mode: string;
    prompt_stored: boolean;
    response_stored: boolean;
    prompt_fingerprint: string | null;
    response_fingerprint: string | null;
    redaction_applied: boolean;
    retention_expires_at: string | null;

    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

function fmtUsd(n: number | string | null, digits = 6): string {
    if (n === null || n === undefined) return '—';
    const v = Number(n);
    if (!Number.isFinite(v)) return '—';
    return `$${v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function fmtTs(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toUTCString();
    } catch {
        return iso;
    }
}

function daysUntil(iso: string | null): string {
    if (!iso) return '—';
    const ms = new Date(iso).getTime() - Date.now();
    if (!Number.isFinite(ms)) return '—';
    if (ms <= 0) return 'expired';
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return `${days} day${days === 1 ? '' : 's'} remaining`;
}

function PrivacyModeBadge({ mode }: { mode: string }) {
    // Visual rank: tighter modes are more "calm", looser modes more "loud".
    const tone: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
        metadata_only:   'success',
        fingerprint_only: 'success',
        redacted_trace:  'default',
        private_gateway: 'success',
        full_trace:      'warning',
    };
    return <Badge tone={tone[mode] ?? 'default'}>{mode.replace(/_/g, ' ').toUpperCase()}</Badge>;
}

function StorageRow({ label, stored }: { label: string; stored: boolean }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-neutral-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{label}</span>
            <span className={`text-[11px] font-black uppercase px-2 py-0.5 border-2 ${stored ? 'border-warning bg-warning/20 text-black' : 'border-success bg-success/10 text-black'}`}>
                {stored ? 'STORED' : 'NOT STORED'}
            </span>
        </div>
    );
}

function KV({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
    return (
        <div className="flex justify-between gap-3 py-1.5 border-b border-neutral-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 shrink-0">{label}</span>
            <span className={`text-[12px] text-right ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
        </div>
    );
}

export default function EventDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);

    const { data, isLoading, error } = useQuery<{ ok: boolean; event: EconomicEvent }>({
        queryKey: ['economic-event', id],
        queryFn: async () => {
            const res = await fetch(`/api/v2/meter/events/${id}`);
            if (res.status === 404) throw new Error('Event not found');
            if (!res.ok) throw new Error(`Failed to load event (${res.status})`);
            return res.json();
        },
    });

    return (
        <div className="space-y-6 max-w-[1100px] mx-auto">
            <div className="flex flex-wrap justify-between items-end gap-4 border-b-2 border-black/5 pb-6">
                <div className="space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                        Meter · Event Detail
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-black break-all">
                        {data?.event.request_id ?? id}
                    </h1>
                </div>
                <Link
                    href="/dashboard/optimize"
                    className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-black px-3 py-1.5 hover:bg-neutral-50 transition-colors"
                >
                    ← Optimize
                </Link>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-48" />
                </div>
            ) : error ? (
                <ErrorState title="Could not load event" message={String(error)} />
            ) : !data ? null : (
                <>
                    {/* ── Privacy posture (top of page) ──────────────────── */}
                    <Card title="Privacy posture" body="What P402 stored and when it expires">
                        <div className="flex flex-wrap items-center gap-4 mb-4">
                            <PrivacyModeBadge mode={data.event.privacy_mode} />
                            <span className="text-[11px] font-mono text-neutral-600">
                                Retention: {daysUntil(data.event.retention_expires_at)}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-400">
                                expires {fmtTs(data.event.retention_expires_at)}
                            </span>
                        </div>
                        <StorageRow label="Prompt content"   stored={data.event.prompt_stored} />
                        <StorageRow label="Response content" stored={data.event.response_stored} />
                        <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                                Redaction applied
                            </span>
                            <span className={`text-[11px] font-black uppercase px-2 py-0.5 border-2 ${data.event.redaction_applied ? 'border-success bg-success/10 text-black' : 'border-neutral-200 bg-neutral-50 text-neutral-500'}`}>
                                {data.event.redaction_applied ? 'YES' : 'NO'}
                            </span>
                        </div>
                        {data.event.prompt_fingerprint && (
                            <KV label="Prompt fingerprint" value={<code className="text-[10px]">{data.event.prompt_fingerprint.slice(0, 16)}…</code>} mono />
                        )}
                        {data.event.response_fingerprint && (
                            <KV label="Response fingerprint" value={<code className="text-[10px]">{data.event.response_fingerprint.slice(0, 16)}…</code>} mono />
                        )}
                        <p className="text-[11px] font-mono text-neutral-500 mt-3 max-w-[640px]">
                            P402 meters economics, not content. This event was recorded under the{' '}
                            <strong className="text-black">{data.event.privacy_mode}</strong> privacy mode.
                            Customers control storage, redaction, and retention per scope.
                        </p>
                    </Card>

                    {/* ── Cost + usage ───────────────────────────────────── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <MetricBox label="Cost"      value={fmtUsd(data.event.cost_usd)}        subtext={`direct ${fmtUsd(data.event.direct_cost_usd)}`} />
                        <MetricBox label="Tokens"    value={data.event.total_tokens.toLocaleString()} subtext={`${data.event.input_tokens} in / ${data.event.output_tokens} out`} />
                        <MetricBox label="Latency"   value={data.event.latency_ms !== null ? `${data.event.latency_ms} ms` : '—'} subtext={data.event.cache_hit ? 'cache hit' : 'cache miss'} />
                        <MetricBox label="Status"    value={data.event.status_code ?? '—'} subtext={data.event.success === null ? '' : data.event.success ? 'success' : 'failed'} />
                    </div>

                    {/* ── Attribution ────────────────────────────────────── */}
                    <Card title="Attribution" body="Who owns this spend">
                        <KV label="Owner type"    value={data.event.owner_type} />
                        <KV label="Owner ID"      value={data.event.owner_id} mono />
                        <KV label="Department"    value={data.event.department_id} mono />
                        <KV label="Employee"      value={data.event.employee_id} mono />
                        <KV label="Customer"      value={data.event.customer_id} mono />
                        <KV label="Project"       value={data.event.project_id} mono />
                        <KV label="Feature"       value={data.event.feature_id} mono />
                        <KV label="Workflow"      value={data.event.workflow_id} mono />
                        <KV label="API Key ID"    value={data.event.api_key_id} mono />
                        <KV label="Task type"     value={data.event.task_type} />
                        <KV label="Action type"   value={data.event.action_type} />
                    </Card>

                    {/* ── Routing + Economics ────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card title="Routing">
                            <KV label="Provider"        value={data.event.provider} mono />
                            <KV label="Model used"      value={data.event.model_used} mono />
                            <KV label="Model requested" value={data.event.model_requested} mono />
                            <KV label="Source"          value={data.event.source} mono />
                            <KV label="Cache savings"   value={fmtUsd(data.event.cache_savings_usd)} mono />
                            <KV label="Route savings"   value={fmtUsd(data.event.route_savings_usd)} mono />
                        </Card>

                        <Card title="Economics + Outcome">
                            <KV label="Revenue"         value={fmtUsd(data.event.revenue_usd ?? '0')} mono />
                            <KV label="Gross margin"    value={data.event.gross_margin_pct ? `${(Number(data.event.gross_margin_pct) * 100).toFixed(2)}%` : '—'} />
                            <KV label="Output status"   value={data.event.output_status ?? '—'} />
                            <KV label="Quality score"   value={data.event.quality_score ?? '—'} />
                            <KV label="Human review"    value={data.event.human_review_status ?? '—'} />
                        </Card>
                    </div>

                    {/* ── Governance ─────────────────────────────────────── */}
                    <Card title="Governance">
                        <KV label="Decision"      value={data.event.governance_decision ?? '—'} />
                        <KV label="Deny code"     value={data.event.deny_code ?? '—'} mono />
                        <KV label="Budget"        value={data.event.budget_id ?? '—'} mono />
                        <KV label="Policy"        value={data.event.policy_id ?? '—'} mono />
                        <KV label="Mandate"       value={data.event.mandate_id ?? '—'} mono />
                    </Card>

                    {/* ── Evidence (with privacy status) ────────────────── */}
                    <Card title="Evidence" body="Privacy posture is part of the evidence record">
                        <KV label="Evidence bundle" value={data.event.evidence_bundle_id ?? '—'} mono />
                        <KV label="Receipt"         value={data.event.receipt_id ?? '—'} mono />
                        <KV label="Privacy mode"    value={data.event.privacy_mode} />
                        <KV label="Prompt stored"   value={data.event.prompt_stored ? 'yes' : 'no'} />
                        <KV label="Response stored" value={data.event.response_stored ? 'yes' : 'no'} />
                        <KV label="Redaction"       value={data.event.redaction_applied ? 'applied' : 'not applied'} />
                        <KV label="Retention"       value={`${daysUntil(data.event.retention_expires_at)} (expires ${fmtTs(data.event.retention_expires_at)})`} />
                    </Card>

                    {/* ── Footer timestamps ──────────────────────────────── */}
                    <div className="flex flex-wrap gap-6 text-[10px] font-mono text-neutral-500 pt-2 border-t-2 border-black/5">
                        <span>event_id <code className="text-neutral-700">{data.event.id}</code></span>
                        <span>recorded {fmtTs(data.event.event_time)}</span>
                        <span>created {fmtTs(data.event.created_at)}</span>
                        <span>updated {fmtTs(data.event.updated_at)}</span>
                    </div>
                </>
            )}
        </div>
    );
}
