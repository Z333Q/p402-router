'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
    Plus,
    Copy,
    Check,
    Pause,
    Play,
    ExternalLink,
    Link2,
    X,
    AlertCircle,
    ChevronRight,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PartnerLink {
    id: string
    code: string
    label: string | null
    destination_path: string
    utm_source: string | null
    utm_medium: string | null
    utm_campaign: string | null
    default_subid: string | null
    status: 'active' | 'paused' | 'expired'
    click_count: number
    created_at: string
}

interface CreateLinkForm {
    label: string
    destination_path: string
    utm_source: string
    utm_medium: string
    utm_campaign: string
    default_subid: string
    custom_code: string
}

const BLANK_FORM: CreateLinkForm = {
    label: '',
    destination_path: '/',
    utm_source: 'partner',
    utm_medium: 'referral',
    utm_campaign: '',
    default_subid: '',
    custom_code: '',
}

const DESTINATIONS = [
    { label: 'Home',           value: '/' },
    { label: 'Pricing',        value: '/pricing' },
    { label: 'Docs — Router',  value: '/docs/router' },
    { label: 'Docs — WDK',     value: '/docs/wdk' },
    { label: 'Bazaar',         value: '/dashboard/bazaar' },
    { label: 'Custom…',        value: '__custom__' },
]

// ---------------------------------------------------------------------------
// Inline hooks
// ---------------------------------------------------------------------------

function useCopy(text: string) {
    const [copied, setCopied] = useState(false)
    const copy = useCallback(async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [text])
    return { copied, copy }
}

function linkUrl(code: string) {
    return `${typeof window !== 'undefined' ? window.location.origin : 'https://p402.io'}/r/${code}`
}

// ---------------------------------------------------------------------------
// URL preview
// ---------------------------------------------------------------------------

