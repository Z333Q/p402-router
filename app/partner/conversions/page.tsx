'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, AlertCircle, RefreshCw, Filter } from 'lucide-react'

interface AttributionRow {
    id: string
    partner_id: string
    attributed_tenant_id: string | null
    partner_link_id: string | null
    attribution_type: string
    first_click_at: string | null
    last_click_at: string | null
    attributed_at: string
    window_expires_at: string | null
    status: string
    link_code?: string
    link_label?: string
}

function statusColor(status: string) {
    switch (status) {
        case 'active':     return 'bg-primary text-black'
        case 'expired':    return 'bg-neutral-100 text-neutral-500'
        case 'superseded': return 'bg-warning/20 text-warning'
        case 'rejected':   return 'bg-error/10 text-error'
        default:           return 'bg-neutral-100 text-neutral-500'
    }
}

function typeLabel(type: string) {
    switch (type) {
        case 'cookie_last_touch': return 'Cookie'
        case 'registered_lead':   return 'Lead'
        case 'deal_registration': return 'Deal'
        case 'manual_override':   return 'Override'
        default:                  return type
    }
}

function fmt(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntilExpiry(iso: string | null): string {
    if (!iso) return '—'
    const diff = new Date(iso).getTime() - Date.now()
    const days = Math.ceil(diff / 86400000)
    if (days < 0)  return 'Expired'
    if (days === 0) return 'Today'
    return `${days}d`
}

export default function ConversionsPage() {
    const [rows, setRows]       = useState<AttributionRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState<string | null>(null)
    const [filter, setFilter]   = useState<'all' | 'active' | 'expired'>('all')

    const load = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/partner/analytics/conversions')
            if (!res.ok) throw new Error('Failed to load')
            const data = await res.json() as { conversions: AttributionRow[] }
            setRows(data.conversions ?? [])
        } catch {
            setError('Unable to load conversion data.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { void load() }, [])

    const filtered = rows.filter(r => {
        if (filter === 'active')  return r.status === 'active'
        if (filter === 'expired') return r.status !== 'active'
        return true
    })

    const activeCount  = rows.filter(r => r.status === 'active').length
    const expiredCount = rows.filter(r => r.status !== 'active').length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="page-title">Conversions</h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        Attribution records — from first click through to signup and activation.
                    </p>
                </div>
                <button onClick={load} className="btn btn-secondary flex items-center gap-2">
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Attributed',  value: rows.length },
                    { label: 'Active (in window)', value: activeCount },
                    { label: 'Expired',            value: expiredCount },
                ].map(s => (
                    <div key={s.label} className="card p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">{s.label}</p>
                        <p className="text-2xl font-black text-black mt-1">{loading ? '—' : s.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black flex-wrap gap-3">
                    <h2 className="section-header text-[11px]">Attribution Log</h2>
                    <div className="flex items-center gap-1">
                        <Filter size={12} className="text-neutral-400 mr-1" />
                        {(['all', 'active', 'expired'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest border transition-colors ${
                                    filter === f
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-neutral-400 border-neutral-200 hover:border-black hover:text-black'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="h-1 w-24 mx-auto overflow-hidden bg-neutral-100 border border-black">
                            <div className="h-full w-full animate-loading-bar bg-primary origin-left" />
                        </div>
                    </div>
                ) : error ? (
                    <div className="p-6 flex items-center gap-3">
                        <AlertCircle size={16} className="text-error" />
                        <p className="text-sm text-error font-bold">{error}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <TrendingUp className="h-8 w-8 text-neutral-200 mx-auto mb-3" />
                        <p className="text-sm font-black text-neutral-400 uppercase tracking-widest">No conversions yet</p>
                        <p className="text-xs text-neutral-400 mt-1">Attributions appear here when referred users sign up.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-100 bg-neutral-50">
                                    {['Status', 'Type', 'Source Link', 'First Click', 'Attributed', 'Window Expires'].map(h => (
                                        <th key={h} className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400 whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(row => (
                                    <tr key={row.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest border border-black/10 ${statusColor(row.status)}`}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-bold text-neutral-600">{typeLabel(row.attribution_type)}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {row.link_code ? (
                                                <span className="font-mono text-[11px] text-neutral-600">/r/{row.link_code}</span>
                                            ) : (
                                                <span className="text-[11px] text-neutral-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-[11px] text-neutral-600 whitespace-nowrap">{fmt(row.first_click_at)}</td>
                                        <td className="px-4 py-3 text-[11px] text-neutral-600 whitespace-nowrap">{fmt(row.attributed_at)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[11px] font-bold ${
                                                daysUntilExpiry(row.window_expires_at) === 'Expired'
                                                    ? 'text-error'
                                                    : 'text-neutral-600'
                                            }`}>
                                                {daysUntilExpiry(row.window_expires_at)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="card p-4 bg-neutral-50">
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                    <span className="font-black text-black">Privacy: </span>
                    Customer identifiers are anonymized in this view. Full attribution metadata
                    is retained for internal review and payout verification only.
                </p>
            </div>
        </div>
    )
}
