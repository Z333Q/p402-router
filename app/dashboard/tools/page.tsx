'use client'
/**
 * Tools — Built-in & Custom Tool Registry
 * Top-1% neo-brutalist tool manager.
 */
import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, MetricBox, EmptyState, ErrorState, Input } from '../_components/ui'
import { formatDistanceToNow } from 'date-fns'
import { Globe, Code, ChevronDown, ChevronUp, Zap } from 'lucide-react'

interface Tool {
    id: string
    name: string
    description: string
    is_builtin: boolean
    enabled: boolean
    input_schema: Record<string, unknown>
    created_at: string
}

const TOOL_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    web_search: Globe,
    http_fetch: Code,
}

function ToolCard({ tool }: { tool: Tool }) {
    const [open, setOpen] = useState(false)
    const Icon = TOOL_ICONS[tool.name] ?? Zap
    const params = (tool.input_schema as any)?.properties ?? {}
    const required: string[] = (tool.input_schema as any)?.required ?? []

    return (
        <div className={`border-2 border-black bg-white overflow-hidden`}>
            <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-neutral-50 transition-colors"
                onClick={() => setOpen(v => !v)}
            >
                {/* Icon */}
                <div className={`p-2 border-2 shrink-0 ${tool.is_builtin ? 'border-primary bg-primary/10' : 'border-neutral-200 bg-neutral-50'}`}>
                    <Icon size={14} className={tool.is_builtin ? 'text-black' : 'text-neutral-600'} />
                </div>

                {/* Name + desc */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-black text-[13px]">{tool.name}</span>
                        {tool.is_builtin && (
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-primary/20 border border-primary/40 text-black">Built-in</span>
                        )}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5 truncate">{tool.description}</div>
                </div>

                {/* Status */}
                <span className={`text-[9px] font-black uppercase shrink-0 ${tool.enabled ? 'text-success' : 'text-error'}`}>
                    {tool.enabled ? '● Active' : '○ Disabled'}
                </span>

                {open ? <ChevronUp size={14} className="text-neutral-400 shrink-0" /> : <ChevronDown size={14} className="text-neutral-400 shrink-0" />}
            </div>

            {open && (
                <div className="border-t-2 border-black bg-neutral-50 p-4 space-y-4">
                    {/* Parameters */}
                    {Object.keys(params).length > 0 ? (
                        <div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-3">Parameters</div>
                            <div className="space-y-2">
                                {Object.entries(params).map(([pName, pDef]: [string, any]) => (
                                    <div key={pName} className="flex items-start gap-3 text-[10px] font-mono">
                                        <span className="font-black text-black shrink-0">
                                            {pName}
                                            {required.includes(pName) && <span className="text-error ml-0.5">*</span>}
                                        </span>
                                        <span className="text-primary bg-black px-1.5 py-0.5 text-[8px] font-black uppercase shrink-0">{pDef?.type ?? 'any'}</span>
                                        <span className="text-neutral-500 flex-1">{pDef?.description ?? ''}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <pre className="text-[10px] font-mono bg-neutral-100 border border-neutral-200 p-3 overflow-x-auto max-h-40 whitespace-pre-wrap">
                            {JSON.stringify(tool.input_schema, null, 2)}
                        </pre>
                    )}

                    <div className="text-[9px] text-neutral-400 font-mono border-t border-neutral-200 pt-2">
                        {tool.id.slice(0, 16)}… · added {formatDistanceToNow(new Date(tool.created_at), { addSuffix: true })}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function ToolsPage() {
    const qc = useQueryClient()
    const [creating, setCreating] = useState(false)
    const [toolName, setToolName] = useState('')
    const [description, setDescription] = useState('')
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState('')

    const { data, isLoading, error, refetch } = useQuery<{ tools: Tool[]; total: number }>({
        queryKey: ['tools'],
        queryFn: async () => {
            const res = await fetch('/api/v1/tools')
            if (!res.ok) throw new Error('Failed to fetch tools')
            return res.json()
        },
    })

    const builtins = data?.tools.filter(t => t.is_builtin) ?? []
    const custom   = data?.tools.filter(t => !t.is_builtin) ?? []

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!toolName.trim() || !description.trim()) { setFormError('Name and description are required'); return }
        setSaving(true); setFormError('')
        try {
            const res = await fetch('/api/v1/tools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: toolName.trim(), description: description.trim() }),
            })
            if (!res.ok) {
                const d = await res.json().catch(() => ({}))
                setFormError((d as any)?.error?.message ?? 'Failed to create tool')
                return
            }
            setToolName(''); setDescription(''); setCreating(false)
            qc.invalidateQueries({ queryKey: ['tools'] })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-8 max-w-[1000px] mx-auto">

            {/* Header */}
            <div className="flex flex-wrap justify-between items-end gap-4 border-b-2 border-black/5 pb-8">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Tools</h1>
                    <p className="text-neutral-500 font-medium">Built-in and custom tools available to the planner.</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={() => refetch()} variant="secondary" size="sm">Refresh</Button>
                    <Button onClick={() => setCreating(v => !v)} size="sm">
                        {creating ? '✕ Cancel' : '+ Register Tool'}
                    </Button>
                </div>
            </div>

            {/* Stats */}
            {!isLoading && (
                <div className="grid grid-cols-3 gap-4">
                    <MetricBox label="Built-in" value={builtins.length} subtext="globally available" />
                    <MetricBox label="Custom" value={custom.length} subtext="your tools" />
                    <MetricBox label="Total" value={(builtins.length + custom.length)} accent={(builtins.length + custom.length) > 0} />
                </div>
            )}

            {/* Create form */}
            {creating && (
                <Card title="Register Custom Tool" className="border-2 border-black">
                    <form onSubmit={handleCreate} className="space-y-4 mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Input label="Name *" value={toolName} onChange={setToolName} placeholder="my_custom_tool" />
                                <p className="text-[9px] text-neutral-400 font-mono mt-1">Lowercase a-z 0-9 _ — must start with a letter</p>
                            </div>
                            <Input label="Description *" value={description} onChange={setDescription} placeholder="What this tool does" />
                        </div>
                        {formError && (
                            <div className="border-2 border-error bg-error/5 px-3 py-2 text-[11px] font-mono text-error">{formError}</div>
                        )}
                        <div className="flex gap-3">
                            <Button type="submit" disabled={saving} loading={saving} size="sm">Register</Button>
                            <Button type="button" onClick={() => { setCreating(false); setFormError('') }} variant="secondary" size="sm">Cancel</Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Tool list */}
            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-20 bg-neutral-100 border-2 border-neutral-200 animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <ErrorState title="Failed to load tools" message={String(error)} />
            ) : (
                <div className="space-y-8">
                    {/* Built-ins */}
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-3">Built-in Tools</div>
                        {builtins.length === 0 ? (
                            <div className="border-2 border-dashed border-neutral-200 p-4 text-[11px] text-neutral-400 font-mono text-center">
                                No built-in tools registered
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {builtins.map(t => <ToolCard key={t.id} tool={t} />)}
                            </div>
                        )}
                    </div>

                    {/* Custom */}
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-3">Custom Tools</div>
                        {custom.length === 0 ? (
                            <EmptyState
                                title="No custom tools"
                                body="Register a tool to extend the planner with your own capabilities."
                                icon="🔧"
                            >
                                <Button onClick={() => setCreating(true)} size="sm" className="mt-4">+ Register Tool</Button>
                            </EmptyState>
                        ) : (
                            <div className="space-y-2">
                                {custom.map(t => <ToolCard key={t.id} tool={t} />)}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
