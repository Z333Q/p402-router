'use client';
/**
 * Slice 3H — Event detail drill-down page.
 *
 * One row of ai_economic_events rendered as a CFO-readable evidence card.
 * Hits /api/v2/prove/economic-events/[request_id], which is read-only and
 * metadata-only by construction. This page NEVER fetches or displays
 * prompt or response content.
 */

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { Card, Button } from '../../../_components/ui';
import {
    AttributionBadge,
    ColorLegend,
    EvidenceBadge,
    GovernanceBadge,
    PrivacyBadge,
    SemanticBadge,
    SpendRiskBadge,
    StatusCodeBadge,
} from '../../../_components/semantic';
import { PageHeader } from '../../../_components/PageHeader';
import { Breadcrumbs } from '../../../_components/Breadcrumbs';
import { DISCLAIMER_METADATA_ONLY } from '@/lib/dashboard/language';
import type {
    EventDetailResponse,
    RelatedEventSummary,
} from '@/lib/prove/event-detail';
import { getOutcomeTone, type OutcomeView } from '@/lib/prove/outcome';

// ─────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────

function fmtUsd(n: number | string, digits = 4): string {
    const v = typeof n === 'number' ? n : Number(n);
    if (!Number.isFinite(v)) return '$0.00';
    return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: digits })}`;
}
function fmtInt(n: number): string {
    return n.toLocaleString('en-US');
}
function fmtPct(n: number | null): string {
    if (n == null || !Number.isFinite(n)) return 'n/a';
    return `${n.toFixed(1)}%`;
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const requestId = String(params?.request_id ?? '');

    const detail = useQuery<EventDetailResponse>({
        queryKey: ['prove/event', requestId],
        enabled: !!requestId,
        queryFn: async () => {
            const r = await fetch(`/api/v2/prove/economic-events/${encodeURIComponent(requestId)}`);
            if (r.status === 404) throw new Error('NOT_FOUND');
            if (!r.ok) throw new Error(`detail ${r.status}`);
            return r.json();
        },
    });

    if (detail.isLoading) {
        return <div className="p-8 text-sm text-neutral-500">Loading event…</div>;
    }
    if (detail.error instanceof Error && detail.error.message === 'NOT_FOUND') {
        return (
            <div className="p-6 lg:p-8">
                <Card title="Event not found">
                    <p className="text-sm text-neutral-700 mb-4">
                        No economic event matches <span className="font-mono">{requestId}</span> for this tenant.
                    </p>
                    <Button onClick={() => router.push('/dashboard/prove')}>Back to Prove</Button>
                </Card>
            </div>
        );
    }
    if (detail.error || !detail.data) {
        return (
            <div className="p-6 lg:p-8">
                <Card title="Could not load event">
                    <p className="text-sm text-neutral-700">An error occurred. Please try again.</p>
                </Card>
            </div>
        );
    }

    const d = detail.data;
    const { event, attribution, governance, privacy, evidence, cost, related_events, explanation } = d;
    const outcome: OutcomeView | null = d.outcome;

    function copyToClipboard(text: string): void {
        navigator.clipboard?.writeText(text).catch(() => { /* noop */ });
    }
    function downloadJson(): void {
        const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `p402-event-${event.request_id}.json`;
        a.click();
    }
    function downloadCsvRow(): void {
        const url = `/api/v2/prove/economic-events/export?format=csv&limit=1&` +
            `since=${encodeURIComponent(event.event_time)}&until=${encodeURIComponent(event.event_time)}`;
        // The export route filters by event_time window; the single-row
        // assumption holds because request_id is unique per tenant in the
        // window and the caller already knows what they want.
        window.location.href = url;
    }
    function applyFilter(qs: string): void {
        router.push(`/dashboard/prove?${qs}`);
    }

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <PageHeader
                area="Prove"
                title="Event detail"
                purpose="One row of the canonical economic ledger, rendered as a CFO-readable evidence card."
                disclaimers={[DISCLAIMER_METADATA_ONLY]}
                primary={[
                    { label: 'Prove search',     href: '/dashboard/prove' },
                    { label: 'Outcome coverage', href: '/dashboard/prove/outcomes' },
                ]}
                secondary={[
                    { label: 'Accountability', href: '/dashboard/accountability' },
                ]}
                breadcrumbs={
                    <Breadcrumbs items={[
                        { label: 'Prove',  href: '/dashboard/prove' },
                        { label: event.request_id },
                    ]} />
                }
            />

            {/* ── 1. Event summary card ──────────────────────────────────── */}
            <Card title="Summary" action={
                <div className="flex gap-2">
                    <Button onClick={() => copyToClipboard(event.request_id)}>Copy ID</Button>
                    <Button onClick={downloadJson}>Copy JSON</Button>
                    <Button onClick={downloadCsvRow}>Export CSV</Button>
                </div>
            }>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <Field label="Event time" value={event.event_time} mono />
                    <Field label="Request ID" value={event.request_id} mono />
                    <Field label="Source" value={event.source} mono />
                    <Field label="Route" value={event.route ?? '—'} mono />
                    <Field label="Provider" value={event.provider ?? '—'} mono />
                    <Field label="Model used" value={event.model_used ?? '—'} mono />
                    <div>
                        <Lbl>Status</Lbl>
                        <StatusCodeBadge code={event.status_code} />
                    </div>
                    <div>
                        <Lbl>Success</Lbl>
                        <span className="font-mono">{event.success == null ? '—' : event.success ? '✓ yes' : '✕ no'}</span>
                    </div>
                    <Field label="Cost (USD)" value={fmtUsd(event.cost_usd, 6)} mono />
                    <Field label="Input tokens"  value={fmtInt(event.input_tokens)}  mono />
                    <Field label="Output tokens" value={fmtInt(event.output_tokens)} mono />
                    <Field label="Total tokens"  value={fmtInt(event.total_tokens)}  mono />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <GovernanceBadge value={governance.decision} />
                    {governance.deny_code && (
                        <SemanticBadge descriptor={{ tone: 'red', label: governance.deny_code, glyph: '✕' }} />
                    )}
                    <PrivacyBadge value={privacy.privacy_mode} />
                    <EvidenceBadge state={evidence.present ? 'present' : 'missing'} />
                    <AttributionBadge state={attribution.status} />
                    <SpendRiskBadge state={
                        cost.zero_cost_denied
                            ? 'zero_cost'
                            : cost.cost_usd > 1 ? 'high' : 'normal'
                    } />
                </div>
            </Card>

            {/* ── 2. CFO-readable explanation ────────────────────────────── */}
            <Card title="Explanation">
                <p className="text-base font-bold text-neutral-900 mb-3">{explanation.headline}</p>
                {explanation.details.length > 0 && (
                    <ul className="list-disc ml-5 space-y-1 text-sm text-neutral-700">
                        {explanation.details.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                )}
                {explanation.notes.length > 0 && (
                    <div className="mt-4 border-t-2 border-black pt-3 space-y-1 text-sm">
                        {explanation.notes.map((n, i) => (
                            <p key={i} className="text-amber-900">⚠ {n}</p>
                        ))}
                    </div>
                )}
            </Card>

            {/* ── 3. Attribution chain ───────────────────────────────────── */}
            <Card title="Attribution chain">
                <div className="flex items-center gap-3 mb-3">
                    <AttributionBadge state={attribution.status} />
                    <span className="text-xs font-mono">
                        {attribution.completeness_count}/6 fields ({fmtPct(attribution.completeness_pct)})
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <AttrField label="Department owner" value={attribution.department_id} onClick={() => attribution.department_id && applyFilter(`department_id=${attribution.department_id}`)} />
                    <AttrField label="Employee owner"   value={attribution.employee_id}   onClick={() => attribution.employee_id   && applyFilter(`employee_id=${attribution.employee_id}`)} />
                    <AttrField label="Workflow"         value={attribution.workflow_id}   onClick={() => attribution.workflow_id   && applyFilter(`workflow_id=${attribution.workflow_id}`)} />
                    <AttrField label="Customer"         value={attribution.customer_id}   onClick={() => attribution.customer_id   && applyFilter(`customer_id=${attribution.customer_id}`)} />
                    <AttrField label="Feature"          value={attribution.feature_id}    onClick={() => attribution.feature_id    && applyFilter(`feature_id=${attribution.feature_id}`)} />
                    <AttrField label="API key"          value={attribution.api_key_id}    onClick={() => attribution.api_key_id    && applyFilter(`api_key_id=${attribution.api_key_id}`)} />
                </div>
                {attribution.missing.length > 0 && (
                    <p className="mt-3 text-xs text-amber-900">
                        Missing: {attribution.missing.join(', ')}.
                    </p>
                )}
            </Card>

            {/* ── 4. Governance and control verdict ──────────────────────── */}
            <Card title="Governance &amp; control verdict">
                <div className="flex items-center gap-2 mb-3">
                    <GovernanceBadge value={governance.decision} />
                    {governance.deny_code && (
                        <SemanticBadge descriptor={{ tone: 'red', label: governance.deny_code, glyph: '✕' }} />
                    )}
                    {governance.provider_call_blocked && (
                        <SemanticBadge descriptor={{ tone: 'gray', label: 'provider call blocked', glyph: '·' }} />
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <Field label="Decision" value={governance.decision ?? '—'} mono />
                    <Field label="Deny code" value={governance.deny_code ?? '—'} mono />
                    <Field label="Deny rule" value={governance.deny_rule ?? '—'} mono />
                    <Field label="Decision source" value={governance.decision_source ?? '—'} mono />
                    <Field label="Budget" value={governance.budget_id ?? '—'} mono />
                    <Field label="Policy" value={governance.policy_id ?? '—'} mono />
                    <Field label="Mandate" value={governance.mandate_id ?? '—'} mono />
                    <Field label="Status code" value={governance.status_code == null ? '—' : String(governance.status_code)} mono />
                </div>
                {cost.zero_cost_denied && (
                    <p className="mt-4 text-sm text-rose-900">
                        Provider execution was blocked. <span className="font-mono">cost_usd = $0</span>.
                    </p>
                )}
            </Card>

            {/* ── 5. Privacy posture ─────────────────────────────────────── */}
            <Card title="Privacy posture">
                <div className="flex items-center gap-2 mb-3">
                    <PrivacyBadge value={privacy.privacy_mode} />
                    {privacy.redaction_applied && (
                        <SemanticBadge descriptor={{ tone: 'amber', label: 'redaction applied', glyph: 'R' }} />
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <Field label="Privacy mode" value={privacy.privacy_mode} mono />
                    <Field label="Prompt stored"   value={privacy.prompt_stored   ? 'yes' : 'no'} mono />
                    <Field label="Response stored" value={privacy.response_stored ? 'yes' : 'no'} mono />
                    <Field label="Redaction applied" value={privacy.redaction_applied ? 'yes' : 'no'} mono />
                    <Field label="Retention expires" value={privacy.retention_expires_at ?? '—'} mono />
                </div>
                <p className="mt-4 text-xs text-neutral-600">
                    This event is shown using economic metadata only. Prompt and response content are not displayed.
                </p>
                {!privacy.prompt_stored   && <p className="mt-1 text-xs text-neutral-700">Prompt content not stored.</p>}
                {!privacy.response_stored && <p className="text-xs text-neutral-700">Response content not stored.</p>}
            </Card>

            {/* ── 5.5 Outcome (Slice 3J) ──────────────────────────────────── */}
            <Card title="Outcome">
                <div className="flex items-center gap-2 mb-3">
                    <SemanticBadge descriptor={getOutcomeTone(outcome?.status ?? null)} />
                    {outcome?.legacy_status && (
                        <SemanticBadge descriptor={{ tone: 'gray', label: `legacy: ${outcome.legacy_status}`, glyph: '·' }} />
                    )}
                    {outcome && outcome.source && !outcome.source_is_canonical && (
                        <SemanticBadge descriptor={{ tone: 'gray', label: `legacy source: ${outcome.source}`, glyph: '·' }} />
                    )}
                </div>
                {outcome ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <Field label="Outcome status (V5)" value={outcome.status} mono />
                        <Field
                            label="Legacy status"
                            value={outcome.legacy_status ?? '—'}
                            mono
                        />
                        <Field
                            label="Quality score"
                            value={outcome.quality_score == null ? '—' : outcome.quality_score.toFixed(3)}
                            mono
                        />
                        <Field label="Source" value={outcome.source ?? '—'} mono />
                        <Field label="Recorded at" value={outcome.created_at} mono />
                        <Field label="Last updated" value={outcome.updated_at} mono />
                    </div>
                ) : (
                    <div className="text-sm text-neutral-700 space-y-2">
                        <p>
                            No outcome has been recorded for this request. Outcomes are recorded by your SDK,
                            an agent webhook, or by calling <span className="font-mono">POST /api/v2/outcomes</span>.
                        </p>
                        <p>
                            See the <Link href="/dashboard/prove/outcomes/setup" className="underline">activation kit</Link>{' '}
                            for SDK, REST, and application-callback examples, or watch overall coverage on the{' '}
                            <Link href="/dashboard/prove/outcomes" className="underline">coverage dashboard</Link>.
                        </p>
                    </div>
                )}
                <p className="mt-3 text-xs text-neutral-600">
                    Outcome state is derived from <span className="font-mono">request_outcomes</span> and is
                    metadata-only. Prompt and response content are never read or displayed here.
                </p>
            </Card>

            {/* ── 6. Evidence ────────────────────────────────────────────── */}
            <Card title="Evidence">
                <div className="flex items-center gap-2 mb-3">
                    <EvidenceBadge state={evidence.present ? 'present' : 'missing'} />
                </div>
                {evidence.present ? (
                    <div className="space-y-2 text-sm">
                        <p>
                            Evidence bundle id: <span className="font-mono">{evidence.evidence_bundle_id}</span>
                        </p>
                        {evidence.bundle_url && (
                            <Button onClick={() => evidence.bundle_url && (window.location.href = evidence.bundle_url)}>
                                Open evidence bundle
                            </Button>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-neutral-700">
                        No evidence bundle attached. This is neutral; the dashboard does not imply non-compliance
                        unless policy explicitly required evidence for this event.
                    </p>
                )}
            </Card>

            {/* ── 7. Cost and token math ─────────────────────────────────── */}
            <Card title="Cost &amp; tokens">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <Field label="cost_usd" value={fmtUsd(cost.cost_usd, 6)} mono />
                    <Field label="direct_cost_usd" value={fmtUsd(cost.direct_cost_usd, 6)} mono />
                    <Field label="Input tokens"  value={fmtInt(cost.input_tokens)}  mono />
                    <Field label="Output tokens" value={fmtInt(cost.output_tokens)} mono />
                    <Field label="Total tokens"  value={fmtInt(cost.total_tokens)}  mono />
                    <Field
                        label="Avg / 1K tokens"
                        value={cost.avg_cost_per_1k_tokens == null ? 'n/a' : fmtUsd(cost.avg_cost_per_1k_tokens, 6)}
                        mono
                    />
                </div>
                {cost.zero_cost_denied && (
                    <p className="mt-3 text-xs text-rose-900">
                        This event is a denied request. Provider cost is $0 because the request never reached the model.
                    </p>
                )}
            </Card>

            {/* ── 8. Related events ──────────────────────────────────────── */}
            <Card title="Related events">
                <p className="text-xs text-neutral-600 mb-3">
                    Most recent 10 events that share a department, employee, workflow, customer, provider/model,
                    deny code, or fall within the same 24-hour window as this one.
                </p>
                {related_events.length === 0 ? (
                    <p className="text-sm text-neutral-500">No related events.</p>
                ) : (
                    <div className="overflow-auto border-2 border-black">
                        <table className="w-full text-[11px]">
                            <thead className="bg-neutral-100 border-b-2 border-black">
                                <tr>
                                    {['event_time','request_id','provider','model','governance','deny','cost','related by'].map((h) => (
                                        <th key={h} className="text-left p-2 font-bold uppercase whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {related_events.map((r) => (
                                    <tr key={r.request_id} className="border-b border-neutral-200 hover:bg-neutral-50">
                                        <td className="p-1 font-mono whitespace-nowrap">{r.event_time}</td>
                                        <td className="p-1 font-mono">
                                            <Link href={`/dashboard/prove/event/${encodeURIComponent(r.request_id)}`} className="underline">
                                                {r.request_id.slice(0, 12)}…
                                            </Link>
                                        </td>
                                        <td className="p-1 font-mono">{r.provider ?? '—'}</td>
                                        <td className="p-1 font-mono">{r.model_used ?? '—'}</td>
                                        <td className="p-1"><GovernanceBadge value={r.governance_decision} /></td>
                                        <td className="p-1 font-mono">{r.deny_code ?? '—'}</td>
                                        <td className="p-1 font-mono tabular-nums">{fmtUsd(r.cost_usd)}</td>
                                        <td className="p-1">
                                            <RelatedReasonBadge reason={r.match_reason} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* ── 9. Actions footer ─────────────────────────────────────── */}
            <Card title="Actions">
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => copyToClipboard(event.request_id)}>Copy request ID</Button>
                    <Button onClick={downloadJson}>Copy event JSON</Button>
                    <Button onClick={downloadCsvRow}>Export event CSV</Button>
                    {evidence.bundle_url && (
                        <Button onClick={() => evidence.bundle_url && (window.location.href = evidence.bundle_url)}>
                            Open evidence bundle
                        </Button>
                    )}
                    {event.department_id && (
                        <Button onClick={() => applyFilter(`department_id=${event.department_id}`)}>
                            Filter by department
                        </Button>
                    )}
                    {event.deny_code && (
                        <Button onClick={() => applyFilter(`deny_code=${event.deny_code}`)}>
                            Filter by deny code
                        </Button>
                    )}
                    {event.model_used && (
                        <Button onClick={() => applyFilter(`model=${event.model_used}`)}>
                            Filter by model
                        </Button>
                    )}
                    <Button onClick={() => router.push('/dashboard/prove')}>Back to Prove search</Button>
                </div>
                <div className="mt-4 pt-4 border-t-2 border-black">
                    <ColorLegend
                        title="Tone legend"
                        items={[
                            { tone: 'green',  label: 'healthy / approved' },
                            { tone: 'blue',   label: 'normal' },
                            { tone: 'amber',  label: 'review / warned' },
                            { tone: 'red',    label: 'denied / failed' },
                            { tone: 'purple', label: 'privacy' },
                            { tone: 'gray',   label: 'unknown / n/a' },
                        ]}
                    />
                </div>
            </Card>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Tiny sub-components
// ─────────────────────────────────────────────────────────────────────────

function Lbl({ children }: { children: React.ReactNode }) {
    return <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-1">{children}</div>;
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <Lbl>{label}</Lbl>
            <div className={`${mono ? 'font-mono' : ''} break-all`}>{value}</div>
        </div>
    );
}

function AttrField({ label, value, onClick }: { label: string; value: string | null; onClick: () => void }) {
    return (
        <div>
            <Lbl>{label}</Lbl>
            {value ? (
                <button
                    onClick={onClick}
                    className="font-mono underline text-left hover:text-rose-700"
                    title={`Apply ${label} as Prove filter`}
                >
                    {value}
                </button>
            ) : (
                <SemanticBadge descriptor={{ tone: 'red', label: 'unattributed', glyph: '✕' }} />
            )}
        </div>
    );
}

function RelatedReasonBadge({ reason }: { reason: RelatedEventSummary['match_reason'] }) {
    const labelMap: Record<RelatedEventSummary['match_reason'], string> = {
        department: 'same department',
        employee: 'same employee',
        workflow: 'same workflow',
        customer: 'same customer',
        provider_model: 'same provider/model',
        deny_code: 'same deny code',
        nearby: 'nearby in time',
    };
    return (
        <SemanticBadge
            descriptor={{ tone: 'blue', label: labelMap[reason], glyph: '·' }}
        />
    );
}

