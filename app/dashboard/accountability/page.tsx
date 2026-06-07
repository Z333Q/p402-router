'use client';
/**
 * Slice 3M — Accountability Health Center.
 *
 * Single executive readiness surface over the AI economic ledger. Reads
 * /api/v2/accountability/health and renders an overall score card,
 * eight dimension cards, and a ranked, non-recommendation cleanup list.
 *
 * Every panel deep-links into the relevant existing module: Monitor,
 * Control, Prove, Outcome Coverage, Outcome Setup, Flip Readiness,
 * Executive Report. Read-only; no Optimize recommendations; no
 * savings claims.
 */

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { Card } from '../_components/ui';
import {
    ColorLegend,
    SemanticBadge,
    type SemanticTone,
} from '../_components/semantic';
import { PageHeader } from '../_components/PageHeader';
import {
    DISCLAIMER_METADATA_ONLY,
    DISCLAIMER_OPTIMIZE_BLOCKED,
    DISCLAIMER_RUNTIME_FLIP_BLOCKED,
} from '@/lib/dashboard/language';

// ─────────────────────────────────────────────────────────────────────────
// Local mirror of the API types (decouples client bundle from server).
// ─────────────────────────────────────────────────────────────────────────

type DimensionStatus =
    | 'healthy' | 'warning' | 'blocked' | 'unknown'
    | 'observing' | 'not_ready' | 'ready_for_optimize_analysis';

interface DimensionScore { subscore: number; weight: number; weighted: number; }

interface MeterHealth {
    status: DimensionStatus; score: DimensionScore;
    total_events: number; events_in_period: number;
    most_recent_event_at: string | null; event_freshness_seconds: number | null;
    source_distribution: Array<{ source: string; count: number }>;
    outbox_pending: number; outbox_abandoned: number;
    explainer: string;
}
interface AttributionHealth {
    status: DimensionStatus; score: DimensionScore;
    department_coverage_pct: number; employee_coverage_pct: number;
    workflow_coverage_pct: number; customer_coverage_pct: number;
    feature_coverage_pct: number; api_key_coverage_pct: number;
    unattributed_event_count: number; unattributed_spend_usd: number;
    explainer: string;
}
interface EvidenceHealth {
    status: DimensionStatus; score: DimensionScore;
    events_with_evidence: number; events_missing_evidence: number; coverage_pct: number;
    missing_by_department: Array<{ key: string; missing: number; total: number }>;
    missing_by_workflow:   Array<{ key: string; missing: number; total: number }>;
    missing_by_provider:   Array<{ key: string; missing: number; total: number }>;
    explainer: string;
}
interface ControlHealth {
    status: DimensionStatus; score: DimensionScore;
    denied_event_count: number; denied_with_deny_code: number;
    denied_with_decision_source: number; denied_with_deny_rule: number;
    denied_provider_cost_usd: number;
    deny_code_distribution: Array<{ deny_code: string; count: number }>;
    governance_decision_coverage_pct: number;
    explainer: string;
}
interface OutcomeHealth {
    status: DimensionStatus; score: DimensionScore;
    readiness_status: 'blocked' | 'not_ready' | 'observing' | 'ready_for_optimize_analysis';
    coverage_pct: number; accepted_count: number;
    accepted_threshold: number; coverage_threshold: number;
    window_days: number; baseline_threshold: number;
    cost_per_accepted_output_usd: number | null; insufficient_data: boolean;
    top_missing_segments: Array<{ label: string; missing_count: number; sample_request_id: string | null }>;
    explainer: string;
}
interface PrivacyHealth {
    status: DimensionStatus; score: DimensionScore;
    privacy_mode_distribution: Array<{ privacy_mode: string; count: number }>;
    prompt_stored_count: number; response_stored_count: number;
    redaction_applied_count: number; metadata_only_count: number;
    explainer: string;
}
interface RuntimeFlipHealth {
    status: DimensionStatus; score: DimensionScore;
    flip_status: 'ready_to_flip' | 'observing' | 'not_ready' | 'blocked';
    flip_reason: string; mtd_passes: boolean; prev_calendar_month_complete: boolean;
    explainer: string;
}
interface OptimizeReadinessHealth {
    status: DimensionStatus; score: DimensionScore;
    recommendations_enabled: false; savings_claims_enabled: false;
    readiness_status: 'blocked' | 'not_ready' | 'observing' | 'ready_for_optimize_analysis';
    explainer: string;
}

