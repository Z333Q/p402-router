'use client';

/**
 * Slice 3S — Control · Configuration form (client).
 *
 * Reads the current tenant defaults from GET /api/v2/control/configuration,
 * lets a tenant admin edit them, and PATCHes the change. Non-admin viewers
 * see the same form with inputs disabled.
 *
 * Validation is courtesy here; the authoritative validator lives in
 * lib/control/configuration.ts and runs on every PATCH.
 */

import { useEffect, useMemo, useState } from 'react';

type Settings = {
    monthly_budget_usd:         number | null;
    max_cost_per_request_usd:   number | null;
    human_review_threshold_usd: number | null;
    allowed_models:             string[];
    allowed_task_types:         string[];
    source: 'tenant_default' | 'system_default';
};

function emptySettings(): Settings {
    return {
        monthly_budget_usd: null,
        max_cost_per_request_usd: null,
        human_review_threshold_usd: null,
        allowed_models: [],
        allowed_task_types: [],
        source: 'system_default',
    };
}

function scalarToInputValue(n: number | null): string {
    return n === null ? '' : String(n);
}

function inputValueToScalar(s: string): number | null {
    const trimmed = s.trim();
    if (trimmed === '') return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return null;
    return n;
}

function arrayToInputValue(a: string[]): string {
    return a.join(', ');
}

function inputValueToArray(s: string): string[] {
    return s
        .split(',')
        .map((x) => x.trim())
        .filter((x) => x.length > 0);
}

export function ConfigurationForm() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving]   = useState(false);
    const [error, setError]     = useState<string | null>(null);
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [settings, setSettings] = useState<Settings>(emptySettings);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const r = await fetch('/api/v2/control/configuration', { cache: 'no-store' });
                if (!r.ok) throw new Error(`Failed to load (${r.status})`);
                const body = await r.json();
                if (cancelled) return;
                setSettings({ ...emptySettings(), ...body.settings });
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const sourceLabel = useMemo(() => {
        return settings.source === 'tenant_default'
            ? 'Currently saved tenant default'
            : 'No tenant default saved yet (system default shown)';
    }, [settings.source]);

    async function onSave(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSavedAt(null);
        setSaving(true);
        try {
            const patch = {
                monthly_budget_usd:         settings.monthly_budget_usd,
                max_cost_per_request_usd:   settings.max_cost_per_request_usd,
                human_review_threshold_usd: settings.human_review_threshold_usd,
                allowed_models:             settings.allowed_models,
                allowed_task_types:         settings.allowed_task_types,
            };
            const r = await fetch('/api/v2/control/configuration', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(patch),
            });
            const body = await r.json();
            if (!r.ok) {
                throw new Error(body.error?.message ?? body.error ?? `Save failed (${r.status})`);
            }
            setSettings({ ...emptySettings(), ...body.settings });
            setSavedAt(new Date().toISOString());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="border-2 border-black p-5 bg-white animate-pulse space-y-3">
                <div className="h-3 w-48 bg-neutral-200" />
                <div className="h-10 w-full bg-neutral-100" />
                <div className="h-10 w-full bg-neutral-100" />
                <div className="h-10 w-full bg-neutral-100" />
            </div>
        );
    }

    return (
        <form onSubmit={onSave} className="space-y-6">
            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                {sourceLabel}
            </div>

            <Field
                label="Monthly budget (USD)"
                help="Soft cap for tenant-level spend. Empty = no tenant default set."
                id="monthly_budget_usd"
            >
                <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    id="monthly_budget_usd"
                    className="w-full h-11 px-3 border-2 border-black font-mono text-sm"
                    value={scalarToInputValue(settings.monthly_budget_usd)}
                    onChange={(e) => setSettings((s) => ({ ...s, monthly_budget_usd: inputValueToScalar(e.target.value) }))}
                    disabled={saving}
                />
            </Field>

            <Field
                label="Max cost per request (USD)"
                help="Per-request ceiling. Empty = no tenant default set."
                id="max_cost_per_request_usd"
            >
                <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.0001"
                    id="max_cost_per_request_usd"
                    className="w-full h-11 px-3 border-2 border-black font-mono text-sm"
                    value={scalarToInputValue(settings.max_cost_per_request_usd)}
                    onChange={(e) => setSettings((s) => ({ ...s, max_cost_per_request_usd: inputValueToScalar(e.target.value) }))}
                    disabled={saving}
                />
            </Field>

            <Field
                label="Human-review threshold (USD)"
                help="Requests above this cost would be flagged for human review. Empty = no tenant default set."
                id="human_review_threshold_usd"
            >
                <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    id="human_review_threshold_usd"
                    className="w-full h-11 px-3 border-2 border-black font-mono text-sm"
                    value={scalarToInputValue(settings.human_review_threshold_usd)}
                    onChange={(e) => setSettings((s) => ({ ...s, human_review_threshold_usd: inputValueToScalar(e.target.value) }))}
                    disabled={saving}
                />
            </Field>

            <Field
                label="Allowed models"
                help="Comma-separated. Empty = no allowlist; all models allowed by this rung."
                id="allowed_models"
            >
                <input
                    type="text"
                    id="allowed_models"
                    className="w-full h-11 px-3 border-2 border-black font-mono text-sm"
                    placeholder="gpt-4o-mini, claude-haiku, ..."
                    value={arrayToInputValue(settings.allowed_models)}
                    onChange={(e) => setSettings((s) => ({ ...s, allowed_models: inputValueToArray(e.target.value) }))}
                    disabled={saving}
                />
            </Field>

            <Field
                label="Allowed task types"
                help="Comma-separated. Empty = no allowlist; all task types allowed by this rung."
                id="allowed_task_types"
            >
                <input
                    type="text"
                    id="allowed_task_types"
                    className="w-full h-11 px-3 border-2 border-black font-mono text-sm"
                    placeholder="summarize, classify, ..."
                    value={arrayToInputValue(settings.allowed_task_types)}
                    onChange={(e) => setSettings((s) => ({ ...s, allowed_task_types: inputValueToArray(e.target.value) }))}
                    disabled={saving}
                />
            </Field>

            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center h-11 px-6 bg-primary border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors disabled:opacity-60"
                >
                    {saving ? 'Saving…' : 'Save tenant defaults'}
                </button>
                {savedAt && (
                    <span className="text-[11px] font-mono text-neutral-600">
                        Saved at {new Date(savedAt).toLocaleString()}
                    </span>
                )}
            </div>

            {error && (
                <div
                    role="alert"
                    className="border-2 border-red-700 bg-red-50 text-red-900 p-3 text-[13px] font-medium"
                >
                    {error}
                </div>
            )}
        </form>
    );
}

function Field({
    label,
    help,
    id,
    children,
}: {
    label: string;
    help: string;
    id: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="block text-[11px] font-black uppercase tracking-widest text-black">
                {label}
            </label>
            <p className="text-[11px] font-medium text-neutral-600 leading-relaxed">{help}</p>
            {children}
        </div>
    );
}
