'use client';

// Per-user auth-gated content; never statically cacheable. Marking
// force-dynamic also satisfies Next 15's useSearchParams CSR-bailout
// requirement without an explicit Suspense wrapper.
export const dynamic = 'force-dynamic';

/**
 * Slice 3O — Mission Control 2.0.
 *
 * Executive command center for the full AI spend accountability path:
 *   Meter -> Monitor -> Control -> Prove -> Outcomes -> Accountability
 *
 * Read-only. Reuses the Slice 3M /api/v2/accountability/health endpoint
 * (which itself composes Slice 3D flip readiness and Slice 3K outcome
 * coverage), so this page issues one HTTP call. Optimize remains
 * blocked; runtime flip remains blocked.
 *
 * No DB queries, no writes, no new APIs introduced.
 */

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { Card } from './_components/ui';
import {
    ColorLegend,
    SemanticBadge,
    type SemanticTone,
} from './_components/semantic';
import { PageHeader } from './_components/PageHeader';
import {
    DemoDataDisclaimer,
    DemoPreviewBanner,
    EmptyLedgerStory,
} from './_components/DemoPreview';
import {
    DISCLAIMER_METADATA_ONLY,
    DISCLAIMER_OPTIMIZE_BLOCKED,
    DISCLAIMER_RUNTIME_FLIP_BLOCKED,
    PRODUCT_PATH,
} from '@/lib/dashboard/language';
import {
    buildDemoAccountabilityHealth,
    isDemoMode,
} from '@/lib/demo/accountability-story';
import { getDemoScenario, withDemoQs } from '@/lib/demo/scenarios';

// ─────────────────────────────────────────────────────────────────────────
// Local mirrors of the accountability/health API shape (decouples client
// bundle from server-only modules).
// ─────────────────────────────────────────────────────────────────────────

type DimensionStatus =
    | 'healthy' | 'warning' | 'blocked' | 'unknown'
    | 'observing' | 'not_ready' | 'ready_for_optimize_analysis';

interface DimensionScore { subscore: number; weight: number; weighted: number; }

interface DimensionBase {
    status: DimensionStatus;
    score: DimensionScore;
    explainer: string;
}

interface AccountabilityResponse {
    ok: true;
    generated_at: string;
    period: { since: string; until: string };
    overall: {
        score: number;
        status: 'blocked' | 'needs_cleanup' | 'operational' | 'audit_ready';
        label: string;
        explainer: string;
    };
    dimensions: {
        meter: DimensionBase & {
            total_events: number;
            events_in_period: number;
            event_freshness_seconds: number | null;
            outbox_pending: number;
            outbox_abandoned: number;
        };
        attribution: DimensionBase & {
            unattributed_event_count: number;
            unattributed_spend_usd: number;
            department_coverage_pct: number;
        };
        evidence: DimensionBase & {
            events_missing_evidence: number;
            coverage_pct: number;
        };
        control: DimensionBase & {
            denied_event_count: number;
            denied_provider_cost_usd: number;
        };
        outcomes: DimensionBase & {
            readiness_status: 'blocked' | 'not_ready' | 'observing' | 'ready_for_optimize_analysis';
            coverage_pct: number;
            accepted_count: number;
        };
        privacy: DimensionBase & {
            metadata_only_count: number;
        };
        runtime_flip: DimensionBase & {
            flip_status: 'ready_to_flip' | 'observing' | 'not_ready' | 'blocked';
            flip_reason: string;
        };
        optimize_readiness: DimensionBase & {
            recommendations_enabled: false;
            savings_claims_enabled: false;
            readiness_status: 'blocked' | 'not_ready' | 'observing' | 'ready_for_optimize_analysis';
        };
    };
    cleanup_priorities: Array<{
        id: string;
        category: 'outcomes' | 'attribution' | 'evidence' | 'control' | 'meter' | 'privacy';
        severity: 'high' | 'medium' | 'low';
        title: string;
        count: number;
        affected_spend_usd: number;
        link: string;
        why_it_matters: string;
    }>;
}

// ─────────────────────────────────────────────────────────────────────────
// Formatting + tone helpers
// ─────────────────────────────────────────────────────────────────────────

