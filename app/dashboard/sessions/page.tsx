'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    Layers,
    RefreshCw,
    Bot,
    Wallet,
    Clock,
    DollarSign,
    AlertTriangle,
    StopCircle,
    ChevronDown,
    ChevronRight,
    Copy,
    Check,
    Plus,
} from 'lucide-react'
import {
    Card,
    Badge,
    Button,
    ProgressBar,
    EmptyState,
    Stat,
} from '@/app/dashboard/_components/ui'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionBudget {
    total_usd: number
    used_usd: number
    remaining_usd: number
    utilization_percent?: number
}

interface Session {
    id: string
    agent_id: string | null
    wallet_address: string | null
    wallet_source: 'cdp' | 'eoa'
    cdp_wallet_name: string | null
    budget: SessionBudget
    policy: Record<string, unknown> | null
    status: 'active' | 'expired' | 'ended' | 'exhausted'
    created_at: string
    expires_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCost(n: number): string {
    if (n === 0) return '$0.00'
    if (n >= 1) return `$${n.toFixed(2)}`
    if (n >= 0.01) return `$${n.toFixed(4)}`
    return `$${n.toFixed(6)}`
}

function formatRelative(iso: string): string {
    const diff = new Date(iso).getTime() - Date.now()
    const abs = Math.abs(diff)
    const past = diff < 0
    if (abs < 60_000) return past ? 'just now' : 'in seconds'
    if (abs < 3_600_000) {
        const m = Math.round(abs / 60_000)
        return past ? `${m}m ago` : `in ${m}m`
    }
    if (abs < 86_400_000) {
        const h = Math.round(abs / 3_600_000)
        return past ? `${h}h ago` : `in ${h}h`
    }
    const d = Math.round(abs / 86_400_000)
    return past ? `${d}d ago` : `in ${d}d`
}

function statusConfig(status: Session['status']) {
    const cfg = {
        active:    { variant: 'success' as const,  label: 'Active' },
        exhausted: { variant: 'warning' as const,  label: 'Exhausted' },
        expired:   { variant: 'danger' as const,   label: 'Expired' },
        ended:     { variant: 'default' as const,  label: 'Ended' },
    }
    return cfg[status] ?? cfg.ended
}

function budgetVariant(pct: number): 'default' | 'success' | 'warning' | 'danger' {
    if (pct >= 90) return 'danger'
    if (pct >= 70) return 'warning'
    if (pct >= 30) return 'success'
    return 'default'
}

const CREATE_EXAMPLE = `curl -X POST https://p402.io/api/v2/sessions \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "my-agent",
    "budget_usd": 5.00,
    "expires_in_hours": 24
  }'`

// ---------------------------------------------------------------------------
// Session Card
// ---------------------------------------------------------------------------

function SessionCard({
    session,
    onEnd,
    ending,
}: {
    session: Session
    onEnd: (id: string) => void
    ending: boolean
}) {
    const [expanded, setExpanded] = useState(false)
    const cfg = statusConfig(session.status)
    const pct = session.budget.utilization_percent
        ?? (session.budget.total_usd > 0
            ? Math.round((session.budget.used_usd / session.budget.total_usd) * 100)
            : 0)

    return (
        <div className="border-2 border-black bg-white">
            {/* Header row */}
            <div className="flex items-start justify-between px-4 py-3 border-b border-neutral-200">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 border-2 border-black bg-neutral-100 flex items-center justify-center shrink-0">
                        <Bot size={14} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold truncate max-w-[180px]">
                                {session.id}
                            </span>
                            <Badge variant={cfg.variant}>{cfg.label}</Badge>
                            {session.wallet_source === 'cdp' && (
                                <Badge variant="primary">CDP</Badge>
                            )}
                        </div>
                        {session.agent_id && (
                            <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                                agent: {session.agent_id}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                    {session.status === 'active' && (
                        <button
                            onClick={() => onEnd(session.id)}
                            disabled={ending}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-black text-neutral-600 hover:bg-error hover:text-white hover:border-error transition-all disabled:opacity-50"
                        >
                            <StopCircle size={10} />
                            End
                        </button>
                    )}
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="p-1 hover:bg-neutral-100 border-2 border-transparent hover:border-black transition-all"
                    >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                </div>
            </div>

            {/* Budget bar */}
            <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        Budget Utilization
                    </span>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-neutral-400">
                            {formatCost(session.budget.used_usd)} / {formatCost(session.budget.total_usd)}
                        </span>
                        <span className="text-[10px] font-black text-neutral-700">
                            {formatCost(session.budget.remaining_usd)} left
                        </span>
                    </div>
                </div>
                <ProgressBar
                    value={pct}
                    max={100}
                    showValue={false}
                    variant={budgetVariant(pct)}
                />
                {pct >= 80 && session.status === 'active' && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-warning">
                        <AlertTriangle size={10} />
                        Budget {pct >= 100 ? 'exhausted' : 'nearly exhausted'}
                    </div>
                )}
            </div>

            {/* Timing strip */}
            <div className="grid grid-cols-2 border-t border-neutral-100 divide-x divide-neutral-100">
                <div className="px-4 py-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-0.5">Created</p>
                    <p className="text-xs font-mono font-bold">{formatRelative(session.created_at)}</p>
                </div>
                <div className="px-4 py-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-0.5">
                        {session.status === 'active' ? 'Expires' : 'Expired'}
                    </p>
                    <p className={`text-xs font-mono font-bold ${session.status === 'active' ? '' : 'text-neutral-400'}`}>
                        {formatRelative(session.expires_at)}
                    </p>
                </div>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className="border-t-2 border-black bg-neutral-50 px-4 py-3 space-y-3">
                    {session.wallet_address && (
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                                Wallet
                            </p>
                            <div className="flex items-center gap-2">
                                <Wallet size={10} className="text-neutral-400" />
                                <span className="font-mono text-xs text-neutral-700 break-all">
                                    {session.wallet_address}
                                </span>
                            </div>
                        </div>
                    )}

                    {session.policy && Object.keys(session.policy).length > 0 && (
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                                Policies
                            </p>
                            <div className="space-y-1">
                                {Object.entries(session.policy).map(([k, v]) => (
                                    <div key={k} className="flex items-start gap-2">
                                        <span className="font-mono text-[10px] text-neutral-500 w-32 shrink-0">{k}</span>
                                        <span className="font-mono text-[10px] text-black break-all">
                                            {typeof v === 'string' ? v : JSON.stringify(v)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 pt-1">
                        <Link
                            href={`/dashboard/requests?session=${session.id}`}
                            className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-black border-b border-dashed border-neutral-400 hover:border-black transition-colors"
                        >
                            View Requests →
                        </Link>
                        <span className="text-neutral-300">|</span>
                        <Link
                            href={`/dashboard/traces?session=${session.id}`}
                            className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-black border-b border-dashed border-neutral-400 hover:border-black transition-colors"
                        >
                            View Traces →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Code block with copy
// ---------------------------------------------------------------------------

function CopyBlock({ code }: { code: string }) {
    const [copied, setCopied] = useState(false)
    const copy = () => {
        void navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <div className="relative border-2 border-black bg-neutral-900">
            <button
                onClick={copy}
                className="absolute top-2 right-2 p-1.5 border-2 border-neutral-700 hover:border-primary text-neutral-400 hover:text-primary transition-colors"
            >
                {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
            <pre className="font-mono text-[11px] text-neutral-100 overflow-x-auto p-4 pr-10 leading-relaxed">
                {code}
            </pre>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

type FilterStatus = 'active' | 'expired' | 'ended'

export default function SessionsPage() {
    const [sessions, setSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<FilterStatus>('active')
    const [endingId, setEndingId] = useState<string | null>(null)

    const fetchSessions = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/v2/sessions?status=${filter}`)
            if (res.ok) {
                const data = await res.json() as { data: Session[] }
                setSessions(data.data ?? [])
            } else {
                setSessions([])
            }
        } catch {
            setSessions([])
        } finally {
            setLoading(false)
        }
    }, [filter])

    useEffect(() => { void fetchSessions() }, [fetchSessions])

    const handleEnd = async (id: string) => {
        if (!confirm(`End session ${id}? This cannot be undone.`)) return
        setEndingId(id)
        try {
            await fetch(`/api/v2/sessions/${id}`, { method: 'DELETE' })
            await fetchSessions()
        } finally {
            setEndingId(null)
        }
    }

    // Summary stats (active sessions only for meaningful numbers)
    const activeSessions = sessions.filter(s => s.status === 'active')
    const totalBudget = activeSessions.reduce((sum, s) => sum + s.budget.total_usd, 0)
    const totalSpent = activeSessions.reduce((sum, s) => sum + s.budget.used_usd, 0)
    const avgUtilization = activeSessions.length > 0
        ? Math.round(activeSessions.reduce((sum, s) => {
            const pct = s.budget.total_usd > 0
                ? (s.budget.used_usd / s.budget.total_usd) * 100 : 0
            return sum + pct
        }, 0) / activeSessions.length)
        : 0

    return (
        <div className="space-y-6 p-6">
            {/* Page header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight">Sessions</h1>
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-1">
                        Agent budget sessions — scoped spending with lifecycle tracking
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => void fetchSessions()}
                        className="p-2 border-2 border-black hover:bg-primary transition-colors"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Summary strip — only meaningful when viewing active */}
            {filter === 'active' && sessions.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="border-2 border-black p-3 bg-white">
                        <Stat label="Active Sessions" value={activeSessions.length} size="sm" />
                    </div>
                    <div className="border-2 border-black p-3 bg-white">
                        <Stat label="Total Budget" value={`$${totalBudget.toFixed(2)}`} size="sm" />
                    </div>
                    <div className="border-2 border-black p-3 bg-white">
                        <Stat label="Spent" value={`$${totalSpent.toFixed(4)}`} size="sm" />
                    </div>
                    <div className="border-2 border-black p-3 bg-primary">
                        <Stat label="Avg Utilization" value={`${avgUtilization}%`} size="sm" />
                    </div>
                </div>
            )}

            {/* Filter tabs */}
            <div className="flex border-b-2 border-black">
                {(['active', 'expired', 'ended'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`
                            px-4 py-2.5 text-[11px] font-black uppercase tracking-widest border-r-2 border-black transition-colors
                            ${filter === f
                                ? 'bg-black text-white'
                                : 'bg-white text-neutral-400 hover:text-black hover:bg-neutral-50'
                            }
                        `}
                    >
                        {f}
                        {f === 'active' && activeSessions.length > 0 && filter !== 'active' && (
                            <span className="ml-1.5 bg-primary text-black px-1 text-[9px] font-black">
                                {activeSessions.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="border-2 border-neutral-200 p-4 animate-pulse">
                            <div className="h-4 bg-neutral-100 w-48 mb-3" />
                            <div className="h-3 bg-neutral-100 w-full mb-2" />
                            <div className="h-2 bg-neutral-100 w-32" />
                        </div>
                    ))}
                </div>
            ) : sessions.length === 0 ? (
                <div className="border-2 border-black bg-white">
                    {filter === 'active' ? (
                        <div className="p-8 space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 border-2 border-black bg-primary flex items-center justify-center shrink-0">
                                    <Layers size={18} />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg uppercase tracking-tight">No Active Sessions</h3>
                                    <p className="text-sm text-neutral-500 mt-1">
                                        Sessions let your agents operate within a scoped budget — spending limits,
                                        wallet assignment, and AP2 mandate governance in a single object.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {[
                                    { icon: <Bot size={14} />, title: 'Agent Identity', body: 'Bind a session to any agent_id to track spend per agent' },
                                    { icon: <DollarSign size={14} />, title: 'Budget Control', body: 'Set max spend per session — enforced at routing time' },
                                    { icon: <Clock size={14} />, title: 'Time-bounded', body: 'Sessions auto-expire — no runaway agent spend' },
                                ].map(item => (
                                    <div key={item.title} className="border-2 border-black p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-6 h-6 border-2 border-black bg-neutral-100 flex items-center justify-center">
                                                {item.icon}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest">{item.title}</span>
                                        </div>
                                        <p className="text-[11px] text-neutral-500">{item.body}</p>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                                    Create a session via API
                                </p>
                                <CopyBlock code={CREATE_EXAMPLE} />
                            </div>

                            <div className="flex gap-3">
                                <Link
                                    href="/docs/api"
                                    className="flex items-center gap-2 px-4 py-2.5 border-2 border-black text-[11px] font-black uppercase tracking-widest hover:bg-primary transition-colors"
                                >
                                    <Plus size={12} />
                                    API Docs
                                </Link>
                                <Link
                                    href="/dashboard/playground"
                                    className="flex items-center gap-2 px-4 py-2.5 border-2 border-neutral-300 text-[11px] font-black uppercase tracking-widest text-neutral-500 hover:border-black hover:text-black transition-colors"
                                >
                                    Try Execute →
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <EmptyState
                            icon="📋"
                            title={`No ${filter} sessions`}
                            body={`${filter === 'expired' ? 'Sessions that passed their expiry window appear here.' : 'Manually ended sessions appear here.'}`}
                        />
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map(session => (
                        <SessionCard
                            key={session.id}
                            session={session}
                            onEnd={handleEnd}
                            ending={endingId === session.id}
                        />
                    ))}
                </div>
            )}

            {/* Mental model explainer — always visible */}
            {sessions.length > 0 && (
                <Card title="Session Mental Model" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border-2 border-black">
                        {[
                            { step: '01', label: 'Create', body: 'POST /api/v2/sessions with budget + agent ID. Optionally assign a CDP wallet.' },
                            { step: '02', label: 'Authorize', body: 'Pass session token as X-P402-Session header. Budget enforced at every route call.' },
                            { step: '03', label: 'Monitor', body: 'Track spend vs budget in real-time. Requests tagged by session in Traces.' },
                            { step: '04', label: 'Expire', body: 'Session ends at budget exhaustion, expiry time, or manual DELETE call.' },
                        ].map((item, i) => (
                            <div key={item.step} className={`p-4 ${i < 3 ? 'border-r-2 border-black' : ''}`}>
                                <div className="text-[10px] font-black text-neutral-300 mb-1">{item.step}</div>
                                <div className="text-xs font-black uppercase tracking-widest mb-2">{item.label}</div>
                                <p className="text-[11px] text-neutral-500 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    )
}
