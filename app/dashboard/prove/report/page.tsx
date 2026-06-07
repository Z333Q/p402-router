'use client';
/**
 * Slice 3I — Executive Prove Report and Audit Packet.
 *
 * Print-friendly, board-ready packet over ai_economic_events. Reads
 * /api/v2/prove/report, which is tenant-scoped, read-only, and never
 * touches prompt or response content. Browser print-to-PDF is enough
 * for this slice; the print stylesheet hides the action bar.
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { Button, Card, Input, Select } from '../../_components/ui';
import {
    AttributionBadge,
    ColorLegend,
    EvidenceBadge,
    GovernanceBadge,
    PrivacyBadge,
    SemanticBadge,
    StatusCodeBadge,
} from '../../_components/semantic';
import { PageHeader } from '../../_components/PageHeader';
import { Breadcrumbs } from '../../_components/Breadcrumbs';
import {
    DISCLAIMER_METADATA_ONLY,
    DISCLAIMER_OPTIMIZE_BLOCKED,
} from '@/lib/dashboard/language';

// ─────────────────────────────────────────────────────────────────────────
// Types mirrored from the API (kept local to avoid coupling client code
// to server-only modules).
// ─────────────────────────────────────────────────────────────────────────

interface ExecutiveSummary {
    total_spend_usd: number;
    total_events: number;
    denied_events: number;
    avg_cost_per_request_usd: number;
    total_tokens: number;
    evidence_coverage_pct: number;
    unattributed_event_count: number;
    unattributed_spend_usd: number;
    missing_evidence_count: number;
    denied_provider_cost_usd: 0;
}

interface RankedRow {
    key: string;
    request_count: number;
    total_cost_usd: number;
    denied_count: number;
}

interface ProviderModelRow extends RankedRow {
    provider: string;
    model_used: string;
}

interface DeniedSummary {
    total_denied: number;
    total_blocked_cost_usd: 0;
    by_code: Array<{ deny_code: string; count: number; deny_rule: string | null }>;
    top_deny_rules: Array<{ deny_rule: string; count: number }>;
}

interface BudgetControlEvidence {
    budget_count: number;
    policy_count: number;
    mandate_count: number;
    decision_sources: Array<{ source: string; count: number }>;
}

interface PrivacyRow {
    privacy_mode: string;
    count: number;
    prompt_stored: number;
    response_stored: number;
    redaction_applied: number;
}

interface AttributionGaps {
    unattributed_count: number;
    partial_count: number;
    attributed_count: number;
    most_commonly_missing: Array<{ field: string; missing_count: number }>;
}

interface CleanupRow {
    event_time: string;
    request_id: string;
    cost_usd: string;
    provider: string | null;
    model_used: string | null;
    governance_decision: string | null;
    deny_code: string | null;
    department_id: string | null;
    workflow_id: string | null;
    missing_evidence: boolean;
    unattributed: boolean;
    cleanup_score: number;
}

interface AppendixRow {
    event_time: string;
    request_id: string;
    provider: string | null;
    model_used: string | null;
    status_code: number | null;
    success: boolean | null;
    cost_usd: string;
    total_tokens: number;
    department_id: string | null;
    workflow_id: string | null;
    governance_decision: string | null;
    deny_code: string | null;
    privacy_mode: string;
    evidence_bundle_id: string | null;
}

interface ReportResponse {
    ok: true;
    generated_at: string;
    window: { since: string; until: string };
    filters_applied: Record<string, string>;
    executive_summary: ExecutiveSummary;
    executive_summary_text: string;
    by_department:    RankedRow[];
    by_workflow:      RankedRow[];
    by_provider_model: ProviderModelRow[];
    denied: DeniedSummary;
    budget_control_evidence: BudgetControlEvidence;
    privacy: { distribution: PrivacyRow[] };
    evidence: { coverage_pct: number; missing_evidence_count: number };
    attribution_gaps: AttributionGaps;
    top_cleanup: CleanupRow[];
    appendix: { count: number; limit: number; rows: AppendixRow[] };
}

// ─────────────────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────────────────

function fmtUsd(n: number, digits = 2): string {
    if (!Number.isFinite(n)) return '$0.00';
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: digits })}`;
}
function fmtInt(n: number): string { return n.toLocaleString('en-US'); }
function fmtPct(n: number | null | undefined, digits = 1): string {
    if (n == null || !Number.isFinite(n)) return 'n/a';
    return `${n.toFixed(digits)}%`;
}

// ─────────────────────────────────────────────────────────────────────────
// Filter state
// ─────────────────────────────────────────────────────────────────────────

interface FilterUI {
    since: string; until: string;
    department_id: string; workflow_id: string; customer_id: string;
    provider: string; model: string;
    governance_decision: string; deny_code: string;
    privacy_mode: string; evidence_status: string; attribution_status: string;
}
const EMPTY: FilterUI = {
    since: '', until: '',
    department_id: '', workflow_id: '', customer_id: '',
    provider: '', model: '',
    governance_decision: '', deny_code: '', privacy_mode: '',
    evidence_status: '', attribution_status: '',
};

function toQs(s: FilterUI): URLSearchParams {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(s)) if (v) qs.set(k, v);
    return qs;
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function ReportPage() {
    const [filters, setFilters] = useState<FilterUI>(EMPTY);
    const [runToken, setRunToken] = useState(0);
    const set = <K extends keyof FilterUI>(k: K, v: string) => setFilters((p) => ({ ...p, [k]: v }));
    const qs = useMemo(() => toQs(filters).toString(), [runToken]); // eslint-disable-line react-hooks/exhaustive-deps

    const report = useQuery<ReportResponse>({
        queryKey: ['prove/report', qs],
        queryFn: async () => {
            const r = await fetch(`/api/v2/prove/report?${qs}`);
            if (!r.ok) throw new Error(`report ${r.status}`);
            return r.json();
        },
    });

    function downloadJson(): void {
        if (!report.data) return;
        const blob = new Blob([JSON.stringify(report.data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `p402-report-${report.data.generated_at.slice(0, 10)}.json`;
        a.click();
    }
    function downloadAppendixCsv(): void {
        const u = new URLSearchParams(qs);
        u.set('format', 'csv-appendix');
        window.location.href = `/api/v2/prove/report?${u.toString()}`;
    }
    function copyExecSummary(): void {
        if (!report.data) return;
        navigator.clipboard?.writeText(report.data.executive_summary_text).catch(() => { /* noop */ });
    }
    function printPage(): void {
        window.print();
    }

    if (report.isLoading) return <div className="p-8 text-sm text-neutral-500">Loading report…</div>;
    if (report.error || !report.data) {
        return (
            <div className="p-8">
                <Card title="Could not load report">
                    <p className="text-sm text-neutral-700">Try widening the filters or refreshing.</p>
                </Card>
            </div>
        );
    }

    const r = report.data;
    const s = r.executive_summary;
    const winSince = r.window.since.slice(0, 10);
    const winUntil = r.window.until.slice(0, 10);

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-6xl print:max-w-none print:p-0">
            {/* Print-only header */}
            <div className="hidden print:block border-b-2 border-black pb-3 mb-4">
                <div className="text-[10px] font-extrabold uppercase tracking-wider">P402 Prove report</div>
                <div className="text-xs">Window {winSince} → {winUntil} • Generated {r.generated_at.slice(0, 16)}</div>
            </div>

            {/* ── Action bar (hidden in print) ───────────────────────────── */}
            <div className="print:hidden">
                <PageHeader
                    area="Prove"
                    title="Executive Prove Report"
                    purpose="Board-ready, tenant-scoped, read-only accountability packet over ai_economic_events."
                    disclaimers={[
                        DISCLAIMER_METADATA_ONLY,
                        DISCLAIMER_OPTIMIZE_BLOCKED,
                    ]}
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
                            { label: 'Executive report' },
                        ]} />
                    }
                />
            </div>
            <header className="space-y-3 print:hidden">
                <div className="flex flex-wrap gap-3 items-end">
                    <Input label="Since (UTC)"    placeholder="2026-05-01T00:00:00Z" value={filters.since}    onChange={(v) => set('since', v)} />
                    <Input label="Until (UTC)"    placeholder="2026-05-31T23:59:59Z" value={filters.until}    onChange={(v) => set('until', v)} />
                    <Input label="Department"     value={filters.department_id} onChange={(v) => set('department_id', v)} />
                    <Input label="Workflow"       value={filters.workflow_id}   onChange={(v) => set('workflow_id', v)} />
                    <Input label="Customer"       value={filters.customer_id}   onChange={(v) => set('customer_id', v)} />
                    <Input label="Provider"       value={filters.provider}      onChange={(v) => set('provider', v)} />
                    <Input label="Model"          value={filters.model}         onChange={(v) => set('model', v)} />
                    <Select label="Governance"
                        options={[
                            { value: '', label: 'Any' },
                            { value: 'approved', label: 'approved' },
                            { value: 'denied',   label: 'denied' },
                            { value: 'warned',   label: 'warned' },
                            { value: 'requires_review', label: 'requires_review' },
                        ]}
                        value={filters.governance_decision}
                        onChange={(v) => set('governance_decision', v)}
                    />
                    <Input label="Deny code" value={filters.deny_code} onChange={(v) => set('deny_code', v)} />
                    <Select label="Privacy mode"
                        options={[
                            { value: '', label: 'Any' },
                            { value: 'metadata_only', label: 'metadata_only' },
                            { value: 'fingerprint_only', label: 'fingerprint_only' },
                            { value: 'redacted_trace', label: 'redacted_trace' },
                            { value: 'private_gateway', label: 'private_gateway' },
                            { value: 'full_trace', label: 'full_trace' },
                        ]}
                        value={filters.privacy_mode}
                        onChange={(v) => set('privacy_mode', v)}
                    />
                    <Select label="Evidence"
                        options={[
                            { value: '', label: 'Any' },
                            { value: 'present', label: 'present' },
                            { value: 'missing', label: 'missing' },
                        ]}
                        value={filters.evidence_status}
                        onChange={(v) => set('evidence_status', v)}
                    />
                    <Select label="Attribution"
                        options={[
                            { value: '', label: 'Any' },
                            { value: 'attributed', label: 'attributed' },
                            { value: 'partial', label: 'partial' },
                            { value: 'unattributed', label: 'unattributed' },
                        ]}
                        value={filters.attribution_status}
                        onChange={(v) => set('attribution_status', v)}
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setRunToken((t) => t + 1)}>Apply</Button>
                    <Button onClick={() => { setFilters(EMPTY); setRunToken((t) => t + 1); }}>Reset</Button>
                    <Button onClick={copyExecSummary}>Copy executive summary</Button>
                    <Button onClick={downloadJson}>Export JSON</Button>
                    <Button onClick={downloadAppendixCsv}>Export appendix CSV</Button>
                    <Button onClick={printPage}>Print</Button>
                </div>
            </header>

            {/* ── 1. Executive summary ───────────────────────────────────── */}
            <Section title="Executive summary">
                <p className="text-base text-neutral-900 leading-relaxed mb-4 print:text-sm">
                    {r.executive_summary_text}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <Tile label="Total AI spend" value={fmtUsd(s.total_spend_usd)} />
                    <Tile label="Total events"   value={fmtInt(s.total_events)} />
                    <Tile label="Denied events"  value={fmtInt(s.denied_events)} tone={s.denied_events > 0 ? 'red' : 'gray'} />
                    <Tile label="Denied provider cost" value="$0" tone="green" explain="Denied requests never reached the provider." />
                    <Tile label="Avg cost / request" value={fmtUsd(s.avg_cost_per_request_usd, 4)} />
                    <Tile label="Total tokens"   value={fmtInt(s.total_tokens)} />
                    <Tile label="Evidence coverage" value={fmtPct(s.evidence_coverage_pct)} tone={s.evidence_coverage_pct >= 95 ? 'green' : s.evidence_coverage_pct >= 75 ? 'amber' : 'red'} />
                    <Tile label="Unattributed spend" value={fmtUsd(s.unattributed_spend_usd)} tone={s.unattributed_spend_usd > 0 ? 'amber' : 'green'} />
                </div>
                <div className="mt-3 print:hidden">
                    <ColorLegend
                        title="Tones"
                        items={[
                            { tone: 'green',  label: 'healthy' },
                            { tone: 'blue',   label: 'normal' },
                            { tone: 'amber',  label: 'review' },
                            { tone: 'red',    label: 'denied' },
                            { tone: 'purple', label: 'privacy' },
                            { tone: 'gray',   label: 'unknown' },
                        ]}
                    />
                </div>
            </Section>

            {/* ── 2. Spend by department ─────────────────────────────────── */}
            <Section title="Spend by department">
                <RankedTable rows={r.by_department} />
            </Section>

            {/* ── 3. Spend by workflow ───────────────────────────────────── */}
            <Section title="Spend by workflow">
                <RankedTable rows={r.by_workflow} />
            </Section>

            {/* ── 4. Spend by provider / model ───────────────────────────── */}
            <Section title="Spend by provider / model">
                <table className="w-full text-[12px]">
                    <thead className="border-b-2 border-black">
                        <tr>
                            <Th>Provider</Th><Th>Model</Th><Th right>Requests</Th>
                            <Th right>Denied</Th><Th right>Spend</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {r.by_provider_model.length === 0 && (
                            <tr><td colSpan={5} className="p-2 text-neutral-500">No data.</td></tr>
                        )}
                        {r.by_provider_model.map((row) => (
                            <tr key={row.key} className="border-b border-neutral-200">
                                <Td mono>{row.provider}</Td>
                                <Td mono>{row.model_used}</Td>
                                <Td right>{fmtInt(row.request_count)}</Td>
                                <Td right tone={row.denied_count > 0 ? 'red' : 'gray'}>{fmtInt(row.denied_count)}</Td>
                                <Td right mono>{fmtUsd(row.total_cost_usd)}</Td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Section>

            {/* ── 5. Denied-event summary ────────────────────────────────── */}
            <Section title="Denied-event summary">
                <p className="text-sm text-neutral-700 mb-3 print:text-xs">
                    Denied events are requests stopped before provider execution. Provider cost on these events is $0 by construction.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs mb-4">
                    <Tile label="Total denied" value={fmtInt(r.denied.total_denied)} tone={r.denied.total_denied > 0 ? 'red' : 'gray'} />
                    <Tile label="Denied provider cost" value="$0" tone="green" />
                    <Tile label="Distinct deny codes" value={fmtInt(r.denied.by_code.length)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <SubHd>By deny code</SubHd>
                        <ul className="space-y-1">
                            {r.denied.by_code.map((c) => (
                                <li key={c.deny_code} className="flex items-center justify-between gap-2">
                                    <SemanticBadge descriptor={{ tone: 'red', label: c.deny_code, glyph: '✕' }} />
                                    {c.deny_rule && <span className="font-mono text-[10px] text-neutral-500 truncate">{c.deny_rule}</span>}
                                    <span className="font-mono text-xs font-bold tabular-nums">{fmtInt(c.count)}</span>
                                </li>
                            ))}
                            {r.denied.by_code.length === 0 && <li className="text-xs text-neutral-500">No denied events.</li>}
                        </ul>
                    </div>
                    <div>
                        <SubHd>Top deny rules</SubHd>
                        <ul className="space-y-1">
                            {r.denied.top_deny_rules.map((d) => (
                                <li key={d.deny_rule} className="flex items-center justify-between">
                                    <span className="font-mono text-[11px] truncate">{d.deny_rule}</span>
                                    <span className="font-mono text-xs font-bold tabular-nums">{fmtInt(d.count)}</span>
                                </li>
                            ))}
                            {r.denied.top_deny_rules.length === 0 && <li className="text-xs text-neutral-500">No deny rules surfaced.</li>}
                        </ul>
                    </div>
                </div>
            </Section>

            {/* ── 6. Budget / control evidence ───────────────────────────── */}
            <Section title="Budget &amp; control evidence">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs mb-4">
                    <Tile label="Distinct budgets referenced"  value={fmtInt(r.budget_control_evidence.budget_count)} />
                    <Tile label="Distinct policies referenced" value={fmtInt(r.budget_control_evidence.policy_count)} />
                    <Tile label="Distinct mandates referenced" value={fmtInt(r.budget_control_evidence.mandate_count)} />
                </div>
                <SubHd>Decision sources observed</SubHd>
                <ul className="space-y-1">
                    {r.budget_control_evidence.decision_sources.length === 0 && (
                        <li className="text-xs text-neutral-500">No decision sources recorded in this window.</li>
                    )}
                    {r.budget_control_evidence.decision_sources.map((d) => (
                        <li key={d.source} className="flex items-center justify-between">
                            <span className="font-mono text-[11px]">{d.source}</span>
                            <span className="font-mono text-xs font-bold tabular-nums">{fmtInt(d.count)}</span>
                        </li>
                    ))}
                </ul>
            </Section>

            {/* ── 7. Privacy posture ─────────────────────────────────────── */}
            <Section title="Privacy posture">
                <p className="text-xs text-neutral-700 mb-3">
                    Privacy mode is how much content P402 was allowed to store for each event. This report shows the
                    distribution; it never displays the content itself.
                </p>
                <table className="w-full text-[12px]">
                    <thead className="border-b-2 border-black">
                        <tr>
                            <Th>Mode</Th><Th right>Events</Th>
                            <Th right>Prompt stored</Th><Th right>Response stored</Th><Th right>Redaction</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {r.privacy.distribution.length === 0 && (
                            <tr><td colSpan={5} className="p-2 text-neutral-500">No events.</td></tr>
                        )}
                        {r.privacy.distribution.map((p) => (
                            <tr key={p.privacy_mode} className="border-b border-neutral-200">
                                <Td><PrivacyBadge value={p.privacy_mode} /></Td>
                                <Td right mono>{fmtInt(p.count)}</Td>
                                <Td right mono>{fmtInt(p.prompt_stored)}</Td>
                                <Td right mono>{fmtInt(p.response_stored)}</Td>
                                <Td right mono>{fmtInt(p.redaction_applied)}</Td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Section>

            {/* ── 8. Evidence coverage ───────────────────────────────────── */}
            <Section title="Evidence coverage">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <Tile label="Overall coverage" value={fmtPct(r.evidence.coverage_pct)}
                        tone={r.evidence.coverage_pct >= 95 ? 'green' : r.evidence.coverage_pct >= 75 ? 'amber' : 'red'} />
                    <Tile label="Events missing evidence" value={fmtInt(r.evidence.missing_evidence_count)}
                        tone={r.evidence.missing_evidence_count > 0 ? 'amber' : 'green'} />
                </div>
            </Section>

            {/* ── 9. Attribution gaps ────────────────────────────────────── */}
            <Section title="Attribution gaps">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs mb-4">
                    <Tile label="Fully attributed"  value={fmtInt(r.attribution_gaps.attributed_count)}  tone="green" />
                    <Tile label="Partial attribution" value={fmtInt(r.attribution_gaps.partial_count)} tone="amber" />
                    <Tile label="Unattributed"      value={fmtInt(r.attribution_gaps.unattributed_count)} tone="red" />
                </div>
                <SubHd>Most commonly missing fields</SubHd>
                <ul className="space-y-1">
                    {r.attribution_gaps.most_commonly_missing.map((f) => (
                        <li key={f.field} className="flex items-center justify-between">
                            <span className="font-mono text-[11px]">{f.field}</span>
                            <span className="font-mono text-xs font-bold tabular-nums">{fmtInt(f.missing_count)}</span>
                        </li>
                    ))}
                </ul>
            </Section>

            {/* ── 10. Top events requiring cleanup ───────────────────────── */}
            <Section title="Top events requiring cleanup">
                <p className="text-xs text-neutral-700 mb-3">
                    Events with the highest combined cost, missing-evidence, and missing-attribution score. Click a request ID to drill in.
                </p>
                <table className="w-full text-[12px]">
                    <thead className="border-b-2 border-black">
                        <tr>
                            <Th>Time</Th><Th>Request</Th><Th>Provider</Th><Th>Model</Th>
                            <Th>Governance</Th><Th right>Cost</Th>
                            <Th>Missing</Th><Th right>Score</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {r.top_cleanup.length === 0 && (
                            <tr><td colSpan={8} className="p-2 text-neutral-500">No cleanup events.</td></tr>
                        )}
                        {r.top_cleanup.map((row) => (
                            <tr key={row.request_id} className="border-b border-neutral-200">
                                <Td mono>{row.event_time.slice(0, 16)}</Td>
                                <Td>
                                    <Link href={`/dashboard/prove/event/${encodeURIComponent(row.request_id)}`} className="font-mono underline">
                                        {row.request_id.slice(0, 14)}…
                                    </Link>
                                </Td>
                                <Td mono>{row.provider ?? '—'}</Td>
                                <Td mono>{row.model_used ?? '—'}</Td>
                                <Td><GovernanceBadge value={row.governance_decision} /></Td>
                                <Td right mono>{fmtUsd(Number(row.cost_usd))}</Td>
                                <Td>
                                    <div className="flex gap-1">
                                        {row.missing_evidence && <SemanticBadge descriptor={{ tone: 'amber', label: 'evidence', glyph: '?' }} />}
                                        {row.unattributed && <AttributionBadge state="unattributed" />}
                                    </div>
                                </Td>
                                <Td right mono>{row.cleanup_score}</Td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Section>

            {/* ── 11. Appendix table ─────────────────────────────────────── */}
            <Section title={`Appendix: economic events (${r.appendix.count} of up to ${r.appendix.limit})`}>
                <div className="overflow-auto border-2 border-black">
                    <table className="w-full text-[11px]">
                        <thead className="bg-neutral-100 border-b-2 border-black">
                            <tr>
                                {['event_time','request_id','provider','model','status','success','cost','tokens','dept','workflow','governance','deny','privacy','evidence'].map((h) => (
                                    <th key={h} className="text-left p-2 font-bold uppercase whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {r.appendix.rows.length === 0 && (
                                <tr><td colSpan={14} className="p-2 text-neutral-500">No rows in the appendix.</td></tr>
                            )}
                            {r.appendix.rows.map((row) => (
                                <tr key={row.request_id} className="border-b border-neutral-200">
                                    <td className="p-1 font-mono whitespace-nowrap">{row.event_time.slice(0, 16)}</td>
                                    <td className="p-1 font-mono">
                                        <Link href={`/dashboard/prove/event/${encodeURIComponent(row.request_id)}`} className="underline">
                                            {row.request_id.slice(0, 12)}…
                                        </Link>
                                    </td>
                                    <td className="p-1 font-mono">{row.provider ?? '—'}</td>
                                    <td className="p-1 font-mono">{row.model_used ?? '—'}</td>
                                    <td className="p-1"><StatusCodeBadge code={row.status_code} /></td>
                                    <td className="p-1 font-mono">{row.success == null ? '—' : row.success ? '✓' : '✕'}</td>
                                    <td className="p-1 font-mono tabular-nums">{fmtUsd(Number(row.cost_usd), 4)}</td>
                                    <td className="p-1 font-mono tabular-nums">{fmtInt(row.total_tokens)}</td>
                                    <td className="p-1 font-mono">{row.department_id ?? '—'}</td>
                                    <td className="p-1 font-mono">{row.workflow_id ?? '—'}</td>
                                    <td className="p-1"><GovernanceBadge value={row.governance_decision} /></td>
                                    <td className="p-1 font-mono">{row.deny_code ?? '—'}</td>
                                    <td className="p-1"><PrivacyBadge value={row.privacy_mode} /></td>
                                    <td className="p-1"><EvidenceBadge state={row.evidence_bundle_id ? 'present' : 'missing'} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>

            <footer className="text-[10px] text-neutral-500 border-t-2 border-black pt-3 print:text-[9px]">
                Generated by P402 Prove. Window {winSince} → {winUntil}. Rendered from economic metadata only;
                prompt and response content are not included.
            </footer>

            <style jsx global>{`
                @media print {
                    .print\\:hidden { display: none !important; }
                    body { background: white; }
                }
            `}</style>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="bg-white border-2 border-black p-4 print:p-3 print:break-inside-avoid">
            <h2 className="text-xs font-extrabold uppercase tracking-wider mb-3 print:text-[10px]">{title}</h2>
            {children}
        </section>
    );
}

function SubHd({ children }: { children: React.ReactNode }) {
    return <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-2 mt-2">{children}</div>;
}

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray';

function Tile({ label, value, tone = 'blue', explain }: { label: string; value: string; tone?: Tone; explain?: string }) {
    const toneCls: Record<Tone, string> = {
        green:  'text-emerald-900',
        amber:  'text-amber-900',
        red:    'text-rose-900',
        blue:   'text-sky-900',
        purple: 'text-violet-900',
        gray:   'text-neutral-700',
    };
    return (
        <div className="border-2 border-black p-3 print:p-2" title={explain}>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">{label}</div>
            <div className={`text-2xl font-extrabold mt-1 print:text-lg ${toneCls[tone]}`}>{value}</div>
        </div>
    );
}

function RankedTable({ rows }: { rows: RankedRow[] }) {
    return (
        <table className="w-full text-[12px]">
            <thead className="border-b-2 border-black">
                <tr>
                    <Th>Key</Th><Th right>Requests</Th><Th right>Denied</Th><Th right>Spend</Th>
                </tr>
            </thead>
            <tbody>
                {rows.length === 0 && (
                    <tr><td colSpan={4} className="p-2 text-neutral-500">No data.</td></tr>
                )}
                {rows.map((row) => (
                    <tr key={row.key} className="border-b border-neutral-200">
                        <Td mono>{row.key}</Td>
                        <Td right>{fmtInt(row.request_count)}</Td>
                        <Td right tone={row.denied_count > 0 ? 'red' : 'gray'}>{fmtInt(row.denied_count)}</Td>
                        <Td right mono>{fmtUsd(row.total_cost_usd)}</Td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
    return (
        <th className={`p-2 font-bold uppercase tracking-wide text-[10px] whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
            {children}
        </th>
    );
}

function Td({ children, right, mono, tone }: { children: React.ReactNode; right?: boolean; mono?: boolean; tone?: Tone }) {
    const toneCls: Record<Tone, string> = {
        green: 'text-emerald-900', amber: 'text-amber-900', red: 'text-rose-900',
        blue: 'text-sky-900', purple: 'text-violet-900', gray: 'text-neutral-700',
    };
    return (
        <td className={[
            'p-2',
            right ? 'text-right' : '',
            mono ? 'font-mono tabular-nums' : '',
            tone ? toneCls[tone] : '',
        ].join(' ')}>
            {children}
        </td>
    );
}
