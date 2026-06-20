'use client';
import { useCallback, useEffect, useState } from 'react';
import { AdminCard, AdminPageHeader, AdminButton } from '../../_components/AdminUI';

type Candidate = {
    candidate_id: string;
    type: string;
    tenant_id: string;
    slice: { tenant_id: string; workflow_id?: string; model_id?: string };
    evidence_snapshot: {
        event_id_range: { count: number };
        outcome_id_range: { count: number };
        shadow_decision_id_range: { count: number };
        window: { start: string; end: string; days: number };
    };
    gate_results: { name: string; value: number | string | boolean | null; threshold: number | string | boolean | null; passed: boolean }[];
    confidence_score: number;
    status: string;
    created_at: string;
};

type ApiResponse = {
    mode: 'fixture' | 'production';
    tenant: string | null;
    window: { start: string; end: string; days: number };
    loaded: { events: number; outcomes: number; shadow_decisions: number; allowlist: number };
    total: number;
    by_type: Record<string, number>;
    candidates: Candidate[];
};

const DISCLAIMER = 'Internal candidate review only. These are not recommendations. Nothing is applied. No savings are claimed.';
const STATUS_LABEL = 'internal_candidate' as const;

export default function InternalOptimizeCandidatesPage() {
    const [mode, setMode] = useState<'fixture' | 'production'>('fixture');
    const [tenant, setTenant] = useState('');
    const [windowDays, setWindowDays] = useState('14');
    const [data, setData] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        setData(null);
        try {
            const qs = new URLSearchParams({ mode, window_days: windowDays });
            if (mode === 'production' && tenant) qs.set('tenant', tenant);
            const res = await fetch(`/api/admin/optimize/candidates?${qs.toString()}`);
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `HTTP ${res.status}`);
            }
            setData(await res.json());
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [mode, tenant, windowDays]);

    useEffect(() => {
        if (mode === 'fixture') void load();
    }, [load, mode]);

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Internal Optimize Candidates"
                subtitle="Phase 1 — internal review only. No tenant exposure."
            />

            <div className="border-2 border-[#FF9500] bg-[#FF9500]/10 p-4 text-xs font-mono text-[#FF9500] uppercase tracking-wide">
                {DISCLAIMER} Every row is rendered with status={STATUS_LABEL}.
            </div>

            <AdminCard title="Inputs">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <label className="flex flex-col gap-1 text-xs font-mono uppercase text-neutral-400">
                        Mode
                        <select
                            value={mode}
                            onChange={(e) => setMode(e.target.value as 'fixture' | 'production')}
                            className="bg-black border-2 border-neutral-800 p-2 text-white font-mono"
                        >
                            <option value="fixture">Fixture demo</option>
                            <option value="production">Production (read-only)</option>
                        </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-mono uppercase text-neutral-400">
                        Tenant UUID (production only)
                        <input
                            value={tenant}
                            onChange={(e) => setTenant(e.target.value)}
                            placeholder="00000000-0000-0000-0000-000000000000"
                            className="bg-black border-2 border-neutral-800 p-2 text-white font-mono"
                            disabled={mode !== 'production'}
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-mono uppercase text-neutral-400">
                        Window days
                        <input
                            value={windowDays}
                            onChange={(e) => setWindowDays(e.target.value.replace(/[^0-9]/g, ''))}
                            className="bg-black border-2 border-neutral-800 p-2 text-white font-mono"
                        />
                    </label>
                    <AdminButton onClick={() => void load()} disabled={loading}>
                        {loading ? 'Loading…' : 'Run'}
                    </AdminButton>
                </div>
            </AdminCard>

            {error && (
                <div className="border-2 border-[#FF3B30] bg-[#FF3B30]/10 p-4 font-mono text-sm text-[#FF3B30]">{error}</div>
            )}

            {data && (
                <>
                    <AdminCard title={`Summary — ${data.mode}`}>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 font-mono text-sm">
                            <Metric label="Total" value={String(data.total)} />
                            <Metric label="Events" value={String(data.loaded.events)} />
                            <Metric label="Outcomes" value={String(data.loaded.outcomes)} />
                            <Metric label="Shadow" value={String(data.loaded.shadow_decisions)} />
                            <Metric label="Allowlist" value={String(data.loaded.allowlist)} />
                            <Metric label="Window days" value={String(data.window.days)} />
                        </div>
                        {Object.keys(data.by_type).length > 0 && (
                            <div className="mt-4 font-mono text-xs text-neutral-400">
                                By type:&nbsp;
                                {Object.entries(data.by_type).map(([k, v]) => (
                                    <span key={k} className="mr-3"><span className="text-white">{k}</span>={v}</span>
                                ))}
                            </div>
                        )}
                    </AdminCard>

                    {data.total === 0 ? (
                        <AdminCard title="No candidates">
                            <p className="font-mono text-sm text-neutral-400">
                                No internal candidates generated for this tenant/window. This usually means data is too thin or gates rejected noisy suggestions.
                            </p>
                        </AdminCard>
                    ) : (
                        <div className="space-y-4">
                            {data.candidates.map((c) => <CandidateRow key={c.candidate_id} c={c} />)}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
            <div className="text-2xl font-black text-white">{value}</div>
        </div>
    );
}

function CandidateRow({ c }: { c: Candidate }) {
    const sliceLabel = [c.slice.workflow_id ? `workflow=${c.slice.workflow_id}` : null, c.slice.model_id ? `model=${c.slice.model_id}` : null]
        .filter(Boolean)
        .join(' · ');
    return (
        <AdminCard title={`${c.type}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm">
                <div className="space-y-1">
                    <div><span className="text-neutral-500">candidate_id:</span> {c.candidate_id}</div>
                    <div><span className="text-neutral-500">tenant_id:</span> {c.tenant_id}</div>
                    <div><span className="text-neutral-500">slice:</span> {sliceLabel || '(tenant)'}</div>
                    <div><span className="text-neutral-500">status:</span> <span className="text-[#FF9500]">{c.status}</span></div>
                    <div><span className="text-neutral-500">created_at:</span> {c.created_at}</div>
                </div>
                <div className="space-y-1">
                    <div><span className="text-neutral-500">confidence:</span> {c.confidence_score.toFixed(3)}</div>
                    <div><span className="text-neutral-500">events:</span> {c.evidence_snapshot.event_id_range.count}</div>
                    <div><span className="text-neutral-500">outcomes:</span> {c.evidence_snapshot.outcome_id_range.count}</div>
                    <div><span className="text-neutral-500">shadow:</span> {c.evidence_snapshot.shadow_decision_id_range.count}</div>
                    <div><span className="text-neutral-500">window:</span> {c.evidence_snapshot.window.days}d</div>
                </div>
            </div>
            <div className="mt-3 pt-3 border-t-2 border-neutral-800">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Gates</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 font-mono text-xs">
                    {c.gate_results.map((g) => (
                        <div key={g.name} className="flex justify-between border border-neutral-900 px-2 py-1">
                            <span className={g.passed ? 'text-[#34D399]' : 'text-[#FF3B30]'}>
                                {g.passed ? 'pass' : 'fail'}
                            </span>
                            <span className="text-neutral-300">{g.name}</span>
                            <span className="text-neutral-500">{String(g.value)} / {String(g.threshold)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </AdminCard>
    );
}
