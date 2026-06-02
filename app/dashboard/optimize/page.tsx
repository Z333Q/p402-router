'use client';
/**
 * P402 Optimize — visible product surface (Slice 1).
 *
 * Read-only. Backed entirely by /api/v2/optimize/overview (traffic_events +
 * execute_requests). No optimization_recommendations table consumed; the
 * recommendation queue is an honest empty state ("Coming next: action-level
 * optimization") that links to where deeper optimization will live.
 *
 * Per V5 §10 + privacy-modes-core: "P402 meters economics, not content.
 * Optimization depth follows your privacy mode."
 */

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
    Card,
    MetricBox,
    Button,
    ErrorState,
    Badge,
    Skeleton,
    ProgressBar,
} from '../_components/ui';

interface ProviderSpend {
    provider: string;
    request_count: number;
    total_cost_usd: number;
    avg_cost_usd: number;
}

interface TaskSpend {
    task: string;
    request_count: number;
    total_cost_usd: number;
    avg_cost_usd: number;
}

interface OverviewResponse {
    period_days: number;
    actual_mtd_cost_usd: number;
    estimated_monthly_cost_usd: number;
    existing_savings_usd: number;
    existing_savings_pct: number;
    request_count_30d: number;
    by_provider: ProviderSpend[];
    by_task: TaskSpend[];
    top_expensive_tasks: TaskSpend[];
    open_recommendations: number;
    recommendations_state: 'coming_soon' | 'live';
    coming_soon_label: string;
    privacy_note: string;
}

