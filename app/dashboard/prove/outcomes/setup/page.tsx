'use client';
/**
 * Slice 3L — Outcome Capture Activation Kit.
 *
 * Read-only activation guide. Hits /api/v2/outcomes/setup, which composes
 * a lightweight readiness summary (from the Slice 3K aggregations) with
 * static integration content (checklist, SDK / REST / callback / human
 * review examples, safe-metadata guide, common validation errors, API
 * reference). This page never writes outcomes; the only buttons are
 * copy-to-clipboard for snippets, deep-links into Prove search, and a
 * jump back to the Slice 3K coverage dashboard.
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { Button, Card } from '../../../_components/ui';
import {
    ColorLegend,
    SemanticBadge,
    type SemanticTone,
} from '../../../_components/semantic';
import { PageHeader } from '../../../_components/PageHeader';
import { Breadcrumbs } from '../../../_components/Breadcrumbs';
import {
    DISCLAIMER_METADATA_ONLY,
    DISCLAIMER_OPTIMIZE_BLOCKED,
    DISCLAIMER_READINESS_NOT_RECOMMENDATION,
} from '@/lib/dashboard/language';

// ─────────────────────────────────────────────────────────────────────────
// Local types (mirror the API; keep client bundle decoupled from server).
// ─────────────────────────────────────────────────────────────────────────

type ReadinessStatus =
    | 'blocked'
    | 'not_ready'
    | 'observing'
    | 'ready_for_optimize_analysis';

interface ChecklistItem { id: string; title: string; description: string; }
interface CodeExample {
    id: string;
    title: string;
    language: 'typescript' | 'bash' | 'javascript' | 'json';
    description: string;
    code: string;
}
interface MetadataExample { key: string; sample_value: string; note: string; }
interface ValidationError { code: string; when: string; fix: string; }
interface MissingSegment {
    label: string;
    dimension: 'department' | 'workflow' | 'customer' | 'provider_model';
    key: string;
    missing_count: number;
    total_events: number;
    coverage_pct: number;
    sample_request_id: string | null;
}
interface ReadinessSummary {
    status: ReadinessStatus;
    reason: string;
    explainer: string;
    coverage_pct: number;
    events_with_outcome: number;
    total_events: number;
    accepted_count: number;
    window_days: number;
    cost_per_accepted_output_usd: number | null;
    cost_per_accepted_insufficient_data: boolean;
}
interface SetupResponse {
    ok: true;
    generated_at: string;
    intro_copy: string;
    disclaimer_copy: string;
    readiness_summary: ReadinessSummary;
    thresholds: { min_coverage_pct: number; min_accepted_count: number; min_baseline_days: number };
    top_missing_segments: MissingSegment[];
    integration_checklist: ChecklistItem[];
    examples: CodeExample[];
    allowed_metadata_examples: MetadataExample[];
    common_validation_errors: ValidationError[];
    api: {
        write_endpoint: string;
        read_endpoint_pattern: string;
        idempotency_key: string;
        body_keys: string[];
        statuses_stored: string[];
        statuses_canonical: string[];
        sources_canonical: string[];
        forbidden_fields: string[];
    };
    disclaimers: {
        readiness_not_recommendation: boolean;
        no_savings_claim: boolean;
        content_displayed: boolean;
        writes_from_this_endpoint: boolean;
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Formatting helpers (small + local)
// ─────────────────────────────────────────────────────────────────────────

function fmtInt(n: number): string  { return n.toLocaleString('en-US'); }
function fmtPct(n: number): string  { return Number.isFinite(n) ? `${n.toFixed(1)}%` : 'n/a'; }
function fmtUsd(n: number | null): string {
    if (n == null || !Number.isFinite(n)) return 'n/a';
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

function readinessTone(s: ReadinessStatus): SemanticTone {
    return s === 'ready_for_optimize_analysis' ? 'green'
        :  s === 'observing' ? 'amber'
        :  s === 'not_ready' ? 'red' : 'gray';
}
function readinessLabel(s: ReadinessStatus): string {
    return s === 'ready_for_optimize_analysis' ? 'analysis-ready'
        :  s === 'observing' ? 'observing'
        :  s === 'not_ready' ? 'not ready' : 'blocked';
}
function readinessGlyph(s: ReadinessStatus): string {
    return s === 'ready_for_optimize_analysis' ? '✓'
        :  s === 'observing' ? '~'
        :  s === 'not_ready' ? '!' : '·';
}

function dimensionToSearchQs(seg: MissingSegment): string {
    const qs = new URLSearchParams();
    if (seg.dimension === 'department')      qs.set('department_id', seg.key);
    else if (seg.dimension === 'workflow')   qs.set('workflow_id', seg.key);
    else if (seg.dimension === 'customer')   qs.set('customer_id', seg.key);
    else if (seg.dimension === 'provider_model') {
        const [provider, model] = seg.key.split(' / ');
        if (provider) qs.set('provider', provider);
        if (model)    qs.set('model', model);
    }
    return qs.toString();
}

function copyToClipboard(text: string): void {
    navigator.clipboard?.writeText(text).catch(() => { /* noop */ });
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function OutcomeSetupPage() {
    const [checked, setChecked] = useState<Record<string, boolean>>({});
    const toggle = (id: string) => setChecked((p) => ({ ...p, [id]: !p[id] }));

    const data = useQuery<SetupResponse>({
        queryKey: ['outcomes/setup'],
        queryFn: async () => {
            const r = await fetch('/api/v2/outcomes/setup');
            if (!r.ok) throw new Error(`setup ${r.status}`);
            return r.json();
        },
    });

    const completedCount = useMemo(
        () => Object.values(checked).filter(Boolean).length,
        [checked],
    );

    if (data.isLoading) return <div className="p-8 text-sm text-neutral-500">Loading activation kit…</div>;
    if (data.error || !data.data) return (
        <div className="p-8">
            <Card title="Could not load setup">
                <p className="text-sm">Try refreshing the page.</p>
            </Card>
        </div>
    );

    const d = data.data;
    const r = d.readiness_summary;
    const t = d.thresholds;

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-6xl">
            {/* ── Header ────────────────────────────────────────────────── */}
            <PageHeader
                area="Outcomes"
                title="Outcome Capture Activation Kit"
                purpose={d.intro_copy}
                disclaimers={[
                    d.disclaimer_copy,
                    DISCLAIMER_METADATA_ONLY,
                    DISCLAIMER_READINESS_NOT_RECOMMENDATION,
                    DISCLAIMER_OPTIMIZE_BLOCKED,
                ]}
                primary={[
                    { label: 'Outcome coverage', href: '/dashboard/prove/outcomes' },
                    { label: 'Prove search',     href: '/dashboard/prove' },
                ]}
                secondary={[
                    { label: 'Accountability', href: '/dashboard/accountability' },
                ]}
                breadcrumbs={
                    <Breadcrumbs items={[
                        { label: 'Prove',     href: '/dashboard/prove' },
                        { label: 'Outcomes',  href: '/dashboard/prove/outcomes' },
                        { label: 'Activation kit' },
                    ]} />
                }
            />

            {/* ── 1. Outcome coverage status ────────────────────────────── */}
            <Card title="1. Where you are today">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                    <SemanticBadge descriptor={{
                        tone: readinessTone(r.status),
                        label: readinessLabel(r.status),
                        glyph: readinessGlyph(r.status),
                    }} />
                    <span className="font-mono text-[11px] text-neutral-500">reason: {r.reason || '—'}</span>
                </div>
                <p className="text-sm leading-relaxed mb-4">{r.explainer}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <StatTile label="Outcome coverage" value={fmtPct(r.coverage_pct)} note={`min ${t.min_coverage_pct}%`} />
                    <StatTile label="Accepted outcomes" value={fmtInt(r.accepted_count)} note={`min ${t.min_accepted_count}`} />
                    <StatTile label="Window length" value={`${r.window_days} days`} note={`min ${t.min_baseline_days}`} />
                    <StatTile
                        label="Cost / accepted"
                        value={r.cost_per_accepted_insufficient_data ? 'insufficient data' : fmtUsd(r.cost_per_accepted_output_usd)}
                        note="reported once thresholds are met"
                    />
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                    <Link href="/dashboard/prove/outcomes" className="px-3 py-1 border-2 border-black font-bold uppercase text-[11px] hover:bg-neutral-100">
                        Open full coverage dashboard
                    </Link>
                </div>

                <div className="mt-3">
                    <ColorLegend
                        title="Readiness tones"
                        items={[
                            { tone: 'green', label: 'analysis-ready' },
                            { tone: 'amber', label: 'observing' },
                            { tone: 'red',   label: 'not ready' },
                            { tone: 'gray',  label: 'blocked' },
                        ]}
                    />
                </div>
            </Card>

            {/* ── 2. Integration checklist ──────────────────────────────── */}
            <Card title={`2. Integration checklist (${completedCount} / ${d.integration_checklist.length})`}>
                <ul className="space-y-3">
                    {d.integration_checklist.map((item) => (
                        <li key={item.id} className="border-2 border-black p-3 flex gap-3">
                            <input
                                type="checkbox"
                                checked={!!checked[item.id]}
                                onChange={() => toggle(item.id)}
                                aria-label={item.title}
                                className="mt-1 h-4 w-4 shrink-0"
                            />
                            <div className="grow">
                                <div className="font-extrabold uppercase text-[11px] tracking-wider">{item.title}</div>
                                <p className="text-sm text-neutral-700 mt-1">{item.description}</p>
                            </div>
                        </li>
                    ))}
                </ul>
                <p className="text-[10px] text-neutral-500 mt-3">
                    Checklist state is local to your browser. It is not persisted server-side in this slice.
                </p>
            </Card>

            {/* ── 3–6. Examples (SDK, REST, callback, human review) ─────── */}
            <Card title="3–6. Integration examples">
                <p className="text-xs text-neutral-700 mb-3">
                    Copy-ready snippets. The SDK example uses the existing
                    <span className="font-mono"> @p402/sdk</span> outcomes client; the others target the
                    canonical write URL <span className="font-mono">{d.api.write_endpoint}</span> directly.
                </p>
                <div className="space-y-4">
                    {d.examples.map((ex) => (
                        <ExampleBlock key={ex.id} example={ex} />
                    ))}
                </div>
            </Card>

            {/* ── 7. Safe metadata guide ────────────────────────────────── */}
            <Card title="7. Safe metadata guide">
                <p className="text-xs text-neutral-700 mb-3">
                    Use metadata for context that helps finance, ops, and procurement — never for raw model
                    inputs or outputs. The writer rejects any payload that carries a content-bearing key at
                    the body or metadata level with a 400 before any DB write.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 mb-2">
                            Allowed (content-safe)
                        </div>
                        <ul className="space-y-2">
                            {d.allowed_metadata_examples.map((m) => (
                                <li key={m.key} className="border-2 border-emerald-700 bg-emerald-50 p-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-[11px]">{m.key}</span>
                                        <span className="font-mono text-[11px]">{m.sample_value}</span>
                                    </div>
                                    <p className="text-[11px] text-emerald-900 mt-1">{m.note}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-900 mb-2">
                            Forbidden (writer rejects with 400)
                        </div>
                        <ul className="grid grid-cols-2 gap-2">
                            {d.api.forbidden_fields.map((k) => (
                                <li key={k} className="border-2 border-rose-700 bg-rose-50 p-1.5 font-mono text-[11px] flex items-center gap-1">
                                    <span aria-hidden="true">✕</span>{k}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Card>

            {/* ── 8. Coverage improvement panel ─────────────────────────── */}
            <Card title="8. Top missing-outcome segments">
                <p className="text-xs text-neutral-700 mb-3">
                    Where to point your next integration. Each row links into Prove search pre-filtered to the
                    segment, and (where available) into the event detail page for a sample event.
                </p>
                <div className="overflow-auto border-2 border-black">
                    <table className="w-full text-[12px]">
                        <thead className="bg-neutral-100 border-b-2 border-black">
                            <tr>
                                <Th>Dimension</Th><Th>Key</Th><Th right>Missing</Th><Th right>Total</Th><Th right>Coverage</Th>
                                <Th>Sample event</Th><Th>Search Prove</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {d.top_missing_segments.length === 0 && (
                                <tr><td colSpan={7} className="p-2 text-neutral-500">No segments with missing outcomes.</td></tr>
                            )}
                            {d.top_missing_segments.map((seg) => (
                                <tr key={`${seg.dimension}-${seg.key}`} className="border-b border-neutral-200">
                                    <Td mono>{seg.dimension}</Td>
                                    <Td mono>{seg.key}</Td>
                                    <Td right mono>{fmtInt(seg.missing_count)}</Td>
                                    <Td right mono>{fmtInt(seg.total_events)}</Td>
                                    <Td right>{fmtPct(seg.coverage_pct)}</Td>
                                    <Td>
                                        {seg.sample_request_id ? (
                                            <Link
                                                href={`/dashboard/prove/event/${encodeURIComponent(seg.sample_request_id)}`}
                                                className="font-mono underline"
                                            >
                                                {seg.sample_request_id.slice(0, 12)}…
                                            </Link>
                                        ) : '—'}
                                    </Td>
                                    <Td>
                                        <Link href={`/dashboard/prove?${dimensionToSearchQs(seg)}`} className="underline text-[11px]">
                                            search Prove
                                        </Link>
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* ── 9. Test console (read-only) ───────────────────────────── */}
            <Card title="9. Test console (read-only)">
                <p className="text-xs text-neutral-700 mb-3">
                    This panel does NOT send outcomes. It documents the sample request, the expected response
                    shape, and the most common validation failures so you can sanity-check your integration
                    without writing to the ledger from the dashboard.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <SubHd>Sample request</SubHd>
                        <pre className="border-2 border-black p-3 bg-neutral-50 text-[11px] font-mono whitespace-pre-wrap">
{`POST ${d.api.write_endpoint}
Authorization: Bearer <P402_API_KEY>
Content-Type: application/json

{
  "request_id": "req_abc123",
  "status":     "accepted",
  "source":     "sdk",
  "quality_score": 0.91,
  "metadata":   {
    "user_action":    "accepted",
    "workflow_stage": "approval"
  }
}`}
                        </pre>
                    </div>
                    <div>
                        <SubHd>Expected response shape</SubHd>
                        <pre className="border-2 border-black p-3 bg-neutral-50 text-[11px] font-mono whitespace-pre-wrap">
{`200 OK
{
  "ok": true,
  "outcome_id": "<uuid>",
  "request_id": "req_abc123",
  "status":     "accepted",
  "quality_score": 0.91,
  "recorded_at": "<iso8601>"
}`}
                        </pre>
                    </div>
                </div>

                <div className="mt-4">
                    <SubHd>Common validation errors</SubHd>
                    <table className="w-full text-[12px]">
                        <thead className="border-b-2 border-black">
                            <tr>
                                <Th>Code</Th><Th>When</Th><Th>Fix</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {d.common_validation_errors.map((e) => (
                                <tr key={e.code} className="border-b border-neutral-200">
                                    <Td mono>{e.code}</Td>
                                    <Td>{e.when}</Td>
                                    <Td>{e.fix}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* ── API reference ─────────────────────────────────────────── */}
            <Card title="API reference">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <KV k="Write endpoint"        v={d.api.write_endpoint} mono />
                    <KV k="Read pattern"          v={d.api.read_endpoint_pattern} mono />
                    <KV k="Idempotency key"       v={d.api.idempotency_key} mono />
                    <KV k="Allowed body keys"     v={d.api.body_keys.join(', ')} mono />
                    <KV k="Canonical statuses"    v={d.api.statuses_canonical.join(', ')} mono />
                    <KV k="Stored (superset)"     v={d.api.statuses_stored.join(', ')} mono />
                    <KV k="Canonical sources"     v={d.api.sources_canonical.join(', ')} mono />
                </div>
            </Card>

            <footer className="text-[10px] text-neutral-500 border-t-2 border-black pt-3">
                Activation guide only. Optimize recommendations remain blocked. Generated {d.generated_at.slice(0, 19)}.
            </footer>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function ExampleBlock({ example }: { example: CodeExample }) {
    return (
        <div className="border-2 border-black">
            <div className="flex items-center justify-between px-3 py-2 border-b-2 border-black bg-neutral-100">
                <div>
                    <div className="font-extrabold uppercase text-[11px] tracking-wider">{example.title}</div>
                    <div className="text-[10px] text-neutral-500 font-mono">{example.language}</div>
                </div>
                <Button onClick={() => copyToClipboard(example.code)}>Copy</Button>
            </div>
            <p className="text-xs text-neutral-700 px-3 py-2 border-b border-neutral-300">{example.description}</p>
            <pre className="p-3 bg-neutral-50 text-[11px] font-mono whitespace-pre-wrap overflow-auto">{example.code}</pre>
        </div>
    );
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
    return (
        <div className="border-2 border-black p-3">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">{label}</div>
            <div className="text-xl font-extrabold mt-1">{value}</div>
            {note && <div className="text-[10px] text-neutral-500 mt-1">{note}</div>}
        </div>
    );
}

function SubHd({ children }: { children: React.ReactNode }) {
    return <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-2">{children}</div>;
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
    return (
        <div className="border-2 border-black p-2">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">{k}</div>
            <div className={mono ? 'font-mono text-[11px] break-all' : 'text-xs'}>{v}</div>
        </div>
    );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
    return (
        <th className={`p-2 font-bold uppercase tracking-wide text-[10px] whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
            {children}
        </th>
    );
}
function Td({ children, right, mono }: { children: React.ReactNode; right?: boolean; mono?: boolean }) {
    return (
        <td className={[
            'p-2 align-top',
            right ? 'text-right' : '',
            mono ? 'font-mono tabular-nums' : '',
        ].join(' ')}>
            {children}
        </td>
    );
}
