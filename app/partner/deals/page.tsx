'use client'

import { useState, useEffect } from 'react'
import { Briefcase, CheckCircle, Clock, ChevronRight } from 'lucide-react'

interface Deal {
    id: string
    company_name: string
    contact_name: string
    contact_email: string
    estimated_arr_usd: string | null
    expected_close_date: string | null
    stage: string
    actual_arr_usd: string | null
    created_at: string
}

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

// Deals page is for partner_enterprise_referrer track (Track C).

const DEAL_STAGES = [
    { key: 'registered',  label: 'Registered',   desc: 'Deal logged, P402 review pending' },
    { key: 'accepted',    label: 'Accepted',      desc: 'P402 confirmed deal is in scope' },
    { key: 'negotiating', label: 'Negotiating',   desc: 'Active commercial discussion' },
    { key: 'closed_won',  label: 'Closed Won',    desc: 'Contract signed — commission pending' },
    { key: 'closed_lost', label: 'Closed Lost',   desc: 'Deal did not close' },
]

function DealStageFlow() {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {DEAL_STAGES.map((stage, i) => (
                <div key={stage.key} className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                        <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border border-neutral-200 bg-neutral-50 text-neutral-500">
                            {stage.label}
                        </span>
                        <span className="text-[9px] text-neutral-300 mt-0.5 max-w-[80px] text-center leading-tight">{stage.desc}</span>
                    </div>
                    {i < DEAL_STAGES.length - 2 && (
                        <ChevronRight size={12} className="text-neutral-200 shrink-0 self-start mt-1" />
                    )}
                </div>
            ))}
        </div>
    )
}

