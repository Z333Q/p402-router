'use client'
/**
 * Execute — P402 Dashboard
 * ========================
 * Direct task execution surface. Input a task, pick a mode,
 * run it, and see every routing and cost decision immediately.
 */

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { P402Client } from '@p402/sdk'
import { MetricBox, Button, Card, ProgressBar } from '../_components/ui'
import { formatCost, formatLatency } from '../_components/format'
import { useWallet } from '@/hooks/useWallet'
import { useFundWallet } from '../_components/FundWalletModal'
import {
    Play, Zap, TrendingDown, Star, BarChart2,
    Network, ChevronRight, Copy, Check, RefreshCw,
    Cpu, AlertCircle, CheckCircle2
} from 'lucide-react'

const client = new P402Client({ routerUrl: '' })

type RoutingMode = 'cost' | 'speed' | 'quality' | 'balanced'

interface ExecMeta {
    request_id: string
    provider:   string
    model:      string
    cost_usd:   number
    savings:    number
    latency_ms: number
    cached:     boolean
    routing_mode: string
    credits_balance?: number | null
}

interface PreviewResult {
    mode: string
    winner: {
        provider:       string
        model:          string
        estimated_cost: number
        score:          number
        reason:         string
    }
    alternatives: Array<{
        provider:       string
        model:          string
        score:          number
        estimated_cost: number | null
    }>
}

interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
    meta?: ExecMeta
}

const MODES: Array<{ id: RoutingMode; label: string; icon: typeof Zap; desc: string }> = [
    { id: 'cost',     label: 'Cost',     icon: TrendingDown, desc: 'Cheapest model that meets quality bar' },
    { id: 'speed',    label: 'Speed',    icon: Zap,          desc: 'Lowest latency provider' },
    { id: 'quality',  label: 'Quality',  icon: Star,         desc: 'Highest capability model' },
    { id: 'balanced', label: 'Balanced', icon: BarChart2,     desc: 'Composite cost + speed + quality score' },
]

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest border border-neutral-200 px-1.5 py-0.5 hover:border-black transition-colors"
        >
            {copied ? <Check size={8} className="text-success" /> : <Copy size={8} />}
            {copied ? 'Copied' : 'Copy'}
        </button>
    )
}

