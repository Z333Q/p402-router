'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Check, AlertCircle, ChevronRight, Shield } from 'lucide-react'
import Link from 'next/link'

interface PartnerProfile {
    id: string
    display_name: string
    website_url: string | null
    type: string
    status: string
    referral_code: string
}

export default function PartnerSettingsPage() {
    const { data: session } = useSession()
    const user = session?.user as { partnerRole?: string; email?: string } | undefined

    const [profile, setProfile]     = useState<PartnerProfile | null>(null)
    const [displayName, setDisplayName] = useState('')
    const [websiteUrl, setWebsiteUrl]   = useState('')
    const [saving, setSaving]           = useState(false)
    const [saved, setSaved]             = useState(false)
    const [error, setError]             = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/partner/me')
            .then(r => r.json())
            .then((data: { partner: PartnerProfile }) => {
                setProfile(data.partner)
                setDisplayName(data.partner.display_name)
                setWebsiteUrl(data.partner.website_url ?? '')
            })
            .catch(() => {})
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError(null)
        setSaved(false)
        try {
            const res = await fetch('/api/partner/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ display_name: displayName, website_url: websiteUrl }),
            })
            if (!res.ok) throw new Error('Save failed')
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch {
            setError('Failed to save. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const inputCls = "w-full px-3 py-2.5 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 bg-white"
    const labelCls = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5"
    const roleBadge = user?.partnerRole?.replace('partner_', '').replace(/_/g, ' ') ?? '—'

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="page-title">Partner Settings</h1>
                <p className="text-sm text-neutral-500 mt-1">Profile, compliance, and account preferences.</p>
            </div>

            {/* Profile card */}
            <form onSubmit={handleSave} className="card p-6 space-y-5">
                <h3 className="section-header text-[11px]">Profile</h3>

                {/* Read-only fields */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Partner Role</label>
                        <div className="px-3 py-2.5 border-2 border-neutral-200 bg-neutral-50 font-mono text-sm text-neutral-500 capitalize">
                            {roleBadge}
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Referral Code</label>
                        <div className="px-3 py-2.5 border-2 border-neutral-200 bg-neutral-50 font-mono text-sm text-neutral-500">
                            {profile?.referral_code ?? '—'}
                        </div>
                    </div>
                </div>

                <div>
                    <label className={labelCls}>Email</label>
                    <div className="px-3 py-2.5 border-2 border-neutral-200 bg-neutral-50 font-mono text-sm text-neutral-500">
                        {user?.email ?? '—'}
                    </div>
                </div>

                {/* Editable fields */}
                <div>
                    <label className={labelCls}>Display Name <span className="text-error">*</span></label>
                    <input
                        className={inputCls}
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Your name or company"
                    />
                </div>

                <div>
                    <label className={labelCls}>Website / Profile URL</label>
                    <input
                        className={inputCls}
                        type="url"
                        value={websiteUrl}
                        onChange={e => setWebsiteUrl(e.target.value)}
                        placeholder="https://yourblog.com"
                    />
                </div>

                {error && (
                    <div className="flex items-center gap-2 border-2 border-error bg-error/5 px-3 py-2">
                        <AlertCircle size={14} className="text-error" />
                        <p className="text-xs font-bold text-error">{error}</p>
                    </div>
                )}

                <button type="submit" disabled={saving} className="btn btn-primary flex items-center gap-2 disabled:opacity-60">
                    {saved ? <Check size={14} strokeWidth={3} /> : null}
                    {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
                </button>
            </form>

            {/* Compliance section */}
            <div className="card p-6 space-y-4">
                <h3 className="section-header text-[11px]">Compliance & Payouts</h3>

                {[
                    {
                        label: 'Terms of Service',
                        sub: 'Partner Program Agreement v1.0 — accepted at enrollment',
                        done: true,
                        href: null,
                        action: null,
                    },
                    {
                        label: 'Tax Profile',
                        sub: 'Required before first payout. W-9 (US) or W-8BEN (international).',
                        done: false,
                        href: null,
                        action: 'Complete Tax Profile',
                    },
                    {
                        label: 'Payout Method',
                        sub: 'USDC on Base, Stripe Connect, Wise, or PayPal.',
                        done: false,
                        href: '/partner/payouts',
                        action: 'Add Payout Method',
                    },
                ].map(item => (
                    <div key={item.label} className="flex items-start justify-between gap-4 py-3 border-b border-neutral-100 last:border-0">
                        <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 border-2 flex items-center justify-center shrink-0 mt-0.5 ${item.done ? 'border-black bg-primary' : 'border-neutral-300'}`}>
                                {item.done && <Check size={10} strokeWidth={3} />}
                            </div>
                            <div>
                                <p className={`text-sm font-black ${item.done ? 'text-neutral-400' : 'text-black'}`}>{item.label}</p>
                                <p className="text-[11px] text-neutral-400 mt-0.5">{item.sub}</p>
                            </div>
                        </div>
                        {!item.done && item.action && (
                            item.href ? (
                                <Link href={item.href} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary border border-primary px-3 py-1.5 hover:bg-primary hover:text-black transition-colors shrink-0">
                                    {item.action} <ChevronRight size={10} />
                                </Link>
                            ) : (
                                <button className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-warning border border-warning px-3 py-1.5 hover:bg-warning hover:text-black transition-colors shrink-0">
                                    {item.action} <ChevronRight size={10} />
                                </button>
                            )
                        )}
                    </div>
                ))}
            </div>

            {/* Disclosure reminder */}
            <div className="card p-4 bg-neutral-50 flex items-start gap-3">
                <Shield size={14} className="text-neutral-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                    <strong className="text-black">Disclosure reminder: </strong>
                    You must disclose your financial relationship with P402 whenever you promote the product.
                    See the{' '}
                    <Link href="/partner/docs" className="text-black font-bold hover:text-primary transition-colors">
                        Compliance Docs
                    </Link>
                    {' '}for approved disclosure language.
                </p>
            </div>
        </div>
    )
}
