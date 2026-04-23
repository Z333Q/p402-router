'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'

interface Deal {
    id: string
    company_name: string
    contact_name: string
    contact_email: string
    estimated_arr_usd: string | null
    expected_close_date: string | null
    description: string | null
    stage: string
    actual_arr_usd: string | null
    rejection_reason: string | null
    created_at: string
    expires_at: string
    partner_name: string
    referral_code: string
    partner_email: string
}

const STAGES = ['all', 'registered', 'accepted', 'negotiating', 'closed_won', 'closed_lost'] as const

function StageBadge({ stage }: { stage: string }) {
    const cls = stage === 'closed_won' ? 'bg-success/10 border-success text-success'
        : stage === 'closed_lost' ? 'bg-error/10 border-error text-error'
        : stage === 'negotiating' ? 'bg-info/10 border-info text-info'
        : stage === 'accepted' ? 'bg-primary/20 border-black text-black'
        : 'bg-neutral-100 border-neutral-200 text-neutral-500'
    return (
        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border ${cls}`}>
            {stage.replace('_', ' ')}
        </span>
    )
}

function DealRow({ deal, onAction }: { deal: Deal; onAction: () => void }) {
    const [expanded, setExpanded] = useState(false)
    const [newStage, setNewStage] = useState(deal.stage)
    const [actualArr, setActualArr] = useState(deal.actual_arr_usd ?? '')
    const [notes, setNotes] = useState('')
    const [acting, setActing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const canAction = deal.stage !== 'closed_lost'

    const update = async () => {
        setActing(true)
        setError(null)
        try {
            const res = await fetch('/api/partner-admin/deals', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: deal.id,
                    stage: newStage,
                    review_notes: notes || undefined,
                    actual_arr_usd: actualArr ? parseFloat(actualArr) : undefined,
                    rejection_reason: newStage === 'closed_lost' ? (notes || 'Deal did not close') : undefined,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Update failed')
            onAction()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Update failed')
        } finally {
            setActing(false)
        }
    }

    const arrDisplay = deal.actual_arr_usd
        ? `$${parseFloat(deal.actual_arr_usd).toLocaleString()} actual`
        : deal.estimated_arr_usd
            ? `~$${parseFloat(deal.estimated_arr_usd).toLocaleString()} est.`
            : '—'

    return (
        <div className="border-b border-neutral-100 last:border-0">
            <div
                className="flex items-center gap-4 py-3.5 px-5 cursor-pointer hover:bg-neutral-50"
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex-1 grid grid-cols-5 gap-3 items-center min-w-0">
                    <div>
                        <p className="text-xs font-black text-black">{deal.company_name}</p>
                        <p className="text-[10px] text-neutral-400">{deal.contact_name}</p>
                    </div>
                    <div>
                        <p className="font-mono text-[10px] text-neutral-500">{deal.contact_email}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-black">{deal.partner_name}</p>
                        <p className="font-mono text-[10px] text-neutral-400">{deal.partner_email}</p>
                    </div>
                    <div className="font-mono text-xs font-bold text-black">{arrDisplay}</div>
                    <div className="flex items-center gap-2 justify-between">
                        <StageBadge stage={deal.stage} />
                        <span className="text-[10px] text-neutral-400">{new Date(deal.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                {expanded ? <ChevronUp size={14} className="text-neutral-400 shrink-0" /> : <ChevronDown size={14} className="text-neutral-400 shrink-0" />}
            </div>

            {expanded && (
                <div className="px-5 pb-5 bg-neutral-50 border-t border-neutral-100 space-y-4 pt-4">
                    {deal.description && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Description</p>
                            <p className="text-xs text-neutral-700">{deal.description}</p>
                        </div>
                    )}
                    {deal.expected_close_date && (
                        <p className="text-xs text-neutral-600">
                            Expected close: <strong>{new Date(deal.expected_close_date).toLocaleDateString()}</strong>
                        </p>
                    )}
                    <p className="text-xs text-neutral-400">Registration expires: {new Date(deal.expires_at).toLocaleDateString()}</p>

                    {canAction && (
                        <div className="flex items-end gap-3 flex-wrap">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Stage</label>
                                <select
                                    className="border-2 border-black px-3 py-2 font-mono text-xs focus:outline-none bg-white"
                                    value={newStage}
                                    onChange={e => setNewStage(e.target.value)}
                                >
                                    {STAGES.filter(s => s !== 'all').map(s => (
                                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                    ))}
                                </select>
                            </div>
                            {newStage === 'closed_won' && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Actual ARR (USD)</label>
                                    <input
                                        className="w-28 px-3 py-2 border-2 border-black font-mono text-xs focus:outline-none"
                                        placeholder="50000"
                                        value={actualArr}
                                        onChange={e => setActualArr(e.target.value)}
                                    />
                                </div>
                            )}
                            <div className="flex-1 min-w-[160px]">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Notes</label>
                                <input
                                    className="w-full px-3 py-2 border-2 border-black font-mono text-xs focus:outline-none"
                                    placeholder="Internal notes…"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={update}
                                disabled={acting || newStage === deal.stage}
                                className="btn btn-primary text-xs disabled:opacity-60"
                            >
                                {acting ? 'Updating…' : 'Update'}
                            </button>
                        </div>
                    )}
                    {error && <p className="text-xs text-error font-bold">{error}</p>}
                </div>
            )}
        </div>
    )
}

export default function AdminDealsPage() {
    const [stageFilter, setStageFilter] = useState<typeof STAGES[number]>('registered')
    const [search, setSearch] = useState('')
    const [deals, setDeals] = useState<Deal[]>([])
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ stage: stageFilter, q: search })
            const res = await fetch(`/api/partner-admin/deals?${params}`)
            const data = await res.json()
            setDeals(data.deals ?? [])
        } finally {
            setLoading(false)
        }
    }, [stageFilter, search])

    useEffect(() => { load() }, [load])

    const totalARR = deals
        .filter(d => d.stage === 'closed_won' && d.actual_arr_usd)
        .reduce((s, d) => s + parseFloat(d.actual_arr_usd!), 0)

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="page-title">Deals Pipeline</h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        Enterprise deal registrations across all Track C partners.
                    </p>
                </div>
                {totalARR > 0 && (
                    <div className="card p-4 shrink-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Closed ARR (view)</p>
                        <p className="text-xl font-black text-black">${totalARR.toLocaleString()}</p>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 border-2 border-black px-3 py-2 bg-white flex-1 max-w-xs">
                    <Search size={14} className="text-neutral-400 shrink-0" />
                    <input
                        className="flex-1 font-mono text-xs focus:outline-none"
                        placeholder="Search company or email…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="border-2 border-black px-3 py-2 font-mono text-xs focus:outline-none bg-white"
                    value={stageFilter}
                    onChange={e => setStageFilter(e.target.value as typeof STAGES[number])}
                >
                    {STAGES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
            </div>

            <div className="card overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-xs text-neutral-400 font-bold uppercase tracking-widest">Loading…</div>
                ) : deals.length === 0 ? (
                    <div className="p-10 text-center text-xs text-neutral-400 font-bold uppercase tracking-widest">
                        No {stageFilter === 'all' ? '' : stageFilter.replace('_', ' ')} deals
                    </div>
                ) : deals.map(deal => (
                    <DealRow key={deal.id} deal={deal} onAction={load} />
                ))}
            </div>
        </div>
    )
}
