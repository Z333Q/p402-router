'use client';
/**
 * Slice 3G — Prove semantic UI primitives.
 *
 * Color encodes meaning, never decoration. Every state pairs a tone with
 * a text label so the dashboard stays usable without color (accessibility
 * contract). Tones are mapped to the same neo-brutalist palette the rest
 * of the dashboard uses; we never reach for raw hex.
 *
 * Reusable across Prove, Monitor, and Control. Lives in
 * app/dashboard/_components/ so anything inside /dashboard can import it.
 */

import React from 'react';

// ─────────────────────────────────────────────────────────────────────────
// Tone vocabulary
// ─────────────────────────────────────────────────────────────────────────

export type SemanticTone =
    | 'green'      // healthy, complete, approved, evidence present
    | 'amber'     // warning, partial, needs review
    | 'red'       // denied, blocked, failed, critical missing
    | 'blue'      // neutral spend, informational, normal activity
    | 'purple'    // privacy posture
    | 'gray';     // unknown / no data / unattributed / n/a

export interface SemanticDescriptor {
    tone: SemanticTone;
    label: string;
    /** Short ASCII glyph so red/green states can be distinguished without color. */
    glyph: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Tone classes — Tailwind, no raw hex.
// Pairs of (text color, background tint, border). Dark-mode safe via
// neutral and CSS-var tokens already in use across the dashboard.
// ─────────────────────────────────────────────────────────────────────────

const TONE_CLASSES: Record<SemanticTone, { bg: string; text: string; border: string }> = {
    green:  { bg: 'bg-emerald-50',  text: 'text-emerald-900',  border: 'border-emerald-700'  },
    amber:  { bg: 'bg-amber-50',    text: 'text-amber-900',    border: 'border-amber-700'    },
    red:    { bg: 'bg-rose-50',     text: 'text-rose-900',     border: 'border-rose-700'     },
    blue:   { bg: 'bg-sky-50',      text: 'text-sky-900',      border: 'border-sky-700'      },
    purple: { bg: 'bg-violet-50',   text: 'text-violet-900',   border: 'border-violet-700'   },
    gray:   { bg: 'bg-neutral-100', text: 'text-neutral-700',  border: 'border-neutral-500'  },
};

// ─────────────────────────────────────────────────────────────────────────
// Tone helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Governance decision -> tone.
 *   approved        -> green
 *   denied          -> red
 *   warned          -> amber
 *   requires_review -> amber
 *   null/unknown    -> gray
 *   anything else   -> blue (informational, not a control outcome)
 */
export function getGovernanceTone(value: string | null | undefined): SemanticDescriptor {
    switch (value) {
        case 'approved':         return { tone: 'green', label: 'approved',         glyph: '✓' };
        case 'denied':           return { tone: 'red',   label: 'denied',           glyph: '✕' };
        case 'warned':           return { tone: 'amber', label: 'warned',           glyph: '!' };
        case 'requires_review':  return { tone: 'amber', label: 'requires_review',  glyph: '?' };
        case null: case undefined: case '':
            return { tone: 'gray', label: 'unknown', glyph: '·' };
        default:
            return { tone: 'blue', label: String(value), glyph: '•' };
    }
}

/**
 * Evidence presence -> tone.
 */
export type EvidenceState = 'present' | 'missing' | 'failed' | 'not_applicable';
export function getEvidenceTone(state: EvidenceState | null | undefined): SemanticDescriptor {
    switch (state) {
        case 'present':         return { tone: 'green', label: 'evidence',          glyph: '✓' };
        case 'missing':         return { tone: 'amber', label: 'missing evidence',  glyph: '?' };
        case 'failed':          return { tone: 'red',   label: 'evidence failed',   glyph: '✕' };
        case 'not_applicable':  return { tone: 'gray',  label: 'n/a',                glyph: '·' };
        default:                return { tone: 'gray',  label: 'unknown',            glyph: '·' };
    }
}

/**
 * Privacy mode -> tone. All privacy states are in the purple family so
 * the operator can scan a row and know "this is a privacy field", with
 * the tone modulating risk.
 */
export function getPrivacyTone(value: string | null | undefined): SemanticDescriptor {
    switch (value) {
        case 'metadata_only':    return { tone: 'purple', label: 'metadata_only',    glyph: 'P' };
        case 'fingerprint_only': return { tone: 'blue',   label: 'fingerprint_only', glyph: 'P' };
        case 'redacted_trace':   return { tone: 'amber',  label: 'redacted_trace',   glyph: 'P' };
        case 'full_trace':       return { tone: 'red',    label: 'full_trace',       glyph: 'P' };
        case 'private_gateway':  return { tone: 'green',  label: 'private_gateway',  glyph: 'P' };
        default:                 return { tone: 'gray',   label: 'unknown',           glyph: '·' };
    }
}

/**
 * Attribution -> tone. The "Where did this spend come from" question.
 */
export type AttributionState = 'attributed' | 'partial' | 'unattributed' | 'not_applicable';
export function getAttributionTone(state: AttributionState | null | undefined): SemanticDescriptor {
    switch (state) {
        case 'attributed':     return { tone: 'green', label: 'attributed',          glyph: '✓' };
        case 'partial':        return { tone: 'amber', label: 'partial attribution', glyph: '~' };
        case 'unattributed':   return { tone: 'red',   label: 'unattributed',        glyph: '✕' };
        case 'not_applicable': return { tone: 'gray',  label: 'n/a',                  glyph: '·' };
        default:               return { tone: 'gray',  label: 'unknown',              glyph: '·' };
    }
}

/**
 * Spend risk band derived from a cost vs a soft threshold. Dashboard
 * decides the threshold; this helper exists so the same shape is reused
 * across panels.
 */
export type SpendRisk = 'normal' | 'high' | 'budget_risk' | 'zero_cost';
export function getSpendRiskTone(state: SpendRisk): SemanticDescriptor {
    switch (state) {
        case 'normal':       return { tone: 'blue',  label: 'normal spend',  glyph: '$' };
        case 'high':         return { tone: 'amber', label: 'high spend',    glyph: '$$' };
        case 'budget_risk':  return { tone: 'red',   label: 'budget risk',   glyph: '!' };
        case 'zero_cost':    return { tone: 'gray',  label: '$0 (denied)',   glyph: '·' };
    }
}

/**
 * Map a numeric HTTP status code into a tone family.
 */
export function getStatusCodeTone(code: number | null | undefined): SemanticDescriptor {
    if (code == null) return { tone: 'gray', label: 'unknown', glyph: '·' };
    if (code >= 200 && code < 300) return { tone: 'green', label: String(code), glyph: '✓' };
    if (code >= 400 && code < 500) return { tone: 'red',   label: String(code), glyph: '✕' };
    if (code >= 500)               return { tone: 'red',   label: String(code), glyph: '✕' };
    return { tone: 'blue', label: String(code), glyph: '•' };
}

// ─────────────────────────────────────────────────────────────────────────
// SemanticBadge — base building block
// ─────────────────────────────────────────────────────────────────────────

interface SemanticBadgeProps {
    descriptor: SemanticDescriptor;
    title?: string;
    className?: string;
}

export function SemanticBadge({ descriptor, title, className = '' }: SemanticBadgeProps) {
    const cls = TONE_CLASSES[descriptor.tone];
    return (
        <span
            title={title ?? descriptor.label}
            className={[
                'inline-flex items-center gap-1 px-2 py-0.5 border-2 font-mono text-[10px] font-bold uppercase tracking-wide',
                cls.bg, cls.text, cls.border, className,
            ].join(' ')}
        >
            <span aria-hidden="true">{descriptor.glyph}</span>
            <span>{descriptor.label}</span>
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Specialized badges — thin wrappers so callers stay tidy
// ─────────────────────────────────────────────────────────────────────────

export function GovernanceBadge({ value }: { value: string | null | undefined }) {
    return <SemanticBadge descriptor={getGovernanceTone(value)} />;
}
export function EvidenceBadge({ state }: { state: EvidenceState | null | undefined }) {
    return <SemanticBadge descriptor={getEvidenceTone(state)} />;
}
export function PrivacyBadge({ value }: { value: string | null | undefined }) {
    return <SemanticBadge descriptor={getPrivacyTone(value)} />;
}
export function AttributionBadge({ state }: { state: AttributionState | null | undefined }) {
    return <SemanticBadge descriptor={getAttributionTone(state)} />;
}
export function SpendRiskBadge({ state }: { state: SpendRisk }) {
    return <SemanticBadge descriptor={getSpendRiskTone(state)} />;
}
export function StatusCodeBadge({ code }: { code: number | null | undefined }) {
    return <SemanticBadge descriptor={getStatusCodeTone(code)} />;
}

// ─────────────────────────────────────────────────────────────────────────
// MetricCard — a non-technical KPI tile with semantic tone + tooltip
// ─────────────────────────────────────────────────────────────────────────

interface MetricCardProps {
    label: string;
    value: string;
    /** Tone of the value (e.g. red for denied). */
    tone?: SemanticTone;
    /** Plain-language tooltip. */
    explain: string;
    /** Optional period-comparison delta string e.g. "+12.4% vs last 30 days". */
    delta?: string;
    deltaTone?: SemanticTone;
}

export function MetricCard({ label, value, tone = 'blue', explain, delta, deltaTone = 'gray' }: MetricCardProps) {
    const cls = TONE_CLASSES[tone];
    const dCls = TONE_CLASSES[deltaTone];
    return (
        <div
            className={`bg-white border-2 border-black p-4 flex flex-col gap-2`}
            title={explain}
        >
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                    {label}
                </span>
                {delta && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 border ${dCls.bg} ${dCls.text} ${dCls.border}`}>
                        {delta}
                    </span>
                )}
            </div>
            <span className={`text-2xl font-extrabold ${cls.text}`}>{value}</span>
            <span className="text-[10px] text-neutral-600 leading-snug">{explain}</span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// ColorLegend — must appear next to any chart that uses tones
// ─────────────────────────────────────────────────────────────────────────

interface ColorLegendProps {
    title?: string;
    items: Array<{ tone: SemanticTone; label: string }>;
}

export function ColorLegend({ title, items }: ColorLegendProps) {
    return (
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
            {title && <span className="text-neutral-500">{title}:</span>}
            {items.map((it) => {
                const cls = TONE_CLASSES[it.tone];
                return (
                    <span
                        key={`${it.tone}-${it.label}`}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 border ${cls.bg} ${cls.text} ${cls.border}`}
                    >
                        <span className={`inline-block w-2 h-2 ${cls.bg} ${cls.border} border`} />
                        {it.label}
                    </span>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// StackedBreakdownBar — accessible non-recharts mini chart
//
// Renders a horizontal bar split by governance decision tones. Each
// segment carries an accessible label and the tooltip discloses the
// raw counts.
// ─────────────────────────────────────────────────────────────────────────

export interface BreakdownSegment {
    tone: SemanticTone;
    label: string;
    value: number;
}

export function StackedBreakdownBar({ segments }: { segments: BreakdownSegment[] }) {
    const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
    if (total === 0) {
        return <div className="text-[10px] text-neutral-400 uppercase font-bold">no data</div>;
    }
    return (
        <div
            role="img"
            aria-label={segments.map((s) => `${s.label} ${s.value}`).join(', ')}
            className="flex w-full h-3 border-2 border-black overflow-hidden"
        >
            {segments.map((s) => {
                const pct = (Math.max(0, s.value) / total) * 100;
                if (pct === 0) return null;
                const cls = TONE_CLASSES[s.tone];
                return (
                    <span
                        key={s.label}
                        style={{ width: `${pct}%` }}
                        title={`${s.label}: ${s.value} (${pct.toFixed(1)}%)`}
                        className={`${cls.bg} border-r-2 border-black last:border-r-0`}
                    />
                );
            })}
        </div>
    );
}