function fmtUsd(n: number, digits = 2): string {
    if (!Number.isFinite(n)) return '$0.00';
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: digits })}`;
}
function fmtInt(n: number): string  { return n.toLocaleString('en-US'); }
function fmtPct(n: number): string  { return Number.isFinite(n) ? `${n.toFixed(1)}%` : 'n/a'; }

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
    if (s === 'healthy' || s === 'ready_for_optimize_analysis') return '✓';
    if (s === 'observing' || s === 'warning' || s === 'not_ready') return '!';
    if (s === 'blocked') return '✕';
    return '·';
}

function overallTone(s: AccountabilityResponse['overall']['status']): SemanticTone {
    return s === 'audit_ready' ? 'green' : s === 'operational' ? 'blue' : s === 'needs_cleanup' ? 'amber' : 'red';
}

function severityTone(s: 'high' | 'medium' | 'low'): SemanticTone {
    return s === 'high' ? 'red' : s === 'medium' ? 'amber' : 'gray';
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function MissionControlPage() {
    const searchParams = useSearchParams();
    const demoActive = isDemoMode(searchParams);
    const scenario = getDemoScenario(searchParams);
    const dq = (href: string) => withDemoQs(href, demoActive, scenario);

    const data = useQuery<AccountabilityResponse>({
        queryKey: ['dashboard/accountability'],
        // In demo mode we never hit the network — the demo builder
        // returns a fully-formed envelope.
        enabled: !demoActive,
        queryFn: async () => {
            const r = await fetch('/api/v2/accountability/health');
            if (!r.ok) throw new Error(`health ${r.status}`);
            return r.json();
        },
    });

    // When demo=1 is active we substitute the demo envelope. The builder
    // shape mirrors AccountabilityResponse (with an _demo marker on the
    // root + on cleanup priorities so a future export-path regression
    // cannot silently leak demo rows as real audit data).
    const d: AccountabilityResponse | undefined = demoActive
        ? (buildDemoAccountabilityHealth(scenario) as unknown as AccountabilityResponse)
        : data.data;

    // Empty ledger: real tenant, fetch succeeded, but zero events. Show
    // the story state instead of a row of zeros.
    const showEmptyLedgerStory =
        !demoActive && !data.isLoading && !data.error && d != null &&
        d.dimensions.meter.total_events === 0;

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
            {demoActive && <DemoPreviewBanner
                exitHref="/dashboard"
                scenario={scenario}
                pathname="/dashboard"
            />}

            {showEmptyLedgerStory && (
                <EmptyLedgerStory
                    setupHref="/dashboard/prove/outcomes/setup"
                    demoHref="?demo=1"
                />
            )}

            {/* ── 1. Executive command header ───────────────────────────── */}
            <PageHeader
                area="Mission Control"
                title="AI Spend Accountability Command Center"
                purpose="Meter usage, monitor budgets, control spend, prove economic events, and prepare for outcome-based optimization."
                disclaimers={[
                    DISCLAIMER_METADATA_ONLY,
                    DISCLAIMER_OPTIMIZE_BLOCKED,
                    DISCLAIMER_RUNTIME_FLIP_BLOCKED,
                ]}
                primary={[
                    { label: 'Accountability', href: '/dashboard/accountability' },
                    { label: 'Prove',          href: '/dashboard/prove' },
                    { label: 'Outcome coverage', href: '/dashboard/prove/outcomes' },
                ]}
                secondary={[
                    { label: 'Executive report', href: '/dashboard/prove/report' },
                    { label: 'Activation kit',   href: '/dashboard/prove/outcomes/setup' },
                ]}
            />

            {data.isLoading && (
                <Card title="Loading system status">
                    <p className="text-sm text-neutral-500">Reading the canonical ledger…</p>
                </Card>
            )}
            {data.error && (
                <Card title="Could not load system status">
                    <p className="text-sm">Try refreshing the page. The detail pages remain reachable from the sidebar.</p>
                </Card>
            )}

            {d && (
                <>
                    {/* ── 2. System status strip ────────────────────────────── */}
                    <section data-testid="system-status-strip" className="space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <h2 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">System status</h2>
                            {demoActive && <DemoDataDisclaimer />}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            <StatTile
                                label="Accountability score"
                                value={`${d.overall.score} / 100`}
                                tone={overallTone(d.overall.status)}
                                note={d.overall.label}
                            />
                            <StatTile
                                label="Total economic events"
                                value={fmtInt(d.dimensions.meter.total_events)}
                                tone="blue"
                                note={`${fmtInt(d.dimensions.meter.events_in_period)} in window`}
                            />
                            <StatTile
                                label="Denied events"
                                value={fmtInt(d.dimensions.control.denied_event_count)}
                                tone={d.dimensions.control.denied_event_count > 0 ? 'red' : 'gray'}
                                note="zero provider cost"
                            />
                            <StatTile
                                label="Unattributed spend"
                                value={fmtUsd(d.dimensions.attribution.unattributed_spend_usd)}
                                tone={d.dimensions.attribution.unattributed_spend_usd > 0 ? 'amber' : 'green'}
                            />
                            <StatTile
                                label="Outcome coverage"
                                value={fmtPct(d.dimensions.outcomes.coverage_pct)}
                                tone={dimensionTone(d.dimensions.outcomes.status)}
                                note={`accepted: ${fmtInt(d.dimensions.outcomes.accepted_count)}`}
                            />
                            <StatTile
                                label="Evidence coverage"
                                value={fmtPct(d.dimensions.evidence.coverage_pct)}
                                tone={dimensionTone(d.dimensions.evidence.status)}
                            />
                            <StatTile
                                label="Attribution status"
                                value={dimensionLabel(d.dimensions.attribution.status)}
                                tone={dimensionTone(d.dimensions.attribution.status)}
                                note={`${fmtPct(d.dimensions.attribution.department_coverage_pct)} dept coverage`}
                            />
                            <StatTile
                                label="Runtime flip"
                                value={d.dimensions.runtime_flip.flip_status}
                                tone={dimensionTone(d.dimensions.runtime_flip.status)}
                                note="blocked until gates pass"
                            />
                            <StatTile
                                label="Optimize readiness"
                                value={d.dimensions.optimize_readiness.readiness_status}
                                tone={dimensionTone(d.dimensions.optimize_readiness.status)}
                                note="recommendations remain blocked"
                            />
                        </div>
                        <ColorLegend
                            title="Tones"
                            items={[
                                { tone: 'green', label: 'healthy / analysis-ready' },
                                { tone: 'blue',  label: 'normal' },
                                { tone: 'amber', label: 'observing / review' },
                                { tone: 'red',   label: 'blocked / not ready' },
                                { tone: 'gray',  label: 'unknown' },
                            ]}
                        />
                    </section>

                    {/* ── 3. Product path cards ─────────────────────────────── */}
                    <section data-testid="product-path" className="space-y-3">
                        <h2 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">
                            Product path
                        </h2>
                        <p className="text-xs text-neutral-700 max-w-3xl">
                            One canonical flow: Meter records every AI request as an economic event, Monitor
                            watches operational health, Control governs denied events, Prove turns events into
                            audit-ready evidence, Outcomes tracks the result of each request, and Accountability
                            consolidates it all.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            <PathCard
                                title="Meter"
                                purpose={PRODUCT_PATH[0].purpose}
                                href={PRODUCT_PATH[0].href}
                                stats={[
                                    { k: 'Total events', v: fmtInt(d.dimensions.meter.total_events) },
                                    { k: 'In window',    v: fmtInt(d.dimensions.meter.events_in_period) },
                                ]}
                                statusLabel="metering"
                                statusTone={dimensionTone(d.dimensions.meter.status)}
                                nextStep={{ label: 'Activation kit', href: '/dashboard/prove/outcomes/setup' }}
                            />
                            <PathCard
                                title="Monitor"
                                purpose={PRODUCT_PATH[1].purpose}
                                href={PRODUCT_PATH[1].href}
                                stats={[
                                    { k: 'Events in window', v: fmtInt(d.dimensions.meter.events_in_period) },
                                    { k: 'Outbox pending',   v: fmtInt(d.dimensions.meter.outbox_pending) },
                                ]}
                                statusLabel={dimensionLabel(d.dimensions.meter.status)}
                                statusTone={dimensionTone(d.dimensions.meter.status)}
                                nextStep={{ label: 'Open Control', href: '/dashboard/control' }}
                            />
                            <PathCard
                                title="Control"
                                purpose={PRODUCT_PATH[2].purpose}
                                href={PRODUCT_PATH[2].href}
                                stats={[
                                    { k: 'Denied events',  v: fmtInt(d.dimensions.control.denied_event_count) },
                                    { k: 'Provider cost',  v: fmtUsd(d.dimensions.control.denied_provider_cost_usd, 4) },
                                ]}
                                statusLabel={dimensionLabel(d.dimensions.control.status)}
                                statusTone={dimensionTone(d.dimensions.control.status)}
                                nextStep={{ label: 'Review denied events', href: '/dashboard/prove?governance_decision=denied' }}
                            />
                            <PathCard
                                title="Prove"
                                purpose={PRODUCT_PATH[3].purpose}
                                href={PRODUCT_PATH[3].href}
                                stats={[
                                    { k: 'Evidence coverage', v: fmtPct(d.dimensions.evidence.coverage_pct) },
                                    { k: 'Missing evidence',  v: fmtInt(d.dimensions.evidence.events_missing_evidence) },
                                ]}
                                statusLabel={dimensionLabel(d.dimensions.evidence.status)}
                                statusTone={dimensionTone(d.dimensions.evidence.status)}
                                nextStep={{ label: 'Executive report', href: '/dashboard/prove/report' }}
                            />
                            <PathCard
                                title="Outcomes"
                                purpose={PRODUCT_PATH[4].purpose}
                                href={PRODUCT_PATH[4].href}
                                stats={[
                                    { k: 'Coverage',  v: fmtPct(d.dimensions.outcomes.coverage_pct) },
                                    { k: 'Accepted',  v: fmtInt(d.dimensions.outcomes.accepted_count) },
                                ]}
                                statusLabel={dimensionLabel(d.dimensions.outcomes.status)}
                                statusTone={dimensionTone(d.dimensions.outcomes.status)}
                                nextStep={{ label: 'Activation kit', href: '/dashboard/prove/outcomes/setup' }}
                            />
                            <PathCard
                                title="Accountability"
                                purpose={PRODUCT_PATH[5].purpose}
                                href={PRODUCT_PATH[5].href}
                                stats={[
                                    { k: 'Score', v: `${d.overall.score} / 100` },
                                    { k: 'State', v: d.overall.label },
                                ]}
                                statusLabel={d.overall.label.toLowerCase()}
                                statusTone={overallTone(d.overall.status)}
                                nextStep={{ label: 'Open', href: '/dashboard/accountability' }}
                            />
                        </div>
                    </section>

                    {/* ── 4. What needs attention ───────────────────────────── */}
                    <section data-testid="cleanup-panel">
                        <Card title={`Next cleanup areas (${d.cleanup_priorities.length})`}>
                            <p className="text-xs text-neutral-700 mb-3">
                                Ranked findings, not recommendations. Each item identifies a concrete area where
                                the accountability system can be tightened.
                            </p>
                            {d.cleanup_priorities.length === 0 ? (
                                <p className="text-sm text-neutral-600">No cleanup items in this window.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {d.cleanup_priorities.slice(0, 6).map((p) => (
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
                            )}
                            {d.cleanup_priorities.length > 6 && (
                                <p className="mt-3 text-xs">
                                    <Link href="/dashboard/accountability" className="underline">See the full list on Accountability →</Link>
                                </p>
                            )}
                        </Card>
                    </section>

                    {/* ── 5. Readiness gates ────────────────────────────────── */}
                    <section data-testid="readiness-gates">
                        <Card title="Readiness gates">
                            <p className="text-xs text-neutral-700 mb-3">
                                Each gate must pass before the next milestone is unlocked. Optimize analysis
                                does not mean Optimize recommendations — recommendations stay blocked until
                                explicitly approved.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                <GateTile
                                    label="Runtime flip readiness"
                                    status={dimensionLabel(d.dimensions.runtime_flip.status)}
                                    tone={dimensionTone(d.dimensions.runtime_flip.status)}
                                    explainer={d.dimensions.runtime_flip.explainer}
                                />
                                <GateTile
                                    label="Outcome coverage readiness"
                                    status={dimensionLabel(d.dimensions.outcomes.status)}
                                    tone={dimensionTone(d.dimensions.outcomes.status)}
                                    explainer={d.dimensions.outcomes.explainer}
                                />
                                <GateTile
                                    label="Optimize analysis readiness"
                                    status={dimensionLabel(d.dimensions.optimize_readiness.status)}
                                    tone={dimensionTone(d.dimensions.optimize_readiness.status)}
                                    explainer="Optimize recommendations remain blocked regardless of this status."
                                />
                                <GateTile
                                    label="Evidence coverage readiness"
                                    status={dimensionLabel(d.dimensions.evidence.status)}
                                    tone={dimensionTone(d.dimensions.evidence.status)}
                                    explainer={d.dimensions.evidence.explainer}
                                />
                            </div>
                        </Card>
                    </section>

                    {/* ── 6. Recent economic activity ───────────────────────── */}
                    <section data-testid="recent-activity">
                        <Card title="Recent economic activity">
                            <p className="text-xs text-neutral-700 mb-3">
                                Drill-downs into the canonical ledger. Activity is summarized from the same
                                accountability snapshot; the linked pages show row-level detail. None of these
                                surfaces display prompt or response content.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                <ActivityTile
                                    title="Recent events"
                                    count={d.dimensions.meter.events_in_period}
                                    href="/dashboard/prove"
                                    cta="Search Prove"
                                />
                                <ActivityTile
                                    title="Recent denied events"
                                    count={d.dimensions.control.denied_event_count}
                                    href="/dashboard/prove?governance_decision=denied"
                                    cta="Open denied"
                                />
                                <ActivityTile
                                    title="Recent outcomes"
                                    count={d.dimensions.outcomes.accepted_count}
                                    href="/dashboard/prove/outcomes"
                                    cta="Outcome coverage"
                                />
                                <ActivityTile
                                    title="Recent evidence gaps"
                                    count={d.dimensions.evidence.events_missing_evidence}
                                    href="/dashboard/prove?evidence_status=missing"
                                    cta="Find missing evidence"
                                />
                                <ActivityTile
                                    title="Recent attribution gaps"
                                    count={d.dimensions.attribution.unattributed_event_count}
                                    href="/dashboard/prove?attribution_status=unattributed"
                                    cta="Find unattributed"
                                />
                                <ActivityTile
                                    title="Recent outbox issues"
                                    count={d.dimensions.meter.outbox_pending + d.dimensions.meter.outbox_abandoned}
                                    href="/dashboard/audit"
                                    cta="Audit panel"
                                />
                            </div>
                        </Card>
                    </section>

                    {/* ── 7. Buyer narrative ────────────────────────────────── */}
                    <section data-testid="buyer-narrative">
                        <Card title="What P402 is doing here">
                            <p className="text-sm leading-relaxed">
                                P402 turns AI usage into accountable economic events. Each event can be
                                attributed to a budget owner, governed by a control, proven against an audit
                                packet, and later evaluated by outcome. Optimize remains blocked until outcome
                                coverage is sufficient — this surface measures spend quality, never proposes a
                                model swap or a savings claim.
                            </p>
                        </Card>
                    </section>

                    {/* ── 8. Next actions by role ───────────────────────────── */}
                    <section data-testid="next-actions">
                        <h2 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 mb-3">Next actions by role</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <RoleCard
                                title="CFO"
                                actions={[
                                    { label: 'Review accountability health', href: '/dashboard/accountability' },
                                    { label: 'Export executive report',      href: '/dashboard/prove/report' },
                                    { label: 'Inspect unattributed spend',   href: '/dashboard/prove?attribution_status=unattributed' },
                                ]}
                            />
                            <RoleCard
                                title="Engineering lead"
                                actions={[
                                    { label: 'Improve outcome capture',       href: '/dashboard/prove/outcomes/setup' },
                                    { label: 'Review runtime flip readiness', href: '/dashboard/control' },
                                    { label: 'Check denied-event recording',  href: '/dashboard/prove?governance_decision=denied' },
                                ]}
                            />
                            <RoleCard
                                title="Compliance / procurement"
                                actions={[
                                    { label: 'Review evidence coverage',      href: '/dashboard/prove?evidence_status=missing' },
                                    { label: 'Export audit packet',           href: '/dashboard/prove/report' },
                                    { label: 'Inspect privacy posture',       href: '/dashboard/accountability' },
                                ]}
                            />
                            <RoleCard
                                title="Operator"
                                actions={[
                                    { label: 'Monitor denied events',         href: '/dashboard/control' },
                                    { label: 'Resolve missing evidence',      href: '/dashboard/prove?evidence_status=missing' },
                                    { label: 'Review cleanup areas',          href: '/dashboard/accountability' },
                                ]}
                            />
                        </div>
                    </section>
                </>
            )}

            <footer className="text-[10px] text-neutral-500 border-t-2 border-black pt-3">
                Optimize recommendations remain blocked. Runtime flip remains blocked.
                {d && <> Generated {d.generated_at.slice(0, 19)}.</>}
            </footer>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function StatTile({ label, value, tone = 'blue', note }: {
    label: string; value: string; tone?: SemanticTone; note?: string;
}) {
    const TONE_TEXT: Record<SemanticTone, string> = {
        green: 'text-emerald-900', amber: 'text-amber-900', red: 'text-rose-900',
        blue: 'text-sky-900', purple: 'text-violet-900', gray: 'text-neutral-700',
    };
    return (
        <div className="border-2 border-black bg-white p-3">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">{label}</div>
            <div className={`text-xl font-extrabold mt-1 ${TONE_TEXT[tone]}`}>{value}</div>
            {note && <div className="text-[10px] text-neutral-500 mt-1">{note}</div>}
        </div>
    );
}

function PathCard({
    title, purpose, href, stats, statusLabel, statusTone, nextStep,
}: {
    title: string;
    purpose: string;
    href: string;
    stats: Array<{ k: string; v: string }>;
    statusLabel: string;
    statusTone: SemanticTone;
    nextStep: { label: string; href: string };
}) {
    return (
        <div className="border-2 border-black bg-white p-4 flex flex-col gap-3" data-path-card={title.toLowerCase()}>
            <div className="flex items-center justify-between">
                <h3 className="font-extrabold uppercase tracking-wider text-sm">{title}</h3>
                <SemanticBadge descriptor={{
                    tone: statusTone,
                    label: statusLabel,
                    glyph: statusTone === 'green' ? '✓' : statusTone === 'red' ? '✕' : statusTone === 'amber' ? '!' : '·',
                }} />
            </div>
            <p className="text-xs text-neutral-700">{purpose}</p>
            <ul className="space-y-1 text-xs">
                {stats.map((s) => (
                    <li key={s.k} className="flex justify-between border-b border-neutral-200 py-1">
                        <span className="text-neutral-500">{s.k}</span>
                        <span className="font-mono font-bold tabular-nums">{s.v}</span>
                    </li>
                ))}
            </ul>
            <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t-2 border-black">
                <Link href={href} className="text-[11px] font-bold uppercase underline">Open {title}</Link>
                <Link href={nextStep.href} className="text-[11px] underline">{nextStep.label} →</Link>
            </div>
        </div>
    );
}

function GateTile({ label, status, tone, explainer }: {
    label: string; status: string; tone: SemanticTone; explainer: string;
}) {
    return (
        <div className="border-2 border-black bg-white p-3">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-2">{label}</div>
            <SemanticBadge descriptor={{
                tone, label: status,
                glyph: tone === 'green' ? '✓' : tone === 'red' ? '✕' : tone === 'amber' ? '!' : '·',
            }} />
            <p className="text-[11px] text-neutral-700 mt-2">{explainer}</p>
        </div>
    );
}

function ActivityTile({ title, count, href, cta }: {
    title: string; count: number; href: string; cta: string;
}) {
    return (
        <div className="border-2 border-black bg-white p-3">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">{title}</div>
            <div className="text-xl font-extrabold mt-1 font-mono">{count.toLocaleString('en-US')}</div>
            <Link href={href} className="text-[11px] underline mt-1 inline-block">{cta} →</Link>
        </div>
    );
}

function RoleCard({ title, actions }: {
    title: string;
    actions: Array<{ label: string; href: string }>;
}) {
    return (
        <div className="border-2 border-black bg-white p-4" data-role-card={title.toLowerCase()}>
            <h3 className="font-extrabold uppercase tracking-wider text-sm mb-3">{title}</h3>
            <ul className="space-y-2">
                {actions.map((a) => (
                    <li key={a.href}>
                        <Link href={a.href} className="text-[12px] underline">{a.label} →</Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
