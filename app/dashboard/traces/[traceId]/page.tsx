'use client'
/**
 * Trace Detail — Node-by-node execution inspector
 * Top-1% neo-brutalist timeline view.
 */
import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { MetricBox, Button, Card, ProgressBar, ErrorState } from '../../_components/ui'
import { formatCost, formatLatency } from '../../_components/format'
import { Copy, Check, ChevronDown, ChevronUp, Cpu, Wrench, Search, ShieldCheck, Zap, CircleDot, Network, Trophy, X, Shield, Database, BookOpen } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface EvalData {
    overall_score: number
    passed: boolean
    scores: Record<string, number>
    pass_threshold: number
    evaluator_model: string
}
interface ToolExec {
    tool_name: string
    args: Record<string, unknown>
    output: unknown
    latency_ms: number | null
    error: string | null
}
interface TraceNode {
    id: string
    node_type: 'model' | 'tool' | 'retrieval' | 'verify' | 'settle' | 'cache' | string
    status: 'completed' | 'failed' | 'running' | 'pending' | 'skipped' | string
    label?: string
    cost?: number
    latency_ms?: number
    started_at?: string
    completed_at?: string
    error?: string
    provider_id?: string
    model_id?: string
    tool_execution?: ToolExec
    evaluation?: EvalData
}
interface TraceSummary {
    total_cost: number
    total_latency_ms: number
    node_count: number
    mode_resolved: string
    cached: boolean
    provider?: string
    model?: string
}
interface RoutingDecision {
    selected_provider_id: string
    reason: string
    requested_mode: string
    alternatives: Array<{ provider: string; score: number; reason: string }>
}
interface TraceData {
    id: string
    request_id: string
    status: string
    summary: TraceSummary
    nodes: TraceNode[]
    created_at?: string
    completed_at?: string
    task?: string
    actual_cost?: number
    baseline_cost?: number
    routing_decision?: RoutingDecision
}

// ── Routing reason labels ─────────────────────────────────────────────────────

const ROUTING_REASONS: Record<string, string> = {
    scored_optimal:        'Highest composite score across all candidates',
    intelligence_override: 'Autonomous optimizer redirected to a cheaper equivalent',
    semantic_hit:          'Identical request found in semantic cache — skipped LLM entirely',
    usage_limit_reached:   'Usage limit reached — request blocked by policy',
    no_route:              'No viable route found',
}

const REJECTION_REASONS: Record<string, string> = {
    lower_score:  'lower score',
    unsupported:  'unsupported payment scheme',
    health_down:  'unhealthy — live probe failed',
}

// ── Node type config ───────────────────────────────────────────────────────────

const NODE_CONFIG: Record<string, { label: string; bg: string; border: string; text: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
    model:     { label: 'Model',     bg: 'bg-primary/20',   border: 'border-primary',   text: 'text-black',   Icon: Cpu },
    tool:      { label: 'Tool',      bg: 'bg-warning/15',   border: 'border-warning',   text: 'text-warning', Icon: Wrench },
    retrieval: { label: 'Retrieval', bg: 'bg-info/10',      border: 'border-info',      text: 'text-info',    Icon: Search },
    verify:    { label: 'Verify',    bg: 'bg-neutral-100',  border: 'border-neutral-400', text: 'text-neutral-700', Icon: ShieldCheck },
    settle:    { label: 'Settle',    bg: 'bg-success/10',   border: 'border-success',   text: 'text-success', Icon: Zap },
    cache:     { label: 'Cache',     bg: 'bg-primary/10',   border: 'border-primary/50', text: 'text-black',  Icon: CircleDot },
}

const STATUS_CLASSES: Record<string, string> = {
    completed: 'text-success',
    failed:    'text-error',
    running:   'text-info animate-pulse',
    pending:   'text-warning',
    skipped:   'text-neutral-400',
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            className="text-neutral-400 hover:text-black transition-colors p-1"
            title="Copy"
        >
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
        </button>
    )
}