function UrlPreview({ form }: { form: CreateLinkForm }) {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://p402.io'
    const dest = form.destination_path === '__custom__' ? '/' : form.destination_path

    let destWithUtm = dest
    try {
        const url = new URL(dest.startsWith('http') ? dest : `${base}${dest}`)
        if (form.utm_source)   url.searchParams.set('utm_source',   form.utm_source)
        if (form.utm_medium)   url.searchParams.set('utm_medium',   form.utm_medium)
        if (form.utm_campaign) url.searchParams.set('utm_campaign', form.utm_campaign)
        destWithUtm = url.pathname + url.search
    } catch { /* ignore malformed */ }

    return (
        <div className="bg-neutral-50 border-2 border-neutral-200 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5">
                Shareable URL (UTMs injected on redirect)
            </p>
            <p className="font-mono text-xs text-black break-all">
                <span className="text-primary font-black">{base}/r/</span>
                <span className="text-neutral-600">{form.custom_code || '<code>'}</span>
            </p>
            <p className="font-mono text-[10px] text-neutral-400 break-all mt-1">
                → {destWithUtm}
            </p>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Create link modal
// ---------------------------------------------------------------------------

function CreateLinkModal({
    open,
    onClose,
    onCreated,
    defaultUtmSource,
}: {
    open: boolean
    onClose: () => void
    onCreated: (link: PartnerLink) => void
    defaultUtmSource: string
}) {
    const [form, setForm] = useState<CreateLinkForm>({
        ...BLANK_FORM,
        utm_source: defaultUtmSource || 'partner',
    })
    const [customDest, setCustomDest] = useState('')
    const [destPreset, setDestPreset] = useState('/')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            setForm({ ...BLANK_FORM, utm_source: defaultUtmSource || 'partner' })
            setError(null)
            setCustomDest('')
            setDestPreset('/')
        }
    }, [open, defaultUtmSource])

    const set = (k: keyof CreateLinkForm) => (v: string) =>
        setForm(p => ({ ...p, [k]: v }))

    const handleDestPreset = (v: string) => {
        setDestPreset(v)
        if (v !== '__custom__') set('destination_path')(v)
        else set('destination_path')(customDest || '/')
    }

    const handleCustomDest = (v: string) => {
        setCustomDest(v)
        set('destination_path')(v || '/')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSubmitting(true)
        try {
            const res = await fetch('/api/partner/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    label:            form.label || undefined,
                    destination_path: form.destination_path,
                    utm_source:       form.utm_source || undefined,
                    utm_medium:       form.utm_medium || undefined,
                    utm_campaign:     form.utm_campaign || undefined,
                    default_subid:    form.default_subid || undefined,
                    custom_code:      form.custom_code || undefined,
                }),
            })
            const data = await res.json() as { link?: PartnerLink & { url: string }; error?: string }
            if (!res.ok) { setError(data.error ?? 'Create failed'); return }
            if (data.link) onCreated({ ...data.link, click_count: 0 } as PartnerLink)
            onClose()
        } catch {
            setError('Network error. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    if (!open) return null

    const inputCls = "w-full px-3 py-2 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 bg-white"
    const labelCls = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1"

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
            <div className="w-full max-w-lg bg-white border-2 border-black max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b-2 border-black sticky top-0 bg-white z-10">
                    <h2 className="text-sm font-black uppercase tracking-widest">New Referral Link</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 border border-black">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Label */}
                    <div>
                        <label className={labelCls}>Label <span className="text-neutral-300">(internal)</span></label>
                        <input className={inputCls} placeholder="e.g. YouTube launch video" value={form.label} onChange={e => set('label')(e.target.value)} />
                    </div>

                    {/* Destination */}
                    <div>
                        <label className={labelCls}>Destination Page <span className="text-error">*</span></label>
                        <select
                            className={inputCls}
                            value={destPreset}
                            onChange={e => handleDestPreset(e.target.value)}
                        >
                            {DESTINATIONS.map(d => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                        </select>
                        {destPreset === '__custom__' && (
                            <input
                                className={`${inputCls} mt-2`}
                                placeholder="/docs/router or https://..."
                                value={customDest}
                                onChange={e => handleCustomDest(e.target.value)}
                            />
                        )}
                    </div>

                    {/* UTMs */}
                    <div className="border-t border-neutral-100 pt-4">
                        <p className={labelCls}>UTM Parameters <span className="text-neutral-300">(injected on redirect)</span></p>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            <div>
                                <label className={labelCls}>utm_source</label>
                                <input className={inputCls} value={form.utm_source} onChange={e => set('utm_source')(e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls}>utm_medium</label>
                                <input className={inputCls} value={form.utm_medium} onChange={e => set('utm_medium')(e.target.value)} />
                            </div>
                            <div className="col-span-2">
                                <label className={labelCls}>utm_campaign</label>
                                <input className={inputCls} placeholder="q1-launch, tutorial-series…" value={form.utm_campaign} onChange={e => set('utm_campaign')(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* SubID */}
                    <div>
                        <label className={labelCls}>Default SubID <span className="text-neutral-300">(optional, for your own tracking)</span></label>
                        <input className={inputCls} placeholder="email-footer, sidebar-cta…" value={form.default_subid} onChange={e => set('default_subid')(e.target.value)} />
                    </div>

                    {/* Custom code */}
                    <div>
                        <label className={labelCls}>Custom Link Code <span className="text-neutral-300">(leave blank to auto-generate)</span></label>
                        <input
                            className={inputCls}
                            placeholder="yourname-pricing"
                            value={form.custom_code}
                            onChange={e => set('custom_code')(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                            maxLength={64}
                        />
                    </div>

                    {/* URL preview */}
                    <UrlPreview form={form} />

                    {error && (
                        <div className="flex items-center gap-2 border-2 border-error bg-error/5 px-3 py-2">
                            <AlertCircle size={14} className="text-error shrink-0" />
                            <p className="text-xs font-bold text-error">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 btn btn-primary disabled:opacity-60"
                        >
                            {submitting ? 'Creating…' : 'Create Link'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Link row
// ---------------------------------------------------------------------------

function LinkRow({
    link,
    onStatusChange,
}: {
    link: PartnerLink
    onStatusChange: (id: string, status: 'active' | 'paused') => void
}) {
    const url = linkUrl(link.code)
    const { copied, copy } = useCopy(url)
    const [toggling, setToggling] = useState(false)

    const handleToggle = async () => {
        const next = link.status === 'active' ? 'paused' : 'active'
        setToggling(true)
        try {
            const res = await fetch(`/api/partner/links/${link.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: next }),
            })
            if (res.ok) onStatusChange(link.id, next)
        } catch { /* non-critical */ }
        finally { setToggling(false) }
    }

    const utmParts = [
        link.utm_source   && `src=${link.utm_source}`,
        link.utm_medium   && `med=${link.utm_medium}`,
        link.utm_campaign && `cmp=${link.utm_campaign}`,
    ].filter(Boolean)

    return (
        <tr className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors group">
            {/* Status dot */}
            <td className="w-8 px-4 py-4">
                <div className={`w-2 h-2 border border-black ${link.status === 'active' ? 'bg-primary' : 'bg-neutral-200'}`} />
            </td>

            {/* Label + code */}
            <td className="px-4 py-4 min-w-0">
                <p className="text-xs font-black text-black truncate">
                    {link.label ?? <span className="text-neutral-400 font-normal italic">No label</span>}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[11px] text-neutral-500">/r/{link.code}</span>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Open link"
                    >
                        <ExternalLink size={10} className="text-neutral-400 hover:text-black" />
                    </a>
                </div>
            </td>

            {/* Destination */}
            <td className="px-4 py-4 hidden md:table-cell">
                <span className="font-mono text-[11px] text-neutral-500 truncate block max-w-[160px]">
                    {link.destination_path}
                </span>
            </td>

            {/* UTMs */}
            <td className="px-4 py-4 hidden lg:table-cell">
                {utmParts.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {utmParts.map(p => (
                            <span key={p as string} className="px-1.5 py-0.5 bg-neutral-100 text-[10px] font-mono text-neutral-500 border border-neutral-200">
                                {p}
                            </span>
                        ))}
                    </div>
                ) : (
                    <span className="text-[11px] text-neutral-300">—</span>
                )}
            </td>

            {/* Clicks */}
            <td className="px-4 py-4 text-right">
                <span className="text-sm font-black text-black">{link.click_count.toLocaleString()}</span>
                <span className="block text-[10px] text-neutral-400 uppercase tracking-widest">clicks</span>
            </td>

            {/* Actions */}
            <td className="px-4 py-4">
                <div className="flex items-center gap-2 justify-end">
                    <button
                        onClick={copy}
                        title="Copy link"
                        className="p-1.5 border border-black hover:bg-primary hover:border-primary transition-colors"
                    >
                        {copied ? <Check size={13} strokeWidth={3} /> : <Copy size={13} />}
                    </button>
                    <button
                        onClick={handleToggle}
                        disabled={toggling || link.status === 'expired'}
                        title={link.status === 'active' ? 'Pause link' : 'Activate link'}
                        className="p-1.5 border border-black hover:bg-neutral-100 transition-colors disabled:opacity-40"
                    >
                        {link.status === 'active'
                            ? <Pause size={13} />
                            : <Play size={13} />
                        }
                    </button>
                </div>
            </td>
        </tr>
    )
}

// ---------------------------------------------------------------------------
// Default link card
// ---------------------------------------------------------------------------

function DefaultLinkCard({ referralCode }: { referralCode: string }) {
    const url = linkUrl(referralCode)
    const { copied, copy } = useCopy(url)

    return (
        <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Default Referral Link</span>
                    <p className="text-xs text-neutral-500 mt-0.5">Share this link anywhere. Create campaign links below for UTM tracking.</p>
                </div>
                <div className="w-2 h-2 bg-primary border border-black" />
            </div>
            <div className="flex items-center gap-2 bg-neutral-50 border-2 border-black p-3">
                <Link2 size={14} className="text-neutral-400 shrink-0" />
                <span className="flex-1 font-mono text-sm text-black truncate">{url}</span>
                <button
                    onClick={copy}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-colors border border-black shrink-0"
                >
                    {copied ? <Check size={11} strokeWidth={3} /> : <Copy size={11} />}
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PartnerLinksPage() {
    const { data: session } = useSession()
    const user = session?.user as { partnerRole?: string } | undefined

    const [links, setLinks]         = useState<PartnerLink[]>([])
    const [loading, setLoading]     = useState(true)
    const [error, setError]         = useState<string | null>(null)
    const [showCreate, setShowCreate] = useState(false)
    const [referralCode, setReferralCode] = useState('')

    const loadLinks = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [linksRes, meRes] = await Promise.all([
                fetch('/api/partner/links'),
                fetch('/api/partner/me'),
            ])
            if (linksRes.ok) {
                const data = await linksRes.json() as { links: PartnerLink[] }
                setLinks(data.links ?? [])
            }
            if (meRes.ok) {
                const me = await meRes.json() as { partner: { referral_code: string } }
                setReferralCode(me.partner?.referral_code ?? '')
            }
        } catch {
            setError('Failed to load links.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void loadLinks() }, [loadLinks])

    const handleCreated = (link: PartnerLink) => {
        setLinks(prev => [link, ...prev])
    }

    const handleStatusChange = (id: string, status: 'active' | 'paused') => {
        setLinks(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    }

    const totalClicks = links.reduce((sum, l) => sum + l.click_count, 0)
    const activeLinks = links.filter(l => l.status === 'active').length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="page-title">Referral Links</h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        Create campaign-specific links with UTM tracking and SubID support.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={14} />
                    New Link
                </button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Links',   value: links.length },
                    { label: 'Active',        value: activeLinks },
                    { label: 'Total Clicks',  value: totalClicks },
                ].map(s => (
                    <div key={s.label} className="card p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">{s.label}</p>
                        <p className="text-2xl font-black text-black mt-1">{loading ? '—' : s.value.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            {/* Default link */}
            {referralCode && <DefaultLinkCard referralCode={referralCode} />}

            {/* Campaign links table */}
            <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black">
                    <h2 className="section-header text-[11px]">Campaign Links</h2>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                        {links.length} {links.length === 1 ? 'link' : 'links'}
                    </span>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="h-1 w-24 mx-auto overflow-hidden bg-neutral-100 border border-black">
                            <div className="h-full w-full animate-loading-bar bg-primary origin-left" />
                        </div>
                        <p className="font-mono text-xs text-neutral-400 mt-3 uppercase tracking-widest">Loading links…</p>
                    </div>
                ) : error ? (
                    <div className="p-6 flex items-center gap-3 border-b border-neutral-100">
                        <AlertCircle size={16} className="text-error" />
                        <p className="text-sm text-error font-bold">{error}</p>
                        <button onClick={loadLinks} className="ml-auto text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors">
                            Retry
                        </button>
                    </div>
                ) : links.length === 0 ? (
                    <div className="p-12 text-center">
                        <Link2 className="h-8 w-8 text-neutral-200 mx-auto mb-3" />
                        <p className="text-sm font-black text-neutral-400 uppercase tracking-widest">No campaign links yet</p>
                        <p className="text-xs text-neutral-400 mt-1 mb-4">Create links with UTM params to track where your conversions come from.</p>
                        <button onClick={() => setShowCreate(true)} className="btn btn-primary inline-flex items-center gap-2">
                            <Plus size={13} />
                            Create First Link
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-100 bg-neutral-50">
                                    <th className="w-8 px-4 py-2" />
                                    <th className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400">Link</th>
                                    <th className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400 hidden md:table-cell">Destination</th>
                                    <th className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400 hidden lg:table-cell">UTMs</th>
                                    <th className="px-4 py-2 text-right text-[10px] font-black uppercase tracking-widest text-neutral-400">Clicks</th>
                                    <th className="px-4 py-2 text-right text-[10px] font-black uppercase tracking-widest text-neutral-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {links.map(link => (
                                    <LinkRow
                                        key={link.id}
                                        link={link}
                                        onStatusChange={handleStatusChange}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Docs CTA */}
            <div className="card p-5 flex items-center justify-between gap-4 bg-neutral-900 text-white border-neutral-900">
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-1">Partner Docs</p>
                    <p className="text-sm font-bold text-white">Learn approved messaging, talk tracks, and campaign strategies.</p>
                </div>
                <a href="/partner/docs" className="flex items-center gap-2 px-4 py-2 bg-primary text-black text-[11px] font-black uppercase tracking-widest border border-black hover:bg-white transition-colors shrink-0">
                    Open Docs <ChevronRight size={12} />
                </a>
            </div>

            {/* Create modal */}
            <CreateLinkModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                onCreated={handleCreated}
                defaultUtmSource={user?.partnerRole === 'partner_agency' ? 'agency' : 'affiliate'}
            />
        </div>
    )
}
