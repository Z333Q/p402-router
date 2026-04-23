'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Clock, CheckCircle, ChevronRight } from 'lucide-react'
import Link from 'next/link'

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
}

const LEAD_STAGES = [
    { key: 'submitted',   label: 'Submitted',   desc: 'Logged — under P402 review' },
    { key: 'accepted',    label: 'Accepted',     desc: 'P402 confirmed lead is qualified' },
    { key: 'in_progress', label: 'In Progress',  desc: 'Active conversation with P402 sales' },
    { key: 'converted',   label: 'Converted',    desc: 'Lead became a paid customer' },
    { key: 'rejected',    label: 'Rejected',     desc: 'Not qualified or duplicate' },
]

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

function LeadStageFlow() {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {LEAD_STAGES.map((stage, i) => (
                <div key={stage.key} className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                        <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border border-neutral-200 bg-neutral-50 text-neutral-500">
                            {stage.label}
                        </span>
                        <span className="text-[9px] text-neutral-300 mt-0.5 max-w-[80px] text-center leading-tight">{stage.desc}</span>
                    </div>
                    {i < LEAD_STAGES.length - 1 && (
                        <ChevronRight size={12} className="text-neutral-200 shrink-0 self-start mt-1" />
                    )}
                </div>
            ))}
        </div>
    )
}

export default function PartnerLeadsPage() {
    const [showForm, setShowForm] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [leads, setLeads] = useState<Lead[]>([])
    const [loadingLeads, setLoadingLeads] = useState(true)
    const [form, setForm] = useState({
        company_name: '',
        contact_name: '',
        contact_email: '',
        estimated_seats: '',
        notes: '',
    })
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/partner/leads')
            .then(r => r.json())
            .then(d => setLeads(d.leads ?? []))
            .catch(() => {})
            .finally(() => setLoadingLeads(false))
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setSaveError(null)
        try {
            const res = await fetch('/api/partner/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_name: form.company_name,
                    contact_name: form.contact_name,
                    contact_email: form.contact_email,
                    estimated_seats: form.estimated_seats ? parseInt(form.estimated_seats, 10) : undefined,
                    notes: form.notes || undefined,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Submission failed')
            setSubmitted(true)
            setShowForm(false)
            setForm({ company_name: '', contact_name: '', contact_email: '', estimated_seats: '', notes: '' })
            // Refresh leads list
            const refresh = await fetch('/api/partner/leads')
            const refreshData = await refresh.json()
            setLeads(refreshData.leads ?? [])
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
                    <h1 className="page-title">Leads</h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        Register qualified prospects. Registered leads take attribution precedence over referral links.
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(s => !s); setSubmitted(false) }}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <UserPlus size={14} /> Register Lead
                </button>
            </div>

            {/* Attribution priority callout */}
            <div className="card p-4 bg-primary/5 border-primary/30">
                <p className="text-[11px] text-neutral-700 leading-relaxed">
                    <strong className="text-black">Attribution priority:</strong>{' '}
                    Registered leads have higher attribution precedence than cookie-based referral links.
                    Register a lead early in the sales cycle to lock attribution before the prospect clicks any other partner link.
                </p>
            </div>

            {/* Lead stage flow */}
            <div className="card p-5">
                <h3 className="section-header text-[11px] mb-4">Lead Stage Flow</h3>
                <LeadStageFlow />
            </div>

            {/* Register lead form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="card p-6 space-y-5">
                    <h3 className="section-header text-[11px]">Register New Lead</h3>
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
                            <label className={labelCls}>Estimated Seats</label>
                            <input className={inputCls} value={form.estimated_seats}
                                onChange={e => setForm(f => ({ ...f, estimated_seats: e.target.value }))}
                                placeholder="e.g. 50" />
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Notes</label>
                        <textarea className={inputCls} rows={3} value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder="Context about the opportunity, timeline, pain points…" />
                    </div>
                    {saveError && <p className="text-xs text-error font-bold">{saveError}</p>}
                    <div className="flex items-center gap-3">
                        <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-60">
                            {saving ? 'Submitting…' : 'Submit Lead'}
                        </button>
                        <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {submitted && (
                <div className="card p-5 flex items-center gap-3 bg-success/5 border-success">
                    <CheckCircle size={16} className="text-success shrink-0" />
                    <div>
                        <p className="text-sm font-black text-black">Lead registered successfully.</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">P402 will review within 1 business day. Attribution is locked to your account from this moment.</p>
                    </div>
                </div>
            )}

            {/* Leads table */}
            <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black">
                    <h3 className="section-header text-[11px]">Registered Leads</h3>
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        {leads.length} total
                    </span>
                </div>
                {loadingLeads ? (
                    <div className="p-8 text-center text-xs text-neutral-400 uppercase tracking-widest font-bold">Loading…</div>
                ) : leads.length === 0 ? (
                    <div className="p-10 text-center">
                        <Clock className="h-7 w-7 text-neutral-200 mx-auto mb-3" />
                        <p className="text-sm font-black text-neutral-400 uppercase tracking-widest">No leads yet</p>
                        <p className="text-xs text-neutral-400 mt-1">
                            Register your first lead to lock attribution before they sign up.
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b-2 border-black bg-neutral-50">
                                {['Company', 'Contact', 'Stage', 'Seats', 'Registered'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-500">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map(lead => (
                                <tr key={lead.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                                    <td className="px-4 py-3 font-bold text-black">{lead.company_name}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-bold">{lead.contact_name}</div>
                                        <div className="font-mono text-[10px] text-neutral-400">{lead.contact_email}</div>
                                    </td>
                                    <td className="px-4 py-3"><StageBadge stage={lead.stage} /></td>
                                    <td className="px-4 py-3 text-neutral-500">{lead.estimated_seats ?? '—'}</td>
                                    <td className="px-4 py-3 text-neutral-400">{new Date(lead.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="card p-4 bg-neutral-50 flex items-start gap-3">
                <UserPlus size={14} className="text-neutral-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Need to register an enterprise deal?{' '}
                    <Link href="/partner/deals" className="text-black font-bold hover:text-primary">
                        Use the Deals page →
                    </Link>
                    {' '}for Track C enterprise referral registrations with revenue-share tracking.
                </p>
            </div>
        </div>
    )
}
