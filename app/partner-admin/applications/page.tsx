'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, Clock, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

interface Application {
    id: string
    email: string
    name: string
    website_url: string | null
    channel_type: string | null
    audience_size: string | null
    audience_description: string | null
    partner_type_interest: string
    why_p402: string | null
    promotion_plan: string | null
    status: string
    review_notes: string | null
    partner_id: string | null
    created_at: string
}

const STATUS_TABS = ['pending', 'reviewing', 'approved', 'rejected', 'all'] as const

function StatusDot({ status }: { status: string }) {
    const cls = status === 'approved' ? 'bg-success'
        : status === 'rejected' ? 'bg-error'
        : status === 'reviewing' ? 'bg-warning'
        : 'bg-neutral-300'
    return <span className={`inline-block w-2 h-2 border border-black shrink-0 ${cls}`} />
}

function ApplicationRow({ app, onAction }: {
    app: Application
    onAction: () => void
}) {
    const [expanded, setExpanded] = useState(false)
    const [notes, setNotes] = useState('')
    const [acting, setActing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const act = async (action: 'approve' | 'reject') => {
        if (action === 'reject' && !notes.trim()) {
            setError('Review notes required for rejection.')
            return
        }
        setActing(true)
        setError(null)
        try {
            const res = await fetch(`/api/partner-admin/applications/${app.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, review_notes: notes || undefined }),
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

    const isPending = app.status === 'pending' || app.status === 'reviewing'

    return (
        <div className="border-b border-neutral-100 last:border-0">
            <div
                className="flex items-center gap-4 py-4 px-5 cursor-pointer hover:bg-neutral-50 transition-colors"
                onClick={() => setExpanded(e => !e)}
            >
                <StatusDot status={app.status} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-black text-black">{app.name}</span>
                        <span className="text-xs text-neutral-400 font-mono">{app.email}</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-neutral-100 border border-neutral-200 text-neutral-500">
                            {app.partner_type_interest}
                        </span>
                        {app.channel_type && (
                            <span className="text-[10px] text-neutral-400">{app.channel_type}</span>
                        )}
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                        {new Date(app.created_at).toLocaleDateString()} · {app.audience_size ?? 'n/a'}
                    </p>
                </div>
                {app.website_url && (
                    <a
                        href={app.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-neutral-400 hover:text-black transition-colors"
                    >
                        <ExternalLink size={12} />
                    </a>
                )}
                {expanded ? <ChevronUp size={14} className="text-neutral-400 shrink-0" /> : <ChevronDown size={14} className="text-neutral-400 shrink-0" />}
            </div>

            {expanded && (
                <div className="px-5 pb-5 space-y-4 bg-neutral-50 border-t border-neutral-100">
                    {app.audience_description && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Audience</p>
                            <p className="text-xs text-neutral-700">{app.audience_description}</p>
                        </div>
                    )}
                    {app.why_p402 && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Why P402</p>
                            <p className="text-xs text-neutral-700">{app.why_p402}</p>
                        </div>
                    )}
                    {app.promotion_plan && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Promotion Plan</p>
                            <p className="text-xs text-neutral-700">{app.promotion_plan}</p>
                        </div>
                    )}
                    {app.review_notes && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Review Notes</p>
                            <p className="text-xs text-neutral-700">{app.review_notes}</p>
                        </div>
                    )}

                    {isPending && (
                        <div className="flex flex-col gap-3 pt-2">
                            <textarea
                                className="w-full px-3 py-2 border-2 border-black font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                rows={2}
                                placeholder="Review notes (required for rejection)"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                            {error && <p className="text-xs text-error font-bold">{error}</p>}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => act('approve')}
                                    disabled={acting}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary border-2 border-black text-[10px] font-black uppercase tracking-widest hover:bg-primary-hover transition-colors disabled:opacity-60"
                                >
                                    <CheckCircle size={12} /> Approve
                                </button>
                                <button
                                    onClick={() => act('reject')}
                                    disabled={acting}
                                    className="flex items-center gap-2 px-4 py-2 border-2 border-black text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 transition-colors disabled:opacity-60"
                                >
                                    <XCircle size={12} /> Reject
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default function AdminApplicationsPage() {
    const [activeTab, setActiveTab] = useState<typeof STATUS_TABS[number]>('pending')
    const [applications, setApplications] = useState<Application[]>([])
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/partner-admin/applications?status=${activeTab}`)
            const data = await res.json()
            setApplications(data.applications ?? [])
        } finally {
            setLoading(false)
        }
    }, [activeTab])

    useEffect(() => { load() }, [load])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="page-title">Applications</h1>
                <p className="text-sm text-neutral-500 mt-1">Review and action partner program applications.</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b-2 border-black">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest border-r border-neutral-200 transition-colors ${
                            activeTab === tab
                                ? 'bg-primary text-black border-b-2 border-b-black -mb-0.5'
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
                        <Clock className="h-6 w-6 text-neutral-200 mx-auto mb-3" />
                        <p className="text-xs text-neutral-400 uppercase tracking-widest font-bold">Loading…</p>
                    </div>
                ) : applications.length === 0 ? (
                    <div className="p-10 text-center">
                        <p className="text-xs text-neutral-400 uppercase tracking-widest font-bold">No {activeTab} applications</p>
                    </div>
                ) : (
                    applications.map(app => (
                        <ApplicationRow key={app.id} app={app} onAction={load} />
                    ))
                )}
            </div>
        </div>
    )
}
