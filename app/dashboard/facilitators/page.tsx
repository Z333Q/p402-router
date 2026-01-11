'use client'
import React, { useState } from 'react'
import { Card, Button, Input, Badge, EmptyState, ErrorState } from '../_components/ui'
import { WalletRequired } from '../_components/WalletRequired';
import { useFacilitators, Facilitator } from '@/hooks/useFacilitators'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'

export default function FacilitatorsPage() {
    const { facilitators, loading, error, syncing, refresh, performSync } = useFacilitators()
    const [isAdding, setIsAdding] = useState(false)

    // Form State
    const [form, setForm] = useState({ name: '', endpoint: '', networks: '' })

    return (
        <WalletRequired
            mode="soft"
            title="Facilitator Explorer"
            description="View and manage active settlement providers. Connect your wallet to perform health checks and add trusted nodes."
        >
            <div className="space-y-8">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Facilitators</h1>
                        <p className="text-neutral-500 font-medium">Manage settlement nodes and cross-chain liquidity providers.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={performSync}
                            disabled={syncing}
                            variant="secondary"
                            className="text-xs"
                        >
                            {syncing ? 'Synchronizing...' : 'Re-Check Health'}
                        </Button>
                        <Button onClick={() => setIsAdding(true)} className="text-xs">Register Node</Button>
                    </div>
                </div>

                {error && <ErrorState title="Facilitator Registry Err" body={error} action={<Button onClick={refresh}>Retry</Button>} />}

                {/* Facilitators Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading && facilitators.length === 0 ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-48 bg-neutral-100 border-2 border-dashed border-black/10 animate-pulse" />
                        ))
                    ) : facilitators.length === 0 ? (
                        <div className="col-span-full py-20">
                            <EmptyState
                                title="No facilitators found"
                                body="The registry is empty. Add your first facilitator node to begin routing."
                                action={<Button onClick={() => setIsAdding(true)}>Add Facilitator</Button>}
                            />
                        </div>
                    ) : (
                        facilitators.map(f => (
                            <FacilitatorCard key={f.facilitatorId} f={f} />
                        ))
                    )}
                </div>

                {/* Add Form Modal */}
                {isAdding && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200">
                        <Card title="Register Facilitator" className="w-full max-w-lg bg-white">
                            <div className="space-y-6">
                                <Input
                                    label="Provider Name"
                                    value={form.name}
                                    onChange={v => setForm({ ...form, name: v })}
                                    placeholder="e.g. Acme Private Settlement"
                                />
                                <Input
                                    label="API Endpoint"
                                    value={form.endpoint}
                                    onChange={v => setForm({ ...form, endpoint: v })}
                                    placeholder="https://facilitator.example.com"
                                />
                                <Input
                                    label="Networks (comma separated)"
                                    value={form.networks}
                                    onChange={v => setForm({ ...form, networks: v })}
                                    placeholder="base, ethereum, polygon"
                                />

                                <div className="pt-4 flex gap-3">
                                    <Button variant="secondary" onClick={() => setIsAdding(false)} className="flex-1">Cancel</Button>
                                    <Button onClick={() => setIsAdding(false)} className="flex-1">Save & Verify</Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </WalletRequired>
    )
}

function FacilitatorCard({ f }: { f: Facilitator }) {
    const healthStatus = f.health.status || 'unknown'

    return (
        <Card title={f.name} className="flex flex-col h-full bg-white relative overflow-hidden">
            {/* Status indicators */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-2">
                    <Badge tone={f.type === 'Global' ? 'info' : 'neutral'}>{f.type}</Badge>
                    {f.status === 'inactive' && <Badge tone="warn">Needs Config</Badge>}
                </div>
                <Badge tone={
                    healthStatus === 'healthy' ? 'ok' :
                        healthStatus === 'down' ? 'bad' :
                            healthStatus === 'degraded' ? 'warn' : 'neutral'
                }>
                    {healthStatus}
                </Badge>
            </div>

            <div className="space-y-4 mb-8 flex-1">
                <div className="space-y-1">
                    <div className="text-[10px] font-black uppercase text-neutral-400">Endpoint Cluster</div>
                    <div className="font-mono text-[10px] text-black break-all p-2 bg-neutral-100 border border-black/5 leading-relaxed">
                        {f.endpoint}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y-2 border-black/5">
                    <div>
                        <div className="text-[10px] font-black uppercase text-neutral-400">Success Rate</div>
                        <div className="text-xl font-black text-black">
                            {Math.round((f.health.successRate || 0) * 100)}%
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase text-neutral-400">p95 Latency</div>
                        <div className="text-xl font-black text-black">
                            {f.health.p95 ? `${f.health.p95}ms` : '---'}
                        </div>
                    </div>
                </div>
            </div>

            {f.health.lastChecked && (
                <div className="text-[9px] font-black text-neutral-400 uppercase tracking-widest text-right mt-auto">
                    Heartbeat: {formatDistanceToNow(new Date(f.health.lastChecked))} ago
                </div>
            )}
        </Card>
    )
}
