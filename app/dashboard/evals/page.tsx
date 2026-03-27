'use client'
/**
 * Evals — Response Quality Evaluations
 * Top-1% neo-brutalist eval dashboard.
 */
import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, MetricBox, EmptyState, ErrorState, Select, ProgressBar } from '../_components/ui'
import { formatDistanceToNow } from 'date-fns'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface EvalItem {
    id: string
    request_id: string
    trace_node_id: string | null
    task: string
    overall_score: number
    passed: boolean
    pass_threshold: number
    scores: Record<string, number>
    evaluator_model: string
    latency_ms: number | null
    created_at: string
}

interface EvalsResponse {
    evals: EvalItem[]
    total: number
    aggregate: {
        total_evals: number
        passed: number
        failed: number
        pass_rate: number | null
        avg_score: number | null
    }
}

const DIM_ORDER = ['relevance', 'completeness', 'groundedness', 'coherence']

function ScoreFill({ score }: { score: number }) {
    const variant: 'success' | 'warning' | 'danger' = score >= 0.7 ? 'success' : score >= 0.5 ? 'warning' : 'danger'
    return (
        <ProgressBar
            value={score * 100}
            showValue={false}
            variant={variant}
        />
    )
}

function EvalRow({ ev }: { ev: EvalItem }) {
    const [open, setOpen] = useState(false)
    const pct = Math.round(ev.overall_score * 100)
    const scoreColor = ev.overall_score >= 0.7 ? 'text-success' : ev.overall_score >= 0.5 ? 'text-warning' : 'text-error'

    return (
        <div className={`border-b border-neutral-100 ${!ev.passed ? 'bg-error/[0.02]' : ''}`}>
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-50 transition-colors"
                onClick={() => setOpen(v => !v)}
            >
                {/* Pass/fail */}
                <span className={`shrink-0 text-[9px] font-black uppercase px-2 py-0.5 border-2 ${ev.passed ? 'border-success bg-success/10 text-success' : 'border-error bg-error/10 text-error'}`}>
                    {ev.passed ? '✓ Pass' : '✕ Fail'}
                </span>

                {/* Score */}
                <span className={`shrink-0 font-black font-mono text-lg w-12 text-center ${scoreColor}`}>
                    {pct}
                </span>

                {/* Score bar (compact) */}
                <div className="w-24 shrink-0 hidden sm:block">
                    <ScoreFill score={ev.overall_score} />
                </div>

                {/* Task */}
                <span className="flex-1 text-[11px] font-mono text-neutral-600 truncate">{ev.task}</span>

                {/* Model */}
                <span className="text-[9px] font-mono text-neutral-300 shrink-0 hidden lg:block">
                    {ev.evaluator_model}
                </span>

                {/* Age */}
                <span className="text-[10px] text-neutral-400 shrink-0 hidden sm:block">
                    {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}
                </span>

                <span className="text-neutral-400 shrink-0">
                    {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
            </div>

            {open && (
                <div className="px-4 pb-4 pt-1 border-t border-neutral-100 bg-neutral-50/50 space-y-4">
                    {/* Dimension scores */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                        {DIM_ORDER
                            .filter(d => d in ev.scores)
                            .concat(Object.keys(ev.scores).filter(d => !DIM_ORDER.includes(d)))
                            .map(dim => {
                                const score = ev.scores[dim] ?? 0
                                return (
                                    <div key={dim}>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">{dim}</span>
                                            <span className="text-[9px] font-black font-mono">{score.toFixed(2)}</span>
                                        </div>
                                        <ScoreFill score={score} />
                                    </div>
                                )
                            })}
                    </div>

                    {/* Fix path for failed evals */}
                    {!ev.passed && (
                        <div className="flex items-start gap-3 p-3 border-2 border-error/30 bg-error/5">
                            <span className="text-error text-sm shrink-0">⚠</span>
                            <div className="flex-1 space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-error">Quality below threshold ({ev.pass_threshold})</p>
                                <p className="text-[11px] text-neutral-600">
                                    Try re-running this task with <span className="font-black text-black">planned mode</span> — it adds verification steps that typically improve scores by 15–40%.
                                </p>
                                <div className="flex gap-2 mt-2">
                                    <Link
                                        href={`/dashboard/intelligence?task=${encodeURIComponent(ev.task)}&mode=planned`}
                                        className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest border-2 border-black bg-primary px-2 py-1 hover:bg-black hover:text-white transition-colors"
                                    >
                                        Re-run with Planned →
                                    </Link>
                                    <Link
                                        href={`/dashboard/requests?highlight=${ev.request_id}`}
                                        className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest border-2 border-neutral-200 px-2 py-1 hover:border-black transition-colors text-neutral-600"
                                    >
                                        View original request
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Meta */}
                    <div className="flex flex-wrap gap-4 text-[9px] font-mono text-neutral-400 pt-1 border-t border-neutral-100">
                        <span>Overall: <span className={`font-black ${scoreColor}`}>{ev.overall_score.toFixed(2)}</span></span>
                        <span>Threshold: <span className="font-black text-black">{ev.pass_threshold}</span></span>
                        {ev.latency_ms !== null && <span>Eval: <span className="font-black text-black">{ev.latency_ms}ms</span></span>}
                        {ev.trace_node_id && (
                            <span>Node: <span className="font-mono text-neutral-600">{ev.trace_node_id.slice(0, 8)}…</span></span>
                        )}
                        <span className="ml-auto">
                            Request:{' '}
                            <Link href={`/dashboard/requests?highlight=${ev.request_id}`} className="font-black text-black hover:text-primary border-b border-current">
                                {ev.request_id.slice(0, 8)}…
                            </Link>
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function EvalsPage() {
    const [passedFilter, setPassedFilter] = useState('')
    const [offset, setOffset] = useState(0)
    const limit = 20

    const { data, isLoading, isFetching, error, refetch } = useQuery<EvalsResponse>({
        queryKey: ['evals', passedFilter, offset],
        queryFn: async () => {
            const p = new URLSearchParams({ limit: String(limit), offset: String(offset) })
            if (passedFilter) p.set('passed', passedFilter)
            const res = await fetch(`/api/v1/evals?${p}`)
            if (!res.ok) throw new Error('Failed to load evals')
            return res.json()
        },
    })

    const agg = data?.aggregate
    const passRate = agg?.pass_rate ?? null
    const totalPages = data ? Math.ceil(data.total / limit) : 0
    const page = Math.floor(offset / limit) + 1

    return (
        <div className="space-y-8 max-w-[1200px] mx-auto">

            {/* Header */}
            <div className="flex flex-wrap justify-between items-end gap-4 border-b-2 border-black/5 pb-8">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Evals</h1>
                    <p className="text-neutral-500 font-medium">Response quality evaluations from verify nodes.</p>
                </div>
                <Button onClick={() => refetch()} variant="secondary" size="sm" loading={isFetching}>Refresh</Button>
            </div>

            {/* Aggregate */}
            {agg && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <MetricBox label="Total Evals" value={agg.total_evals.toLocaleString()} />
                    <MetricBox label="Passed" value={agg.passed.toLocaleString()} subtext={passRate !== null ? `${(passRate * 100).toFixed(1)}% rate` : undefined} accent={agg.passed > agg.failed} />
                    <MetricBox label="Failed" value={agg.failed.toLocaleString()} subtext={passRate !== null ? `${((1 - passRate) * 100).toFixed(1)}% rate` : undefined} />
                    <MetricBox
                        label="Avg Score"
                        value={agg.avg_score !== null ? agg.avg_score.toFixed(2) : '—'}
                        subtext="0.00 – 1.00"
                        accent={(agg.avg_score ?? 0) >= 0.7}
                    />
                </div>
            )}

            {/* Pass rate bar */}
            {agg && agg.total_evals > 0 && (
                <Card title="Pass Rate">
                    <div className="mt-2">
                        <ProgressBar
                            value={(passRate ?? 0) * 100}
                            label={`${agg.passed} passed · ${agg.failed} failed`}
                            variant={(passRate ?? 0) >= 0.8 ? 'success' : (passRate ?? 0) >= 0.6 ? 'warning' : 'danger'}
                        />
                    </div>
                </Card>
            )}

            {/* Filter */}
            <Card className="p-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <Select
                        label="Result"
                        value={passedFilter}
                        onChange={(v) => { setPassedFilter(v); setOffset(0) }}
                        options={[
                            { value: '', label: 'All results' },
                            { value: 'true', label: 'Passed only' },
                            { value: 'false', label: 'Failed only' },
                        ]}
                        className="min-w-[160px]"
                    />
                    {passedFilter && (
                        <Button onClick={() => { setPassedFilter(''); setOffset(0) }} variant="ghost" size="sm">Clear</Button>
                    )}
                    {data && (
                        <span className="ml-auto text-[10px] font-black text-neutral-400 uppercase tracking-widest self-end">
                            {data.total.toLocaleString()} total
                        </span>
                    )}
                </div>
            </Card>

            {/* List */}
            {isLoading ? (
                <div className="space-y-1.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-14 bg-neutral-50 border-2 border-neutral-100 animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
                    ))}
                </div>
            ) : error ? (
                <ErrorState title="Failed to load evals" message={String(error)} />
            ) : !data?.evals.length ? (
                <div className="border-2 border-black p-8 space-y-5">
                    <div className="space-y-2">
                        <div className="text-3xl">🔬</div>
                        <h2 className="text-xl font-black uppercase tracking-tighter">No evaluations yet</h2>
                        <p className="text-neutral-500 font-medium">
                            Evals are generated automatically when a <span className="font-black text-black">verify node</span> runs inside a planned execution.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400">How to get your first eval</div>
                        <ol className="space-y-2">
                            {[
                                'Send a request with mode: "planned" (or let the router auto-select it for complex tasks)',
                                'P402 will automatically run a verify node after each LLM response',
                                'Scores for relevance, completeness, groundedness, and coherence will appear here',
                            ].map((step, i) => (
                                <li key={i} className="flex items-start gap-3 text-[11px] text-neutral-600">
                                    <span className="shrink-0 w-5 h-5 border-2 border-black flex items-center justify-center text-[9px] font-black">{i + 1}</span>
                                    {step}
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/dashboard/intelligence" className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-primary bg-primary px-3 py-1.5 hover:bg-black hover:text-white hover:border-black transition-colors">
                            Open Playground →
                        </Link>
                        <Link href="/dashboard/requests" className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-black px-3 py-1.5 hover:bg-neutral-50 transition-colors">
                            View Requests
                        </Link>
                    </div>
                </div>
            ) : (
                <Card className="overflow-hidden p-0">
                    <div className="px-4 py-3 border-b-2 border-black bg-black">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                            Evaluation Log
                        </span>
                    </div>

                    {data.evals.map((ev) => <EvalRow key={ev.id} ev={ev} />)}

                    {totalPages > 1 && (
                        <div className="border-t-2 border-neutral-100 px-4 py-3 flex items-center justify-between bg-neutral-50">
                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                Page {page} of {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <Button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} variant="secondary" size="sm">← Prev</Button>
                                <Button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= (data?.total ?? 0)} variant="secondary" size="sm">Next →</Button>
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </div>
    )
}
