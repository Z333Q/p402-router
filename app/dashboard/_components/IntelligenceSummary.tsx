'use client'
/**
 * IntelligenceSummary — Mission Control widget
 * Shows key intelligence layer metrics with links to drill-down pages.
 */
import React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { MetricBox } from './ui'
import { formatCost } from './format'
import { GitBranch, TrendingDown, FlaskConical, ArrowRight } from 'lucide-react'

export function IntelligenceSummary() {
    const { data: requestsData } = useQuery<{ requests: any[]; total: number }>({
        queryKey: ['intelligence-summary-requests'],
        queryFn: () => fetch('/api/v1/requests?limit=100&status=completed').then(r => r.json()),
        refetchInterval: 30_000,
    })

    const { data: savingsData } = useQuery<{ totals: any }>({
        queryKey: ['intelligence-summary-savings'],
        queryFn: () => fetch('/api/v1/savings?period=7d').then(r => r.json()),
        refetchInterval: 60_000,
    })

    const { data: evalsData } = useQuery<{ aggregate: any }>({
        queryKey: ['intelligence-summary-evals'],
        queryFn: () => fetch('/api/v1/evals?limit=1').then(r => r.json()),
        refetchInterval: 60_000,
    })

    const totalRequests = requestsData?.total ?? null
    const totalSaved    = savingsData?.totals?.total_savings_usd ?? null
    const savingsPct    = savingsData?.totals?.savings_pct ?? null
    const passRate      = evalsData?.aggregate?.pass_rate ?? null
    const totalEvals    = evalsData?.aggregate?.total_evals ?? null

    const links = [
        { href: '/dashboard/requests', icon: GitBranch,   label: 'Requests', value: totalRequests !== null ? String(totalRequests) : '—', sub: 'this week' },
        { href: '/dashboard/savings',  icon: TrendingDown, label: 'Saved',    value: totalSaved !== null ? formatCost(totalSaved) : '—', sub: savingsPct !== null ? `${savingsPct.toFixed(1)}% off` : 'vs baseline' },
        { href: '/dashboard/evals',    icon: FlaskConical, label: 'Evals',    value: totalEvals !== null ? String(totalEvals) : '—', sub: passRate !== null ? `${(passRate * 100).toFixed(0)}% pass rate` : 'no data yet' },
    ]

    return (
        <div className="border-2 border-black bg-white p-4">
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black">
                <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-wider">Intelligence Layer</h2>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase mt-0.5">Last 7 days</p>
                </div>
                <Link href="/dashboard/requests" className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors">
                    View all <ArrowRight size={10} />
                </Link>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {links.map(({ href, icon: Icon, label, value, sub }) => (
                    <Link key={href} href={href} className="group">
                        <div className="border-2 border-neutral-200 group-hover:border-black p-3 transition-all group-hover:bg-neutral-50">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Icon size={10} className="text-neutral-400 group-hover:text-black transition-colors" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 group-hover:text-neutral-600">{label}</span>
                            </div>
                            <div className="text-xl font-black text-black font-mono">{value}</div>
                            <div className="text-[9px] text-neutral-400 mt-0.5 font-mono">{sub}</div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
