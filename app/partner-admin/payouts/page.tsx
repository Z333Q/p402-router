'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, AlertTriangle, CheckCircle, Zap } from 'lucide-react'

function BatchActions({ batchId, status, onAction }: {
    batchId: string
    status: string
    onAction: () => void
}) {
    const [acting, setActing] = useState(false)
    const [result, setResult] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const action = async (actionName: string) => {
        setActing(true)
        setResult(null)
        setError(null)
        try {
            const res = await fetch(`/api/partner-admin/payouts/${batchId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: actionName }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Action failed')
            if (actionName === 'execute_usdc') {
                setResult(`Sent $${data.totalSent?.toFixed(2)} to ${data.entryCount} entries${data.failureCount > 0 ? ` (${data.failureCount} failed)` : ''}`)
            }
            onAction()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed')
        } finally {
            setActing(false)
        }
    }

    return (
        <div className="flex flex-col gap-1.5">
            {status === 'pending' && (
                <button
                    onClick={() => action('approve')}
                    disabled={acting}
                    className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-primary border border-black hover:bg-primary-hover disabled:opacity-60"
                >
                    {acting ? '…' : 'Approve →'}
                </button>
            )}
            {status === 'approved' && (
                <button
                    onClick={() => action('execute_usdc')}
                    disabled={acting}
                    className="flex items-center gap-1 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-black text-primary border border-black hover:bg-neutral-800 disabled:opacity-60"
                >
                    <Zap size={9} /> {acting ? 'Sending…' : 'Execute USDC'}
                </button>
            )}
            {(status === 'processing' || status === 'approved') && (
                <button
                    onClick={() => action('mark_completed')}
                    disabled={acting}
                    className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border border-success text-success hover:bg-success hover:text-black disabled:opacity-60"
                >
                    Mark Complete
                </button>
            )}
            {result && <p className="text-[9px] text-success font-bold">{result}</p>}
            {error && <p className="text-[9px] text-error font-bold">{error}</p>}
        </div>
    )
}

interface PayoutBatch {
    id: string
    status: string
    total_amount: string
    currency: string
    notes: string | null
    created_at: string
    updated_at: string
    created_by_email: string | null
    approved_by_email: string | null
    entry_count: string
}

function StatusBadge({ status }: { status: string }) {
    const cls = status === 'completed' ? 'bg-success/10 border-success text-success'
        : status === 'approved' ? 'bg-primary/20 border-black text-black'
        : status === 'processing' ? 'bg-info/10 border-info text-info'
        : status === 'failed' ? 'bg-error/10 border-error text-error'
        : 'bg-neutral-100 border-neutral-200 text-neutral-500'
    return <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border ${cls}`}>{status}</span>
}

export default function PayoutBatchesPage() {
    const [batches, setBatches] = useState<PayoutBatch[]>([])
    const [loading, setLoading] = useState(true)
    const [assembling, setAssembling] = useState(false)
    const [assembleResult, setAssembleResult] = useState<string | null>(null)
    const [assembleError, setAssembleError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/partner-admin/payouts')
            const data = await res.json()
            setBatches(data.batches ?? [])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const assembleBatch = async () => {
        setAssembling(true)
        setAssembleResult(null)
        setAssembleError(null)
        try {
            const res = await fetch('/api/partner-admin/payouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: `Manual batch - ${new Date().toLocaleDateString()}` }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed')
            setAssembleResult(
                `Batch created: ${data.entryCount} entries across ${data.partnerCount} partners — $${data.totalAmount}`
            )
            await load()
        } catch (e: unknown) {
            setAssembleError(e instanceof Error ? e.message : 'Assembly failed')
        } finally {
            setAssembling(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="page-title">Payout Batches</h1>
                    <p className="text-sm text-neutral-500 mt-1">Assemble approved commissions into payout batches for disbursement.</p>
                </div>
                <button
                    onClick={assembleBatch}
                    disabled={assembling}
                    className="btn btn-primary flex items-center gap-2 disabled:opacity-60 shrink-0"
                >
                    <Package size={14} />
                    {assembling ? 'Assembling…' : 'Assemble New Batch'}
                </button>
            </div>

            {assembleResult && (
                <div className="flex items-center gap-3 border-2 border-success bg-success/5 px-4 py-3">
                    <CheckCircle size={14} className="text-success shrink-0" />
                    <p className="text-xs font-bold text-black">{assembleResult}</p>
                </div>
            )}
            {assembleError && (
                <div className="flex items-center gap-3 border-2 border-error bg-error/5 px-4 py-3">
                    <AlertTriangle size={14} className="text-error shrink-0" />
                    <p className="text-xs font-bold text-error">{assembleError}</p>
                </div>
            )}

            <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b-2 border-black">
                    <h3 className="section-header text-[11px]">Batch History</h3>
                </div>

                {loading ? (
                    <div className="p-10 text-center">
                        <p className="text-xs text-neutral-400 uppercase tracking-widest font-bold">Loading…</p>
                    </div>
                ) : batches.length === 0 ? (
                    <div className="p-10 text-center">
                        <Package className="h-7 w-7 text-neutral-200 mx-auto mb-3" />
                        <p className="text-xs text-neutral-400 uppercase tracking-widest font-bold">No payout batches yet</p>
                        <p className="text-[11px] text-neutral-400 mt-1">Approve commissions first, then assemble a batch.</p>
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-neutral-200 bg-neutral-50">
                                {['Batch ID', 'Status', 'Partners', 'Total', 'Created By', 'Created', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-500">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {batches.map(batch => (
                                <tr key={batch.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-[10px] text-neutral-500">
                                        {batch.id.slice(0, 8)}…
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={batch.status} />
                                    </td>
                                    <td className="px-4 py-3 font-mono text-neutral-600">
                                        {parseInt(batch.entry_count)}
                                    </td>
                                    <td className="px-4 py-3 font-mono font-black text-black">
                                        ${parseFloat(batch.total_amount).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-[11px] text-neutral-500">
                                        {batch.created_by_email ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 text-[11px] text-neutral-400">
                                        {new Date(batch.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <BatchActions batchId={batch.id} status={batch.status} onAction={load} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="card p-4 bg-neutral-50 text-[11px] text-neutral-500 leading-relaxed">
                <strong className="text-black">Payout workflow:</strong> Assemble batch (moves approved commissions to <em>in_payout</em>) →
                Finance review → Approve batch → Initiate transfers (Stripe Connect, USDC, Wise) →
                Mark confirmed. Batches are immutable once assembled.
                Reversals must be applied before batch assembly.
            </div>
        </div>
    )
}
