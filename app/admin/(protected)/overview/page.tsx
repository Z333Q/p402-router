'use client';
import { useEffect, useState } from 'react';
import { KPICard, GrowthChart, AdminCard, AdminPageHeader, HealthPulse, AdminButton } from '../../_components/AdminUI';

type OverviewData = {
    platform: { totalTenants: number; new7d: number; newToday: number; active7d: number; churnRisk: number; delta30d: number };
    financial: { volAllTime: number; vol30d: number; vol7d: number; successRate: number; settledCount: number };
    routing:   { requestsLast1h: number; cacheHitPct: number; p50Ms: number; p95Ms: number; p99Ms: number; totalRequests24h: number };
    safety:    { activeMandates: number; openIncidents: number; bannedTenants: number };
    agents:    { activeSessions: number; a2aTasksLast24h: number; paymentsLast24h: number; paymentVol24h: number };
    spark:     { tenantGrowth: { date: string; value: number }[] };
};

export default function OverviewPage() {
    const [data, setData]       = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    async function load() {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/admin/overview');
            if (!res.ok) throw new Error(await res.text());
            setData(await res.json());
            setLastRefresh(new Date());
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    if (error) {
        return (
            <div className="border-2 border-[#FF3B30] bg-[#FF3B30]/10 p-6 font-mono text-[#FF3B30] text-sm">
                {error}
            </div>
        );
    }

    const fmtUsdc  = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtMs    = (v: number) => v > 0 ? `${v}ms` : '—';

    return (
        <div>
            <AdminPageHeader
                title="Platform Overview"
                subtitle={lastRefresh ? `Last refreshed ${lastRefresh.toLocaleTimeString()}` : 'Loading…'}
                action={
                    <AdminButton onClick={load} disabled={loading} variant="secondary" size="sm">
                        {loading ? 'Refreshing…' : '↻ Refresh'}
                    </AdminButton>
                }
            />

            {/* ── Section 1: Platform Growth ──────────────────────────────── */}
            <div className="mb-8">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Platform Growth</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                        label="Total Tenants"
                        value={data?.platform.totalTenants.toLocaleString() ?? '—'}
                        delta={data?.platform.delta30d}
                        sublabel={`+${data?.platform.new7d ?? 0} this week`}
                        spark={data?.spark.tenantGrowth}
                        sparkColor="#22D3EE"
                        loading={loading}
                    />
                    <KPICard
                        label="New Today"
                        value={data?.platform.newToday.toString() ?? '—'}
                        sublabel="Signups in last 24h"
                        loading={loading}
                    />
                    <KPICard
                        label="Active (7d)"
                        value={data?.platform.active7d.toLocaleString() ?? '—'}
                        sublabel="Unique tenants with traffic"
                        loading={loading}
                    />
                    <KPICard
                        label="Churn Risk"
                        value={data?.platform.churnRisk.toString() ?? '—'}
                        sublabel="No activity in 30+ days"
                        sparkColor="#FF9500"
                        loading={loading}
                    />
                </div>
            </div>

            {/* ── Section 2: Financial Health ─────────────────────────────── */}
            <div className="mb-8">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Financial Health</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                        label="Volume — All Time"
                        value={data ? fmtUsdc(data.financial.volAllTime) : '—'}
                        sublabel="Total USDC settled"
                        loading={loading}
                    />
                    <KPICard
                        label="Volume — 30d"
                        value={data ? fmtUsdc(data.financial.vol30d) : '—'}
                        sublabel={data ? `7d: ${fmtUsdc(data.financial.vol7d)}` : ''}
                        sparkColor="#34D399"
                        loading={loading}
                    />
                    <KPICard
                        label="Settlement Rate"
                        value={data ? `${data.financial.successRate}%` : '—'}
                        sublabel={`${data?.financial.settledCount.toLocaleString() ?? 0} settled payments`}
                        loading={loading}
                    />
                    <KPICard
                        label="Payments (24h)"
                        value={data ? fmtUsdc(data.agents.paymentVol24h) : '—'}
                        sublabel={`${data?.agents.paymentsLast24h ?? 0} transactions`}
                        loading={loading}
                    />
                </div>
            </div>

            {/* ── Section 3: Routing Intelligence ────────────────────────── */}
            <div className="mb-8">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Routing Intelligence</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                        label="Requests / Hour"
                        value={data?.routing.requestsLast1h.toLocaleString() ?? '—'}
                        sublabel={`${data?.routing.totalRequests24h.toLocaleString() ?? 0} in 24h`}
                        loading={loading}
                    />
                    <KPICard
                        label="Cache Hit Rate"
                        value={data ? `${data.routing.cacheHitPct}%` : '—'}
                        sublabel="Semantic cache efficiency"
                        loading={loading}
                    />
                    <KPICard
                        label="Latency p50 / p95"
                        value={data ? `${fmtMs(data.routing.p50Ms)}` : '—'}
                        sublabel={data ? `p95: ${fmtMs(data.routing.p95Ms)} · p99: ${fmtMs(data.routing.p99Ms)}` : ''}
                        loading={loading}
                    />
                    <KPICard
                        label="Active Sessions"
                        value={data?.agents.activeSessions.toString() ?? '—'}
                        sublabel={`${data?.agents.a2aTasksLast24h ?? 0} A2A tasks (24h)`}
                        loading={loading}
                    />
                </div>
            </div>

            {/* ── Section 4: Trust & Safety summary ──────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                <AdminCard title="Trust & Safety">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-neutral-400 font-mono">Active Mandates</span>
                            <span className="text-sm font-black text-white">{data?.safety.activeMandates ?? '—'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-neutral-400 font-mono">Open Incidents</span>
                            <span className={`text-sm font-black ${(data?.safety.openIncidents ?? 0) > 0 ? 'text-[#FF9500]' : 'text-white'}`}>
                                {data?.safety.openIncidents ?? '—'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-neutral-400 font-mono">Banned Tenants</span>
                            <span className={`text-sm font-black ${(data?.safety.bannedTenants ?? 0) > 0 ? 'text-[#FF3B30]' : 'text-white'}`}>
                                {data?.safety.bannedTenants ?? '—'}
                            </span>
                        </div>
                    </div>
                </AdminCard>

                <AdminCard title="System Status" className="lg:col-span-2">
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'Routing Engine',   status: 'healthy' as const },
                            { label: 'Settlement Layer', status: 'healthy' as const },
                            { label: 'Intelligence (Gemini)', status: 'healthy' as const },
                            { label: 'Semantic Cache',   status: 'healthy' as const },
                        ].map(item => (
                            <div key={item.label} className="flex items-center gap-3">
                                <HealthPulse status={item.status} />
                                <span className="text-xs text-neutral-400 font-mono">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </AdminCard>
            </div>

            {/* ── Section 5: Tenant growth sparkline chart ────────────────── */}
            {data?.spark.tenantGrowth && data.spark.tenantGrowth.length > 0 && (
                <AdminCard title="New Tenant Signups — Last 14 Days">
                    <GrowthChart
                        data={data.spark.tenantGrowth}
                        series={[{ dataKey: 'value', label: 'New Tenants', type: 'bar', color: '#22D3EE' }]}
                        height={180}
                        formatY={v => String(v)}
                        formatTooltip={v => `${v} tenants`}
                    />
                </AdminCard>
            )}
        </div>
    );
}
