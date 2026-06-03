'use client';
/**
 * Tenant Privacy Settings — V5 §27.4
 *
 * Three panels:
 *   1. "What each mode means" reference card (top) — V5 §27.2 content
 *   2. Tenant default privacy form (PUT /api/v2/privacy/settings)
 *   3. Per-scope override list + add form (POST/DELETE /api/v2/privacy/scope-overrides)
 *
 * Saves are gated by requireTenantAdminAccess at the API layer; the UI
 * shows a tenant-admin-only badge but does not gate client-side (server
 * enforces).
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Card, Button, Select, Input, Badge,
    ErrorState, Alert, Skeleton,
} from '../../_components/ui';

// ─────────────────────────────────────────────────────────────────────────────
// Privacy mode reference (V5 §27.2)
// ─────────────────────────────────────────────────────────────────────────────
type Mode = 'metadata_only' | 'fingerprint_only' | 'redacted_trace' | 'private_gateway' | 'full_trace';

interface ModeDescriptor {
    label: string;
    short: string;
    receives: string[];
    stores: string[];
    never_stores: string[];
    optimization_enabled: string[];
    optimization_limited: string[];
    recommended: string;
}

const MODE_DESCRIPTORS: Record<Mode, ModeDescriptor> = {
    metadata_only: {
        label: 'Metadata only',
        short: 'P402 receives economic metadata only. Default. Recommended for enterprise.',
        receives: [
            'request_id, tenant_id, api_key_id',
            'owner / department / employee / customer / project / workflow IDs',
            'task_type, action_type, model, provider',
            'tokens, cost, latency, cache_hit',
            'budget_id, policy_id, governance decision, deny_code',
            'output_status, quality_score, evidence_bundle_id',
        ],
        stores: ['economic metadata listed above'],
        never_stores: [
            'prompt text', 'response text', 'files', 'documents',
            'chat history', 'PHI', 'PII', 'secrets', 'source code',
        ],
        optimization_enabled: [
            'model swap by action', 'route cost comparison', 'budget optimization',
            'department + employee efficiency', 'customer + feature margin',
            'provider consolidation', 'retry waste from metadata',
            'cost per accepted output',
        ],
        optimization_limited: [
            'no semantic cache (P402 cloud)',
            'no prompt-level optimization',
            'no context-bloat analysis',
            'no duplicate-work detection',
        ],
        recommended: 'CFOs, regulated teams, healthcare, finance, legal, privacy-sensitive SaaS',
    },
    fingerprint_only: {
        label: 'Fingerprint only',
        short: 'HMAC fingerprints for duplicate / repeat-work detection. Never raw content.',
        receives: [
            'everything in metadata_only',
            'HMAC prompt fingerprint',
            'HMAC response fingerprint',
            'optional document hash',
        ],
        stores: ['metadata + HMAC fingerprints (keyed by tenant secret, NOT plain SHA-256)'],
        never_stores: [
            'raw prompt or response content',
            'embeddings (would require explicit opt-in)',
        ],
        optimization_enabled: [
            '+ duplicate input detection',
            '+ repeat request detection',
            '+ same-document repeat detection',
            '+ cache opportunity estimates',
            '+ retry-loop confidence',
        ],
        optimization_limited: ['no context, retry, or prompt-structure analysis'],
        recommended: 'teams that want duplicate detection without exposing content',
    },
    redacted_trace: {
        label: 'Redacted trace',
        short: 'Redacted samples + trace summaries. Customer runs redaction first.',
        receives: [
            'metadata + fingerprints',
            'redacted prompt sample',
            'redacted response sample',
            'trace summary, tool-call summary, retrieval summary, policy summary',
        ],
        stores: ['everything above; tenant must enable store_prompts / store_responses'],
        never_stores: [
            'PII, PHI, secrets, API keys, emails, phones, addresses',
            'anything not passing customer redaction',
        ],
        optimization_enabled: [
            '+ context waste detection',
            '+ prompt compression',
            '+ tool-call waste',
            '+ workflow-specific templates',
            '+ retrieval tuning',
        ],
        optimization_limited: [],
        recommended: 'developers + enterprises that want deeper optimization with limited exposure',
    },
    private_gateway: {
        label: 'Private gateway',
        short: 'P402 gateway runs inside customer VPC. P402 cloud sees aggregates + evidence hashes only.',
        receives: ['aggregates, recommendation summaries, savings proofs, evidence hashes'],
        stores: ['inside the customer VPC under customer control'],
        never_stores: ['raw content leaves the customer cloud'],
        optimization_enabled: [
            '+ full semantic cache',
            '+ full prompt-level optimization',
            '+ private embeddings',
            '+ private trace review',
            '+ private policy simulation',
        ],
        optimization_limited: [],
        recommended: 'enterprise + regulated enterprise + high-value customers',
    },
    full_trace: {
        label: 'Full trace (opt-in)',
        short: 'Full prompt + response logging. Never the default. Explicit opt-in only.',
        receives: ['everything: prompt, response, tool calls, full trace, retrieval context'],
        stores: ['everything; retention is bounded, role-gated, audit-logged'],
        never_stores: ['must be deletable + exportable on demand'],
        optimization_enabled: [
            '+ deep prompt debugging',
            '+ response quality analysis',
            '+ advanced evals',
            '+ fine-grained model routing',
        ],
        optimization_limited: [],
        recommended: 'small developer teams that want maximum debugging — NEVER the default',
    },
};

const MODE_OPTIONS = (Object.keys(MODE_DESCRIPTORS) as Mode[]).map((value) => ({
    value, label: MODE_DESCRIPTORS[value].label,
}));

const SCOPE_OPTIONS = [
    { value: 'tenant',     label: 'Tenant (org-wide)' },
    { value: 'department', label: 'Department' },
    { value: 'employee',   label: 'Employee' },
    { value: 'workflow',   label: 'Workflow' },
    { value: 'project',    label: 'Project' },
    { value: 'agent',      label: 'Agent' },
    { value: 'customer',   label: 'Customer' },
    { value: 'feature',    label: 'Feature' },
    { value: 'api_key',    label: 'API Key' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Types from API
// ─────────────────────────────────────────────────────────────────────────────
interface TenantSettings {
    default_privacy_mode: Mode;
    store_prompts: boolean;
    store_responses: boolean;
    allow_fingerprints: boolean;
    allow_redacted_traces: boolean;
    retention_days: number;
    require_redaction: boolean;
    customer_managed_key: boolean;
    source: 'system_default' | 'tenant_default' | 'scope_override';
    metadata?: Record<string, unknown>;
    updated_at?: string;
}

interface ScopeOverride {
    id: string;
    scope: string;
    scope_id: string;
    privacy_mode: Mode;
    store_prompts: boolean | null;
    store_responses: boolean | null;
    retention_days: number | null;
    metadata?: Record<string, unknown>;
    updated_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function PrivacySettingsPage() {
    const qc = useQueryClient();

    const settingsQ = useQuery<{ ok: boolean; settings: TenantSettings }>({
        queryKey: ['privacy-settings'],
        queryFn: async () => {
            const r = await fetch('/api/v2/privacy/settings');
            if (!r.ok) throw new Error(`Failed to load tenant settings (${r.status})`);
            return r.json();
        },
    });

    const overridesQ = useQuery<{ ok: boolean; count: number; overrides: ScopeOverride[] }>({
        queryKey: ['privacy-scope-overrides'],
        queryFn: async () => {
            const r = await fetch('/api/v2/privacy/scope-overrides');
            if (!r.ok) throw new Error(`Failed to load scope overrides (${r.status})`);
            return r.json();
        },
    });

    const settings = settingsQ.data?.settings;

    // ─── Tenant-default save ────────────────────────────────────────────────
    const saveSettings = useMutation({
        mutationFn: async (body: Partial<TenantSettings>) => {
            const r = await fetch('/api/v2/privacy/settings', {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await r.json();
            if (!r.ok) throw new Error(json.error?.message || `save failed (${r.status})`);
            return json;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['privacy-settings'] }),
    });

    // ─── Scope override save / delete ───────────────────────────────────────
    const saveOverride = useMutation({
        mutationFn: async (body: { scope: string; scope_id: string; privacy_mode: Mode; store_prompts?: boolean; store_responses?: boolean; retention_days?: number }) => {
            const r = await fetch('/api/v2/privacy/scope-overrides', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await r.json();
            if (!r.ok) throw new Error(json.error?.message || `save failed (${r.status})`);
            return json;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['privacy-scope-overrides'] }),
    });

    const deleteOverride = useMutation({
        mutationFn: async (id: string) => {
            const r = await fetch(`/api/v2/privacy/scope-overrides/${id}`, { method: 'DELETE' });
            if (!r.ok) {
                const j = await r.json().catch(() => ({}));
                throw new Error(j.error?.message || `delete failed (${r.status})`);
            }
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['privacy-scope-overrides'] }),
    });

    return (
        <div className="space-y-8 max-w-[1100px] mx-auto">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-end gap-4 border-b-2 border-black/5 pb-6">
                <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                        Settings · Privacy
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter">
                        Privacy & data boundary
                    </h1>
                    <p className="text-[12px] font-mono text-neutral-600 max-w-[640px]">
                        P402 meters economics, not content. Choose what leaves your environment:
                        nothing, hashed fingerprints, redacted samples, private gateway aggregates,
                        or full traces. Saves require tenant-admin access.
                    </p>
                </div>
                <Badge tone="warning">Tenant admin only</Badge>
            </div>

            {/* What each mode means */}
            <Card title="What each mode means" body="P402 receives, stores, never stores, and which optimizations apply">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(Object.keys(MODE_DESCRIPTORS) as Mode[]).map((mode) => {
                        const m = MODE_DESCRIPTORS[mode];
                        return (
                            <div key={mode} className="border-2 border-black p-4 space-y-3 bg-white">
                                <div className="flex items-baseline justify-between gap-3">
                                    <h3 className="text-sm font-black uppercase tracking-wider">{m.label}</h3>
                                    <code className="text-[10px] text-neutral-500">{mode}</code>
                                </div>
                                <p className="text-[11px] text-neutral-700">{m.short}</p>
                                <Section label="Receives"     items={m.receives}     tone="default" />
                                <Section label="Stores"       items={m.stores}       tone="default" />
                                <Section label="Never stores" items={m.never_stores} tone="success" />
                                <Section label="Optimization enabled" items={m.optimization_enabled} tone="default" />
                                {m.optimization_limited.length > 0 && (
                                    <Section label="Optimization limited" items={m.optimization_limited} tone="warning" />
                                )}
                                <p className="text-[10px] text-neutral-500 pt-2 border-t border-neutral-100">
                                    <span className="font-black uppercase">Recommended for:</span> {m.recommended}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Tenant default form */}
            <Card title="Tenant default" body={settings?.source ? `Resolution source: ${settings.source}` : 'Default for every request unless a scope override applies'}>
                {settingsQ.isLoading ? <Skeleton className="h-40" /> :
                 settingsQ.error ? <ErrorState title="Could not load tenant settings" message={String(settingsQ.error)} /> :
                 !settings ? null :
                 <TenantSettingsForm
                    initial={settings}
                    saving={saveSettings.isPending}
                    error={saveSettings.error ? String(saveSettings.error) : null}
                    onSave={(body) => saveSettings.mutate(body)}
                 />
                }
            </Card>

            {/* Scope overrides */}
            <Card title="Scope overrides" body="Per-department / employee / workflow / customer privacy rules">
                <Alert variant="info" title="Widening is allowed here">
                    Scope overrides may widen the tenant default (e.g. tenant <code>metadata_only</code> with a workflow <code>full_trace</code>). Only tenant admins can save widening overrides; every save is audited.
                </Alert>
                {overridesQ.isLoading ? <Skeleton className="h-40" /> :
                 overridesQ.error ? <ErrorState title="Could not load overrides" message={String(overridesQ.error)} /> :
                 <div className="mt-4 space-y-2">
                    {(overridesQ.data?.overrides ?? []).length === 0 ? (
                        <p className="text-[12px] text-neutral-500">
                            No overrides. Tenant default applies to every scope.
                        </p>
                    ) : (
                        <table className="w-full text-[12px] font-mono">
                            <thead>
                                <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b-2 border-black">
                                    <th className="text-left py-2">Scope</th>
                                    <th className="text-left py-2">ID</th>
                                    <th className="text-left py-2">Mode</th>
                                    <th className="text-right py-2">Retention</th>
                                    <th className="text-right py-2">Prompts</th>
                                    <th className="text-right py-2">Resp.</th>
                                    <th className="text-right py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {overridesQ.data!.overrides.map((o) => (
                                    <tr key={o.id} className="border-b border-neutral-100">
                                        <td className="py-2 font-bold text-black">{o.scope}</td>
                                        <td className="py-2 break-all">{o.scope_id}</td>
                                        <td className="py-2">{o.privacy_mode}</td>
                                        <td className="text-right py-2">{o.retention_days ?? 'inherit'}</td>
                                        <td className="text-right py-2">{o.store_prompts === null ? 'inherit' : o.store_prompts ? 'yes' : 'no'}</td>
                                        <td className="text-right py-2">{o.store_responses === null ? 'inherit' : o.store_responses ? 'yes' : 'no'}</td>
                                        <td className="text-right py-2">
                                            <button
                                                onClick={() => deleteOverride.mutate(o.id)}
                                                className="text-[9px] font-black uppercase tracking-widest border-2 border-black px-2 py-1 hover:bg-error hover:text-white hover:border-error transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                 </div>
                }

                <div className="mt-6 pt-6 border-t-2 border-black/5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-3">Add or update an override</h4>
                    <AddOverrideForm
                        saving={saveOverride.isPending}
                        error={saveOverride.error ? String(saveOverride.error) : null}
                        onSave={(body) => saveOverride.mutate(body)}
                    />
                </div>
            </Card>

            <p className="text-[10px] font-mono text-neutral-500 pt-2 border-t-2 border-black/5">
                <Link href="/dashboard/optimize" className="underline">Optimize</Link> · <Link href="/dashboard/audit" className="underline">Prove</Link> · <Link href="/dashboard/settings" className="underline">Settings</Link>
            </p>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────────────────────────────────────
function Section({ label, items, tone }: { label: string; items: string[]; tone: 'default' | 'success' | 'warning' }) {
    if (items.length === 0) return null;
    const dot = tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-neutral-400';
    return (
        <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">{label}</div>
            <ul className="space-y-1">
                {items.map((it, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-neutral-700">
                        <span className={`shrink-0 w-1 h-1 mt-1.5 ${dot}`} />
                        <span>{it}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function TenantSettingsForm({ initial, saving, error, onSave }: {
    initial: TenantSettings;
    saving: boolean;
    error: string | null;
    onSave: (body: Partial<TenantSettings>) => void;
}) {
    const [mode, setMode]      = useState<Mode>(initial.default_privacy_mode);
    const [storeP, setStoreP]  = useState<boolean>(initial.store_prompts);
    const [storeR, setStoreR]  = useState<boolean>(initial.store_responses);
    const [allowFp, setAllowFp] = useState<boolean>(initial.allow_fingerprints);
    const [allowRT, setAllowRT] = useState<boolean>(initial.allow_redacted_traces);
    const [retention, setRetention] = useState<string>(String(initial.retention_days));
    const [requireR, setRequireR]   = useState<boolean>(initial.require_redaction);

    return (
        <form
            className="space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                onSave({
                    default_privacy_mode: mode,
                    store_prompts: storeP,
                    store_responses: storeR,
                    allow_fingerprints: allowFp,
                    allow_redacted_traces: allowRT,
                    retention_days: parseInt(retention, 10) || 30,
                    require_redaction: requireR,
                });
            }}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select label="Default mode" value={mode} options={MODE_OPTIONS} onChange={(v) => setMode(v as Mode)} />
                <Input label="Retention (days, 1–3650)" type="number" min={1} max={3650} value={retention} onChange={setRetention} />
                <div className="flex items-end gap-3 text-[11px] font-bold">
                    <CheckRow label="Store prompts"        on={storeP}   onChange={setStoreP} />
                </div>
                <CheckRow label="Store responses"            on={storeR}   onChange={setStoreR} />
                <CheckRow label="Allow fingerprints"         on={allowFp}  onChange={setAllowFp} />
                <CheckRow label="Allow redacted traces"      on={allowRT}  onChange={setAllowRT} />
                <CheckRow label="Require redaction (when traces enabled)" on={requireR} onChange={setRequireR} />
            </div>
            {error && <Alert variant="error" title="Save failed">{error}</Alert>}
            <div className="flex justify-end">
                <Button type="submit" loading={saving}>Save tenant defaults</Button>
            </div>
        </form>
    );
}

function AddOverrideForm({ saving, error, onSave }: {
    saving: boolean;
    error: string | null;
    onSave: (body: { scope: string; scope_id: string; privacy_mode: Mode; store_prompts?: boolean; store_responses?: boolean; retention_days?: number }) => void;
}) {
    const [scope, setScope]   = useState('department');
    const [scopeId, setScopeId] = useState('');
    const [mode, setMode]     = useState<Mode>('metadata_only');
    const [retention, setRetention] = useState('');
    const [storeP, setStoreP] = useState<'inherit' | 'yes' | 'no'>('inherit');
    const [storeR, setStoreR] = useState<'inherit' | 'yes' | 'no'>('inherit');

    return (
        <form
            className="space-y-3"
            onSubmit={(e) => {
                e.preventDefault();
                if (!scopeId.trim()) return;
                onSave({
                    scope,
                    scope_id: scopeId.trim(),
                    privacy_mode: mode,
                    store_prompts:   storeP === 'inherit' ? undefined : storeP === 'yes',
                    store_responses: storeR === 'inherit' ? undefined : storeR === 'yes',
                    retention_days:  retention ? parseInt(retention, 10) : undefined,
                });
            }}
        >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Select label="Scope"   value={scope}   options={SCOPE_OPTIONS} onChange={setScope} />
                <Input  label="Scope ID" value={scopeId} onChange={setScopeId} placeholder="e.g. claims, emp_42, prior_auth_review" />
                <Select label="Privacy mode" value={mode} options={MODE_OPTIONS} onChange={(v) => setMode(v as Mode)} />
                <Input  label="Retention (days)" type="number" min={1} max={3650} value={retention} onChange={setRetention} placeholder="inherit" />
                <Select label="Store prompts" value={storeP} options={[{value:'inherit',label:'inherit'},{value:'yes',label:'yes'},{value:'no',label:'no'}]} onChange={(v) => setStoreP(v as any)} />
                <Select label="Store responses" value={storeR} options={[{value:'inherit',label:'inherit'},{value:'yes',label:'yes'},{value:'no',label:'no'}]} onChange={(v) => setStoreR(v as any)} />
            </div>
            {error && <Alert variant="error" title="Save failed">{error}</Alert>}
            <div className="flex justify-end">
                <Button type="submit" loading={saving} disabled={!scopeId.trim()}>Save override</Button>
            </div>
        </form>
    );
}

function CheckRow({ label, on, onChange }: { label: string; on: boolean; onChange: (b: boolean) => void }) {
    return (
        <label className="flex items-center gap-2 cursor-pointer">
            <input
                type="checkbox"
                checked={on}
                onChange={(e) => onChange(e.target.checked)}
                className="w-4 h-4 border-2 border-black cursor-pointer"
            />
            <span className="text-[11px] font-bold text-neutral-700">{label}</span>
        </label>
    );
}