// ── ScoreRing ─────────────────────────────────────────────────────────────────

function ScoreRing({ score, passed }: { score: number; passed: boolean }) {
    const pct = Math.round(score * 100)
    const color = passed ? '#22C55E' : score >= 0.5 ? '#F59E0B' : '#EF4444'
    const r = 24, c = 28, stroke = 5
    const circ = 2 * Math.PI * r
    const dash = (score * circ).toFixed(1)
    return (
        <svg width={c * 2} height={c * 2} className="rotate-[-90deg]">
            <circle cx={c} cy={c} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
            <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="square" />
            <text x={c} y={c + 5} textAnchor="middle" className="rotate-90"
                style={{ fontSize: 11, fontWeight: 900, fill: color, transform: `rotate(90deg)`, transformOrigin: `${c}px ${c}px` }}>
                {pct}
            </text>
        </svg>
    )
}

// ── Node Card ─────────────────────────────────────────────────────────────────

function NodeCard({ node, index, isLast }: { node: TraceNode; index: number; isLast: boolean }) {
    const [open, setOpen] = useState(false)
    const cfg = NODE_CONFIG[node.node_type] ?? { label: 'Node', bg: 'bg-neutral-50', border: 'border-neutral-300', text: 'text-neutral-600', Icon: CircleDot }
    const hasDetails = !!(node.tool_execution || node.evaluation || node.error)
    const NodeIcon = cfg.Icon

    return (
        <div className="relative flex gap-4">
            {/* Timeline track */}
            <div className="flex flex-col items-center shrink-0">
                <div className={`w-9 h-9 border-2 ${cfg.border} ${cfg.bg} flex items-center justify-center z-10`}>
                    <NodeIcon size={14} className={cfg.text} />
                </div>
                {!isLast && <div className="w-0.5 flex-1 bg-neutral-200 mt-1 min-h-[1rem]" />}
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
                <div
                    className={`border-2 border-black bg-white overflow-hidden ${hasDetails ? 'cursor-pointer' : ''}`}
                    onClick={() => hasDetails && setOpen(v => !v)}
                >
                    {/* Node header */}
                    <div className="flex items-center gap-3 px-4 py-3">
                        {/* Type badge */}
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 border ${cfg.border} ${cfg.bg} ${cfg.text} shrink-0`}>
                            {cfg.label}
                        </span>
                        {/* Label */}
                        <span className="flex-1 text-[11px] font-mono font-black text-black truncate">
                            {node.label ?? `Node ${index + 1}`}
                        </span>
                        {/* Provider */}
                        {node.provider_id && (
                            <span className="text-[9px] font-mono text-neutral-400 hidden sm:block shrink-0">
                                {node.provider_id}
                                {node.model_id && <span className="text-neutral-300"> · {node.model_id}</span>}
                            </span>
                        )}
                        {/* Cost */}
                        <span className="font-mono text-[11px] text-neutral-600 shrink-0 w-24 text-right">
                            {node.cost !== undefined && node.cost > 0 ? `$${node.cost.toFixed(6)}` : node.cost === 0 ? <span className="text-[9px] font-black text-primary">FREE</span> : '—'}
                        </span>
                        {/* Latency */}
                        <span className="font-mono text-[10px] text-neutral-400 shrink-0 w-20 text-right">
                            {node.latency_ms !== undefined ? `${node.latency_ms.toLocaleString()}ms` : '—'}
                        </span>
                        {/* Status */}
                        <span className={`text-[9px] font-black uppercase shrink-0 w-16 text-right ${STATUS_CLASSES[node.status] ?? 'text-neutral-400'}`}>
                            {node.status}
                        </span>
                        {hasDetails && (
                            <span className="text-neutral-400 shrink-0 ml-1">
                                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </span>
                        )}
                    </div>

                    {/* Expanded detail */}
                    {open && (
                        <div className="border-t-2 border-black bg-neutral-50 px-4 py-4 space-y-4">
                            {/* Error */}
                            {node.error && (
                                <div className="border-2 border-error bg-error/5 p-3">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-error mb-2">Error</div>
                                    <pre className="text-[10px] font-mono text-error whitespace-pre-wrap">{node.error}</pre>
                                </div>
                            )}

                            {/* Tool execution */}
                            {node.tool_execution && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Tool Call</span>
                                        <span className="font-mono font-black text-[10px] text-black">{node.tool_execution.tool_name}</span>
                                        {node.tool_execution.latency_ms !== null && (
                                            <span className="ml-auto text-[9px] font-mono text-neutral-400">{node.tool_execution.latency_ms}ms</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 flex items-center gap-2">
                                                Input <CopyButton text={JSON.stringify(node.tool_execution.args, null, 2)} />
                                            </div>
                                            <pre className="text-[10px] font-mono bg-neutral-900 text-primary p-3 overflow-x-auto max-h-40 whitespace-pre-wrap border-2 border-black">
                                                {JSON.stringify(node.tool_execution.args, null, 2)}
                                            </pre>
                                        </div>
                                        <div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 flex items-center gap-2">
                                                Output <CopyButton text={JSON.stringify(node.tool_execution.output, null, 2)} />
                                            </div>
                                            <pre className={`text-[10px] font-mono p-3 overflow-x-auto max-h-40 whitespace-pre-wrap border-2 border-black ${node.tool_execution.error ? 'bg-error/5 text-error border-error' : 'bg-neutral-900 text-neutral-100'}`}>
                                                {node.tool_execution.error ?? JSON.stringify(node.tool_execution.output, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Evaluation */}
                            {node.evaluation && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-4">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Evaluation Result</span>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 border-2 ml-auto ${node.evaluation.passed ? 'border-success bg-success/10 text-success' : 'border-error bg-error/10 text-error'}`}>
                                            {node.evaluation.passed ? '✓ Pass' : '✕ Fail'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <ScoreRing score={node.evaluation.overall_score} passed={node.evaluation.passed} />
                                        <div className="flex-1 space-y-2">
                                            {Object.entries(node.evaluation.scores).map(([dim, score]) => (
                                                <div key={dim}>
                                                    <div className="flex justify-between mb-0.5">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">{dim}</span>
                                                        <span className="text-[9px] font-mono font-black">{score.toFixed(2)}</span>
                                                    </div>
                                                    <ProgressBar
                                                        value={score * 100}
                                                        showValue={false}
                                                        variant={score >= 0.7 ? 'success' : score >= 0.5 ? 'warning' : 'danger'}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-[9px] font-mono text-neutral-400">
                                        Threshold: {node.evaluation.pass_threshold} · Model: {node.evaluation.evaluator_model}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TraceDetailPage() {
    const { traceId } = useParams<{ traceId: string }>()

    const { data: trace, isLoading, error } = useQuery<TraceData>({
        queryKey: ['trace', traceId],
        queryFn: async (): Promise<TraceData> => {
            const res = await fetch(`/api/v1/traces/${traceId}`)
            if (!res.ok) throw new Error('Trace not found')
            return res.json() as Promise<TraceData>
        },
        enabled: !!traceId,
        refetchInterval: (q) => (q.state.data as TraceData | undefined)?.status === 'running' ? 2000 : false,
    })

    if (isLoading) {
        return (
            <div className="max-w-[900px] mx-auto space-y-4">
                <div className="h-8 w-48 bg-neutral-100 animate-pulse" />
                <div className="h-32 bg-neutral-100 animate-pulse border-2 border-neutral-200" />
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-neutral-100 animate-pulse border-2 border-neutral-200" style={{ opacity: 1 - i * 0.2 }} />
                ))}
            </div>
        )
    }

    if (error || !trace) {
        return <ErrorState title="Trace not found" message={String(error ?? 'Not found')} />
    }

    const s = trace.summary
    const totalCost = s?.total_cost ?? 0
    const totalLatency = s?.total_latency_ms ?? 0

    return (
        <div className="space-y-8 max-w-[900px] mx-auto">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                <Link href="/dashboard/traces" className="hover:text-black transition-colors">Traces</Link>
                <span>/</span>
                <span className="font-mono text-black">{traceId.slice(0, 8)}…</span>
                <CopyButton text={traceId} />
                <span className={`ml-auto text-[9px] font-black uppercase ${STATUS_CLASSES[trace.status] ?? ''}`}>
                    {trace.status === 'running' && <span className="mr-1">●</span>}
                    {trace.status}
                </span>
            </div>

            {/* Task hero — first thing you see */}
            {trace.task && (
                <div className={`border-2 border-black p-5 ${trace.status === 'failed' ? 'bg-error/5' : trace.status === 'completed' ? 'bg-white' : 'bg-neutral-50'}`}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">Task</div>
                            <p className="font-mono text-sm text-black leading-relaxed">{trace.task}</p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 border-2 ${
                                trace.status === 'completed' ? 'border-success bg-success/10 text-success' :
                                trace.status === 'failed'    ? 'border-error bg-error/10 text-error' :
                                trace.status === 'running'   ? 'border-info bg-info/10 text-info' :
                                'border-neutral-300 bg-neutral-50 text-neutral-500'
                            }`}>{trace.status}</span>
                            {trace.actual_cost !== undefined && trace.baseline_cost !== undefined && trace.baseline_cost > 0 && (
                                <span className="text-[9px] font-black text-success font-mono">
                                    {Math.round(((trace.baseline_cost - trace.actual_cost) / trace.baseline_cost) * 100)}% below baseline
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="border-b-2 border-black/5 pb-4">
                <h1 className="text-3xl font-black uppercase tracking-tighter text-black mb-1">Execution Trace</h1>
                <p className="font-mono text-neutral-400 text-xs">{trace.id}</p>
            </div>

            {/* Summary metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <MetricBox
                    label="Total Cost"
                    value={totalCost === 0 ? 'FREE' : `$${totalCost.toFixed(6)}`}
                    accent={totalCost === 0}
                />
                <MetricBox
                    label="Latency"
                    value={totalLatency >= 1000 ? `${(totalLatency / 1000).toFixed(2)}s` : `${totalLatency}ms`}
                    subtext={s?.mode_resolved ? `${s.mode_resolved} mode` : undefined}
                />
                <MetricBox
                    label="Nodes"
                    value={s?.node_count ?? trace.nodes.length}
                    subtext={`${trace.nodes.filter(n => n.status === 'completed').length} completed`}
                />
                <MetricBox
                    label="Cache"
                    value={s?.cached ? 'Hit' : 'Miss'}
                    accent={s?.cached}
                    subtext={s?.provider}
                />
            </div>

            {/* Provider + model pill */}
            {(s?.provider || s?.model) && (
                <div className="flex items-center gap-3 border-2 border-black bg-black text-white px-4 py-3 text-[11px] font-mono">
                    <span className="font-black uppercase tracking-widest text-primary text-[9px]">Provider</span>
                    <span className="font-black">{s.provider}</span>
                    {s.model && <>
                        <span className="text-neutral-600">·</span>
                        <span className="text-neutral-300">{s.model}</span>
                    </>}
                    {s.cached && (
                        <span className="ml-auto text-[9px] font-black uppercase px-2 py-0.5 bg-primary text-black">
                            Cache Hit
                        </span>
                    )}
                </div>
            )}

            {/* Route Reasoning — why this provider won */}
            {trace.routing_decision && (
                <div className="border-2 border-black overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 bg-black text-white">
                        <Network size={12} className="text-primary shrink-0" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Route Decision</span>
                        <span className="font-mono text-[11px] font-black text-white ml-1">{trace.routing_decision.selected_provider_id}</span>
                        <span className="ml-auto text-[9px] font-mono text-neutral-400 uppercase">
                            {trace.routing_decision.requested_mode} mode
                        </span>
                    </div>
                    <div className="px-4 py-4 space-y-4 bg-white">
                        {/* Selection reason */}
                        <div className="flex items-center gap-3">
                            <Trophy size={12} className="text-primary shrink-0" />
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mr-2">Selected because:</span>
                                <span className="text-[11px] font-black text-black">
                                    {ROUTING_REASONS[trace.routing_decision.reason] ?? trace.routing_decision.reason.replace(/_/g, ' ')}
                                </span>
                            </div>
                        </div>

                        {/* Alternatives (rejected candidates) */}
                        {trace.routing_decision.alternatives.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Rejected alternatives</div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {trace.routing_decision.alternatives.map((alt) => (
                                        <div key={alt.provider} className="flex items-center gap-2 border-2 border-neutral-100 px-3 py-2 bg-neutral-50">
                                            <X size={10} className="text-error shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] font-black font-mono text-black truncate">{alt.provider}</div>
                                                <div className="text-[9px] text-neutral-400 font-mono">
                                                    score {alt.score} · {REJECTION_REASONS[alt.reason] ?? alt.reason.replace(/_/g, ' ')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Gap 2.4: Policy Checks ──────────────────────────────────── */}
            {(() => {
                const verifyNodes = trace.nodes.filter(n => n.node_type === 'verify')
                const settleNodes = trace.nodes.filter(n => n.node_type === 'settle')
                const failedPolicyNodes = trace.nodes.filter(n =>
                    n.status === 'failed' && n.error &&
                    (n.error.includes('POLICY') || n.error.includes('SESSION') ||
                     n.error.includes('MANDATE') || n.error.includes('budget') ||
                     n.error.includes('denied') || n.error.includes('blocked'))
                )
                if (verifyNodes.length === 0 && settleNodes.length === 0 && failedPolicyNodes.length === 0) return null

                type PolicyCheck = { label: string; passed: boolean; detail?: string }
                const checks: PolicyCheck[] = []

                verifyNodes.forEach(n => {
                    checks.push({
                        label: n.label ?? 'Payment Verification',
                        passed: n.status === 'completed',
                        detail: n.error ?? undefined,
                    })
                })
                settleNodes.forEach(n => {
                    checks.push({
                        label: n.label ?? 'On-chain Settlement',
                        passed: n.status === 'completed',
                        detail: n.error ?? undefined,
                    })
                })
                failedPolicyNodes
                    .filter(n => n.node_type !== 'verify' && n.node_type !== 'settle')
                    .forEach(n => {
                        checks.push({
                            label: n.label ?? `${n.node_type} check`,
                            passed: false,
                            detail: n.error ?? undefined,
                        })
                    })

                const allPassed = checks.every(c => c.passed)

                return (
                    <div className="border-2 border-black overflow-hidden">
                        <div className={`flex items-center gap-3 px-4 py-3 ${allPassed ? 'bg-success/10' : 'bg-error/10'}`}>
                            <Shield size={12} className={allPassed ? 'text-success shrink-0' : 'text-error shrink-0'} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-700">Policy Checks</span>
                            <span className={`ml-auto text-[9px] font-black uppercase px-2 py-0.5 border-2 ${allPassed ? 'border-success bg-success/10 text-success' : 'border-error bg-error/10 text-error'}`}>
                                {allPassed ? `${checks.length} passed` : `${checks.filter(c => !c.passed).length} failed`}
                            </span>
                        </div>
                        <div className="divide-y divide-neutral-100 bg-white">
                            {checks.map((check, i) => (
                                <div key={i} className="flex items-start gap-3 px-4 py-3">
                                    <div className={`mt-0.5 w-4 h-4 border-2 flex items-center justify-center shrink-0 ${check.passed ? 'border-success bg-success/10' : 'border-error bg-error/10'}`}>
                                        <span className={`text-[8px] font-black ${check.passed ? 'text-success' : 'text-error'}`}>
                                            {check.passed ? '✓' : '✕'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-black text-black uppercase tracking-wide">{check.label}</div>
                                        {check.detail && (
                                            <div className={`text-[10px] font-mono mt-0.5 ${check.passed ? 'text-neutral-400' : 'text-error'}`}>
                                                {check.detail}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })()}

            {/* ── Gap 2.6: Context & Memory Layer ─────────────────────────── */}
            {(() => {
                const cacheNodes   = trace.nodes.filter(n => n.node_type === 'cache')
                const retrievalNodes = trace.nodes.filter(n => n.node_type === 'retrieval')
                const isCacheHit   = s?.cached === true
                if (!isCacheHit && cacheNodes.length === 0 && retrievalNodes.length === 0) return null

                return (
                    <div className="border-2 border-black overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3 bg-info/10">
                            <Database size={12} className="text-info shrink-0" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-700">Context &amp; Memory</span>
                            <span className="ml-auto text-[9px] font-mono text-neutral-500">
                                {[
                                    isCacheHit ? 'semantic cache' : '',
                                    retrievalNodes.length > 0 ? `${retrievalNodes.length} knowledge source${retrievalNodes.length > 1 ? 's' : ''}` : '',
                                ].filter(Boolean).join(' · ')}
                            </span>
                        </div>
                        <div className="bg-white divide-y divide-neutral-100">
                            {isCacheHit && (
                                <div className="flex items-start gap-3 px-4 py-3">
                                    <div className="w-4 h-4 border-2 border-primary bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-[8px] font-black text-black">↺</span>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-black uppercase tracking-wide">Semantic Cache Hit</div>
                                        <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                                            Semantically equivalent request found in cache — LLM call skipped entirely. Cost: $0.00.
                                        </div>
                                    </div>
                                </div>
                            )}
                            {cacheNodes.filter(n => !isCacheHit).map((n, i) => (
                                <div key={i} className="flex items-start gap-3 px-4 py-3">
                                    <div className="w-4 h-4 border-2 border-neutral-300 bg-neutral-50 flex items-center justify-center shrink-0 mt-0.5">
                                        <CircleDot size={8} className="text-neutral-400" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-black uppercase tracking-wide">
                                            Cache {n.status === 'completed' ? 'Hit' : 'Miss'} — {n.label ?? n.node_type}
                                        </div>
                                        {n.latency_ms !== undefined && (
                                            <div className="text-[10px] font-mono text-neutral-400 mt-0.5">{n.latency_ms}ms lookup</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {retrievalNodes.map((n, i) => (
                                <div key={i} className="flex items-start gap-3 px-4 py-3">
                                    <div className="w-4 h-4 border-2 border-info bg-info/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <BookOpen size={8} className="text-info" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-black uppercase tracking-wide">
                                            Knowledge Source — {n.label ?? 'retrieval'}
                                        </div>
                                        <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                                            {n.status === 'completed'
                                                ? `Retrieved in ${n.latency_ms ?? '?'}ms`
                                                : n.status === 'failed'
                                                    ? `Retrieval failed${n.error ? ': ' + n.error : ''}`
                                                    : n.status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })()}

            {/* Node timeline */}
            <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-6">
                    Execution Timeline — {trace.nodes.length} node{trace.nodes.length !== 1 ? 's' : ''}
                </div>

                <div>
                    {trace.nodes.map((node, idx) => (
                        <NodeCard key={node.id} node={node} index={idx} isLast={idx === trace.nodes.length - 1} />
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 border-t-2 border-neutral-100 pt-4">
                <span>Request: <Link href="/dashboard/requests" className="font-black text-black hover:text-primary border-b border-current">{trace.request_id.slice(0, 8)}…</Link></span>
                {trace.created_at && <span>{new Date(trace.created_at).toLocaleString()}</span>}
            </div>
        </div>
    )
}
