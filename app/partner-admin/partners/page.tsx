'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ExternalLink } from 'lucide-react'

interface Partner {
    id: string
    type: string
    status: string
    display_name: string
    website_url: string | null
    referral_code: string
    created_at: string
    tenant_email: string
    group_name: string | null
    total_clicks: number
    total_commissions: number
    total_earned: string
}

const STATUS_OPTS = ['all', 'approved', 'suspended', 'terminated', 'pending_review']

function StatusBadge({ status }: { status: string }) {
    const cls = status === 'approved' ? 'bg-success/10 border-success text-success'
        : status === 'suspended' ? 'bg-warning/10 border-warning text-warning'
        : status === 'terminated' ? 'bg-error/10 border-error text-error'
        : 'bg-neutral-100 border-neutral-300 text-neutral-500'
    return (
        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border ${cls}`}>
            {status.replace('_', ' ')}
        </span>
    )
}

export default function AdminPartnersPage() {
    const [statusFilter, setStatusFilter] = useState('approved')
    const [search, setSearch] = useState('')
    const [partners, setPartners] = useState<Partner[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ status: statusFilter, q: search })
            const res = await fetch(`/api/partner-admin/partners?${params}`)
            const data = await res.json()
            setPartners(data.partners ?? [])
        } finally {
            setLoading(false)
        }
    }, [statusFilter, search])

    useEffect(() => { load() }, [load])

    const updateStatus = async (id: string, newStatus: string) => {
        setUpdating(id)
        try {
            await fetch(`/api/partner-admin/partners/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            await load()
        } finally {
            setUpdating(null)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="page-title">Partners</h1>
                <p className="text-sm text-neutral-500 mt-1">Manage partner accounts, status, and performance at a glance.</p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 border-2 border-black px-3 py-2 bg-white flex-1 max-w-xs">
                    <Search size={14} className="text-neutral-400 shrink-0" />
                    <input
                        className="flex-1 font-mono text-xs focus:outline-none"
                        placeholder="Search name or email…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="border-2 border-black px-3 py-2 font-mono text-xs focus:outline-none bg-white"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                >
                    {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b-2 border-black bg-neutral-50">
                            {['Partner', 'Type / Group', 'Status', 'Clicks', 'Earned', 'Actions'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-500">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="p-10 text-center text-neutral-400 text-xs uppercase tracking-widest font-bold">
                                    Loading…
                                </td>
                            </tr>
                        ) : partners.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-10 text-center text-neutral-400 text-xs uppercase tracking-widest font-bold">
                                    No partners found
                                </td>
                            </tr>
                        ) : partners.map(p => (
                            <tr key={p.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="font-bold text-black">{p.display_name}</div>
                                    <div className="font-mono text-[10px] text-neutral-400">{p.tenant_email}</div>
                                    <div className="font-mono text-[9px] text-neutral-300 mt-0.5">/{p.referral_code}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="capitalize text-black font-bold">{p.type.replace('_', ' ')}</div>
                                    {p.group_name && <div className="text-[10px] text-neutral-400">{p.group_name}</div>}
                                </td>
                                <td className="px-4 py-3">
                                    <StatusBadge status={p.status} />
                                </td>
                                <td className="px-4 py-3 font-mono text-neutral-600">
                                    {p.total_clicks.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 font-mono font-bold text-black">
                                    ${parseFloat(p.total_earned).toFixed(2)}
                                    {p.total_commissions > 0 && (
                                        <div className="text-[10px] font-normal text-neutral-400">
                                            {p.total_commissions} entries
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {p.website_url && (
                                            <a href={p.website_url} target="_blank" rel="noopener noreferrer"
                                               className="p-1.5 border border-neutral-200 hover:border-black transition-colors">
                                                <ExternalLink size={10} />
                                            </a>
                                        )}
                                        {p.status === 'approved' && (
                                            <button
                                                onClick={() => updateStatus(p.id, 'suspended')}
                                                disabled={updating === p.id}
                                                className="px-2 py-1 text-[9px] font-black uppercase tracking-widest border border-warning text-warning hover:bg-warning hover:text-black transition-colors disabled:opacity-60"
                                            >
                                                Suspend
                                            </button>
                                        )}
                                        {p.status === 'suspended' && (
                                            <button
                                                onClick={() => updateStatus(p.id, 'approved')}
                                                disabled={updating === p.id}
                                                className="px-2 py-1 text-[9px] font-black uppercase tracking-widest border border-success text-success hover:bg-success hover:text-black transition-colors disabled:opacity-60"
                                            >
                                                Reinstate
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
