'use client';
import { useEffect, useState } from 'react';
import { GrowthChart, AdminCard, AdminPageHeader } from '../../_components/AdminUI';

type AnalyticsData = {
    days: number;
    timeSeries: Record<string, unknown>[];
    providers: { provider: string; requests: number; pct: number }[];
};

const PERIOD_OPTIONS = [
    { label: '7d',  value: '7' },
    { label: '30d', value: '30' },
    { label: '90d', value: '90' },
];

export default function AnalyticsPage() {
    const [data, setData]     = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays]     = useState('30');

    async function load(d: string) {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/analytics?days=${d}`);
            if (res.ok) setData(await res.json());
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(days); }, [days]);

    const fmtUsdc = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div>
            <AdminPageHeader
                title="Analytics"
                subtitle="Platform-wide routing, volume, and adoption trends"
                action={
                    <div className="flex border-2 border-neutral-700">
                        {PERIOD_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setDays(opt.value)}
                                className={`h-8 px-4 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                    days === opt.value
                                        ? 'bg-[#FF3B30] text-white'
                                        : 'text-neutral-500 hover:text-white'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                }
            />

            {/* USDC Volume */}
            <AdminCard title="USDC Settlement Volume" className="mb-6">
                <GrowthChart
                    data={data?.timeSeries ?? []}
                    series={[
                        { dataKey: 'usdcVolume', label: 'USDC Volume', type: 'area', color: '#34D399' },
                        { dataKey: 'paymentCount', label: 'Payments', type: 'bar', color: '#22D3EE' },
                    ]}
                    height={240}
                    loading={loading}
                    formatY={v => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`}
                    formatTooltip={(v: number, name: string) => name === 'USDC Volume' ? fmtUsdc(v) : `${v} payments`}
                />
            </AdminCard>

            {/* Routing Traffic + Cache */}
            <AdminCard title="Routing Traffic & Cache Performance" className="mb-6">
                <GrowthChart
                    data={data?.timeSeries ?? []}
                    series={[
                        { dataKey: 'requests',    label: 'Requests',      type: 'bar',  color: '#FF9500' },
                        { dataKey: 'cacheHitPct', label: 'Cache Hit %',   type: 'line', color: '#A78BFA' },
                    ]}
                    height={220}
                    loading={loading}
                    formatTooltip={(v: number, name: string) => name === 'Cache Hit %' ? `${v}%` : `${v} req`}
                />
            </AdminCard>

            {/* Latency + Active Tenants */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <AdminCard title="Routing Latency (p50 / p95)">
                    <GrowthChart
                        data={data?.timeSeries ?? []}
                        series={[
                            { dataKey: 'p50Ms', label: 'p50', type: 'line', color: '#22D3EE' },
                            { dataKey: 'p95Ms', label: 'p95', type: 'line', color: '#FF9500' },
                        ]}
                        height={180}
                        loading={loading}
                        formatY={v => `${v}ms`}
                        formatTooltip={v => `${v}ms`}
                    />
                </AdminCard>

                <AdminCard title="Daily Active Tenants">
                    <GrowthChart
                        data={data?.timeSeries ?? []}
                        series={[
                            { dataKey: 'activeTenants', label: 'Active Tenants', type: 'area', color: '#F472B6' },
                        ]}
                        height={180}
                        loading={loading}
                        formatTooltip={v => `${v} tenants`}
                    />
                </AdminCard>
            </div>

            {/* Provider distribution table */}
            {data?.providers && data.providers.length > 0 && (
                <AdminCard title={`Provider Distribution — last ${days} days`}>
                    <div className="space-y-2">
                        {data.providers.map(p => (
                            <div key={p.provider} className="flex items-center gap-4">
                                <span className="text-xs font-mono text-neutral-300 w-32 shrink-0 truncate">{p.provider}</span>
                                <div className="flex-1 h-5 bg-neutral-800 relative">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-[#22D3EE]/40 border-r-2 border-[#22D3EE]"
                                        style={{ width: `${p.pct}%` }}
                                    />
                                </div>
                                <span className="text-xs font-black text-neutral-400 w-16 text-right font-mono">
                                    {p.pct}% <span className="text-neutral-600">({p.requests.toLocaleString()})</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </AdminCard>
            )}
        </div>
    );
}
