'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Clock, CheckCircle, AlertTriangle, Download } from 'lucide-react'
import Link from 'next/link'

interface CommissionSummary {
    pendingAmount: number
    approvedAmount: number
    paidAmount: number
    totalEarned: number
}

interface CommissionEntry {
    id: string
    source_event_type: string
    commission_amount: string
    currency: string
    status: string
    hold_until: string
    month_number: number
    created_at: string
    offer_name: string
}

const STATUS_TABS = ['all', 'pending', 'approved', 'paid', 'declined'] as const

function StatusBadge({ status }: { status: string }) {
    const cls = status === 'paid' ? 'bg-success/10 border-success text-success'
        : status === 'approved' ? 'bg-primary/20 border-black text-black'
        : status === 'in_payout' ? 'bg-info/10 border-info text-info'
        : status === 'declined' || status === 'reversed' ? 'bg-error/10 border-error text-error'
        : 'bg-neutral-100 border-neutral-200 text-neutral-500'
    return <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border ${cls}`}>{status}</span>
}

function HoldTag({ holdUntil, status }: { holdUntil: string; status: string }) {
    if (status !== 'pending') return null
    const past = new Date(holdUntil) <= new Date()
    if (past) return <span className="text-[9px] font-black text-warning uppercase">Hold elapsed</span>
    return <span className="text-[9px] text-neutral-400">Hold until {new Date(holdUntil).toLocaleDateString()}</span>
}

export default function CommissionsPage() {
    const [activeTab, setActiveTab] = useState<typeof STATUS_TABS[number]>('all')
    const [summary, setSummary] = useState<CommissionSummary | null>(null)
    const [entries, setEntries] = useState<CommissionEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const res = await fetch(`/api/partner/commissions?status=${activeTab}`)
                const data = await res.json()
                setSummary(data.summary)
                setEntries(data.entries ?? [])
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [activeTab])

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="page-title">Commissions</h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        Your commission ledger. Commissions enter a hold period before payout.
                    </p>
                </div>
                <a
                    href={`/api/partner/commissions?format=csv&status=${activeTab}&limit=1000`}
                    download
                    className="btn btn-secondary flex items-center gap-2 text-xs"
                >
                    <Download size={13} /> Export CSV
                </a>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Earned',   value: summary?.totalEarned,    icon: DollarSign, color: 'text-black' },
                    { label: 'Pending (Hold)', value: summary?.pendingAmount,  icon: Clock,      color: 'text-warning' },
                    { label: 'Approved',       value: summary?.approvedAmount, icon: CheckCircle,color: 'text-success' },
                    { label: 'Paid Out',       value: summary?.paidAmount,     icon: DollarSign, color: 'text-neutral-400' },
                ].map(card => (
                    <div key={card.label} className="card p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <card.icon size={14} className={card.color} />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">{card.label}</p>
                        </div>
                        <p className={`text-2xl font-black ${card.color}`}>
                            ${loading ? '—' : (card.value ?? 0).toFixed(2)}
                        </p>
                    </div>
                ))}
            </div>

            {/* Commission lifecycle explainer */}
            <div className="card p-5">
                <h3 className="section-header text-[11px] mb-3">Commission Lifecycle</h3>
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    {[
                        { s: 'pending',   desc: 'In hold period' },
                        { s: '→' },
                        { s: 'approved',  desc: 'Hold elapsed, passed review' },
                        { s: '→' },
                        { s: 'in_payout', desc: 'Included in payout batch' },
                        { s: '→' },
                        { s: 'paid',      desc: 'Transfer confirmed' },
                    ].map((step, i) => (
                        step.s === '→' ? (
                            <span key={i} className="text-neutral-300 font-black">→</span>
                        ) : (
                            <div key={i} className="flex items-center gap-1.5">
                                <StatusBadge status={step.s} />
                                {step.desc && <span className="text-neutral-400">{step.desc}</span>}
                            </div>
                        )
                    ))}
                </div>
                <p className="text-[11px] text-neutral-500 mt-3 leading-relaxed">
                    <strong className="text-black">Hold periods:</strong> 30 days for subscription commissions, 45 days for usage and enterprise commissions.
                    Holds protect against chargebacks and refunds.
                </p>
            </div>

            {/* Tabs + table */}
            <div className="space-y-0">
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
                            <DollarSign className="h-7 w-7 text-neutral-200 mx-auto mb-3" />
                            <p className="text-sm font-black text-neutral-400 uppercase tracking-widest">
                                {activeTab === 'all' ? 'No commissions yet' : `No ${activeTab} commissions`}
                            </p>
                            <p className="text-xs text-neutral-400 mt-1">
                                Share your referral link to earn commissions on new subscriptions.
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b-2 border-black bg-neutral-50">
                                    {['Offer', 'Event', 'Amount', 'Month', 'Status / Hold', 'Date'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-500">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map(e => (
                                    <tr key={e.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                                        <td className="px-4 py-3 font-bold text-black max-w-[180px] truncate">{e.offer_name}</td>
                                        <td className="px-4 py-3 font-mono text-[10px] text-neutral-500">{e.source_event_type}</td>
                                        <td className="px-4 py-3 font-black font-mono text-black">
                                            ${parseFloat(e.commission_amount).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-neutral-500">#{e.month_number}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <StatusBadge status={e.status} />
                                                <HoldTag holdUntil={e.hold_until} status={e.status} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-[11px] text-neutral-400">
                                            {new Date(e.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Payout reminder */}
            <div className="card p-4 bg-neutral-50 flex items-start gap-3">
                <AlertTriangle size={14} className="text-neutral-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                    <strong className="text-black">Payout prerequisites: </strong>
                    Complete your{' '}
                    <Link href="/partner/settings" className="text-black font-bold hover:text-primary">tax profile</Link>
                    {' '}and add a{' '}
                    <Link href="/partner/payouts" className="text-black font-bold hover:text-primary">payout method</Link>
                    {' '}before your first commission reaches approved status.
                    Minimum payout threshold: <strong className="text-black">$25</strong>.
                </p>
            </div>
        </div>
    )
}
