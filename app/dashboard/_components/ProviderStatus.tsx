/**
 * P402 Provider Status Widget
 * ============================
 * Real-time health status for all AI providers.
 * Shows latency, success rate, and availability.
 */

'use client';

import React from 'react';
import useSWR from 'swr';
import { Card, StatusDot, Badge, Skeleton, Button } from './ui';

interface ProviderModel {
    id: string;
    name: string;
    tier: string;
    context_window: number;
    input_cost_per_1k: number;
    output_cost_per_1k: number;
    capabilities: string[];
}

interface Provider {
    id: string;
    name: string;
    models: ProviderModel[];
    health?: {
        status: 'healthy' | 'degraded' | 'down';
        latencyP50Ms: number;
        latencyP95Ms: number;
        successRate: number;
        lastCheckedAt: string;
    };
}

interface ProvidersData {
    data: Provider[];
    meta: {
        total_providers: number;
        total_models: number;
        models_by_tier: Record<string, number>;
    };
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function ProviderStatus() {
    const { data, error, isLoading, mutate } = useSWR<ProvidersData>(
        '/api/v2/providers?health=true',
        fetcher,
        { refreshInterval: 60000 }
    );

    const [view, setView] = React.useState<'grid' | 'list'>('grid');

    if (error) {
        return (
            <Card title="PROVIDER STATUS">
                <div className="text-center py-8 text-neutral-500">
                    Failed to load provider status
                </div>
            </Card>
        );
    }

    if (isLoading || !data) {
        return (
            <Card title="PROVIDER STATUS">
                <div className="grid grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
            </Card>
        );
    }

    const providers = data.data || [];
    const healthyCount = providers.filter(p => p.health?.status === 'healthy').length;
    const degradedCount = providers.filter(p => p.health?.status === 'degraded').length;
    const downCount = providers.filter(p => p.health?.status === 'down').length;

    return (
        <Card 
            title="PROVIDER STATUS"
            action={
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <StatusDot status="healthy" pulse={false} />
                        <span className="text-xs font-bold">{healthyCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusDot status="degraded" pulse={false} />
                        <span className="text-xs font-bold">{degradedCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusDot status="down" pulse={false} />
                        <span className="text-xs font-bold">{downCount}</span>
                    </div>
                </div>
            }
        >
            {/* Summary Bar */}
            <div className="flex items-center gap-6 mb-6 py-3 border-b-2 border-black">
                <div>
                    <span className="text-xs font-bold uppercase text-neutral-500">Providers</span>
                    <span className="text-xl font-extrabold block">{data.meta.total_providers}</span>
                </div>
                <div>
                    <span className="text-xs font-bold uppercase text-neutral-500">Models</span>
                    <span className="text-xl font-extrabold block">{data.meta.total_models}</span>
                </div>
                <div className="ml-auto flex gap-1">
                    <Button 
                        variant={view === 'grid' ? 'primary' : 'ghost'} 
                        size="sm"
                        onClick={() => setView('grid')}
                    >
                        Grid
                    </Button>
                    <Button 
                        variant={view === 'list' ? 'primary' : 'ghost'} 
                        size="sm"
                        onClick={() => setView('list')}
                    >
                        List
                    </Button>
                </div>
            </div>

            {/* Provider Grid/List */}
            {view === 'grid' ? (
                <div className="grid grid-cols-4 gap-4">
                    {providers.map(provider => (
                        <ProviderCard key={provider.id} provider={provider} />
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {providers.map(provider => (
                        <ProviderRow key={provider.id} provider={provider} />
                    ))}
                </div>
            )}

            {/* Refresh */}
            <div className="mt-6 pt-4 border-t-2 border-black flex justify-between items-center">
                <span className="text-xs text-neutral-500">
                    Last checked: {new Date().toLocaleTimeString()}
                </span>
                <Button variant="ghost" size="sm" onClick={() => mutate()}>
                    Refresh
                </Button>
            </div>
        </Card>
    );
}

// =============================================================================
// PROVIDER CARD
// =============================================================================

function ProviderCard({ provider }: { provider: Provider }) {
    const health = provider.health || { status: 'unknown' as const, latencyP50Ms: 0, successRate: 1 };
    
    const statusColors = {
        healthy: 'border-[#22C55E]',
        degraded: 'border-[#F59E0B]',
        down: 'border-[#EF4444]',
        unknown: 'border-neutral-300'
    };

    return (
        <div className={`border-2 ${statusColors[health.status]} p-3 bg-white hover:translate-y-[-2px] transition-transform`}>
            <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sm uppercase">{provider.name}</span>
                <StatusDot status={health.status} />
            </div>
            
            <div className="text-xs text-neutral-500 mb-2">
                {provider.models.length} models
            </div>

            {health.status !== 'unknown' && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <span className="text-neutral-400">P50</span>
                        <span className="font-mono block">{health.latencyP50Ms}ms</span>
                    </div>
                    <div>
                        <span className="text-neutral-400">Success</span>
                        <span className="font-mono block">{(health.successRate * 100).toFixed(0)}%</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// PROVIDER ROW
// =============================================================================

function ProviderRow({ provider }: { provider: Provider }) {
    const health = provider.health || { status: 'unknown' as const, latencyP50Ms: 0, latencyP95Ms: 0, successRate: 1 };
    const [expanded, setExpanded] = React.useState(false);

    return (
        <div className="border-2 border-black">
            {/* Row Header */}
            <div 
                className="flex items-center gap-4 p-3 cursor-pointer hover:bg-neutral-50"
                onClick={() => setExpanded(!expanded)}
            >
                <StatusDot status={health.status} />
                <span className="font-bold text-sm uppercase flex-grow">{provider.name}</span>
                <Badge variant="default">{provider.models.length} models</Badge>
                <div className="text-xs font-mono text-neutral-500">
                    P50: {health.latencyP50Ms}ms
                </div>
                <div className="text-xs font-mono text-neutral-500">
                    P95: {health.latencyP95Ms}ms
                </div>
                <div className="text-xs font-mono">
                    {(health.successRate * 100).toFixed(1)}%
                </div>
                <span className="text-neutral-400">{expanded ? '▼' : '▶'}</span>
            </div>

            {/* Expanded Models */}
            {expanded && (
                <div className="border-t-2 border-black bg-neutral-50 p-3">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-left text-neutral-500 uppercase">
                                <th className="pb-2">Model</th>
                                <th className="pb-2">Tier</th>
                                <th className="pb-2">Context</th>
                                <th className="pb-2">Input $/1K</th>
                                <th className="pb-2">Output $/1K</th>
                                <th className="pb-2">Capabilities</th>
                            </tr>
                        </thead>
                        <tbody>
                            {provider.models.map(model => (
                                <tr key={model.id} className="border-t border-neutral-200">
                                    <td className="py-2 font-mono">{model.id}</td>
                                    <td className="py-2">
                                        <Badge variant={model.tier === 'premium' ? 'primary' : model.tier === 'budget' ? 'success' : 'default'}>
                                            {model.tier}
                                        </Badge>
                                    </td>
                                    <td className="py-2 font-mono">{(model.context_window / 1000).toFixed(0)}K</td>
                                    <td className="py-2 font-mono">${model.input_cost_per_1k.toFixed(5)}</td>
                                    <td className="py-2 font-mono">${model.output_cost_per_1k.toFixed(5)}</td>
                                    <td className="py-2">
                                        <div className="flex flex-wrap gap-1">
                                            {model.capabilities.slice(0, 3).map(cap => (
                                                <span key={cap} className="text-[10px] bg-neutral-200 px-1">
                                                    {cap}
                                                </span>
                                            ))}
                                            {model.capabilities.length > 3 && (
                                                <span className="text-[10px] text-neutral-400">
                                                    +{model.capabilities.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// PROVIDER MINI STATUS
// =============================================================================

export function ProviderMini() {
    const { data, isLoading } = useSWR<ProvidersData>('/api/v2/providers', fetcher);

    if (isLoading || !data) {
        return (
            <div className="border-2 border-black p-3 bg-white">
                <Skeleton className="h-8 w-20" />
            </div>
        );
    }

    const providers = data.data || [];

    return (
        <div className="border-2 border-black p-3 bg-white">
            <span className="text-xs font-bold uppercase text-neutral-500">PROVIDERS</span>
            <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold">{providers.length}</span>
                <span className="text-sm text-neutral-500">
                    ({data.meta.total_models} models)
                </span>
            </div>
        </div>
    );
}
