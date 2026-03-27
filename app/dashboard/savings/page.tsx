'use client'
/**
 * Savings — Cost Reduction Analytics
 * Top-1% neo-brutalist savings dashboard.
 */
import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, MetricBox, ErrorState, Select, ProgressBar } from '../_components/ui'

interface TimePoint { day: string; requests: number; actual_usd: number; baseline_usd: number; savings_usd: number }
interface ModeRow    { mode: string; requests: number; actual_usd: number; baseline_usd: number; savings_usd: number }
interface ProviderRow { provider: string; requests: number; actual_usd: number }
interface SavingsResponse {
    period: string
    totals: {
        request_count: number
        total_actual_usd: number
        total_baseline_usd: number
        total_savings_usd: number
        savings_pct: number
        avg_savings_per_request: number
        cached_count: number
    }
    time_series: TimePoint[]
    by_mode: ModeRow[]
    by_provider: ProviderRow[]
}

export default function SavingsPage() {
    const [period, setPeriod] = useState('30d')

    const { data, isLoading, isFetching, error, refetch } = useQuery<SavingsResponse>({
        queryKey: ['savings', period],
        queryFn: async () => {
            const res = await fetch(`/api/v1/savings?period=${period}`)
            if (!res.ok) throw new Error('Failed to load savings')
            return res.json()
        },
    })

    const t = data?.totals
    const maxDaySavings = data ? Math.max(...data.time_series.map(d => d.savings_usd), 0.0001) : 1

    return (
        <div className="space-y-8 max-w-[1200px] mx-auto">

            {/* Header */}
            <div className="flex flex-wrap justify-between items-end gap-4 border-b-2 border-black/5 pb-8">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Savings</h1>
                    <p className="text-neutral-500 font-medium">Actual cost vs. claude-sonnet-4-6 reference baseline.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select
                        value={period}
                        onChange={setPeriod}
                        options={[
                            { value: '7d',  label: 'Last 7 days' },
                            { value: '30d', label: 'Last 30 days' },
                            { value: '90d', label: 'Last 90 days' },
                        ]}
                        className="min-w-[140px]"
                    />
                    <Button onClick={() => refetch()} variant="secondary" size="sm" loading={isFetching}>Refresh</Button>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-24 bg-neutral-100 border-2 border-neutral-200 animate-pulse" />
                        ))}
                    </div>
                </div>
            ) : error ? (
                <ErrorState title="Failed to load savings" message={String(error)} />
            ) : !t ? null : t.request_count === 0 ? (
                <div className="border-2 border-black p-8 space-y-4">
                    <div className="space-y-2">
                        <div className="text-3xl">📊</div>
                        <h2 className="text-xl font-black uppercase tracking-tighter">No data yet</h2>
                        <p className="text-neutral-500 font-medium">
                            No completed requests in the last <span className="font-black text-black">{period}</span>. Savings appear after your first successful execution.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/dashboard/requests" className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-primary bg-primary px-3 py-1.5 hover:bg-black hover:text-white hover:border-black transition-colors">
                            View Requests →
                        </Link>
                        <Link href="/dashboard/intelligence" className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-black px-3 py-1.5 hover:bg-neutral-50 transition-colors">
                            Run a Task
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    {/* Hero strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {/* Hero card — total saved */}
                        <div className="col-span-2 sm:col-span-2 border-2 border-black bg-primary p-6 flex flex-col justify-between">
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/60">Total Saved ({period})</div>
                            <div>
                                <div className="text-5xl font-black tracking-tighter text-black mt-2">
                                    ${t.total_savings_usd.toFixed(t.total_savings_usd < 0.01 ? 6 : 4)}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-2xl font-black text-black/70">{t.savings_pct.toFixed(1)}%</span>
                                    <span className="text-[11px] font-bold text-black/50">below sonnet-4-6 baseline</span>
                                </div>
                            </div>
                        </div>
                        <MetricBox
                            label="Actual Spend"
                            value={`$${t.total_actual_usd.toFixed(4)}`}
                            subtext={`$${t.total_baseline_usd.toFixed(4)} baseline`}
                        />
                        <MetricBox
                            label="Requests"
                            value={t.request_count.toLocaleString()}
                            subtext={`${t.cached_count} cache hits`}
                        />
                    </div>

                    {/* Avg savings + cache rate */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card title="Average Savings per Request">
                            <div className="flex items-baseline gap-3 mt-1">
                                <span className="text-3xl font-black font-mono">${t.avg_savings_per_request.toFixed(6)}</span>
                                <span className="text-[10px] font-bold text-neutral-400 uppercase">per request</span>
                            </div>
                            <div className="mt-4">
                                <ProgressBar
                                    value={t.savings_pct}
                                    label="Savings rate"
                                    variant={t.savings_pct >= 50 ? 'success' : t.savings_pct >= 20 ? 'default' : 'warning'}
                                />
                            </div>
                        </Card>
                        <Card title="Cache Efficiency">
                            <div className="flex items-baseline gap-3 mt-1">
                                <span className="text-3xl font-black font-mono">
                                    {t.request_count > 0 ? ((t.cached_count / t.request_count) * 100).toFixed(1) : '0.0'}%
                                </span>
                                <span className="text-[10px] font-bold text-neutral-400 uppercase">cache hit rate</span>
                            </div>
                            <div className="mt-4">
                                <ProgressBar
                                    value={t.request_count > 0 ? (t.cached_count / t.request_count) * 100 : 0}
                                    label={`${t.cached_count} of ${t.request_count} requests`}
                                    variant="success"
                                />
                            </div>
                        </Card>
                    </div>

                    {/* By mode */}
                    {data.by_mode.length > 0 && (
                        <Card title="Breakdown by Mode" className="p-0 overflow-hidden">
                            <div className="divide-y divide-neutral-100">
                                {data.by_mode.map((m) => {
                                    const pct = m.baseline_usd > 0 ? (m.savings_usd / m.baseline_usd) * 100 : 0
                                    const barWidth = t.total_savings_usd > 0 ? (m.savings_usd / t.total_savings_usd) * 100 : 0
                                    return (
                                        <div key={m.mode} className="px-4 py-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 border-2 ${m.mode === 'planned' ? 'border-primary bg-primary/10 text-black' : 'border-neutral-200 text-neutral-500'}`}>
                                                    {m.mode}
                                                </span>
                                                <span className="text-[10px] font-mono text-neutral-500">{m.requests.toLocaleString()} requests</span>
                                                <span className="ml-auto font-black text-success text-sm font-mono">${m.savings_usd.toFixed(4)}</span>
                                                <span className="text-[9px] font-black text-success/70">{pct.toFixed(1)}% off</span>
                                            </div>
                                            <div className="h-2 bg-neutral-100 border border-neutral-200">
                                                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${barWidth}%` }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    )}

                    {/* Daily time series */}
                    {data.time_series.length > 0 && (
                        <Card title="Daily Savings" className="p-0 overflow-hidden">
                            {/* Mini chart */}
                            <div className="px-4 pt-4 pb-2 flex items-end gap-1 h-24 border-b border-neutral-100">
                                {[...data.time_series].map((d) => {
                                    const h = Math.max(4, (d.savings_usd / maxDaySavings) * 64)
                                    return (
                                        <div
                                            key={d.day}
                                            className="flex-1 bg-primary hover:bg-black transition-colors cursor-default group relative"
                                            style={{ height: h }}
                                            title={`${d.day}: $${d.savings_usd.toFixed(6)} saved`}
                                        />
                                    )
                                })}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-[11px] font-mono">
                                    <thead>
                                        <tr className="border-b border-neutral-100 bg-neutral-50">
                                            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-neutral-400 text-[9px]">Day</th>
                                            <th className="px-4 py-2 text-right font-black uppercase tracking-widest text-neutral-400 text-[9px]">Req</th>
                                            <th className="px-4 py-2 text-right font-black uppercase tracking-widest text-neutral-400 text-[9px]">Actual</th>
                                            <th className="px-4 py-2 text-right font-black uppercase tracking-widest text-neutral-400 text-[9px]">Baseline</th>
                                            <th className="px-4 py-2 text-right font-black uppercase tracking-widest text-neutral-400 text-[9px]">Saved</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-50">
                                        {[...data.time_series].reverse().map((d) => (
                                            <tr key={d.day} className="hover:bg-neutral-50">
                                                <td className="px-4 py-2 text-neutral-600 text-[10px]">{d.day}</td>
                                                <td className="px-4 py-2 text-right text-neutral-500">{d.requests}</td>
                                                <td className="px-4 py-2 text-right text-neutral-600">${d.actual_usd.toFixed(6)}</td>
                                                <td className="px-4 py-2 text-right text-neutral-400">${d.baseline_usd.toFixed(6)}</td>
                                                <td className="px-4 py-2 text-right font-black text-success">${d.savings_usd.toFixed(6)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {/* By provider */}
                    {data.by_provider.length > 0 && (
                        <Card title="Spend by Provider" className="p-0 overflow-hidden">
                            <div className="divide-y divide-neutral-100">
                                {data.by_provider.map((p, i) => {
                                    const maxSpend = Math.max(...data.by_provider.map(x => x.actual_usd), 0.0001)
                                    const barWidth = (p.actual_usd / maxSpend) * 100
                                    return (
                                        <div key={p.provider} className="px-4 py-3">
                                            <div className="flex items-center gap-3 mb-1.5">
                                                <span className="text-[10px] font-black text-black w-4">{i + 1}</span>
                                                <span className="font-mono font-black text-black text-[11px]">{p.provider}</span>
                                                <span className="ml-auto text-[10px] font-mono text-neutral-500">{p.requests} req</span>
                                                <span className="font-black text-[11px] font-mono text-neutral-800 w-24 text-right">${p.actual_usd.toFixed(6)}</span>
                                            </div>
                                            <div className="h-1 bg-neutral-100">
                                                <div className="h-full bg-neutral-800 transition-all duration-500" style={{ width: `${barWidth}%` }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    )}
                </>
            )}
        </div>
    )
}
