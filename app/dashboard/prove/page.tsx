'use client';

// Per-user auth-gated content; never statically cacheable. Marking
// force-dynamic also satisfies Next 15's useSearchParams CSR-bailout
// requirement without an explicit Suspense wrapper.
export const dynamic = 'force-dynamic';

/**
 * Slice 3G — Prove dashboard.
 *
 * Best-in-class, CFO-readable evidence-and-analysis surface over
 * ai_economic_events. Hits one read-only aggregation route
 * (/api/v2/prove/overview), a search route (/api/v2/prove/search), and
 * the existing export route (/api/v2/prove/economic-events/export). NO
 * prompt or response content is fetched, displayed, or exported.
 *
 * Sections:
 *   1. Executive KPI strip with current-vs-previous comparison
 *   2. Spend breakdowns (department, employee, api_key, workflow, customer,
 *      feature, provider, model, governance)
 *   3. Denied event analysis (deny codes, top deny rules, timeline)
 *   4. Privacy + evidence panels
 *   5. Search (q + structured filters + saved presets + plain-English explainer)
 *   6. Audit table (results of the active search) with semantic chips
 *   7. Export center (CSV/JSON + presets)
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { Card, Input, Select, Button } from '../_components/ui';
import {
    ColorLegend,
    MetricCard,
    SemanticBadge,
    StackedBreakdownBar,
    GovernanceBadge,
    EvidenceBadge,
    PrivacyBadge,
    AttributionBadge,
    SpendRiskBadge,
    StatusCodeBadge,
    getGovernanceTone,
    getSpendRiskTone,
} from '../_components/semantic';
import type {
    ProveBreakdownRow,
    ProveOverviewResponse,
    SearchResponse,
} from '@/lib/prove/types';
import { SAVED_VIEWS, EXPORT_PRESETS } from './_components/SavedViews';
import {
    buildDemoSearchResponse,
    isDemoMode,
} from '@/lib/demo/accountability-story';
import { getDemoScenario, withDemoQs } from '@/lib/demo/scenarios';
import { DemoDataDisclaimer, DemoPreviewBanner } from '../_components/DemoPreview';

// ─────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────

function fmtUsd(n: number, digits = 2): string {
    if (!Number.isFinite(n)) return '$0.00';
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
function fmtPct(n: number | null | undefined, digits = 1): string {
    if (n == null || !Number.isFinite(n)) return 'n/a';
    return `${n.toFixed(digits)}%`;
}
function fmtInt(n: number): string {
    return n.toLocaleString('en-US');
}
function fmtDelta(pct: number | null): string {
    if (pct == null || !Number.isFinite(pct)) return 'no prior period';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}% vs prev`;
}

const PLAIN_LANGUAGE = {
    total_spend:    'Sum of cost_usd across every economic event in the period.',
    total_requests: 'Count of economic events recorded in the period.',
    denied:         'Requests stopped before provider execution. Zero provider cost; budget enforcement evidence preserved.',
    prevented:      'Order-of-magnitude estimate: average accepted-request cost multiplied by denied count.',
    avg_cost:       'Total spend divided by total request count.',
    cpa:            'Cost per accepted output — spend divided by accepted outcomes.',
    evidence:       'Share of events with an attached evidence bundle.',
    unattributed:   'Events missing department, employee, workflow, customer, feature, AND api_key.',
    missing:        'Events without an evidence bundle id.',
};

// ─────────────────────────────────────────────────────────────────────────
// Search state
// ─────────────────────────────────────────────────────────────────────────

interface SearchUI {
    q: string;
    date_from: string;
    date_to: string;
    department_id: string;
    employee_id: string;
    api_key_id: string;
    workflow_id: string;
    customer_id: string;
    feature_id: string;
    provider: string;
    model: string;
    governance_decision: string;
    deny_code: string;
    privacy_mode: string;
    evidence_status: string;
    success: string;
    cost_min: string;
    cost_max: string;
    tokens_min: string;
    tokens_max: string;
    attribution_status: string;
}

const EMPTY_SEARCH: SearchUI = {
    q: '', date_from: '', date_to: '', department_id: '', employee_id: '',
    api_key_id: '', workflow_id: '', customer_id: '', feature_id: '',
    provider: '', model: '', governance_decision: '', deny_code: '',
    privacy_mode: '', evidence_status: '', success: '',
    cost_min: '', cost_max: '', tokens_min: '', tokens_max: '',
    attribution_status: '',
};

function toQs(s: SearchUI): URLSearchParams {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(s)) {
        if (v) qs.set(k, v);
    }
    return qs;
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function ProveDashboardPage() {
    const [search, setSearch] = useState<SearchUI>(EMPTY_SEARCH);
    const [runSearchToken, setRunSearchToken] = useState(0); // bump to fetch
    const set = <K extends keyof SearchUI>(k: K, v: string) => setSearch((p) => ({ ...p, [k]: v }));
    const activeSearchQs = useMemo(() => toQs(search).toString(), [runSearchToken]); // eslint-disable-line react-hooks/exhaustive-deps
    const searchParams = useSearchParams();
    const demoActive = isDemoMode(searchParams);
    const scenario = getDemoScenario(searchParams);
    const outcomesHref = withDemoQs('/dashboard/prove/outcomes', demoActive, scenario);

    const overview = useQuery<ProveOverviewResponse>({
        queryKey: ['prove/overview'],
        enabled: !demoActive,
        queryFn: async () => {
            const r = await fetch('/api/v2/prove/overview');
            if (!r.ok) throw new Error(`overview ${r.status}`);
            return r.json();
        },
    });

    const hits = useQuery<SearchResponse>({
        queryKey: ['prove/search', activeSearchQs],
        enabled: !demoActive,
        queryFn: async () => {
            const r = await fetch(`/api/v2/prove/search?${activeSearchQs}`);
            if (!r.ok) throw new Error(`search ${r.status}`);
            return r.json();
        },
        // The page does a search on initial load with empty filters to give
        // the audit table something to show.
    });

    // Demo substitution for the audit table results. Overview/breakdowns
    // remain undefined in demo mode — they would require a separate demo
    // builder; this slice scopes the demo to the search experience.
    const demoSearch = demoActive
        ? (buildDemoSearchResponse(scenario) as unknown as SearchResponse)
        : undefined;

    function applyPreset(id: string) {
        const view = SAVED_VIEWS.find((v) => v.id === id);
        if (!view) return;
        const f = view.filters();
        setSearch({
            ...EMPTY_SEARCH,
            q: f.q ?? '',
            date_from: f.date_from ?? '',
            date_to: f.date_to ?? '',
            department_id: f.department_id ?? '',
            employee_id: f.employee_id ?? '',
            api_key_id: f.api_key_id ?? '',
            workflow_id: f.workflow_id ?? '',
            customer_id: f.customer_id ?? '',
            feature_id: f.feature_id ?? '',
            provider: f.provider ?? '',
            model: f.model ?? '',
            governance_decision: f.governance_decision ?? '',
            deny_code: f.deny_code ?? '',
            privacy_mode: f.privacy_mode ?? '',
            evidence_status: f.evidence_status ?? '',
            success: f.success ?? '',
            cost_min: f.cost_min != null ? String(f.cost_min) : '',
            cost_max: f.cost_max != null ? String(f.cost_max) : '',
            tokens_min: f.tokens_min != null ? String(f.tokens_min) : '',
            tokens_max: f.tokens_max != null ? String(f.tokens_max) : '',
            attribution_status: f.attribution_status ?? '',
        });
        setRunSearchToken((t) => t + 1);
    }

    function runDownload(format: 'csv' | 'json') {
        const qs = toQs(search);
        qs.set('format', format);
        qs.set('limit', '1000');
        window.location.href = `/api/v2/prove/economic-events/export?${qs.toString()}`;
    }

    function runPreset(idx: number) {
        const preset = EXPORT_PRESETS[idx];
        if (!preset) return;
        const qs = new URLSearchParams(preset.params());
        qs.set('format', preset.format);
        qs.set('limit', '1000');
        window.location.href = `/api/v2/prove/economic-events/export?${qs.toString()}`;
    }

    const ovw = overview.data;
    const totals = ovw?.totals;
    const cmp = ovw?.spend_period_comparison;

    return (
        <div className="p-6 lg:p-8 space-y-8">
            {demoActive && (
                <DemoPreviewBanner
                    exitHref="/dashboard/prove"
                    scenario={scenario}
                    pathname="/dashboard/prove"
                />
            )}
            {demoActive && (
                <div className="flex justify-end">
                    <DemoDataDisclaimer />
                </div>
            )}
            {/* ── Header + global search ─────────────────────────────────── */}
            <header className="space-y-3">
                <h1 className="text-4xl font-black uppercase tracking-tighter text-black leading-none">Prove</h1>
                <p className="text-sm text-neutral-700 max-w-3xl">
                    Tenant-scoped, read-only evidence and analysis layer over <span className="font-mono">ai_economic_events</span>.
                    This dashboard uses economic metadata only. It does not display prompt or response content.
                </p>
                <div className="flex flex-wrap gap-3 items-end">
                    <Input
                        className="grow max-w-xl"
                        label="Search"
                        placeholder="Search spend, request IDs, departments, employees, workflows, customers, models, deny codes, evidence IDs..."
                        value={search.q}
                        onChange={(v) => set('q', v)}
                    />
                    <Button onClick={() => setRunSearchToken((t) => t + 1)}>Search</Button>
                    <Button onClick={() => { setSearch(EMPTY_SEARCH); setRunSearchToken((t) => t + 1); }}>Clear</Button>
                </div>
            </header>

            {/* ── 1. Executive KPI strip ──────────────────────────────────── */}
            <section className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">Executive summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard
                        label="Total AI spend"
                        value={fmtUsd(totals?.total_spend_usd ?? 0)}
                        tone="blue"
                        explain={PLAIN_LANGUAGE.total_spend}
                        delta={cmp ? fmtDelta(cmp.delta_pct) : undefined}
                        deltaTone={cmp?.delta_pct != null && cmp.delta_pct > 0 ? 'amber' : 'green'}
                    />
                    <MetricCard
                        label="Total AI requests"
                        value={fmtInt(totals?.total_requests ?? 0)}
                        tone="blue"
                        explain={PLAIN_LANGUAGE.total_requests}
                    />
                    <MetricCard
                        label="Denied requests"
                        value={fmtInt(totals?.denied_requests ?? 0)}
                        tone={(totals?.denied_requests ?? 0) > 0 ? 'red' : 'gray'}
                        explain={PLAIN_LANGUAGE.denied}
                    />
                    <MetricCard
                        label="Cost prevented"
                        value={fmtUsd(totals?.denied_provider_cost_prevented_usd ?? 0)}
                        tone="green"
                        explain={PLAIN_LANGUAGE.prevented}
                    />
                    <MetricCard
                        label="Avg cost / request"
                        value={fmtUsd(totals?.avg_cost_per_request_usd ?? 0, 4)}
                        tone="blue"
                        explain={PLAIN_LANGUAGE.avg_cost}
                    />
                    <MetricCard
                        label="Cost per accepted output"
                        value={totals?.cost_per_accepted_output_usd == null ? 'n/a' : fmtUsd(totals.cost_per_accepted_output_usd, 4)}
                        tone="blue"
                        explain={PLAIN_LANGUAGE.cpa}
                    />
                    <MetricCard
                        label="Evidence coverage"
                        value={fmtPct(totals?.evidence_coverage_pct ?? null)}
                        tone={
                            totals == null ? 'gray'
                            : totals.evidence_coverage_pct >= 95 ? 'green'
                            : totals.evidence_coverage_pct >= 75 ? 'amber'
                            : 'red'
                        }
                        explain={PLAIN_LANGUAGE.evidence}
                    />
                    <MetricCard
                        label="Unattributed spend"
                        value={fmtUsd(totals?.unattributed_spend_usd ?? 0)}
                        tone={(totals?.unattributed_spend_usd ?? 0) === 0 ? 'green' : 'amber'}
                        explain={PLAIN_LANGUAGE.unattributed}
                    />
                </div>
                <div className="border-l-2 border-black/10 pl-4 py-2 flex flex-wrap items-baseline gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-700">Outcome readiness</span>
                    <span className="text-[11px] font-mono text-neutral-500">
                        Cost per accepted output divides spend by accepted outcomes only. Thin data means P402 should not make optimization recommendations yet. This is readiness analysis, not a savings claim.
                    </span>
                    <Link href={outcomesHref} className="text-[11px] font-mono font-bold uppercase text-black underline underline-offset-2">
                        View outcome readiness
                    </Link>
                </div>
                <ColorLegend
                    title="Tones"
                    items={[
                        { tone: 'green',  label: 'healthy' },
                        { tone: 'blue',   label: 'normal' },
                        { tone: 'amber',  label: 'review' },
                        { tone: 'red',    label: 'denied / failed' },
                        { tone: 'purple', label: 'privacy' },
                        { tone: 'gray',   label: 'unknown / n/a' },
                    ]}
                />
            </section>

            {/* ── 2. Spend breakdowns ─────────────────────────────────────── */}
            <section className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">Spend breakdown</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <BreakdownPanel title="By department"  rows={ovw?.breakdowns.by_department} />
                    <BreakdownPanel title="By employee"    rows={ovw?.breakdowns.by_employee} />
                    <BreakdownPanel title="By API key"     rows={ovw?.breakdowns.by_api_key} />
                    <BreakdownPanel title="By workflow"    rows={ovw?.breakdowns.by_workflow} />
                    <BreakdownPanel title="By customer"    rows={ovw?.breakdowns.by_customer} />
                    <BreakdownPanel title="By feature"     rows={ovw?.breakdowns.by_feature} />
                    <BreakdownPanel title="By provider"    rows={ovw?.breakdowns.by_provider} />
                    <BreakdownPanel title="By model"       rows={ovw?.breakdowns.by_model} />
                    <GovernanceBreakdownPanel rows={ovw?.breakdowns.by_governance} />
                </div>
            </section>

            {/* ── 3. Denied event analysis ────────────────────────────────── */}
            <section className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">Denied event analysis</h2>
                <p className="text-xs text-neutral-600">
                    Denied events are requests stopped before provider execution. They have zero provider cost
                    and preserve budget enforcement evidence.
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card title="Denied requests by deny code">
                        {ovw?.denied.by_code.length === 0 && (
                            <p className="text-xs text-neutral-500">No denied events in this period.</p>
                        )}
                        <ul className="space-y-2">
                            {ovw?.denied.by_code.map((r) => (
                                <li key={r.deny_code} className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 grow min-w-0">
                                        <SemanticBadge descriptor={{ tone: 'red', label: r.deny_code, glyph: '✕' }} />
                                        {r.deny_rule && (
                                            <span className="font-mono text-[10px] text-neutral-500 truncate">{r.deny_rule}</span>
                                        )}
                                    </div>
                                    <span className="font-mono text-xs font-bold tabular-nums">{fmtInt(r.count)}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card title="Top deny rules">
                        {ovw?.denied.top_deny_rules.length === 0 && (
                            <p className="text-xs text-neutral-500">No deny rules surfaced.</p>
                        )}
                        <ul className="space-y-2">
                            {ovw?.denied.top_deny_rules.map((r) => (
                                <li key={r.deny_rule} className="flex items-center justify-between">
                                    <span className="font-mono text-xs truncate">{r.deny_rule}</span>
                                    <span className="font-mono text-xs font-bold tabular-nums">{fmtInt(r.count)}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </section>

            {/* ── 4. Privacy + evidence ───────────────────────────────────── */}
            <section className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">Privacy &amp; evidence</h2>
                <p className="text-xs text-neutral-600">
                    Privacy mode is how much content P402 was allowed to store. Evidence coverage is the share of events
                    with an audit bundle attached.
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card title="Privacy mode distribution">
                        {ovw?.privacy.distribution.length === 0 && (
                            <p className="text-xs text-neutral-500">No events.</p>
                        )}
                        <ul className="space-y-2">
                            {ovw?.privacy.distribution.map((r) => (
                                <li key={r.privacy_mode} className="flex items-center justify-between gap-2">
                                    <PrivacyBadge value={r.privacy_mode} />
                                    <div className="flex items-center gap-3 text-[11px] font-mono">
                                        <span title="prompt_stored count">P:{fmtInt(r.prompt_stored_count)}</span>
                                        <span title="response_stored count">R:{fmtInt(r.response_stored_count)}</span>
                                        <span title="redaction_applied count">Rd:{fmtInt(r.redaction_applied_count)}</span>
                                        <span className="font-bold tabular-nums w-12 text-right">{fmtInt(r.count)}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card title="Evidence coverage">
                        {ovw && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase">Overall</span>
                                    <SemanticBadge descriptor={{
                                        tone: ovw.evidence.coverage_overall.coverage_pct >= 95 ? 'green'
                                            : ovw.evidence.coverage_overall.coverage_pct >= 75 ? 'amber' : 'red',
                                        label: fmtPct(ovw.evidence.coverage_overall.coverage_pct),
                                        glyph: '✓',
                                    }} />
                                </div>
                                <EvidenceMatrix
                                    title="By department"
                                    rows={ovw.evidence.coverage_by_department}
                                />
                                <EvidenceMatrix
                                    title="By workflow"
                                    rows={ovw.evidence.coverage_by_workflow}
                                />
                                <EvidenceMatrix
                                    title="By provider"
                                    rows={ovw.evidence.coverage_by_provider}
                                />
                            </div>
                        )}
                    </Card>
                </div>
            </section>

            {/* ── 5. Search (structured filters) ──────────────────────────── */}
            <section className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">Search</h2>
                <Card title="Filters">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <Input label="From (UTC)" placeholder="2026-05-01T00:00:00Z" value={search.date_from} onChange={(v) => set('date_from', v)} />
                        <Input label="To (UTC)"   placeholder="2026-05-31T23:59:59Z" value={search.date_to}   onChange={(v) => set('date_to', v)} />
                        <Input label="Department" value={search.department_id} onChange={(v) => set('department_id', v)} />
                        <Input label="Employee"   value={search.employee_id}   onChange={(v) => set('employee_id', v)} />
                        <Input label="API Key"    value={search.api_key_id}    onChange={(v) => set('api_key_id', v)} />
                        <Input label="Workflow"   value={search.workflow_id}   onChange={(v) => set('workflow_id', v)} />
                        <Input label="Customer"   value={search.customer_id}   onChange={(v) => set('customer_id', v)} />
                        <Input label="Feature"    value={search.feature_id}    onChange={(v) => set('feature_id', v)} />
                        <Input label="Provider"   value={search.provider}      onChange={(v) => set('provider', v)} />
                        <Input label="Model"      value={search.model}         onChange={(v) => set('model', v)} />
                        <Select
                            label="Governance"
                            options={[
                                { value: '', label: 'Any' },
                                { value: 'approved', label: 'approved' },
                                { value: 'denied',   label: 'denied' },
                                { value: 'warned',   label: 'warned' },
                                { value: 'requires_review', label: 'requires_review' },
                                { value: 'settled',  label: 'settled' },
                                { value: 'cached',   label: 'cached' },
                            ]}
                            value={search.governance_decision}
                            onChange={(v) => set('governance_decision', v)}
                        />
                        <Input label="Deny code"  value={search.deny_code} onChange={(v) => set('deny_code', v)} />
                        <Select
                            label="Privacy mode"
                            options={[
                                { value: '', label: 'Any' },
                                { value: 'metadata_only', label: 'metadata_only' },
                                { value: 'fingerprint_only', label: 'fingerprint_only' },
                                { value: 'redacted_trace', label: 'redacted_trace' },
                                { value: 'private_gateway', label: 'private_gateway' },
                                { value: 'full_trace', label: 'full_trace' },
                            ]}
                            value={search.privacy_mode}
                            onChange={(v) => set('privacy_mode', v)}
                        />
                        <Select
                            label="Evidence"
                            options={[
                                { value: '', label: 'Any' },
                                { value: 'present', label: 'present' },
                                { value: 'missing', label: 'missing' },
                            ]}
                            value={search.evidence_status}
                            onChange={(v) => set('evidence_status', v)}
                        />
                        <Select
                            label="Success"
                            options={[
                                { value: '', label: 'Any' },
                                { value: 'true', label: 'successful' },
                                { value: 'false', label: 'not successful' },
                            ]}
                            value={search.success}
                            onChange={(v) => set('success', v)}
                        />
                        <Select
                            label="Attribution"
                            options={[
                                { value: '', label: 'Any' },
                                { value: 'attributed', label: 'attributed' },
                                { value: 'partial', label: 'partial' },
                                { value: 'unattributed', label: 'unattributed' },
                            ]}
                            value={search.attribution_status}
                            onChange={(v) => set('attribution_status', v)}
                        />
                        <Input label="Cost min ($)"   value={search.cost_min}   onChange={(v) => set('cost_min', v)} />
                        <Input label="Cost max ($)"   value={search.cost_max}   onChange={(v) => set('cost_max', v)} />
                        <Input label="Tokens min"     value={search.tokens_min} onChange={(v) => set('tokens_min', v)} />
                        <Input label="Tokens max"     value={search.tokens_max} onChange={(v) => set('tokens_max', v)} />
                    </div>
                    <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t-2 border-black">
                        <Button onClick={() => setRunSearchToken((t) => t + 1)}>Apply</Button>
                        <Button onClick={() => { setSearch(EMPTY_SEARCH); setRunSearchToken((t) => t + 1); }}>Clear filters</Button>
                        <Button onClick={() => runDownload('csv')}>Export CSV</Button>
                        <Button onClick={() => runDownload('json')}>Export JSON</Button>
                    </div>
                    <div className="mt-4">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-2">Saved views</div>
                        <div className="flex flex-wrap gap-2">
                            {SAVED_VIEWS.map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => applyPreset(v.id)}
                                    title={v.description}
                                    className="px-2 py-1 text-[10px] font-bold uppercase border-2 border-black hover:bg-neutral-100"
                                >
                                    {v.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>
            </section>

            {/* ── 6. Audit table ──────────────────────────────────────────── */}
            <section className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">Audit results</h2>
                <p className="text-xs text-neutral-600">
                    {(demoSearch ?? hits.data)?.explanation ?? 'Run a search to populate the audit table.'}
                </p>
                <AuditTable
                    hits={(demoSearch ?? hits.data)?.hits ?? []}
                    loading={!demoActive && hits.isLoading}
                />
            </section>

            {/* ── 7. Export presets ───────────────────────────────────────── */}
            <section className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">Export center</h2>
                <p className="text-xs text-neutral-600">
                    Exports never include prompt content, messages, completion text, or response bodies.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {EXPORT_PRESETS.map((p, idx) => (
                        <Card key={p.id} title={p.label}>
                            <p className="text-xs text-neutral-600 mb-3">{p.description}</p>
                            <Button onClick={() => runPreset(idx)}>Download {p.format.toUpperCase()}</Button>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function BreakdownPanel({ title, rows }: { title: string; rows: ProveBreakdownRow[] | undefined }) {
    const max = Math.max(1, ...(rows ?? []).map((r) => r.total_cost_usd));
    return (
        <Card title={title}>
            {(rows == null || rows.length === 0) && (
                <p className="text-xs text-neutral-500">No data.</p>
            )}
            <ul className="space-y-2">
                {(rows ?? []).slice(0, 8).map((r) => {
                    const risk = r.total_cost_usd === 0 && r.denied_count > 0
                        ? 'zero_cost'
                        : r.total_cost_usd > max * 0.66 ? 'high' : 'normal';
                    const widthPct = (r.total_cost_usd / max) * 100;
                    return (
                        <li key={r.key} className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[11px] truncate">{r.key}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                    {r.denied_count > 0 && (
                                        <span title={`${r.denied_count} denied`} className="text-[10px] font-bold text-rose-700">
                                            {r.denied_count} denied
                                        </span>
                                    )}
                                    <SpendRiskBadge state={risk as 'normal' | 'high' | 'zero_cost'} />
                                    <span className="font-mono text-xs font-bold tabular-nums w-16 text-right">{fmtUsd(r.total_cost_usd)}</span>
                                </div>
                            </div>
                            <div className="h-2 bg-neutral-100 border border-black">
                                <div className={`h-full ${getSpendRiskTone(risk as 'normal' | 'high' | 'zero_cost').tone === 'red' ? 'bg-rose-500' : getSpendRiskTone(risk as 'normal' | 'high' | 'zero_cost').tone === 'amber' ? 'bg-amber-500' : 'bg-sky-500'}`}
                                     style={{ width: `${widthPct}%` }} />
                            </div>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}

function GovernanceBreakdownPanel({ rows }: { rows: ProveBreakdownRow[] | undefined }) {
    return (
        <Card title="By governance decision">
            {(rows == null || rows.length === 0) && (
                <p className="text-xs text-neutral-500">No data.</p>
            )}
            <ul className="space-y-2">
                {(rows ?? []).slice(0, 8).map((r) => (
                    <li key={r.key} className="flex items-center justify-between gap-2">
                        <SemanticBadge descriptor={getGovernanceTone(r.key)} />
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] text-neutral-500">{fmtInt(r.request_count)} req</span>
                            <span className="font-mono text-xs font-bold tabular-nums w-16 text-right">{fmtUsd(r.total_cost_usd)}</span>
                        </div>
                    </li>
                ))}
            </ul>
            <div className="mt-3">
                <StackedBreakdownBar
                    segments={(rows ?? []).map((r) => ({
                        tone: getGovernanceTone(r.key).tone,
                        label: r.key,
                        value: r.request_count,
                    }))}
                />
            </div>
        </Card>
    );
}

function EvidenceMatrix({ title, rows }: { title: string; rows: Array<{ key: string; events: number; with_evidence: number; missing_evidence: number; coverage_pct: number }> }) {
    return (
        <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-1">{title}</div>
            <table className="w-full text-[11px]">
                <thead>
                    <tr className="border-b-2 border-black">
                        <th className="text-left py-1 font-bold uppercase">Key</th>
                        <th className="text-right py-1 font-bold uppercase">Events</th>
                        <th className="text-right py-1 font-bold uppercase">With</th>
                        <th className="text-right py-1 font-bold uppercase">Missing</th>
                        <th className="text-right py-1 font-bold uppercase">Coverage</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (
                        <tr><td colSpan={5} className="py-2 text-neutral-500">No data.</td></tr>
                    )}
                    {rows.map((r) => (
                        <tr key={r.key} className="border-b border-neutral-200">
                            <td className="font-mono truncate max-w-[10rem]">{r.key}</td>
                            <td className="text-right font-mono tabular-nums">{r.events.toLocaleString()}</td>
                            <td className="text-right font-mono tabular-nums">{r.with_evidence.toLocaleString()}</td>
                            <td className="text-right font-mono tabular-nums">{r.missing_evidence.toLocaleString()}</td>
                            <td className="text-right">
                                <SemanticBadge descriptor={{
                                    tone: r.coverage_pct >= 95 ? 'green' : r.coverage_pct >= 75 ? 'amber' : 'red',
                                    label: fmtPct(r.coverage_pct),
                                    glyph: '✓',
                                }} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function AuditTable({ hits, loading }: { hits: SearchResponse['hits']; loading: boolean }) {
    if (loading) return <p className="text-xs text-neutral-500">Loading…</p>;
    if (hits.length === 0) {
        return (
            <Card title="No results">
                <p className="text-xs text-neutral-600 mb-2">No events match the active filters. Try one of these:</p>
                <ul className="list-disc ml-5 text-[11px] text-neutral-600 space-y-1">
                    <li>Widen the date range or clear date filters.</li>
                    <li>Apply a saved view like &quot;Denied events this month&quot; or &quot;Missing evidence bundles&quot;.</li>
                    <li>Drop the cost / token range filters.</li>
                    <li>Clear all filters with the button above.</li>
                </ul>
            </Card>
        );
    }
    return (
        <div className="overflow-auto border-2 border-black">
            <table className="w-full text-[11px]">
                <thead className="bg-neutral-100 border-b-2 border-black">
                    <tr>
                        {[
                            'event_time','request_id','owner','dept','employee','api_key','workflow','customer','feature',
                            'provider','model','status','success','cost','tokens','governance','deny','privacy','evidence',
                            'decision_src','deny_rule','attribution',
                        ].map((h) => (
                            <th key={h} className="text-left p-2 font-bold uppercase whitespace-nowrap">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {hits.map((h) => (
                        <tr key={`${h.event_time}-${h.request_id}`} className="border-b border-neutral-200 hover:bg-neutral-50">
                            <td className="p-1 font-mono whitespace-nowrap">{h.event_time}</td>
                            <td className="p-1 font-mono whitespace-nowrap">{h.request_id.slice(0, 12)}…</td>
                            <td className="p-1 font-mono">{h.department_id ?? '—'}</td>
                            <td className="p-1 font-mono">{h.department_id ?? '—'}</td>
                            <td className="p-1 font-mono">{h.employee_id ?? '—'}</td>
                            <td className="p-1 font-mono">{h.api_key_id ?? '—'}</td>
                            <td className="p-1 font-mono">{h.workflow_id ?? '—'}</td>
                            <td className="p-1 font-mono">{h.customer_id ?? '—'}</td>
                            <td className="p-1 font-mono">{h.feature_id ?? '—'}</td>
                            <td className="p-1 font-mono">{h.provider ?? '—'}</td>
                            <td className="p-1 font-mono">{h.model_used ?? '—'}</td>
                            <td className="p-1"><StatusCodeBadge code={h.status_code} /></td>
                            <td className="p-1 font-mono">{h.success == null ? '—' : h.success ? '✓' : '✕'}</td>
                            <td className="p-1 font-mono tabular-nums">{fmtUsd(Number(h.cost_usd), 4)}</td>
                            <td className="p-1 font-mono tabular-nums">{fmtInt(h.total_tokens)}</td>
                            <td className="p-1"><GovernanceBadge value={h.governance_decision} /></td>
                            <td className="p-1 font-mono">{h.deny_code ?? '—'}</td>
                            <td className="p-1"><PrivacyBadge value={h.privacy_mode} /></td>
                            <td className="p-1"><EvidenceBadge state={h.evidence_bundle_id ? 'present' : 'missing'} /></td>
                            <td className="p-1 font-mono">{h.decision_source ?? '—'}</td>
                            <td className="p-1 font-mono">{h.deny_rule ?? '—'}</td>
                            <td className="p-1"><AttributionBadge state={h.attribution_status} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
