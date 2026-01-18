'use client'
import React, { useState } from 'react'
import { Card, Button, Badge, EmptyState, ErrorState, MetricBox } from '../_components/ui'
import { WalletRequired } from '../_components/WalletRequired';
import { ProTip } from '../_components/ProTip'
import { useBazaar, BazaarResource } from '@/hooks/useBazaar'
import { clsx } from 'clsx'

export default function BazaarIndexPage() {
    const {
        resources,
        allResources,
        loading,
        error,
        syncing,
        importing,
        searchTerm,
        setSearchTerm,
        selectedTag,
        setSelectedTag,
        allTags,
        refresh,
        performSync,
        importRoute,
        requestSimulation,
        models
    } = useBazaar()

    const [simulationResult, setSimulationResult] = useState<any>(null)

    // Calculate real market stats
    const avgHealth = allResources.length > 0
        ? (allResources.filter(r => r.health_status === 'healthy').length / allResources.length) * 100
        : 100;

    const avgFloor = allResources.length > 0
        ? allResources.reduce((acc, r) => acc + (r.pricing?.min_amount || 0), 0) / allResources.length / 1000000
        : 0;
    const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'bad', text: string } | null>(null)

    const handleSync = async () => {
        const res = await performSync()
        setStatusMsg({ type: res.success ? 'ok' : 'bad', text: res.message })
    }

    const handleImport = async (rid: string) => {
        const res = await importRoute(rid)
        if (res.success) {
            setStatusMsg({ type: 'ok', text: `Successfully imported route: ${res.routeId}` })
        } else {
            setStatusMsg({ type: 'bad', text: res.error || 'Import failed' })
        }
    }

    const handleSimulate = async (rid: string) => {
        try {
            const res = await requestSimulation(rid)
            setSimulationResult(res)
        } catch (err: any) {
            alert(err.message)
        }
    }

    return (
        <WalletRequired
            mode="soft"
            title="Registry Explorer"
            description="Browse and find interoperable resources. Connect your wallet to sync with the global registry and secure imports."
        >
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black uppercase tracking-tighter text-black italic">Discovery Bazaar</h1>
                        <p className="text-neutral-500 font-medium">Explore and deploy high-fidelity x402 routing manifests.</p>
                    </div>
                    <Button onClick={handleSync} disabled={syncing} variant="dark" className="text-[10px] tracking-widest px-6">
                        {syncing ? 'SYNCING REGISTRY...' : 'REFRESH DISCOVERY'}
                    </Button>
                </div>

                {/* Market Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricBox
                        label="Market Inventory"
                        value={`${allResources.length}`}
                        subtext="Discoverable Routes"
                        helpText="The total number of verified x402 resource endpoints available for import."
                    />
                    <MetricBox
                        label="Discovery Health"
                        value={`${avgHealth.toFixed(1)}%`}
                        subtext="Uptime Status"
                        helpText="Availability of the global Bazaar registry and synchronization nodes."
                        accent
                    />
                    <MetricBox
                        label="Avg Entry Floor"
                        value={`$${avgFloor.toFixed(3)}`}
                        subtext="Market Average"
                        helpText="The median starting cost for services listed in the current discovery cycle."
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center bg-black p-2 border-2 border-black">
                    <div className="relative flex-1 group w-full">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <span className="text-primary font-mono text-xs opacity-50 group-hover:opacity-100 transition-opacity">{">"}</span>
                        </div>
                        <input
                            type="text"
                            placeholder="SEARCH DISCOVERY LAYER..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-neutral-900 border-2 border-transparent focus:border-primary/30 text-primary font-mono text-[10px] tracking-widest h-12 pl-10 pr-4 outline-none transition-all placeholder:text-neutral-500"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar w-full md:w-auto">
                        <button
                            onClick={() => setSelectedTag(null)}
                            className={clsx(
                                "px-4 h-12 text-[10px] font-black uppercase tracking-widest transition-all border-2 border-transparent whitespace-nowrap",
                                !selectedTag ? "bg-primary text-black border-primary" : "bg-neutral-800 text-neutral-400 hover:text-primary hover:bg-neutral-700"
                            )}
                        >
                            ALL CATEGORIES
                        </button>
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                                className={clsx(
                                    "px-4 h-12 text-[10px] font-black uppercase tracking-widest transition-all border-2 border-transparent whitespace-nowrap",
                                    tag === selectedTag ? "bg-primary text-black border-primary" : "bg-neutral-800 text-neutral-400 hover:text-primary hover:bg-neutral-700"
                                )}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                <ProTip
                    id="bazaar_discovery_v2"
                    text="The Bazaar Discovery Layer uses cryptographic manifests to verify service integrity before routing. Your local policy engine enforces these constraints automatically."
                    className="mb-0"
                />

                {statusMsg && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                        <Badge tone={statusMsg.type} className="w-full justify-center py-3 text-sm">
                            {statusMsg.text}
                        </Badge>
                    </div>
                )}

                {error && <ErrorState title="Registry Connection Refused" body={error} action={<Button onClick={refresh}>Retry Connect</Button>} />}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading && resources.length === 0 ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-64 bg-neutral-100 border-2 border-dashed border-black/10 animate-pulse" />
                        ))
                    ) : resources.length === 0 && models.length === 0 ? (
                        <div className="col-span-full py-20">
                            <EmptyState
                                title="Bazaar is empty"
                                body="No resources were found in the global registry. Try re-indexing or check your facilitator connections."
                                action={<Button onClick={handleSync}>Re-index Now</Button>}
                            />
                        </div>
                    ) : (
                        <>
                            {resources.map(r => (
                                <BazaarCard
                                    key={r.resource_id}
                                    r={r}
                                    onImport={handleImport}
                                    onSimulate={handleSimulate}
                                    isImporting={importing === r.resource_id}
                                />
                            ))}
                            {models.map(m => (
                                <ModelCard
                                    key={m.id}
                                    m={m}
                                />
                            ))}
                        </>
                    )}
                </div>

                {/* Simulation Playground Modal */}
                {simulationResult && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-full max-w-3xl bg-neutral-900 border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                            {/* Terminal Header */}
                            <div className="bg-black p-4 border-b-2 border-primary/20 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-error" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-warn" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-success" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 italic">Routing Debugger v2.4</span>
                                </div>
                                <div className="font-mono text-[9px] text-neutral-500">SESSION_ID: {simulationResult.decisionId}</div>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <div className="text-[10px] font-black uppercase text-neutral-500">Security Layer</div>
                                            <div className="flex items-center gap-3 p-4 bg-black border-2 border-black/50">
                                                <Badge tone={simulationResult.allow ? 'ok' : 'bad'} className="px-3">
                                                    {simulationResult.allow ? 'PASSED' : 'DENIED'}
                                                </Badge>
                                                <div className="text-xs font-mono text-neutral-300">Policy Evaluation Complete</div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="text-[10px] font-black uppercase text-neutral-500">Winning Candidate</div>
                                            <div className="p-5 bg-primary text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-black/5 animate-scanline" />
                                                <div className="text-sm font-black uppercase tracking-tighter">{simulationResult.candidates?.[0]?.name || 'N/A'}</div>
                                                <div className="text-[10px] font-bold mt-1 opacity-60 italic">Reputation Score: {simulationResult.candidates?.[0]?.score || 0}/100</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6 font-mono">
                                        <div className="text-[10px] font-black uppercase text-neutral-500 font-sans">Decision Ledger</div>
                                        <div className="bg-black/50 p-5 border-2 border-black h-48 overflow-y-auto text-[10px] leading-relaxed space-y-2 scrollbar-thin scrollbar-thumb-primary">
                                            <div className="text-primary/40">[0.00ms] Initializing x402 handshake...</div>
                                            {simulationResult.policy.reasons.map((reason: string, i: number) => (
                                                <div key={i} className="text-primary/80">[{((i + 1) * 0.15).toFixed(2)}ms] {reason}</div>
                                            ))}
                                            <div className="text-primary">[{((simulationResult.policy.reasons.length + 1) * 0.2).toFixed(2)}ms] Ranking {simulationResult.candidates.length} facilitators...</div>
                                            <div className="text-white font-bold">{" >> "} WINNER: {simulationResult.candidates?.[0]?.name} ({simulationResult.candidates?.[0]?.latency}ms)</div>
                                            <div className="text-success">[{(simulationResult.policy.reasons.length * 0.3 + 1).toFixed(2)}ms] Pre-verification successful. Route ready.</div>
                                            <div className="animate-pulse text-primary/40 block">_</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <Button onClick={() => setSimulationResult(null)} variant="secondary" className="flex-1 font-black bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700">
                                        EXIT DEBUGGER
                                    </Button>
                                    <Button variant="dark" onClick={() => {
                                        setSimulationResult(null);
                                        handleImport(simulationResult.resourceId);
                                    }} className="flex-2 font-black bg-primary text-black border-primary hover:bg-primary/90 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                                        CONFIRM & DEPLOY POLICY
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </WalletRequired>
    )
}

