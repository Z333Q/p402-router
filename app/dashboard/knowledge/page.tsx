'use client'
/**
 * Knowledge — RAG Knowledge Sources
 * Top-1% neo-brutalist knowledge base manager.
 */
import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, MetricBox, EmptyState, ErrorState, Input, Select } from '../_components/ui'
import { formatDistanceToNow } from 'date-fns'
import { BookOpen, Globe, Upload, Code, RefreshCw } from 'lucide-react'

interface KnowledgeSource {
    id: string
    name: string
    source_type: string
    uri: string | null
    trust_level: string
    document_count: number
    chunk_count: number
    created_at: string
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; border: string; bg: string }> = {
    manual: { label: 'Manual', icon: BookOpen, border: 'border-neutral-400', bg: 'bg-neutral-50' },
    url:    { label: 'URL',    icon: Globe,    border: 'border-info',        bg: 'bg-info/5' },
    upload: { label: 'Upload', icon: Upload,   border: 'border-warning',     bg: 'bg-warning/5' },
    api:    { label: 'API',    icon: Code,     border: 'border-primary',     bg: 'bg-primary/5' },
}

const TRUST_CONFIG: Record<string, { label: string; color: string; border: string }> = {
    internal: { label: 'Internal', color: 'text-black',    border: 'border-primary bg-primary/20' },
    verified: { label: 'Verified', color: 'text-success',  border: 'border-success bg-success/10' },
    standard: { label: 'Standard', color: 'text-neutral-500', border: 'border-neutral-200 bg-neutral-50' },
}

