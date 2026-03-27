'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, EmptyState, ErrorState, Select } from '../_components/ui'
import { formatDistanceToNow } from 'date-fns'

interface RequestItem {
    id: string
    task: string
    status: string
    mode_resolved: string | null
    actual_cost: number | null
    savings: number | null
    created_at: string
    trace_id: string | null
}

const STATUS_COLORS: Record<string, string> = {
    completed: 'text-success',
    pending:   'text-warning',
    failed:    'text-error',
    running:   'text-info',
}

export default function TracesPage() {
    const [status, setStatus] = useState('')
    const [offset, setOffset] = useState(0)
    const limit = 20

    const { data, isLoading, error, refetch } = useQuery<{ requests: RequestItem[]; total: number }>({
        queryKey: ['traces-list', status, offset],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
            if (status) params.set('status', status)
            const res = await fetch(`/api/v1/requests?${params}`)
            if (!res.ok) throw new Error('Failed to fetch')
            return res.json()
        },
        refetchInterval: 15_000,
    })

    const totalPages = data ? Math.ceil(data.total / limit) : 0
    const page = Math.floor(offset / limit) + 1

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Traces</h1>
                    <p className="text-neutral-500 font-medium">Per-request execution traces — node-by-node breakdown.</p>
                </div>
                <Button onClick={() => refetch()} variant="secondary" size="sm">Refresh</Button>
            </div>

            <Card className="p-4 flex gap-3 items-end">
                <div className="min-w-[160px]">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Filter</label>
                    <Select
                        value={status}
                        onChange={(v) => { setStatus(v); setOffset(0) }}
                        options={[
                            { value: '', label: 'All statuses' },
                            { value: 'completed', label: 'Completed' },
                            { value: 'failed', label: 'Failed' },
                            { value: 'running', label: 'Running' },
                        ]}
                    />
                </div>
            </Card>

            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-16 bg-neutral-100 animate-pulse border-2 border-neutral-200" />
                    ))}
                </div>
            ) : error ? (
                <ErrorState title="Failed to load" message={String(error)} />
            ) : !data?.requests.length ? (
                <EmptyState title="No traces yet" body="Execute a task to generate a trace." />
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-[11px] font-mono">
                            <thead>
                                <tr className="border-b-2 border-black bg-neutral-50">
                                    <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-neutral-600">Task</th>
                                    <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-neutral-600">Status</th>
                                    <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-neutral-600">Mode</th>
                                    <th className="px-4 py-3 text-right font-black uppercase tracking-widest text-neutral-600">Cost</th>
                                    <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-neutral-600">Age</th>
                                    <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-neutral-600" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {data.requests.map((r) => (
                                    <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-4 py-3 max-w-[360px]">
                                            <span className="block truncate text-neutral-700">{r.task}</span>
                                            <span className="text-[9px] text-neutral-400">{r.id.slice(0, 8)}…</span>
                                        </td>
                                        <td className={`px-4 py-3 font-black uppercase text-[9px] ${STATUS_COLORS[r.status] ?? 'text-neutral-400'}`}>
                                            {r.status}
                                        </td>
                                        <td className="px-4 py-3 text-neutral-500">{r.mode_resolved ?? '—'}</td>
                                        <td className="px-4 py-3 text-right text-neutral-700">
                                            {r.actual_cost !== null ? `$${r.actual_cost.toFixed(6)}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-neutral-400">
                                            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                                        </td>
                                        <td className="px-4 py-3">
                                            {r.trace_id ? (
                                                <Link
                                                    href={`/dashboard/traces/${r.trace_id}`}
                                                    className="text-[10px] font-black uppercase tracking-widest text-black border-b-2 border-black hover:text-primary hover:border-primary transition-colors"
                                                >
                                                    Inspect →
                                                </Link>
                                            ) : <span className="text-neutral-300 text-[9px]">no trace</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="border-t-2 border-neutral-100 px-4 py-3 flex items-center justify-between">
                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                Page {page} of {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <Button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} variant="secondary" size="sm">← Prev</Button>
                                <Button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= data.total} variant="secondary" size="sm">Next →</Button>
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </div>
    )
}