function BazaarCard({ r, onImport, onSimulate, isImporting }: { r: BazaarResource, onImport: (id: string) => void, onSimulate: (id: string) => void, isImporting: boolean }) {
    const health = r.health_status || 'unknown'
    const priceUsd = r.pricing?.min_amount ? (r.pricing.min_amount / 1000000).toFixed(4) : '0.0000'

    return (
        <Card title={r.title} body={r.description} className="flex flex-col h-96 bg-white group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden cursor-default hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute inset-0 bg-primary/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none animate-flicker" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-primary/20 animate-scanline opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex flex-wrap gap-2">
                    {r.tags?.slice(0, 2).map(t => <Badge key={t} className="bg-neutral-50 text-[9px] border-neutral-200">{t}</Badge>)}
                </div>
                <Badge tone={health === 'healthy' ? 'ok' : health === 'down' ? 'bad' : 'neutral'} className="animate-pulse">
                    {health}
                </Badge>
            </div>

            <div className="space-y-4 flex-1 mb-6 relative z-10">
                <div className="p-3 bg-neutral-900 text-primary border-2 border-black space-y-1 relative group-hover:bg-black transition-colors">
                    <div className="text-[9px] font-black uppercase text-neutral-500 tracking-widest">Origin Node</div>
                    <div className="font-mono text-[10px] truncate">{r.source_facilitator_id}</div>
                </div>

                <div className="flex items-end justify-between px-1">
                    <div className="space-y-0.5">
                        <div className="text-[9px] font-black uppercase text-neutral-400 tracking-widest">Entry Floor</div>
                        <div className="text-2xl font-black text-black tracking-tighter">${priceUsd}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex gap-2">
                            <div className="text-[8px] font-bold text-success bg-success/10 px-1.5 py-0.5 border border-success/20 uppercase tracking-tighter">
                                {r.success_rate_ledger !== undefined && r.total_calls && r.total_calls > 0
                                    ? `${(r.success_rate_ledger * 100).toFixed(1)}% SR`
                                    : '--- % SR'}
                            </div>
                            <div className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 border border-primary/20 uppercase tracking-tighter">
                                {r.p95_latency_ledger !== undefined && r.total_calls && r.total_calls > 0
                                    ? `${Math.round(r.p95_latency_ledger)}ms P95`
                                    : '--- ms'}
                            </div>
                        </div>
                        <div className="text-[8px] font-bold text-neutral-400 uppercase tracking-tighter">
                            {r.total_calls && r.total_calls > 0 ? `${r.total_calls} CALLS` : 'DISCOVERY PENDING'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t-2 border-black/5 flex gap-3 relative z-10">
                <Button
                    variant="secondary"
                    onClick={() => onSimulate(r.resource_id)}
                    className="flex-1 text-[10px] font-black border-neutral-200"
                    disabled={isImporting}
                >
                    DEBUG
                </Button>
                <Button
                    variant="dark"
                    onClick={() => onImport(r.resource_id)}
                    className="flex-1 text-[10px] font-black group-hover:bg-primary group-hover:text-black group-hover:border-primary transition-all"
                    disabled={isImporting}
                >
                    {isImporting ? '...' : 'DEPLOY'}
                </Button>
            </div>
        </Card>
    )
}

function ModelCard({ m }: { m: any }) {
    return (
        <Card title={m.name} body={`Model ID: ${m.id}`} className="flex flex-col h-96 bg-white group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden cursor-default hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-primary/20">
            <div className="absolute inset-0 bg-primary/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex flex-wrap gap-2">
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] uppercase font-black tracking-widest">AI MODEL</Badge>
                    <Badge className="bg-neutral-50 text-[9px] border-neutral-200">{m.provider?.toUpperCase() || 'GENERIC'}</Badge>
                </div>
                <Badge tone="ok">ACTIVE</Badge>
            </div>

            <div className="space-y-4 flex-1 mb-6 relative z-10">
                <div className="p-3 bg-neutral-900 text-primary border-2 border-black space-y-1">
                    <div className="text-[9px] font-black uppercase text-neutral-500 tracking-widest">Context Window</div>
                    <div className="font-mono text-[10px]">{m.context_window?.toLocaleString() || '---'} Tokens</div>
                </div>

                <div className="flex items-end justify-between px-1">
                    <div className="space-y-0.5">
                        <div className="text-[9px] font-black uppercase text-neutral-400 tracking-widest italic">Input Cost (1M)</div>
                        <div className="text-2xl font-black text-black tracking-tighter">${(Number(m.pricing?.prompt) * 1000).toFixed(4)}</div>
                    </div>
                    <div className="space-y-0.5 text-right">
                        <div className="text-[9px] font-black uppercase text-neutral-400 tracking-widest italic">Output Cost (1M)</div>
                        <div className="text-2xl font-black text-black tracking-tighter">${(Number(m.pricing?.completion) * 1000).toFixed(4)}</div>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t-2 border-black/5 flex flex-wrap gap-1 relative z-10 h-16 overflow-hidden">
                {m.capabilities?.slice(0, 5).map((c: string) => (
                    <span key={c} className="text-[8px] font-bold text-neutral-400 border border-neutral-200 px-1.5 py-0.5 uppercase tracking-tighter">
                        {c.replace('_', ' ')}
                    </span>
                ))}
            </div>
        </Card>
    )
}
