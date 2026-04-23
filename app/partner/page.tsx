'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
    Link2,
    TrendingUp,
    DollarSign,
    Copy,
    Check,
    ArrowRight,
    BookOpen,
    Package,
    BarChart2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

function KpiCard({
    label,
    value,
    sub,
    icon: Icon,
}: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ElementType;
}) {
    return (
        <div className="card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">{label}</span>
                <Icon className="h-4 w-4 text-neutral-300" />
            </div>
            <div>
                <span className="text-3xl font-black text-black tracking-tight">{value}</span>
                {sub && <p className="text-[11px] text-neutral-400 mt-1">{sub}</p>}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Copy link button
// ---------------------------------------------------------------------------

function CopyLinkButton({ code }: { code: string }) {
    const [copied, setCopied] = useState(false)
    const link = `https://p402.io/r/${code}`

    const handleCopy = async () => {
        await navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="flex items-center gap-2 border-2 border-black bg-neutral-50 p-3">
            <span className="flex-1 font-mono text-xs text-neutral-600 truncate">{link}</span>
            <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-colors border border-black shrink-0"
            >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
            </button>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

const QUICK_ACTIONS = [
    { label: 'Manage Links',       href: '/partner/links',       icon: Link2 },
    { label: 'View Commissions',   href: '/partner/commissions', icon: BarChart2 },
    { label: 'Partner Docs',       href: '/partner/docs',        icon: BookOpen },
    { label: 'Download Assets',    href: '/partner/assets',      icon: Package },
]

// ---------------------------------------------------------------------------
// Checklist (compliance / getting started)
// ---------------------------------------------------------------------------

function GettingStarted({ hasTaxProfile, hasPayoutMethod }: {
    hasTaxProfile: boolean;
    hasPayoutMethod: boolean;
}) {
    const steps = [
        { label: 'Application approved',    done: true },
        { label: 'Referral link generated', done: true },
        { label: 'Tax profile completed',   done: hasTaxProfile },
        { label: 'Payout method added',     done: hasPayoutMethod },
    ]
    const allDone = steps.every(s => s.done)
    if (allDone) return null

    return (
        <div className="card p-5">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-4">
                Getting Started
            </h3>
            <div className="space-y-2">
                {steps.map(step => (
                    <div key={step.label} className="flex items-center gap-3">
                        <div className={`w-4 h-4 border-2 flex items-center justify-center shrink-0 ${
                            step.done ? 'border-black bg-primary' : 'border-neutral-300'
                        }`}>
                            {step.done && <Check size={10} strokeWidth={3} />}
                        </div>
                        <span className={`text-xs font-bold ${step.done ? 'text-neutral-400 line-through' : 'text-black'}`}>
                            {step.label}
                        </span>
                        {!step.done && step.label.includes('Tax') && (
                            <Link href="/partner/settings" className="ml-auto text-[10px] font-black text-primary border border-primary px-2 py-0.5 hover:bg-primary hover:text-black transition-colors">
                                Add →
                            </Link>
                        )}
                        {!step.done && step.label.includes('Payout') && (
                            <Link href="/partner/payouts" className="ml-auto text-[10px] font-black text-primary border border-primary px-2 py-0.5 hover:bg-primary hover:text-black transition-colors">
                                Add →
                            </Link>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PartnerOverviewPage() {
    const { data: session } = useSession()
    const user = session?.user as {
        partnerId?: string;
        partnerRole?: string;
    } | undefined

    const [stats, setStats] = useState({
        total_clicks: 0,
        attributed_signups: 0,
        pending_commissions_cents: 0,
    })
    const [referralCode, setReferralCode] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch('/api/partner/me')
                if (res.ok) {
                    const data = await res.json() as {
                        partner: { referral_code: string };
                        stats: { total_clicks: number; attributed_signups: number; pending_commissions_cents: number };
                    }
                    setReferralCode(data.partner?.referral_code ?? null)
                    setStats(data.stats ?? { total_clicks: 0, attributed_signups: 0, pending_commissions_cents: 0 })
                }
            } catch {
                // non-blocking
            } finally {
                setLoading(false)
            }
        }
        void load()
    }, [])

    const roleBadge = user?.partnerRole?.replace('partner_', '').replace(/_/g, ' ') ?? 'affiliate'

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-primary text-black border border-black">
                            {roleBadge}
                        </span>
                    </div>
                    <h1 className="page-title">Partner Overview</h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        Your earnings, conversions, and program activity at a glance.
                    </p>
                </div>
                <Link href="/partner/links" className="btn btn-primary flex items-center gap-2">
                    <Link2 size={14} />
                    Manage Links
                </Link>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <KpiCard
                    label="Total Clicks"
                    value={loading ? '—' : stats.total_clicks.toLocaleString()}
                    sub="All time across all links"
                    icon={TrendingUp}
                />
                <KpiCard
                    label="Attributed Signups"
                    value={loading ? '—' : stats.attributed_signups.toLocaleString()}
                    sub="Active attributions within window"
                    icon={ArrowRight}
                />
                <KpiCard
                    label="Pending Commissions"
                    value={loading ? '—' : `$${(stats.pending_commissions_cents / 100).toFixed(2)}`}
                    sub="Awaiting hold period + approval"
                    icon={DollarSign}
                />
            </div>

            {/* Referral link */}
            {referralCode && (
                <div className="card p-5">
                    <h3 className="section-header text-[11px] mb-3">Your Default Referral Link</h3>
                    <CopyLinkButton code={referralCode} />
                    <p className="text-[11px] text-neutral-400 mt-2">
                        Share this link to track attributions. Create campaign-specific links in{' '}
                        <Link href="/partner/links" className="text-black font-bold hover:text-primary transition-colors">
                            Links →
                        </Link>
                    </p>
                </div>
            )}

            {/* Quick actions */}
            <div>
                <h3 className="section-header text-[11px] mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {QUICK_ACTIONS.map(action => (
                        <Link
                            key={action.href}
                            href={action.href}
                            className="card p-4 flex flex-col items-center gap-3 text-center hover:border-primary hover:bg-neutral-50 transition-colors group"
                        >
                            <action.icon className="h-6 w-6 text-neutral-400 group-hover:text-black transition-colors" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-neutral-600 group-hover:text-black transition-colors">
                                {action.label}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Getting started checklist */}
            <GettingStarted hasTaxProfile={false} hasPayoutMethod={false} />
        </div>
    )
}
