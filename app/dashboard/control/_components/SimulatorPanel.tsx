'use client';
/**
 * Slice 3B — Simulator panel. Form + result. Calls
 * POST /api/v2/control/simulator. No mutations.
 *
 * Renders both `first_definitive_decision` (the canonical-order winner) and
 * `all_triggered_checks` so the operator can see every violation at once,
 * not just the first one.
 */

import React from 'react';

import { Badge, Button, Card, Input } from '../../_components/ui';

interface SimulatorCheckHit {
    code: string;
    status: 'approved' | 'denied' | 'warned' | 'requires_review';
    matched_rule: string;
    detail?: Record<string, unknown>;
    /** Slice 3W — provenance for the UI label. */
    source?: string;
    scope?: string;
    field?: string;
}

interface SimulatorDecision {
    first_definitive_decision: {
        code: string;
        status: 'approved' | 'denied' | 'warned' | 'requires_review';
        matched_rule: string;
        source?: string;
        scope?: string;
        field?: string;
    };
    all_triggered_checks: SimulatorCheckHit[];
    margin_floor_status: 'pass' | 'not_met' | 'not_evaluable' | 'not_requested';
    canonical_order: readonly string[];
}

interface SimulatorResponse {
    input: Record<string, unknown>;
    decision: SimulatorDecision;
    privacy_note: string;
}

interface FormState {
    api_key_id: string;
    model_requested: string;
    task_type: string;
    estimated_cost_usd: string;
    revenue_usd: string;
    margin_floor_pct: string;
    human_review_required: boolean;
    mandate_id: string;
    category: string;
}

const EMPTY: FormState = {
    api_key_id: '',
    model_requested: '',
    task_type: '',
    estimated_cost_usd: '',
    revenue_usd: '',
    margin_floor_pct: '',
    human_review_required: false,
    mandate_id: '',
    category: '',
};

function numOrUndef(s: string): number | undefined {
    if (s.length === 0) return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
}

function statusBadgeTone(status: SimulatorCheckHit['status']): 'default' | 'warning' | 'danger' | 'success' {
    if (status === 'approved') return 'success';
    if (status === 'denied') return 'danger';
    if (status === 'warned') return 'warning';
    return 'warning';
}

export function SimulatorPanel() {
    const [form, setForm] = React.useState<FormState>(EMPTY);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [result, setResult] = React.useState<SimulatorResponse | null>(null);

    const set = (k: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
            const body: Record<string, unknown> = {};
            if (form.api_key_id) body.api_key_id = form.api_key_id;
            if (form.model_requested) body.model_requested = form.model_requested;
            if (form.task_type) body.task_type = form.task_type;
            const cost = numOrUndef(form.estimated_cost_usd);
            if (cost !== undefined) body.estimated_cost_usd = cost;
            const revenue = numOrUndef(form.revenue_usd);
            if (revenue !== undefined) body.revenue_usd = revenue;
            const floor = numOrUndef(form.margin_floor_pct);
            if (floor !== undefined) body.margin_floor_pct = floor;
            if (form.human_review_required) body.human_review_required = true;
            if (form.mandate_id) body.mandate_id = form.mandate_id;
            if (form.category) body.category = form.category;

            const res = await fetch('/api/v2/control/simulator', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j?.error?.message ?? `Simulator failed (${res.status})`);
            }
            const j: SimulatorResponse = await res.json();
            setResult(j);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    };

    const reset = () => {
        setForm(EMPTY);
        setResult(null);
        setError(null);
    };

    return (
        <Card title="Policy simulator" body="Read-only. No policy changes, no events created.">
            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Input label="API key id"           value={form.api_key_id}        onChange={set('api_key_id')} />
                    <Input label="Mandate id"           value={form.mandate_id}        onChange={set('mandate_id')} />
                    <Input label="Category"             value={form.category}          onChange={set('category')} />
                    <Input label="Model requested"      value={form.model_requested}   onChange={set('model_requested')} />
                    <Input label="Task type"            value={form.task_type}         onChange={set('task_type')} />
                    <Input label="Estimated cost (USD)" value={form.estimated_cost_usd} onChange={set('estimated_cost_usd')} placeholder="0.0123" />
                    <Input label="Revenue (USD)"        value={form.revenue_usd}       onChange={set('revenue_usd')} placeholder="optional" />
                    <Input label="Margin floor (%)"     value={form.margin_floor_pct}  onChange={set('margin_floor_pct')} placeholder="0-100" />
                    <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider mt-6">
                        <input
                            type="checkbox"
                            checked={form.human_review_required}
                            onChange={(e) => setForm((f) => ({ ...f, human_review_required: e.target.checked }))}
                        />
                        Mark human review required
                    </label>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={reset}>Reset</Button>
                    <Button variant="primary" size="sm" onClick={submit} loading={busy}>Simulate</Button>
                </div>

                {error && (
                    <div className="border-2 border-black bg-red-50 p-3 text-sm font-mono">
                        {error}
                    </div>
                )}

                {result && (
                    <div className="space-y-4 border-t-2 border-black/10 pt-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge tone={statusBadgeTone(result.decision.first_definitive_decision.status)}>
                                    {result.decision.first_definitive_decision.status.replace('_', ' ')}
                                </Badge>
                                <span className="font-mono font-black text-lg">
                                    {result.decision.first_definitive_decision.code}
                                </span>
                                {result.decision.first_definitive_decision.source === 'tenant_default' && (
                                    <span
                                        data-testid="tenant-default-applied-chip"
                                        className="inline-flex items-center px-2 py-0.5 border-2 border-amber-700 bg-amber-50 text-amber-900 font-mono text-[10px] font-bold uppercase tracking-wider"
                                    >
                                        tenant default applied
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] font-mono text-neutral-600">
                                matched rule: {result.decision.first_definitive_decision.matched_rule}
                            </p>
                            <p className="text-[11px] font-mono text-neutral-500">
                                margin floor: {result.decision.margin_floor_status}
                            </p>
                        </div>

                        <div>
                            <p className="text-[11px] font-bold uppercase mb-2">
                                All triggered checks ({result.decision.all_triggered_checks.length})
                            </p>
                            {result.decision.all_triggered_checks.length === 0 ? (
                                <p className="text-sm font-mono text-neutral-500">
                                    No checks fired — approved.
                                </p>
                            ) : (
                                <table className="w-full text-sm font-mono">
                                    <thead>
                                        <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b-2 border-black">
                                            <th className="text-left py-2">Code</th>
                                            <th className="text-left py-2">Status</th>
                                            <th className="text-left py-2">Source</th>
                                            <th className="text-left py-2">Matched rule</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.decision.all_triggered_checks.map((h, i) => (
                                            <tr key={`${h.code}-${i}`} className="border-b border-neutral-100">
                                                <td className="py-2 font-bold text-black">{h.code}</td>
                                                <td className="py-2">
                                                    <Badge tone={statusBadgeTone(h.status)}>
                                                        {h.status.replace('_', ' ')}
                                                    </Badge>
                                                </td>
                                                <td className="py-2 text-neutral-600">
                                                    {h.source === 'tenant_default' ? (
                                                        <span
                                                            data-testid={`tenant-default-row-${i}`}
                                                            className="inline-flex items-center px-1.5 py-0.5 border border-amber-700 bg-amber-50 text-amber-900 text-[10px] font-bold uppercase tracking-wider"
                                                        >
                                                            tenant default
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                                                            {h.source ?? '—'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2 text-neutral-600">{h.matched_rule}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