export default function KnowledgePage() {
    const qc = useQueryClient()
    const [creating, setCreating] = useState(false)
    const [name, setName] = useState('')
    const [sourceType, setSourceType] = useState('manual')
    const [uri, setUri] = useState('')
    const [trustLevel, setTrustLevel] = useState('standard')
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState('')

    const { data, isLoading, isFetching, error, refetch } = useQuery<{ sources: KnowledgeSource[]; total: number }>({
        queryKey: ['knowledge-sources'],
        queryFn: async () => {
            const res = await fetch('/api/v1/knowledge/sources')
            if (!res.ok) throw new Error('Failed to fetch knowledge sources')
            return res.json()
        },
    })

    const sources = data?.sources ?? []
    const totalDocs = sources.reduce((s, x) => s + (x.document_count ?? 0), 0)
    const totalChunks = sources.reduce((s, x) => s + (x.chunk_count ?? 0), 0)

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) { setFormError('Name is required'); return }
        setSaving(true); setFormError('')
        try {
            const body: Record<string, unknown> = { name, source_type: sourceType, trust_level: trustLevel }
            if (uri.trim()) body.uri = uri.trim()
            const res = await fetch('/api/v1/knowledge/sources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            if (!res.ok) {
                const d = await res.json().catch(() => ({}))
                setFormError((d as any)?.error?.message ?? 'Failed to create source')
                return
            }
            setName(''); setUri(''); setSourceType('manual'); setTrustLevel('standard')
            setCreating(false)
            qc.invalidateQueries({ queryKey: ['knowledge-sources'] })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-8 max-w-[1200px] mx-auto">

            {/* Header */}
            <div className="flex flex-wrap justify-between items-end gap-4 border-b-2 border-black/5 pb-8">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Knowledge</h1>
                    <p className="text-neutral-500 font-medium">RAG retrieval sources powering planned execution.</p>
                </div>
                <div className="flex items-center gap-3">
                    {isFetching && <RefreshCw size={12} className="animate-spin text-neutral-400" />}
                    <Button onClick={() => refetch()} variant="secondary" size="sm">Refresh</Button>
                    <Button onClick={() => setCreating(v => !v)} size="sm">
                        {creating ? '✕ Cancel' : '+ New Source'}
                    </Button>
                </div>
            </div>

            {/* Summary */}
            {!isLoading && (
                <div className="grid grid-cols-3 gap-4">
                    <MetricBox label="Sources" value={sources.length} />
                    <MetricBox label="Documents" value={totalDocs.toLocaleString()} />
                    <MetricBox label="Chunks" value={totalChunks.toLocaleString()} subtext="indexed for retrieval" accent={totalChunks > 0} />
                </div>
            )}

            {/* Create form */}
            {creating && (
                <Card title="New Knowledge Source" className="border-2 border-black">
                    <form onSubmit={handleCreate} className="space-y-5 mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input label="Name *" value={name} onChange={setName} placeholder="My knowledge base" />
                            <Select
                                label="Source Type"
                                value={sourceType}
                                onChange={setSourceType}
                                options={[
                                    { value: 'manual', label: 'Manual' },
                                    { value: 'url', label: 'URL' },
                                    { value: 'upload', label: 'Upload' },
                                    { value: 'api', label: 'API' },
                                ]}
                            />
                            <Input label="URI (optional)" value={uri} onChange={setUri} placeholder="https://..." />
                            <Select
                                label="Trust Level"
                                value={trustLevel}
                                onChange={setTrustLevel}
                                options={[
                                    { value: 'standard', label: 'Standard' },
                                    { value: 'verified', label: 'Verified' },
                                    { value: 'internal', label: 'Internal' },
                                ]}
                            />
                        </div>
                        {formError && (
                            <div className="border-2 border-error bg-error/5 px-3 py-2 text-[11px] font-mono text-error">
                                {formError}
                            </div>
                        )}
                        <div className="flex gap-3 pt-1">
                            <Button type="submit" disabled={saving} loading={saving} size="sm">
                                Create Source
                            </Button>
                            <Button type="button" onClick={() => { setCreating(false); setFormError('') }} variant="secondary" size="sm">
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Sources */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-32 bg-neutral-100 border-2 border-neutral-200 animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <ErrorState title="Failed to load knowledge sources" message={String(error)} />
            ) : sources.length === 0 ? (
                <div className="border-2 border-black p-8 space-y-5">
                    <div className="space-y-2">
                        <div className="text-3xl">📚</div>
                        <h2 className="text-xl font-black uppercase tracking-tighter">No knowledge sources</h2>
                        <p className="text-neutral-500 font-medium">
                            Add a knowledge source to enable <span className="font-black text-black">RAG retrieval</span> inside planned executions.
                            The router will automatically query relevant sources when a retrieve node runs.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Supported source types</div>
                        <div className="flex flex-wrap gap-2">
                            {['URL / Website', 'File Upload', 'API Endpoint', 'Plain Text'].map(t => (
                                <span key={t} className="text-[9px] font-black uppercase border-2 border-neutral-200 px-2 py-1 text-neutral-500">{t}</span>
                            ))}
                        </div>
                    </div>
                    <Button onClick={() => setCreating(true)} size="sm">+ Add First Source</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sources.map((source) => {
                        const typeCfg = TYPE_CONFIG[source.source_type] ?? { label: 'Other', icon: BookOpen, border: 'border-neutral-400', bg: 'bg-neutral-50' }
                        const trustCfg = TRUST_CONFIG[source.trust_level] ?? { label: 'Standard', color: 'text-neutral-500', border: 'border-neutral-200 bg-neutral-50' }
                        const TypeIcon = typeCfg.icon
                        return (
                            <div key={source.id} className={`border-2 border-black ${typeCfg.bg} p-4 flex flex-col gap-3`}>
                                {/* Header */}
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 border-2 ${typeCfg.border} bg-white shrink-0`}>
                                        <TypeIcon size={14} className="text-neutral-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-black text-sm truncate">{source.name}</div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mt-0.5">{typeCfg.label}</div>
                                    </div>
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 border ${trustCfg.border} ${trustCfg.color} shrink-0`}>
                                        {trustCfg.label}
                                    </span>
                                </div>

                                {/* URI */}
                                {source.uri && (
                                    <div className="text-[9px] font-mono text-neutral-400 truncate border-t border-neutral-200 pt-2">
                                        {source.uri}
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="flex gap-4 mt-auto pt-2 border-t border-neutral-200">
                                    <div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Docs</div>
                                        <div className="font-black text-lg text-black">{source.document_count ?? 0}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Chunks</div>
                                        <div className="font-black text-lg text-black">{source.chunk_count ?? 0}</div>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Added</div>
                                        <div className="text-[10px] text-neutral-500">{formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}</div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