type OverallStatus = 'blocked' | 'needs_cleanup' | 'operational' | 'audit_ready';

interface AccountabilityResponse {
    ok: true;
    generated_at: string;
    period: { since: string; until: string };
    overall: { score: number; status: OverallStatus; label: string; explainer: string };
    dimensions: {
        meter: MeterHealth;
        attribution: AttributionHealth;
        evidence: EvidenceHealth;
        control: ControlHealth;
        outcomes: OutcomeHealth;
        privacy: PrivacyHealth;
        runtime_flip: RuntimeFlipHealth;
        optimize_readiness: OptimizeReadinessHealth;
    };
    cleanup_priorities: Array<{
        id: string;
        category: 'outcomes' | 'attribution' | 'evidence' | 'control' | 'meter' | 'privacy';
        severity: 'high' | 'medium' | 'low';
        title: string; count: number;
        affected_spend_usd: number;
        link: string; why_it_matters: string;
    }>;
    disclaimers: {
        readiness_not_recommendation: true;
        no_savings_claim: true;
        content_displayed: false;
        runtime_flip_unchanged: true;
        optimize_recommendations_blocked: true;
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Tone + formatting helpers
// ─────────────────────────────────────────────────────────────────────────

function dimensionTone(s: DimensionStatus): SemanticTone {
    if (s === 'healthy' || s === 'ready_for_optimize_analysis') return 'green';
    if (s === 'observing')                                       return 'amber';
    if (s === 'warning')                                         return 'amber';
    if (s === 'not_ready')                                       return 'red';
    if (s === 'blocked')                                         return 'red';
    return 'gray';
}
function dimensionLabel(s: DimensionStatus): string {
    return s === 'ready_for_optimize_analysis' ? 'analysis-ready'
        :  s === 'observing' ? 'observing'
        :  s === 'warning'   ? 'warning'
        :  s === 'not_ready' ? 'not ready'
        :  s === 'blocked'   ? 'blocked'
        :  s === 'unknown'   ? 'unknown'
        : s;
}
function dimensionGlyph(s: DimensionStatus): string {
    return s === 'healthy' || s === 'ready_for_optimize_analysis' ? '✓'
        :  s === 'observing' || s === 'warning' || s === 'not_ready' ? '!'
        :  s === 'blocked' ? '✕' : '·';
}

function overallTone(s: OverallStatus): SemanticTone {
    return s === 'audit_ready'    ? 'green'
        :  s === 'operational'    ? 'blue'
        :  s === 'needs_cleanup'  ? 'amber'
        :                            'red';
}

function severityTone(s: 'high' | 'medium' | 'low'): SemanticTone {
    return s === 'high' ? 'red' : s === 'medium' ? 'amber' : 'gray';
}

function fmtUsd(n: number, digits = 2): string {
    if (!Number.isFinite(n)) return '$0.00';
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: digits })}`;
}
function fmtInt(n: number): string { return n.toLocaleString('en-US'); }
function fmtPct(n: number, digits = 1): string {
    if (!Number.isFinite(n)) return 'n/a';
    return `${n.toFixed(digits)}%`;
}
function fmtAge(seconds: number | null): string {
    if (seconds == null) return 'never';
    if (seconds < 60)         return `${seconds}s ago`;
    if (seconds < 3600)       return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86_400)     return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86_400)}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function AccountabilityPage() {
    const data = useQuery<AccountabilityResponse>({
        queryKey: ['accountability/health'],
        queryFn: async () => {
            const r = await fetch('/api/v2/accountability/health');
            if (!r.ok) throw new Error(`accountability ${r.status}`);
            return r.json();
        },
    });

    if (data.isLoading) return <div className="p-8 text-sm text-neutral-500">Loading accountability health…</div>;
    if (data.error || !data.data) return (
        <div className="p-8">
            <Card title="Could not load accountability health">
                <p className="text-sm">Try refreshing the page.</p>
            </Card>
        </div>
    );

    const d = data.data;
    const dim = d.dimensions;

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
            {/* ── Executive header ──────────────────────────────────────── */}
            <PageHeader
                area="Accountability"
                title="Accountability Health Center"
                purpose="One executive view of whether AI spend is metered, attributed, denied-event-recorded, outcome-tracked, evidence-covered, and privacy-clear."
                disclaimers={[
                    DISCLAIMER_METADATA_ONLY,
                    DISCLAIMER_OPTIMIZE_BLOCKED,
                    DISCLAIMER_RUNTIME_FLIP_BLOCKED,
                ]}
                primary={[
                    { label: 'Monitor',         href: '/dashboard/monitor' },
                    { label: 'Control',         href: '/dashboard/control' },
                    { label: 'Prove',           href: '/dashboard/prove' },
                    { label: 'Outcome coverage', href: '/dashboard/prove/outcomes' },
                ]}
                secondary={[
                    { label: 'Executive report',   href: '/dashboard/prove/report' },
                    { label: 'Activation kit',     href: '/dashboard/prove/outcomes/setup' },
                ]}
            />

            {/* ── Overall score card ────────────────────────────────────── */}
            <Card title="Overall health">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ScoreRing score={d.overall.score} status={d.overall.status} label={d.overall.label} />
                    <div className="md:col-span-2 space-y-2">
                        <p className="text-base text-neutral-900 leading-relaxed">{d.overall.explainer}</p>
                        <p className="text-xs text-neutral-600">
                            Score is the weighted sum of seven dimensions. A blocked dimension forces the
                            overall status to <span className="font-mono">blocked</span> regardless of the
                            numeric total.
                        </p>
                        <ColorLegend
                            title="Overall states"
                            items={[
                                { tone: 'green', label: 'audit-ready (85-100)' },
                                { tone: 'blue',  label: 'operational (70-84)' },
                                { tone: 'amber', label: 'needs cleanup (40-69)' },
                                { tone: 'red',   label: 'blocked (0-39)' },
                            ]}
                        />
                    </div>
                </div>
            </Card>

            {/* ── Dimension cards ───────────────────────────────────────── */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DimensionCard
                    title="Meter health" deep={{ href: '/dashboard/monitor', label: 'Monitor' }}
                    status={dim.meter.status} score={dim.meter.score}
                    explainer={dim.meter.explainer}
                >
                    <KV k="Total events"      v={fmtInt(dim.meter.total_events)} />
                    <KV k="Events in period"  v={fmtInt(dim.meter.events_in_period)} />
                    <KV k="Freshness"         v={fmtAge(dim.meter.event_freshness_seconds)} />
                    <KV k="Outbox pending"    v={fmtInt(dim.meter.outbox_pending)}    tone={dim.meter.outbox_pending   > 0 ? 'amber' : 'gray'} />
                    <KV k="Outbox abandoned"  v={fmtInt(dim.meter.outbox_abandoned)}  tone={dim.meter.outbox_abandoned > 0 ? 'red'   : 'gray'} />
                </DimensionCard>

                <DimensionCard
                    title="Attribution health" deep={{ href: '/dashboard/prove?attribution_status=unattributed', label: 'Prove unattributed' }}
                    status={dim.attribution.status} score={dim.attribution.score}
                    explainer={dim.attribution.explainer}
                >
                    <KV k="Department"  v={fmtPct(dim.attribution.department_coverage_pct)} />
                    <KV k="Employee"    v={fmtPct(dim.attribution.employee_coverage_pct)} />
                    <KV k="Workflow"    v={fmtPct(dim.attribution.workflow_coverage_pct)} />
                    <KV k="Customer"    v={fmtPct(dim.attribution.customer_coverage_pct)} />
                    <KV k="Feature"     v={fmtPct(dim.attribution.feature_coverage_pct)} />
                    <KV k="API key"     v={fmtPct(dim.attribution.api_key_coverage_pct)} />
                    <KV k="Unattributed events" v={fmtInt(dim.attribution.unattributed_event_count)}
                        tone={dim.attribution.unattributed_event_count > 0 ? 'amber' : 'green'} />
                    <KV k="Unattributed spend"  v={fmtUsd(dim.attribution.unattributed_spend_usd)}
                        tone={dim.attribution.unattributed_spend_usd > 0 ? 'amber' : 'green'} />
                </DimensionCard>

                <DimensionCard
                    title="Evidence health" deep={{ href: '/dashboard/prove?evidence_status=missing', label: 'Prove missing-evidence' }}
                    status={dim.evidence.status} score={dim.evidence.score}
                    explainer={dim.evidence.explainer}
                >
                    <KV k="Coverage"        v={fmtPct(dim.evidence.coverage_pct)} />
                    <KV k="With evidence"   v={fmtInt(dim.evidence.events_with_evidence)} />
                    <KV k="Missing evidence" v={fmtInt(dim.evidence.events_missing_evidence)}
                        tone={dim.evidence.events_missing_evidence > 0 ? 'amber' : 'green'} />
                    <div className="col-span-2 mt-2">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-1">Top providers missing evidence</div>
                        <ul className="text-[11px] font-mono space-y-1">
                            {dim.evidence.missing_by_provider.slice(0, 3).map((r) => (
                                <li key={r.key} className="flex justify-between">
                                    <span>{r.key}</span>
                                    <span>{fmtInt(r.missing)} / {fmtInt(r.total)}</span>
                                </li>
                            ))}
                            {dim.evidence.missing_by_provider.length === 0 && <li className="text-neutral-500">none</li>}
                        </ul>
                    </div>
                </DimensionCard>

                <DimensionCard
                    title="Control health" deep={{ href: '/dashboard/control', label: 'Control' }}
                    status={dim.control.status} score={dim.control.score}
                    explainer={dim.control.explainer}
                >
                    <KV k="Denied events"           v={fmtInt(dim.control.denied_event_count)}
                        tone={dim.control.denied_event_count > 0 ? 'red' : 'gray'} />
                    <KV k="Denied with deny_code"   v={fmtInt(dim.control.denied_with_deny_code)} />
                    <KV k="Denied with deny_rule"   v={fmtInt(dim.control.denied_with_deny_rule)} />
                    <KV k="Denied with source"      v={fmtInt(dim.control.denied_with_decision_source)} />
                    <KV k="Denied provider cost"    v={fmtUsd(dim.control.denied_provider_cost_usd, 4)}
                        tone={dim.control.denied_provider_cost_usd === 0 ? 'green' : 'red'} />
                    <KV k="Governance coverage"     v={fmtPct(dim.control.governance_decision_coverage_pct)} />
                    <div className="col-span-2 mt-2">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-1">Top deny codes</div>
                        <ul className="text-[11px] font-mono space-y-1">
                            {dim.control.deny_code_distribution.slice(0, 3).map((c) => (
                                <li key={c.deny_code} className="flex justify-between">
                                    <span>{c.deny_code}</span>
                                    <span>{fmtInt(c.count)}</span>
                                </li>
                            ))}
                            {dim.control.deny_code_distribution.length === 0 && <li className="text-neutral-500">none</li>}
                        </ul>
                    </div>
                </DimensionCard>

                <DimensionCard
                    title="Outcome health" deep={{ href: '/dashboard/prove/outcomes', label: 'Outcome coverage' }}
                    status={dim.outcomes.status} score={dim.outcomes.score}
                    explainer={dim.outcomes.explainer}
                >
                    <KV k="Coverage" v={fmtPct(dim.outcomes.coverage_pct)} />
                    <KV k="Accepted" v={`${fmtInt(dim.outcomes.accepted_count)} / min ${dim.outcomes.accepted_threshold}`} />
                    <KV k="Window"   v={`${dim.outcomes.window_days}d / min ${dim.outcomes.baseline_threshold}d`} />
                    <KV k="Cost / accepted" v={dim.outcomes.insufficient_data ? 'insufficient' : fmtUsd(dim.outcomes.cost_per_accepted_output_usd ?? 0, 4)} />
                    <div className="col-span-2 mt-2">
                        <Link href="/dashboard/prove/outcomes/setup" className="text-[11px] underline">
                            Open the activation kit →
                        </Link>
                    </div>
                </DimensionCard>

                <DimensionCard
                    title="Privacy health" deep={{ href: '/dashboard/prove', label: 'Prove privacy' }}
                    status={dim.privacy.status} score={dim.privacy.score}
                    explainer={dim.privacy.explainer}
                >
                    <KV k="Metadata-only events"  v={fmtInt(dim.privacy.metadata_only_count)} />
                    <KV k="Prompt stored"         v={fmtInt(dim.privacy.prompt_stored_count)}
                        tone={dim.privacy.prompt_stored_count > 0 ? 'amber' : 'green'} />
                    <KV k="Response stored"       v={fmtInt(dim.privacy.response_stored_count)}
                        tone={dim.privacy.response_stored_count > 0 ? 'amber' : 'green'} />
                    <KV k="Redaction applied"     v={fmtInt(dim.privacy.redaction_applied_count)} />
                    <div className="col-span-2 mt-2 text-[11px] text-neutral-600">
                        This health check uses economic metadata only. It does not display prompt or response content.
                    </div>
                </DimensionCard>

                <DimensionCard
                    title="Runtime flip health" deep={{ href: '/dashboard/control', label: 'Flip readiness panel' }}
                    status={dim.runtime_flip.status} score={dim.runtime_flip.score}
                    explainer={dim.runtime_flip.explainer}
                >
                    <KV k="Flip status" v={dim.runtime_flip.flip_status} />
                    <KV k="Reason"      v={dim.runtime_flip.flip_reason || '—'} />
                    <KV k="MTD passes"  v={dim.runtime_flip.mtd_passes ? 'yes' : 'no'} />
                    <KV k="Prev month complete" v={dim.runtime_flip.prev_calendar_month_complete ? 'yes' : 'no'} />
                    <div className="col-span-2 mt-2 text-[11px] text-neutral-600">
                        Runtime flip remains blocked until the observation window and reconciliation gates pass.
                    </div>
                </DimensionCard>

                <DimensionCard
                    title="Optimize readiness (informational)" deep={{ href: '/dashboard/prove/outcomes', label: 'Outcome coverage' }}
                    status={dim.optimize_readiness.status} score={dim.optimize_readiness.score}
                    explainer={dim.optimize_readiness.explainer}
                >
                    <KV k="Readiness" v={dim.optimize_readiness.readiness_status} />
                    <KV k="Recommendations" v="blocked" tone="red" />
                    <KV k="Savings claims" v="blocked" tone="red" />
                    <div className="col-span-2 mt-2 text-[11px] text-neutral-600">
                        Optimize readiness reports whether the data is sufficient for analysis. It does NOT
                        mean P402 is making recommendations or savings claims.
                    </div>
                </DimensionCard>
            </section>

            {/* ── Cleanup priorities ────────────────────────────────────── */}
            <Card title={`Next cleanup areas (${d.cleanup_priorities.length})`}>
                <p className="text-xs text-neutral-700 mb-3">
                    Ranked findings, not recommendations. Each item identifies a concrete area where the
                    accountability system can be tightened. None propose a model switch or claim savings.
                </p>
                {d.cleanup_priorities.length === 0 && (
                    <p className="text-sm text-neutral-600">No cleanup items in this window. The system is in good shape.</p>
                )}
                <ul className="space-y-2">
                    {d.cleanup_priorities.map((p) => (
                        <li key={p.id} className="border-2 border-black p-3 flex flex-wrap items-center gap-3">
                            <SemanticBadge descriptor={{
                                tone: severityTone(p.severity),
                                label: p.severity,
                                glyph: p.severity === 'high' ? '!' : p.severity === 'medium' ? '~' : '·',
                            }} />
                            <SemanticBadge descriptor={{ tone: 'blue', label: p.category, glyph: '·' }} />
                            <span className="font-extrabold uppercase text-[11px] tracking-wider grow min-w-[12rem]">{p.title}</span>
                            <span className="font-mono text-[11px]">{fmtInt(p.count)} event{p.count === 1 ? '' : 's'}</span>
                            {p.affected_spend_usd > 0 && (
                                <span className="font-mono text-[11px]">{fmtUsd(p.affected_spend_usd)}</span>
                            )}
                            <Link href={p.link} className="font-mono text-[11px] underline">open</Link>
                            <p className="basis-full text-xs text-neutral-700 mt-1">{p.why_it_matters}</p>
                        </li>
                    ))}
                </ul>
            </Card>

            {/* ── Deep links ───────────────────────────────────────────── */}
            <Card title="Where to go next">
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                    <DeepLink href="/dashboard/monitor"            label="Monitor — operational view" />
                    <DeepLink href="/dashboard/control"            label="Control — governance + flip readiness" />
                    <DeepLink href="/dashboard/prove"              label="Prove — search the ledger" />
                    <DeepLink href="/dashboard/prove/report"       label="Executive report — board packet" />
                    <DeepLink href="/dashboard/prove/outcomes"     label="Outcome coverage — readiness" />
                    <DeepLink href="/dashboard/prove/outcomes/setup" label="Outcome activation kit" />
                </ul>
            </Card>

            <footer className="text-[10px] text-neutral-500 border-t-2 border-black pt-3">
                Generated {d.generated_at.slice(0, 19)}. Window {d.period.since.slice(0, 10)} → {d.period.until.slice(0, 10)}.
                Optimize recommendations remain blocked. Runtime flip remains blocked.
            </footer>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function ScoreRing({ score, status, label }: { score: number; status: OverallStatus; label: string }) {
    const tone = overallTone(status);
    const TONE_BG: Record<SemanticTone, string> = {
        green:  'border-emerald-700 text-emerald-900',
        blue:   'border-sky-700 text-sky-900',
        amber:  'border-amber-700 text-amber-900',
        red:    'border-rose-700 text-rose-900',
        purple: 'border-violet-700 text-violet-900',
        gray:   'border-neutral-500 text-neutral-700',
    };
    return (
        <div className={`border-4 ${TONE_BG[tone]} p-6 flex flex-col items-center justify-center bg-white`}>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-2">Score</div>
            <div className={`text-6xl font-extrabold ${TONE_BG[tone].split(' ')[1]}`}>{score}</div>
            <div className="text-[10px] text-neutral-500 mt-1">of 100</div>
            <div className="mt-3">
                <SemanticBadge descriptor={{ tone, label, glyph: status === 'audit_ready' ? '✓' : status === 'blocked' ? '✕' : '~' }} />
            </div>
        </div>
    );
}

function DimensionCard({
    title, status, score, explainer, deep, children,
}: {
    title: string;
    status: DimensionStatus;
    score: DimensionScore;
    explainer: string;
    deep: { href: string; label: string };
    children: React.ReactNode;
}) {
    return (
        <Card title={title} action={
            <Link href={deep.href} className="px-2 py-1 text-[10px] font-bold uppercase border-2 border-black hover:bg-neutral-100">
                {deep.label} →
            </Link>
        }>
            <div className="flex items-center gap-2 mb-2">
                <SemanticBadge descriptor={{
                    tone: dimensionTone(status),
                    label: dimensionLabel(status),
                    glyph: dimensionGlyph(status),
                }} />
                <span className="font-mono text-[10px] text-neutral-500">
                    subscore {score.subscore} · weight {score.weight}
                </span>
            </div>
            <p className="text-xs text-neutral-700 mb-3">{explainer}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {children}
            </div>
        </Card>
    );
}

function KV({ k, v, tone }: { k: string; v: string; tone?: SemanticTone }) {
    const TONE_TEXT: Record<SemanticTone, string> = {
        green: 'text-emerald-900', amber: 'text-amber-900', red: 'text-rose-900',
        blue: 'text-sky-900', purple: 'text-violet-900', gray: 'text-neutral-700',
    };
    return (
        <div className="flex justify-between gap-2 border-b border-neutral-200 py-1">
            <span className="text-neutral-500">{k}</span>
            <span className={`font-mono font-bold tabular-nums ${tone ? TONE_TEXT[tone] : ''}`}>{v}</span>
        </div>
    );
}

function DeepLink({ href, label }: { href: string; label: string }) {
    return (
        <li className="border-2 border-black p-2 hover:bg-neutral-100">
            <Link href={href} className="block font-bold uppercase">{label} →</Link>
        </li>
    );
}