export default function PartnerDealsPage() {
    const [showForm, setShowForm] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [deals, setDeals] = useState<Deal[]>([])
    const [loadingDeals, setLoadingDeals] = useState(true)
    const [form, setForm] = useState({
        company_name: '',
        contact_name: '',
        contact_email: '',
        estimated_arr: '',
        close_date: '',
        description: '',
    })
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/partner/deals')
            .then(r => r.json())
            .then(d => setDeals(d.deals ?? []))
            .catch(() => {})
            .finally(() => setLoadingDeals(false))
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setSaveError(null)
        try {
            const res = await fetch('/api/partner/deals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_name: form.company_name,
                    contact_name: form.contact_name,
                    contact_email: form.contact_email,
                    estimated_arr_usd: form.estimated_arr ? parseFloat(form.estimated_arr) : undefined,
                    expected_close_date: form.close_date || undefined,
                    description: form.description || undefined,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Submission failed')
            setSubmitted(true)
            setShowForm(false)
            setForm({ company_name: '', contact_name: '', contact_email: '', estimated_arr: '', close_date: '', description: '' })
            const refresh = await fetch('/api/partner/deals')
            const refreshData = await refresh.json()
            setDeals(refreshData.deals ?? [])
        } catch (err: unknown) {
            setSaveError(err instanceof Error ? err.message : 'Submission failed')
        } finally {
            setSaving(false)
        }
    }

    const inputCls = "w-full px-3 py-2.5 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 bg-white"
    const labelCls = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5"

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="page-title">Deals</h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        Register enterprise referrals to lock 7% year-one revenue attribution.
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(s => !s); setSubmitted(false) }}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Briefcase size={14} /> Register Deal
                </button>
            </div>

            {/* Commission terms card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Commission Rate', value: '7%', sub: 'of year-one net revenue' },
                    { label: 'Hold Period',      value: '45 days', sub: 'from contract activation' },
                    { label: 'Attribution Lock', value: 'On registration', sub: 'beats cookie last-touch' },
                ].map(card => (
                    <div key={card.label} className="card p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">{card.label}</p>
                        <p className="text-xl font-black text-black mt-1">{card.value}</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">{card.sub}</p>
                    </div>
                ))}
            </div>

            {/* Stage flow */}
            <div className="card p-5">
                <h3 className="section-header text-[11px] mb-4">Deal Stage Flow</h3>
                <DealStageFlow />
            </div>

            {/* Registration form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="card p-6 space-y-5">
                    <h3 className="section-header text-[11px]">Register Enterprise Deal</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Company Name <span className="text-error">*</span></label>
                            <input className={inputCls} required value={form.company_name}
                                onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                                placeholder="Acme Corp" />
                        </div>
                        <div>
                            <label className={labelCls}>Contact Name <span className="text-error">*</span></label>
                            <input className={inputCls} required value={form.contact_name}
                                onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                                placeholder="Jane Smith" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Contact Email <span className="text-error">*</span></label>
                            <input className={inputCls} type="email" required value={form.contact_email}
                                onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                                placeholder="jane@acme.com" />
                        </div>
                        <div>
                            <label className={labelCls}>Estimated ARR (USD)</label>
                            <input className={inputCls} value={form.estimated_arr}
                                onChange={e => setForm(f => ({ ...f, estimated_arr: e.target.value }))}
                                placeholder="e.g. 50000" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Expected Close Date</label>
                            <input className={inputCls} type="date" value={form.close_date}
                                onChange={e => setForm(f => ({ ...f, close_date: e.target.value }))} />
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Deal Description</label>
                        <textarea className={inputCls} rows={3} value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="How did you source this lead? What's the use case? Timeline?" />
                    </div>
                    {saveError && <p className="text-xs text-error font-bold">{saveError}</p>}
                    <div className="flex items-center gap-3">
                        <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-60">
                            {saving ? 'Submitting…' : 'Register Deal'}
                        </button>
                        <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                            Cancel
                        </button>
                    </div>
                    <p className="text-[10px] text-neutral-400">
                        Deal registrations are reviewed within 2 business days.
                        Attribution locks to your account immediately upon submission.
                    </p>
                </form>
            )}

            {submitted && (
                <div className="card p-5 flex items-center gap-3 bg-success/5 border-success">
                    <CheckCircle size={16} className="text-success shrink-0" />
                    <div>
                        <p className="text-sm font-black text-black">Deal registered successfully.</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                            Attribution locked. P402 will review and confirm within 2 business days.
                            You will be notified when the deal stage updates.
                        </p>
                    </div>
                </div>
            )}

            {/* Deals table */}
            <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black">
                    <h3 className="section-header text-[11px]">Registered Deals</h3>
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        {deals.length} total
                    </span>
                </div>
                {loadingDeals ? (
                    <div className="p-8 text-center text-xs text-neutral-400 uppercase tracking-widest font-bold">Loading…</div>
                ) : deals.length === 0 ? (
                    <div className="p-10 text-center">
                        <Clock className="h-7 w-7 text-neutral-200 mx-auto mb-3" />
                        <p className="text-sm font-black text-neutral-400 uppercase tracking-widest">No deals yet</p>
                        <p className="text-xs text-neutral-400 mt-1">
                            Register your first enterprise deal to lock attribution.
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b-2 border-black bg-neutral-50">
                                {['Company', 'Contact', 'Stage', 'Est. ARR', 'Registered'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-500">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {deals.map(deal => (
                                <tr key={deal.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                                    <td className="px-4 py-3 font-bold text-black">{deal.company_name}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-bold">{deal.contact_name}</div>
                                        <div className="font-mono text-[10px] text-neutral-400">{deal.contact_email}</div>
                                    </td>
                                    <td className="px-4 py-3"><StageBadge stage={deal.stage} /></td>
                                    <td className="px-4 py-3 font-mono text-neutral-600">
                                        {deal.actual_arr_usd
                                            ? `$${parseFloat(deal.actual_arr_usd).toLocaleString()}`
                                            : deal.estimated_arr_usd
                                                ? `~$${parseFloat(deal.estimated_arr_usd).toLocaleString()}`
                                                : '—'
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-neutral-400">{new Date(deal.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Rules */}
            <div className="card p-5 bg-neutral-50">
                <h3 className="section-header text-[11px] mb-3">Deal Registration Rules</h3>
                <ul className="space-y-2 text-[11px] text-neutral-600 leading-relaxed">
                    <li className="flex items-start gap-2">
                        <span className="w-4 h-4 border-2 border-black bg-primary flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[8px] font-black">1</span>
                        </span>
                        Deal must involve a net-new customer (not an existing P402 customer).
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-4 h-4 border-2 border-black bg-primary flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[8px] font-black">2</span>
                        </span>
                        Duplicate registrations are rejected — first partner to register wins.
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-4 h-4 border-2 border-black bg-primary flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[8px] font-black">3</span>
                        </span>
                        Registration expires after 90 days if no progress recorded.
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-4 h-4 border-2 border-black bg-primary flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[8px] font-black">4</span>
                        </span>
                        Commission is calculated on year-one net contract value (ex. taxes, refunds).
                    </li>
                </ul>
            </div>
        </div>
    )
}
