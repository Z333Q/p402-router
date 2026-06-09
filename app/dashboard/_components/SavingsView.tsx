'use client'
import React from 'react'
import Link from 'next/link'
import { Card } from './ui'

export function SavingsView() {
    return (
        <div className="space-y-6 max-w-[1200px] mx-auto">
            <div className="border-b-2 border-black/5 pb-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-black">
                        Savings report
                    </h1>
                    <span className="border-2 border-amber-300 bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-widest px-2 py-1">
                        Not available yet
                    </span>
                </div>
                <p className="text-neutral-600 font-medium mt-3 max-w-[680px]">
                    Savings proof is not available yet. Optimize recommendations are not active.
                    This page shows readiness and audit context only.
                </p>
                <p className="text-[11px] font-mono text-neutral-500 mt-2 max-w-[680px]">
                    P402 does not claim savings until an approved recommendation has a baseline,
                    outcome evidence, a rollback condition, and a verified post-change result.
                </p>
            </div>

            <Card title="Why this page is blocked" body="3M quarantine">
                <div className="space-y-3 text-sm text-neutral-700">
                    <p className="max-w-[680px]">
                        The previous version of this page rendered aggregate savings totals,
                        per-mode breakdowns, daily savings, and a baseline-comparison percentage.
                        Those numbers were derived from a heuristic baseline, not from a verified
                        proof of a comparable accepted output. Rendering them as facts would be a
                        savings claim before the system has the data to support one.
                    </p>
                    <p className="text-[11px] font-mono text-neutral-500 max-w-[680px]">
                        Manual review is required before any future optimization change.
                        Nothing on this surface applies automatically.
                    </p>
                </div>
            </Card>

            <Card title="What is safe to view today" body="readiness and audit only">
                <div className="space-y-4">
                    <p className="text-sm text-neutral-700 max-w-[680px]">
                        Use the readiness surfaces below to see whether outcome coverage,
                        baseline window, and segment readiness are sufficient. None of these
                        surfaces claim savings.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                        <Link href="/dashboard/optimize" className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-primary bg-primary px-3 py-1.5 hover:bg-black hover:text-white hover:border-black transition-colors">
                            Optimize readiness
                        </Link>
                        <Link href="/dashboard/prove/outcomes" className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-black px-3 py-1.5 hover:bg-neutral-50 transition-colors">
                            Outcome readiness
                        </Link>
                        <Link href="/dashboard/prove" className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-black px-3 py-1.5 hover:bg-neutral-50 transition-colors">
                            Prove dashboard
                        </Link>
                        <Link href="/dashboard/monitor" className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-black px-3 py-1.5 hover:bg-neutral-50 transition-colors">
                            Monitor
                        </Link>
                    </div>
                </div>
            </Card>
        </div>
    )
}