function fmtUsd(n: number, digits = 2): string {
    if (!isFinite(n)) return '$0.00';
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export default function OptimizePage() {
    const { data, isLoading, isFetching, error, refetch } = useQuery<OverviewResponse>({
        queryKey: ['optimize-overview'],
        queryFn: async () => {
            const res = await fetch('/api/v2/optimize/overview');
            if (!res.ok) throw new Error(`Failed to load Optimize overview (${res.status})`);
            return res.json();
        },
    });

    return (
        <div className="space-y-8 max-w-[1200px] mx-auto">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex flex-wrap justify-between items-end gap-4 border-b-2 border-black/5 pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Optimize</h1>
                        <Badge variant="default">Preview</Badge>
                    </div>
                    <p className="text-neutral-600 font-medium max-w-[640px]">
                        P402 does not stop at metering. Optimize turns your spend data into
                        ongoing savings recommendations across models, routes, cache, retries,
                        context, and budgets.
                    </p>
                    <p className="text-[11px] font-mono text-neutral-500">
                        {data?.privacy_note ?? 'P402 meters economics, not content. Optimization depth follows your privacy mode.'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={() => refetch()} variant="secondary" size="sm" loading={isFetching}>
                        Refresh
                    </Button>
                </div>
            </div>

            {/* ── States ─────────────────────────────────────────────────────── */}
            {isLoading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
                    </div>
                    <Skeleton className="h-48" />
                </div>
            ) : error ? (
                <ErrorState title="Failed to load Optimize overview" message={String(error)} />
            ) : !data ? null : (
                <>
                    {/* ── KPI strip ─────────────────────────────────────────── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="col-span-2 sm:col-span-2 border-2 border-black bg-primary p-6 flex flex-col justify-between">
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/60">
                                Forecast Month-End
                            </div>
                            <div>
                                <div className="text-5xl font-black tracking-tighter text-black mt-2">
                                    {fmtUsd(data.estimated_monthly_cost_usd, 2)}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-sm font-black text-black/70 font-mono">
                                        {fmtUsd(data.actual_mtd_cost_usd, 2)} MTD
                                    </span>
                                    <span className="text-[11px] font-bold text-black/50">
                                        linear projection
                                    </span>
                                </div>
                            </div>
                        </div>
                        <MetricBox
                            label="Existing Savings (30d)"
                            value={fmtUsd(data.existing_savings_usd, 2)}
                            subtext={`${data.existing_savings_pct.toFixed(1)}% vs baseline`}
                        />
                        <MetricBox
                            label="Requests (30d)"
                            value={data.request_count_30d.toLocaleString()}
                            subtext={`${data.by_provider.length} providers`}
                        />
                    </div>

                    {/* ── Recommendation queue (honest empty state) ────────── */}
                    <Card title="Recommendation queue" body={data.coming_soon_label}>
                        <div className="space-y-4">
                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl font-black font-mono">
                                    {data.open_recommendations}
                                </span>
                                <span className="text-[10px] font-bold uppercase text-neutral-500">
                                    open recommendations
                                </span>
                            </div>
                            <p className="text-sm text-neutral-600 max-w-[600px]">
                                The recommendation engine ships next. It will detect model mismatch,
                                cache opportunities, retry waste, context bloat, and budget drift —
                                then propose changes with projected savings, quality risk, confidence,
                                and rollback rules.
                            </p>
                            <ul className="text-[12px] font-mono text-neutral-600 space-y-1 pl-4 border-l-2 border-neutral-200">
                                <li>Action-level baselines (cost per accepted output)</li>
                                <li>Model-swap recommendations per action_type</li>
                                <li>Cache opportunity detection from request fingerprints</li>
                                <li>Retry loop and context-bloat detection</li>
                                <li>Department / employee / agent efficiency profiles</li>
                                <li>Verified savings proofs after apply</li>
                            </ul>
                            <div className="flex flex-wrap gap-3 pt-2">
                                <Link href="/dashboard/optimize/savings-report" className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-primary bg-primary px-3 py-1.5 hover:bg-black hover:text-white hover:border-black transition-colors">
                                    View Savings Report →
                                </Link>
                                <Link href="/dashboard/traffic" className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-black px-3 py-1.5 hover:bg-neutral-50 transition-colors">
                                    Meter Activity
                                </Link>
                                <Link href="/dashboard/policies" className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-black px-3 py-1.5 hover:bg-neutral-50 transition-colors">
                                    Control (Budgets &amp; Policies)
                                </Link>
                                <Link href="/dashboard/audit" className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-black px-3 py-1.5 hover:bg-neutral-50 transition-colors">
                                    Prove (Evidence)
                                </Link>
                            </div>
                        </div>
                    </Card>

                    {/* ── Spend breakdowns ─────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card title="Spend by provider" body="last 30 days">
                            {data.by_provider.length === 0 ? (
                                <p className="text-sm text-neutral-500 py-4">No spend in the last 30 days yet.</p>
                            ) : (
                                <table className="w-full text-sm font-mono">
                                    <thead>
                                        <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b-2 border-black">
                                            <th className="text-left py-2">Provider</th>
                                            <th className="text-right py-2">Requests</th>
                                            <th className="text-right py-2">Total</th>
                                            <th className="text-right py-2">Avg</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.by_provider.map((p) => (
                                            <tr key={p.provider} className="border-b border-neutral-100">
                                                <td className="py-2 font-bold text-black">{p.provider}</td>
                                                <td className="text-right py-2">{p.request_count.toLocaleString()}</td>
                                                <td className="text-right py-2">{fmtUsd(p.total_cost_usd, 4)}</td>
                                                <td className="text-right py-2 text-neutral-500">{fmtUsd(p.avg_cost_usd, 6)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </Card>

                        <Card title="Top expensive tasks" body="last 30 days">
                            {data.top_expensive_tasks.length === 0 ? (
                                <p className="text-sm text-neutral-500 py-4">
                                    No tasks recorded. Once requests flow with <code className="text-[11px] bg-neutral-100 px-1">action_type</code> set, top-cost actions appear here.
                                </p>
                            ) : (
                                <table className="w-full text-sm font-mono">
                                    <thead>
                                        <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b-2 border-black">
                                            <th className="text-left py-2">Task</th>
                                            <th className="text-right py-2">Requests</th>
                                            <th className="text-right py-2">Total</th>
                                            <th className="text-right py-2">Cost/req</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.top_expensive_tasks.map((t) => (
                                            <tr key={t.task} className="border-b border-neutral-100">
                                                <td className="py-2 font-bold text-black">{t.task}</td>
                                                <td className="text-right py-2">{t.request_count.toLocaleString()}</td>
                                                <td className="text-right py-2">{fmtUsd(t.total_cost_usd, 4)}</td>
                                                <td className="text-right py-2 text-neutral-500">{fmtUsd(t.avg_cost_usd, 6)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </Card>
                    </div>

                    {/* ── Pricing add-on placeholder (no Stripe yet) ───────── */}
                    <Card title="Optimize add-ons" body="Coming soon">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                {
                                    name: 'Optimize Starter',
                                    price: '$499',
                                    period: '/month',
                                    bullets: [
                                        'Weekly optimization audits',
                                        'Model-swap recommendations',
                                        'Cache + retry waste alerts',
                                        'Projected monthly savings',
                                        'Manual approval workflow',
                                    ],
                                },
                                {
                                    name: 'Optimize Scale',
                                    price: '$1,499',
                                    period: '/month',
                                    bullets: [
                                        'Daily optimization recommendations',
                                        'Automated rec queue',
                                        'Route + cache rule proposals',
                                        'Rollback rules + savings attribution',
                                        'Slack / Teams alerts',
                                    ],
                                },
                                {
                                    name: 'Optimize Enterprise',
                                    price: 'Custom',
                                    period: '',
                                    bullets: [
                                        'Department + employee efficiency',
                                        'Agent loop prevention',
                                        'Policy-linked automated savings',
                                        'Procurement + compliance exports',
                                        'Dedicated optimization review',
                                    ],
                                },
                            ].map((tier) => (
                                <div key={tier.name} className="border-2 border-black p-4 space-y-2 bg-white">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                                        {tier.name}
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black tracking-tighter">{tier.price}</span>
                                        <span className="text-[11px] font-bold text-neutral-500">{tier.period}</span>
                                    </div>
                                    <ul className="space-y-1 text-[12px] font-medium text-neutral-700">
                                        {tier.bullets.map((b, i) => (
                                            <li key={i} className="flex items-start gap-1.5">
                                                <span className="text-primary font-black mt-0.5">→</span>
                                                <span>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        disabled
                                        className="w-full mt-3 text-[10px] font-black uppercase tracking-widest border-2 border-neutral-300 text-neutral-400 px-3 py-2 cursor-not-allowed"
                                    >
                                        Contact sales
                                    </button>
                                </div>
                            ))}
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}
