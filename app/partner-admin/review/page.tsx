'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, RotateCcw, Clock, AlertTriangle } from 'lucide-react'

interface CommissionEntry {
    id: string
    partner_id: string
    partner_name: string
    referral_code: string
    attributed_tenant_email: string
    source_event_type: string
    source_event_id: string
    invoice_amount_usd: string
    commission_amount: string
    currency: string
    status: string
    hold_until: string
    month_number: number
    offer_name: string
    review_notes: string | null
    created_at: string
}

const STATUS_TABS = ['pending', 'approved', 'declined', 'reversed', 'all'] as const
const REVERSAL_REASONS = ['chargeback', 'refund', 'fraud', 'policy_violation', 'manual_override']

function HoldBadge({ holdUntil, status }: { holdUntil: string; status: string }) {
    if (status !== 'pending') return null
    const past = new Date(holdUntil) <= new Date()
    return (
        <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 border ${
            past ? 'bg-warning/10 border-warning text-warning' : 'bg-neutral-100 border-neutral-200 text-neutral-400'
        }`}>
            {past ? <AlertTriangle size={8} /> : <Clock size={8} />}
            {past ? 'READY' : `Hold: ${new Date(holdUntil).toLocaleDateString()}`}
        </span>
    )
}

function EntryRow({ entry, onAction }: { entry: CommissionEntry; onAction: () => void }) {
    const [expanded, setExpanded] = useState(false)
    const [notes, setNotes] = useState('')
    const [reversalReason, setReversalReason] = useState('chargeback')
    const [acting, setActing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const act = async (action: 'approve' | 'decline' | 'reverse') => {
        if (action === 'decline' && !notes.trim()) {
            setError('Notes required for decline.')
            return
        }
        setActing(true)
        setError(null)
        try {
            const res = await fetch(`/api/partner-admin/commissions/${entry.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    notes: notes || undefined,
                    reason: action === 'reverse' ? reversalReason : undefined,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Action failed')
            onAction()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Action failed')
        } finally {
            setActing(false)
        }
    }

    const isPending = entry.status === 'pending'
    const isApprovable = entry.status === 'approved'

    return (
        <div className="border-b border-neutral-100 last:border-0">
            <div
                className="flex items-center gap-4 py-3.5 px-5 cursor-pointer hover:bg-neutral-50 transition-colors"
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex-1 min-w-0 grid grid-cols-5 gap-4 items-center">
                    <div>
                        <p className="text-xs font-black text-black">{entry.partner_name}</p>
                        <p className="text-[10px] text-neutral-400 font-mono">{entry.referral_code}</p>
                    </div>
                    <div>
                        <p className="text-[11px] font-mono text-neutral-600 truncate">{entry.attributed_tenant_email}</p>
                        <p className="text-[10px] text-neutral-400">{entry.offer_name}</p>
                    </div>
                    <div>
                        <p className="text-xs font-black text-black">${parseFloat(entry.commission_amount).toFixed(2)}</p>
                        <p className="text-[10px] text-neutral-400">of ${parseFloat(entry.invoice_amount_usd).toFixed(2)} · mo {entry.month_number}</p>
                    </div>
                    <div>
                        <HoldBadge holdUntil={entry.hold_until} status={entry.status} />
                    </div>
                    <div className="text-right">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 border ${
                            entry.status === 'approved' ? 'bg-success/10 border-success text-success'
                            : entry.status === 'declined' ? 'bg-error/10 border-error text-error'
                            : entry.status === 'reversed' ? 'bg-neutral-100 border-neutral-300 text-neutral-500'
                            : 'bg-warning/10 border-warning text-warning'
                        }`}>
                            {entry.status}
                        </span>
                    </div>
                </div>
            </div>

            {expanded && (
                <div className="px-5 pb-5 bg-neutral-50 border-t border-neutral-100 space-y-3">
                    <div className="grid grid-cols-3 gap-4 pt-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Event Type</p>
                            <p className="font-mono text-xs">{entry.source_event_type}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Event ID</p>
                            <p className="font-mono text-[10px] text-neutral-600 truncate">{entry.source_event_id}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Created</p>
                            <p className="text-xs">{new Date(entry.created_at).toLocaleString()}</p>
                        </div>
                    </div>

                    {entry.review_notes && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Review Notes</p>
                            <p className="text-xs">{entry.review_notes}</p>
                        </div>
                    )}

                    {(isPending || isApprovable) && (
                        <div className="flex flex-col gap-3 pt-2">
                            <textarea
                                className="w-full px-3 py-2 border-2 border-black font-mono text-xs resize-none focus:outline-none"
                                rows={2}
                                placeholder={isPending ? "Notes (required for decline)" : "Notes for reversal"}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                            {isApprovable && (
                                <select
                                    className="border-2 border-black px-3 py-2 font-mono text-xs focus:outline-none bg-white"
                                    value={reversalReason}
                                    onChange={e => setReversalReason(e.target.value)}
                                >
                                    {REVERSAL_REASONS.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                                </select>
                            )}
                            {error && <p className="text-xs text-error font-bold">{error}</p>}
                            <div className="flex gap-3">
                                {isPending && (
                                    <>
                                        <button
                                            onClick={() => act('approve')}
                                            disabled={acting}
                                            className="flex items-center gap-2 px-4 py-2 bg-primary border-2 border-black text-[10px] font-black uppercase tracking-widest hover:bg-primary-hover disabled:opacity-60"
                                        >
                                            <CheckCircle size={12} /> Approve
                                        </button>
                                        <button
                                            onClick={() => act('decline')}
                                            disabled={acting}
                                            className="flex items-center gap-2 px-4 py-2 border-2 border-black text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 disabled:opacity-60"
                                        >
                                            <XCircle size={12} /> Decline
                                        </button>
                                    </>
                                )}
                                {isApprovable && (
                                    <button
                                        onClick={() => act('reverse')}
                                        disabled={acting}
                                        className="flex items-center gap-2 px-4 py-2 border-2 border-error text-error text-[10px] font-black uppercase tracking-widest hover:bg-error hover:text-white disabled:opacity-60"
                                    >
                                        <RotateCcw size={12} /> Reverse
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default function CommissionReviewPage() {
    const [activeTab, setActiveTab] = useState<typeof STATUS_TABS[number]>('pending')
    const [entries, setEntries] = useState<CommissionEntry[]>([])
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/partner-admin/commissions?status=${activeTab}`)
            const data = await res.json()
            setEntries(data.entries ?? [])
        } finally {
            setLoading(false)
        }
    }, [activeTab])

    useEffect(() => { load() }, [load])

    const readyCount = entries.filter(e => e.status === 'pending' && new Date(e.hold_until) <= new Date()).length

    return (
        <div className="space-y-6">
            <div>
                <h1 className="page-title">Commission Review</h1>
                <p className="text-sm text-neutral-500 mt-1">Approve, decline, or reverse commission entries. Hold period must elapse before approval.</p>
            </div>

            {readyCount > 0 && activeTab === 'pending' && (
                <div className="flex items-center gap-3 border-2 border-warning bg-warning/5 px-4 py-3">
                    <AlertTriangle size={14} className="text-warning shrink-0" />
                    <p className="text-xs font-black text-black">
                        {readyCount} commission{readyCount !== 1 ? 's' : ''} past hold period — ready to approve.
                    </p>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b-2 border-black">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest border-r border-neutral-200 transition-colors ${
                            activeTab === tab
                                ? 'bg-primary text-black -mb-0.5'
                                : 'text-neutral-500 hover:text-black hover:bg-neutral-50'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="card overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center">
                        <p className="text-xs text-neutral-400 uppercase tracking-widest font-bold">Loading…</p>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="p-10 text-center">
                        <p className="text-xs text-neutral-400 uppercase tracking-widest font-bold">No {activeTab} entries</p>
                    </div>
                ) : entries.map(entry => (
                    <EntryRow key={entry.id} entry={entry} onAction={load} />
                ))}
            </div>
        </div>
    )
}
