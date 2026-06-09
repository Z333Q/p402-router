'use client'
/**
 * IntelligenceSummary — Mission Control widget.
 *
 * 3N: replaced the legacy "Saved" tile (which fetched a quarantined savings endpoint and
 * rendered "% off vs baseline") with an Outcome readiness tile pointing
 * at /dashboard/prove/outcomes. No savings fetch, no savings claim.
 */
import React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { GitBranch, Sparkles, FlaskConical, ArrowRight } from 'lucide-react'

export function IntelligenceSummary() {
    const { data: requestsData } = useQuery<{ requests: unknown[]; total: number }>({
        queryKey: ['intelligence-summary-requests'],
        queryFn: () => fetch('/api/v1/requests?limit=100&status=completed').then(r => r.json()),
        refetchInterval: 30_000,
    })

    const { data: evalsData } = useQuery<{ aggregate: { pass_rate?: number; total_evals?: number } }>({
        queryKey: ['intelligence-summary-evals'],
        queryFn: () => fetch('/api/v1/evals?limit=1').then(r => r.json()),
        refetchInterval: 60_000,
    })

    const totalRequests = requestsData?.total ?? null
    const passRate      = evalsData?.aggregate?.pass_rate ?? null
    const totalEvals    = evalsData?.aggregate?.total_evals ?? null

    const links = [
        { href: '/dashboard/requests',       icon: GitBranch,   label: 'Requests',         value: totalRequests !== null ? String(totalRequests) : '—', sub: 'this week' },
        { href: '/dashboard/prove/outcomes', icon: Sparkles,    label: 'Outcome readiness', value: 'View',                                              sub: 'coverage and verdict' },
        { href: '/dashboard/evals',          icon: FlaskConical, label: 'Evals',            value: totalEvals !== null ? String(totalEvals) : '—',     sub: passRate !== null ? `${(passRate * 100).toFixed(0)}% pass rate` : 'no data yet' },
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