function MetaPanel({ meta }: { meta: ExecMeta }) {
    const savings = meta.savings ?? 0
    return (
        <div className="border-2 border-black bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-black text-white">
                <CheckCircle2 size={10} className="text-primary shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-widest text-primary">Execution Result</span>
                {meta.cached && (
                    <span className="ml-auto text-[9px] font-black uppercase px-2 py-0.5 bg-primary text-black">Cache Hit</span>
                )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x-2 divide-black border-b-2 border-black">
                <div className="px-3 py-3">
                    <div className="text-[8px] font-black uppercase tracking-widest text-neutral-400 mb-1">Provider</div>
                    <div className="text-[11px] font-black font-mono text-black truncate">{meta.provider}</div>
                    <div className="text-[9px] font-mono text-neutral-400 truncate">{meta.model}</div>
                </div>
                <div className="px-3 py-3">
                    <div className="text-[8px] font-black uppercase tracking-widest text-neutral-400 mb-1">Cost</div>
                    <div className={`text-[11px] font-black font-mono ${meta.cost_usd === 0 ? 'text-primary' : 'text-black'}`}>
                        {meta.cost_usd === 0 ? 'FREE' : formatCost(meta.cost_usd)}
                    </div>
                    {savings > 0 && (
                        <div className="text-[9px] font-black text-success font-mono">−{formatCost(savings)} saved</div>
                    )}
                </div>
                <div className="px-3 py-3">
                    <div className="text-[8px] font-black uppercase tracking-widest text-neutral-400 mb-1">Latency</div>
                    <div className="text-[11px] font-black font-mono text-black">{formatLatency(meta.latency_ms)}</div>
                    <div className="text-[9px] font-mono text-neutral-400 capitalize">{meta.routing_mode} mode</div>
                </div>
                <div className="px-3 py-3">
                    <div className="text-[8px] font-black uppercase tracking-widest text-neutral-400 mb-1">Inspect</div>
                    <Link
                        href={`/dashboard/requests?highlight=${meta.request_id}`}
                        className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest border-2 border-black px-2 py-1 hover:bg-primary hover:border-primary transition-colors"
                    >
                        Trace <ChevronRight size={8} />
                    </Link>
                </div>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 text-[9px] font-mono text-neutral-400">
                <span>req: <CopyButton text={meta.request_id} /></span>
                {meta.credits_balance != null && (
                    <span className="ml-auto">credits: <span className="font-black text-black">{meta.credits_balance}</span></span>
                )}
            </div>
        </div>
    )
}

function SimulatePanel({ task, mode }: { task: string; mode: RoutingMode }) {
    const [result, setResult]     = useState<PreviewResult | null>(null)
    const [loading, setLoading]   = useState(false)
    const [error, setError]       = useState<string | null>(null)

    const run = async () => {
        if (!task.trim()) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/v1/execute/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task, mode }),
            })
            if (!res.ok) throw new Error('Preview failed')
            setResult(await res.json())
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="border-2 border-black overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black bg-neutral-50">
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-black">Simulate</h3>
                    <p className="text-[9px] text-neutral-400 font-mono mt-0.5">Preview routing decision — no LLM call</p>
                </div>
                <Button onClick={run} disabled={loading || !task.trim()} size="sm">
                    {loading ? <RefreshCw size={10} className="animate-spin" /> : <Play size={10} />}
                    {loading ? 'Scoring…' : 'Preview'}
                </Button>
            </div>

            {error && (
                <div className="px-4 py-3 flex items-center gap-2 text-[11px] text-error border-b-2 border-error/20 bg-error/5">
                    <AlertCircle size={12} /> {error}
                </div>
            )}

            {result && (
                <div className="p-4 space-y-4">
                    {/* Winner */}
                    <div className="border-2 border-black p-3 bg-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Network size={10} className="text-black shrink-0" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Selected Route</span>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="font-black font-mono text-sm text-black">{result.winner.provider}</div>
                                <div className="text-[10px] font-mono text-neutral-500">{result.winner.model}</div>
                                <div className="text-[9px] text-neutral-500 mt-1 capitalize">
                                    {result.winner.reason.replace(/_/g, ' ')}
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="font-black font-mono text-black">
                                    {result.winner.estimated_cost != null ? formatCost(result.winner.estimated_cost) : '—'}
                                </div>
                                <div className="text-[9px] text-neutral-400 font-mono">est. cost</div>
                            </div>
                        </div>
                    </div>

                    {/* Alternatives */}
                    {result.alternatives.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Alternatives</div>
                            {result.alternatives.map((alt) => (
                                <div key={`${alt.provider}-${alt.model}`} className="flex items-center justify-between px-3 py-2 border-2 border-neutral-100 bg-neutral-50">
                                    <div>
                                        <div className="text-[10px] font-black font-mono text-black">{alt.provider}</div>
                                        <div className="text-[9px] font-mono text-neutral-400">{alt.model}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-mono text-neutral-600">
                                            {alt.estimated_cost != null ? formatCost(alt.estimated_cost) : '—'}
                                        </div>
                                        <div className="text-[9px] text-neutral-400 font-mono">score {alt.score}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!result && !loading && !error && (
                <div className="px-4 py-6 text-center text-[10px] font-mono text-neutral-400">
                    Enter a task above and click Preview to see which provider wins before spending a token.
                </div>
            )}
        </div>
    )
}

export default function ExecutePage() {
    const { address } = useWallet()
    const { openFundModal } = useFundWallet()
    const bottomRef = useRef<HTMLDivElement>(null)

    const [mode, setMode]           = useState<RoutingMode>('balanced')
    const [messages, setMessages]   = useState<ChatMessage[]>([
        { role: 'system', content: 'You are a helpful AI assistant.' }
    ])
    const [input, setInput]         = useState('')
    const [loading, setLoading]     = useState(false)
    const [error, setError]         = useState<string | null>(null)
    const [showSimulate, setShowSimulate] = useState(false)

    const visibleMessages = messages.filter(m => m.role !== 'system')

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    const handleSend = async () => {
        const text = input.trim()
        if (!text || loading) return

        setInput('')
        setError(null)
        setLoading(true)
        setShowSimulate(false)

        const userMsg: ChatMessage = { role: 'user', content: text }
        const history = [...messages, userMsg]
        setMessages(history)

        try {
            const res = await client.chat({
                messages: history.map(m => ({ role: m.role, content: m.content })),
                p402: { mode, cache: true }
            })

            if (!res.choices?.[0]?.message) throw new Error('No response from router')

            const meta = (res as any).p402_metadata as ExecMeta | undefined
            const assistantMsg: ChatMessage = {
                role:    'assistant',
                content: res.choices[0].message.content as string,
                meta,
            }
            setMessages([...history, assistantMsg])
        } catch (err: any) {
            const msg: string = err.message ?? 'Execution failed'
            if (['INSUFFICIENT_FUNDS', 'BALANCE_TOO_LOW', 'PAYMENT_REQUIRED'].some(c => msg.includes(c)) ||
                ['insufficient', 'balance', 'fund'].some(w => msg.toLowerCase().includes(w))) {
                openFundModal()
            } else {
                setError(msg)
            }
        } finally {
            setLoading(false)
        }
    }

    const lastMeta = [...messages].reverse().find(m => m.meta)?.meta

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-black/5 pb-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Execute</h1>
                    <p className="text-neutral-500 font-medium">Run a task. See every routing and cost decision, immediately.</p>
                </div>
                {lastMeta && (
                    <div className="flex flex-wrap gap-4">
                        <MetricBox label="Last Cost"    value={lastMeta.cost_usd === 0 ? 'FREE' : formatCost(lastMeta.cost_usd)} accent={lastMeta.cost_usd === 0} />
                        <MetricBox label="Latency"      value={formatLatency(lastMeta.latency_ms)} />
                        <MetricBox label="Provider"     value={lastMeta.provider} subtext={lastMeta.model} />
                        <MetricBox label="Cache"        value={lastMeta.cached ? 'Hit' : 'Miss'} accent={lastMeta.cached} />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main — chat + controls */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Mode selector */}
                    <div className="border-2 border-black overflow-hidden">
                        <div className="px-4 py-2 border-b-2 border-black bg-neutral-50">
                            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Routing Mode</span>
                        </div>
                        <div className="grid grid-cols-4">
                            {MODES.map((m, idx) => {
                                const Icon = m.icon
                                const active = mode === m.id
                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => setMode(m.id)}
                                        title={m.desc}
                                        className={`
                                            flex flex-col items-center gap-1.5 px-2 py-3 transition-all
                                            ${idx < 3 ? 'border-r-2 border-black' : ''}
                                            ${active
                                                ? 'bg-primary text-black'
                                                : 'bg-white text-neutral-500 hover:bg-neutral-50 hover:text-black'
                                            }
                                        `}
                                    >
                                        <Icon size={14} className={active ? 'text-black' : 'text-neutral-400'} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{m.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Message history */}
                    <div className="border-2 border-black bg-white">
                        <div className="h-[360px] overflow-y-auto p-4 space-y-4 font-mono text-sm">
                            {visibleMessages.length === 0 && (
                                <div className="flex items-center justify-center h-full text-neutral-400 text-[11px]">
                                    Send a message to execute your first task.
                                </div>
                            )}
                            {visibleMessages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`
                                        max-w-[85%] px-3 py-2 text-[12px] leading-relaxed
                                        ${m.role === 'user'
                                            ? 'bg-black text-white'
                                            : 'bg-neutral-50 border-2 border-neutral-200 text-black'
                                        }
                                    `}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-neutral-50 border-2 border-neutral-200 px-3 py-2 text-[11px] font-mono text-neutral-400">
                                        <span className="animate-pulse">Routing…</span>
                                    </div>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input row */}
                        <div className="border-t-2 border-black flex">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                placeholder="Enter a task…"
                                disabled={loading}
                                className="flex-1 px-4 py-3 font-mono text-sm bg-white focus:outline-none disabled:opacity-50 border-r-2 border-black"
                            />
                            <button
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                                className="flex items-center gap-2 px-5 py-3 bg-primary font-black text-[11px] uppercase tracking-widest text-black hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                            >
                                <Play size={12} />
                                {loading ? 'Running…' : 'Run'}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 border-2 border-error px-4 py-3 bg-error/5 text-error text-[11px] font-bold">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    {/* Execution result panel — appears after first run */}
                    {lastMeta && <MetaPanel meta={lastMeta} />}

                    {/* Reset */}
                    {visibleMessages.length > 0 && (
                        <button
                            onClick={() => { setMessages([{ role: 'system', content: 'You are a helpful AI assistant.' }]); setError(null) }}
                            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors"
                        >
                            <RefreshCw size={10} /> New conversation
                        </button>
                    )}
                </div>

                {/* Sidebar — simulate + session */}
                <div className="space-y-4">
                    {/* Simulate toggle */}
                    <button
                        onClick={() => setShowSimulate(v => !v)}
                        className={`w-full flex items-center justify-between px-4 py-3 border-2 border-black font-black text-[10px] uppercase tracking-widest transition-colors ${showSimulate ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-50'}`}
                    >
                        <span>Simulate first</span>
                        <ChevronRight size={12} className={`transition-transform ${showSimulate ? 'rotate-90' : ''}`} />
                    </button>

                    {showSimulate && (
                        <SimulatePanel task={input} mode={mode} />
                    )}

                    {/* Session info */}
                    <Card className="p-4 space-y-3 border-2 border-black">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Session Budget</div>
                        {lastMeta?.credits_balance != null ? (
                            <>
                                <div className="text-2xl font-black font-mono text-black">{lastMeta.credits_balance}</div>
                                <div className="text-[9px] font-mono text-neutral-400">credits remaining</div>
                                <ProgressBar
                                    value={Math.min(100, lastMeta.credits_balance / 5)}
                                    variant="default"
                                />
                            </>
                        ) : (
                            <div className="text-[11px] font-mono text-neutral-400">
                                Run a task to see your live balance.
                            </div>
                        )}
                        <Link
                            href="/dashboard/settings"
                            className="block text-center text-[9px] font-black uppercase tracking-widest border-2 border-neutral-200 px-3 py-2 hover:border-black transition-colors"
                        >
                            Manage budget →
                        </Link>
                    </Card>

                    {/* Quick links into intelligence layer */}
                    <div className="space-y-1">
                        <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 px-1 mb-2">After execution</div>
                        {[
                            { href: '/dashboard/requests', label: 'View all requests' },
                            { href: '/dashboard/savings',  label: 'See savings report' },
                            { href: '/dashboard/evals',    label: 'Check eval scores' },
                        ].map(({ href, label }) => (
                            <Link
                                key={href}
                                href={href}
                                className="flex items-center justify-between px-3 py-2.5 border-2 border-neutral-100 hover:border-black hover:bg-neutral-50 transition-all text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-black"
                            >
                                {label} <ChevronRight size={10} />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
