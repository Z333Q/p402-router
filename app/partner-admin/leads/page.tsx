'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'

interface Lead {
    id: string
    company_name: string
    contact_name: string
    contact_email: string
    estimated_seats: number | null
    notes: string | null
    stage: string
    rejection_reason: string | null
    expires_at: string
    created_at: string
    partner_name: string
    referral_code: string
    partner_email: string
}

const STAGES = ['all', 'submitted', 'accepted', 'in_progress', 'converted', 'rejected'] as const

function StageBadge({ stage }: { stage: string }) {
    const cls = stage === 'converted' ? 'bg-success/10 border-success text-success'
        : stage === 'accepted' || stage === 'in_progress' ? 'bg-primary/20 border-black text-black'
        : stage === 'rejected' ? 'bg-error/10 border-error text-error'
        : 'bg-neutral-100 border-neutral-200 text-neutral-500'
    return (
        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border ${cls}`}>
            {stage.replace('_', ' ')}
        </span>
    )
}

function LeadRow({ lead, onAction }: { lead: Lead; onAction: () => void }) {
    const [expanded, setExpanded] = useState(false)
    const [newStage, setNewStage] = useState(lead.stage)
    const [notes, setNotes] = useState('')
    const [acting, setActing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const canAction = lead.stage === 'submitted' || lead.stage === 'in_progress' || lead.stage === 'accepted'

    const update = async () => {
        setActing(true)
        setError(null)
        try {
            const res = await fetch('/api/partner-admin/leads', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: lead.id,
                    stage: newStage,
                    review_notes: notes || undefined,
                    rejection_reason: newStage === 'rejected' ? (notes || 'Not qualified') : undefined,
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

    return (
        <div className="border-b border-neutral-100 last:border-0">
            <div
                className="flex items-center gap-4 py-3.5 px-5 cursor-pointer hover:bg-neutral-50"
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex-1 grid grid-cols-4 gap-4 items-center min-w-0">
                    <div>
                        <p className="text-xs font-black text-black">{lead.company_name}</p>
                        <p className="text-[10px] text-neutral-400">{lead.contact_name}</p>
                    </div>
                    <div>
                        <p className="text-[11px] font-mono text-neutral-600">{lead.contact_email}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-black">{lead.partner_name}</p>
                        <p className="font-mono text-[10px] text-neutral-400">{lead.partner_email}</p>
                    </div>
                    <div className="flex items-center gap-3 justify-between">
                        <StageBadge stage={lead.stage} />
                        <span className="text-[10px] text-neutral-400">{new Date(lead.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                {expanded ? <ChevronUp size={14} className="text-neutral-400 shrink-0" /> : <ChevronDown size={14} className="text-neutral-400 shrink-0" />}
            </div>

            {expanded && (
                <div className="px-5 pb-5 bg-neutral-50 border-t border-neutral-100 space-y-4 pt-4">
                    {lead.notes && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Partner Notes</p>
                            <p className="text-xs text-neutral-700">{lead.notes}</p>
                        </div>
                    )}
                    {lead.estimated_seats && (
                        <p className="text-xs text-neutral-600">Estimated seats: <strong>{lead.estimated_seats}</strong></p>
                    )}
                    <p className="text-xs text-neutral-400">
                        Expires: {new Date(lead.expires_at).toLocaleDateString()}
                    </p>

                    {canAction && (
                        <div className="flex items-end gap-3 flex-wrap">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">New Stage</label>
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
                            <div className="flex-1 min-w-[200px]">
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
                                disabled={acting || newStage === lead.stage}
                                className="btn btn-primary text-xs disabled:opacity-60"
                            >
                                {acting ? 'Updating…' : 'Update Stage'}
                            </button>
                        </div>
                    )}
                    {error && <p className="text-xs text-error font-bold">{error}</p>}
                </div>
            )}
        </div>
    )
}

export default function AdminLeadsPage() {
    const [stageFilter, setStageFilter] = useState<typeof STAGES[number]>('submitted')
    const [search, setSearch] = useState('')
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ stage: stageFilter, q: search })
            const res = await fetch(`/api/partner-admin/leads?${params}`)
            const data = await res.json()
            setLeads(data.leads ?? [])
        } finally {
            setLoading(false)
        }
    }, [stageFilter, search])

    useEffect(() => { load() }, [load])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="page-title">Leads Pipeline</h1>
                <p className="text-sm text-neutral-500 mt-1">
                    Review and advance partner-registered leads through the sales pipeline.
                </p>
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
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className="card overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-xs text-neutral-400 font-bold uppercase tracking-widest">Loading…</div>
                ) : leads.length === 0 ? (
                    <div className="p-10 text-center text-xs text-neutral-400 font-bold uppercase tracking-widest">
                        No {stageFilter === 'all' ? '' : stageFilter} leads
                    </div>
                ) : leads.map(lead => (
                    <LeadRow key={lead.id} lead={lead} onAction={load} />
                ))}
            </div>
        </div>
    )
}
