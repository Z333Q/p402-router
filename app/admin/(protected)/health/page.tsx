'use client';
import { useEffect, useState } from 'react';
import { AdminPageHeader, AdminCard, HealthPulse, AdminButton } from '../../_components/AdminUI';

type Facilitator = {
    facilitator_id: string;
    name: string;
    endpoint: string;
    type: string;
    health_status: string;
    p95_verify_ms: number;
    last_checked_at: string;
    tenant_name: string | null;
};

export default function HealthPage() {
    const [facilitators, setFacilitators] = useState<Facilitator[]>([]);
    const [loading, setLoading]           = useState(true);
    const [refreshing, setRefreshing]     = useState(false);

    async function load() {
        setLoading(true);
        const res = await fetch('/api/admin/health');
        if (res.ok) {
            const d = await res.json();
            setFacilitators(d.facilitators ?? []);
        }
        setLoading(false);
    }

    async function refresh() {
        setRefreshing(true);
        await fetch('/api/admin/refresh', { method: 'POST' });
        await load();
        setRefreshing(false);
    }

    useEffect(() => { load(); }, []);

    const healthy  = facilitators.filter(f => f.health_status === 'healthy').length;
    const degraded = facilitators.filter(f => f.health_status === 'degraded').length;
    const down     = facilitators.filter(f => f.health_status === 'down').length;

    return (
        <div>
            <AdminPageHeader
                title="Platform Health"
                subtitle="Real-time facilitator and system health"
                action={
                    <AdminButton onClick={refresh} disabled={refreshing} variant="secondary" size="sm">
                        {refreshing ? 'Refreshing…' : '↻ Force Refresh'}
                    </AdminButton>
                }
            />

            {/* Health summary */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                    { label: 'Healthy', count: healthy, status: 'healthy' as const, color: '#34D399' },
                    { label: 'Degraded', count: degraded, status: 'degraded' as const, color: '#FBBF24' },
                    { label: 'Down', count: down, status: 'down' as const, color: '#FF3B30' },
                ].map(item => (
                    <div key={item.label} className="border-2 border-neutral-800 bg-[#111111] p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <HealthPulse status={item.status} />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: item.color }}>
                                {item.label}
                            </span>
                        </div>
                        <span className="text-3xl font-black" style={{ color: item.color }}>{item.count}</span>
                    </div>
                ))}
            </div>

            {/* Facilitators table */}
            <AdminCard title="Facilitator Health">
                {loading ? (
                    <div className="space-y-3">
                        {[1,2,3].map(i => <div key={i} className="h-12 bg-neutral-800 animate-pulse" />)}
                    </div>
                ) : (
                    <div className="overflow-x-auto -m-5">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b-2 border-neutral-800">
                                    {['Facilitator', 'Type', 'Tenant', 'Health', 'P95 Latency', 'Last Check'].map(h => (
                                        <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-500">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {facilitators.map(f => (
                                    <tr key={f.facilitator_id} className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="text-sm font-bold text-white">{f.name}</div>
                                            <div className="text-[10px] font-mono text-neutral-600 truncate max-w-[200px]">{f.endpoint}</div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-[9px] font-black uppercase tracking-widest border border-neutral-700 text-neutral-400 px-2 py-0.5">
                                                {f.type}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-neutral-400 font-mono">
                                            {f.tenant_name ?? 'Global'}
                                        </td>
                                        <td className="px-5 py-3">
                                            <HealthPulse
                                                status={(f.health_status as 'healthy' | 'degraded' | 'down' | 'unknown') ?? 'unknown'}
                                                label={f.health_status ?? 'unknown'}
                                            />
                                        </td>
                                        <td className="px-5 py-3 font-mono text-xs text-neutral-300">
                                            {f.p95_verify_ms > 0 ? `${f.p95_verify_ms}ms` : '—'}
                                        </td>
                                        <td className="px-5 py-3 font-mono text-[10px] text-neutral-500">
                                            {f.last_checked_at ? new Date(f.last_checked_at).toLocaleString() : 'Never'}
                                        </td>
                                    </tr>
                                ))}
                                {!facilitators.length && (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-12 text-center text-xs text-neutral-600 font-mono">
                                            No facilitators registered
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </AdminCard>
        </div>
    );
}
