'use client'
/**
 * Requests — Intelligence Layer Execution History
 * Top-1% neo-brutalist dashboard page.
 */
import React, { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { MetricBox, Button, Card, ErrorState, Select } from '../_components/ui'
import { formatDistanceToNow } from 'date-fns'
import { RefreshCw, GitBranch, Copy, Check } from 'lucide-react'

interface RequestItem {
    id: string
    task: string
    status: string
    mode_requested: string | null
    mode_resolved: string | null
    actual_cost: number | null
    baseline_cost: number | null
    savings: number | null
    created_at: string
    completed_at: string | null
    trace_id: string | null
}

interface RequestsResponse {
    requests: RequestItem[]
    total: number
}

const STATUS_CONFIG: Record<string, { color: string; dot: string; bg: string }> = {
    completed: { color: 'text-success', dot: 'bg-success', bg: 'bg-success/10' },
    pending:   { color: 'text-warning', dot: 'bg-warning animate-pulse', bg: 'bg-warning/10' },
    failed:    { color: 'text-error',   dot: 'bg-error',   bg: 'bg-error/10' },
    running:   { color: 'text-info',    dot: 'bg-info animate-pulse', bg: 'bg-info/10' },
}

const MODE_LABEL: Record<string, string> = {
    direct:  'Direct',
    planned: 'Planned',
    auto:    'Auto',
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-black px-2 py-1.5 hover:bg-primary hover:border-primary transition-colors"
        >
            {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
            {copied ? 'Copied!' : 'Copy'}
        </button>
    )
}

const EXAMPLE_CURL = `curl -X POST https://p402.io/api/v1/execute \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"task": "Summarize this document", "mode": "cost"}'`

export default function RequestsPage() {
    const router = useRouter()
    const [status, setStatus] = useState('')
    const [mode, setMode]     = useState('')
    const [offset, setOffset] = useState(0)
    const [selectedIdx, setSelectedIdx] = useState<number>(-1)
    const limit = 20

    const { data, isLoading, isFetching, error, refetch } = useQuery<RequestsResponse>({
        queryKey: ['requests', status, mode, offset],
        queryFn: async () => {
            const p = new URLSearchParams({ limit: String(limit), offset: String(offset) })
            if (status) p.set('status', status)
            if (mode)   p.set('mode',   mode)
            const res = await fetch(`/api/v1/requests?${p}`)
            if (!res.ok) throw new Error('Failed to fetch requests')
            return res.json()
        },
        refetchInterval: 10_000,
    })

    const requests = data?.requests ?? []

    // keyboard shortcuts: 'r' = refresh, arrows = row navigation, enter = open trace
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

            if (e.key.toLowerCase() === 'r') {
                e.preventDefault()
                refetch()
            } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIdx(i => Math.min(i + 1, requests.length - 1))
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIdx(i => Math.max(i - 1, 0))
            } else if (e.key === 'Enter' && selectedIdx >= 0) {
                const row = requests[selectedIdx]
                if (row?.trace_id) router.push(`/dashboard/traces/${row.trace_id}`)
            } else if (e.key === 'Escape') {
                setSelectedIdx(-1)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [refetch, requests, selectedIdx, router])

    const reset = useCallback(() => { setStatus(''); setMode(''); setOffset(0) }, [])

    const totalPages = data ? Math.ceil(data.total / limit) : 0
    const page = Math.floor(offset / limit) + 1

    // Derive summary stats from current page data
    const completedCount = requests.filter(r => r.status === 'completed').length
    const failedCount    = requests.filter(r => r.status === 'failed').length
    const totalSaved     = requests.reduce((s, r) => s + (r.savings ?? 0), 0)
    const cachedCount    = requests.filter(r => r.actual_cost === 0 && r.status === 'completed').length

    return (
        <div className="space-y-8 max-w-[1400px] mx-auto">

            {/* Page Header */}
            <div className="flex flex-wrap justify-between items-end gap-4 border-b-2 border-black/5 pb-8">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Requests</h1>
                    <p className="text-neutral-500 font-medium">
                        Intelligence layer execution history ·{' '}
                        <kbd className="text-[10px] font-mono bg-neutral-100 border border-neutral-300 px-1.5 py-0.5">R</kbd> refresh ·{' '}
                        <kbd className="text-[10px] font-mono bg-neutral-100 border border-neutral-300 px-1.5 py-0.5">↑↓</kbd> navigate ·{' '}
                        <kbd className="text-[10px] font-mono bg-neutral-100 border border-neutral-300 px-1.5 py-0.5">↵</kbd> open trace
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isFetching && <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-400"><RefreshCw size={10} className="animate-spin" />Syncing</span>}
                    <Button onClick={() => refetch()} variant="secondary" size="sm" loading={isFetching}>Refresh</Button>
                </div>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <MetricBox
                    label="Shown"
                    value={data?.total ?? '—'}
                    subtext={`${completedCount} completed`}
                />
                <MetricBox
                    label="Failed"
                    value={failedCount}
                    subtext={requests.length ? `${((failedCount / requests.length) * 100).toFixed(0)}% rate` : '—'}
                />
                <MetricBox
                    label="Cache Hits"
                    value={cachedCount}
                    subtext="zero-cost responses"
                />
                <MetricBox
                    label="Saved (page)"
                    value={totalSaved > 0 ? `$${totalSaved.toFixed(4)}` : '$0.0000'}
                    subtext="vs sonnet-4-6 baseline"
                    accent={totalSaved > 0}
                />
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <Select
                        label="Status"
                        value={status}
                        onChange={(v) => { setStatus(v); setOffset(0) }}
                        options={[
                            { value: '', label: 'All statuses' },
                            { value: 'completed', label: 'Completed' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'running', label: 'Running' },
                            { value: 'failed', label: 'Failed' },
                        ]}
                        className="min-w-[140px]"
                    />
                    <Select
                        label="Mode"
                        value={mode}
                        onChange={(v) => { setMode(v); setOffset(0) }}
                        options={[
                            { value: '', label: 'All modes' },
                            { value: 'direct', label: 'Direct' },
                            { value: 'planned', label: 'Planned' },
                        ]}
                        className="min-w-[140px]"
                    />
                    {(status || mode) && (
                        <Button onClick={reset} variant="ghost" size="sm">Clear filters</Button>
                    )}
                    {data && (
                        <span className="ml-auto text-[10px] font-black text-neutral-400 uppercase tracking-widest self-end">
                            {data.total.toLocaleString()} total
                        </span>
                    )}
                </div>
            </Card>

            {/* Table */}
            {isLoading ? (
                <div className="space-y-1.5">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-14 bg-neutral-50 border-2 border-neutral-100 animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
                    ))}
                </div>
            ) : error ? (
                <ErrorState title="Failed to load requests" message={String(error)} />
            ) : requests.length === 0 ? (
                <div className="border-2 border-black p-8 space-y-6">
                    <div className="space-y-2">
                        <div className="text-3xl">⚡</div>
                        <h2 className="text-xl font-black uppercase tracking-tighter">No requests yet</h2>
                        <p className="text-neutral-500 font-medium">Your first execution will appear here. Run any task via the API or Playground.</p>
                    </div>
                    <div className="space-y-3">
                        <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Quick start — send your first request</div>
                        <div className="bg-neutral-900 border-2 border-black p-4 font-mono text-[11px] text-neutral-200 whitespace-pre overflow-x-auto">
                            {EXAMPLE_CURL}
                        </div>
                        <div className="flex gap-3 items-center">
                            <CopyButton text={EXAMPLE_CURL} />
                            <Link href="/dashboard/intelligence" className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-primary bg-primary px-3 py-1.5 hover:bg-black hover:text-white hover:border-black transition-colors">
                                Open Playground →
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                <Card className="overflow-hidden p-0">
                    {/* Table header */}
                    <div className="px-4 py-3 border-b-2 border-black bg-black flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                            Execution Log
                        </span>
                        <span className="text-[9px] font-mono text-neutral-400">
                            Page {page} of {totalPages}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-100">
                                    <th className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-widest text-neutral-400 w-[40%]">Task</th>
                                    <th className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-widest text-neutral-400">Status</th>
                                    <th className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-widest text-neutral-400">Mode</th>
                                    <th className="px-4 py-2.5 text-right text-[9px] font-black uppercase tracking-widest text-neutral-400">Cost</th>
                                    <th className="px-4 py-2.5 text-right text-[9px] font-black uppercase tracking-widest text-neutral-400">Saved</th>
                                    <th className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-widest text-neutral-400">Age</th>
                                    <th className="px-4 py-2.5 text-right text-[9px] font-black uppercase tracking-widest text-neutral-400">Trace</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((r, idx) => {
                                    const cfg = STATUS_CONFIG[r.status] ?? { color: 'text-neutral-400', dot: 'bg-neutral-400', bg: 'bg-neutral-50' }
                                    const savingsPct = r.baseline_cost && r.baseline_cost > 0 && r.savings !== null
                                        ? Math.round((r.savings / r.baseline_cost) * 100) : null
                                    const isSelected = idx === selectedIdx
                                    return (
                                        <tr
                                            key={r.id}
                                            onClick={() => setSelectedIdx(idx)}
                                            onDoubleClick={() => { if (r.trace_id) router.push(`/dashboard/traces/${r.trace_id}`) }}
                                            className={`border-b border-neutral-50 cursor-pointer transition-colors group ${
                                                isSelected
                                                    ? 'bg-primary/20 border-l-4 border-l-black'
                                                    : idx % 2 === 0 ? 'hover:bg-neutral-50' : 'bg-neutral-50/30 hover:bg-neutral-100/50'
                                            }`}
                                        >
                                            {/* Task */}
                                            <td className="px-4 py-3">
                                                <div className="text-[11px] font-medium text-neutral-800 truncate max-w-[280px] group-hover:text-black">
                                                    {r.task}
                                                </div>
                                                <div className="text-[9px] font-mono text-neutral-300 mt-0.5">{r.id.slice(0, 8)}…</div>
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${cfg.color}`}>
                                                    <span className={`w-1.5 h-1.5 ${cfg.dot}`} />
                                                    {r.status}
                                                </span>
                                            </td>
                                            {/* Mode */}
                                            <td className="px-4 py-3">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 border-2 ${
                                                    (r.mode_resolved ?? r.mode_requested) === 'planned'
                                                        ? 'border-primary bg-primary/10 text-black'
                                                        : 'border-neutral-200 text-neutral-500'
                                                }`}>
                                                    {MODE_LABEL[r.mode_resolved ?? r.mode_requested ?? 'auto'] ?? '—'}
                                                </span>
                                            </td>
                                            {/* Cost */}
                                            <td className="px-4 py-3 text-right font-mono text-[11px] text-neutral-600">
                                                {r.actual_cost === 0 ? (
                                                    <span className="text-[9px] font-black uppercase text-primary border border-primary/30 bg-primary/10 px-1.5 py-0.5">Free</span>
                                                ) : r.actual_cost !== null ? `$${r.actual_cost.toFixed(6)}` : '—'}
                                            </td>
                                            {/* Saved */}
                                            <td className="px-4 py-3 text-right">
                                                {r.savings !== null && r.savings > 0 ? (
                                                    <span className="flex flex-col items-end">
                                                        <span className="font-black text-[11px] text-success font-mono">${r.savings.toFixed(6)}</span>
                                                        {savingsPct !== null && (
                                                            <span className="text-[9px] text-success/70 font-black">{savingsPct}% off</span>
                                                        )}
                                                    </span>
                                                ) : <span className="text-neutral-200 text-[11px]">—</span>}
                                            </td>
                                            {/* Age */}
                                            <td className="px-4 py-3 text-[10px] text-neutral-400 whitespace-nowrap">
                                                {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                                            </td>
                                            {/* Trace */}
                                            <td className="px-4 py-3 text-right">
                                                {r.trace_id ? (
                                                    <Link
                                                        href={`/dashboard/traces/${r.trace_id}`}
                                                        className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-black border-2 border-black px-2 py-1 hover:bg-primary hover:border-primary transition-colors"
                                                    >
                                                        <GitBranch size={9} />
                                                        Trace
                                                    </Link>
                                                ) : <span className="text-neutral-200 text-[11px]">—</span>}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="border-t-2 border-neutral-100 px-4 py-3 flex items-center justify-between bg-neutral-50">
                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                {offset + 1}–{Math.min(offset + limit, data?.total ?? 0)} of {data?.total ?? 0}
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
