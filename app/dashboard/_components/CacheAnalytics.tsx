/**
 * P402 Cache Analytics Widget
 * ============================
 * Displays semantic cache performance metrics.
 * Shows hit rate, savings, and cache configuration.
 */

'use client';

import React from 'react';
import useSWR from 'swr';
import { Card, Stat, ProgressBar, Button, Badge, Skeleton, CodeBlock } from './ui';

interface CacheStats {
    totalEntries: number;
    totalHits: number;
    avgHitsPerEntry: number;
    oldestEntry: string | null;
    namespaces: string[];
    hitRate?: number;
    estimatedSavings?: number;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function CacheAnalytics() {
    const { data, error, isLoading, mutate } = useSWR<CacheStats>(
        '/api/v2/cache/stats',
        fetcher,
        { refreshInterval: 30000 }
    );

    const [showConfig, setShowConfig] = React.useState(false);

    // Calculate derived metrics
    const hitRate = data?.hitRate ?? (data?.totalHits && data?.totalEntries
        ? Math.min((data.totalHits / (data.totalEntries * 10)) * 100, 100)
        : 0);

    const estimatedSavings = data?.estimatedSavings ?? (data?.totalHits ? data.totalHits * 0.001 : 0);

    if (error) {
        return (
            <Card title="SEMANTIC CACHE">
                <div className="text-center py-8 text-neutral-500">
                    Cache stats unavailable
                </div>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card title="SEMANTIC CACHE">
                <div className="grid grid-cols-2 gap-6 mb-6">
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                </div>
                <Skeleton className="h-8" />
            </Card>
        );
    }

    return (
        <Card title="SEMANTIC CACHE">
            {/* Main Stats */}
            <div className="grid grid-cols-2 gap-6 mb-6">
                <Stat
                    label="HIT RATE"
                    value={hitRate.toFixed(1)}
                    suffix="%"
                    size="lg"
                />
                <Stat
                    label="EST. SAVED"
                    value={estimatedSavings.toFixed(2)}
                    prefix="$"
                    size="lg"
                />
            </div>

            {/* Hit Rate Visual */}
            <div className="mb-6">
                <ProgressBar
                    value={hitRate}
                    variant={hitRate > 30 ? 'success' : hitRate > 10 ? 'warning' : 'default'}
                />
            </div>

            {/* Cache Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 py-4 border-y-2 border-black mb-6">
                <div className="text-center">
                    <span className="text-lg sm:text-2xl font-extrabold font-mono block">
                        {data?.totalEntries?.toLocaleString() || 0}
                    </span>
                    <span className="text-[10px] text-neutral-500 uppercase">Entries</span>
                </div>
                <div className="text-center">
                    <span className="text-lg sm:text-2xl font-extrabold font-mono block">
                        {data?.totalHits?.toLocaleString() || 0}
                    </span>
                    <span className="text-[10px] text-neutral-500 uppercase">Hits</span>
                </div>
                <div className="text-center">
                    <span className="text-lg sm:text-2xl font-extrabold font-mono block">
                        {(data?.avgHitsPerEntry || 0).toFixed(1)}
                    </span>
                    <span className="text-[10px] text-neutral-500 uppercase">Avg</span>
                </div>
            </div>

            {/* Namespaces */}
            {data?.namespaces && data.namespaces.length > 0 && (
                <div className="mb-6">
                    <span className="text-xs font-bold uppercase text-neutral-500 block mb-2">
                        Active Namespaces
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {data.namespaces.map(ns => (
                            <Badge key={ns} variant="default">{ns}</Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* Configuration */}
            {showConfig && (
                <div className="mb-6">
                    <span className="text-xs font-bold uppercase text-neutral-500 block mb-2">
                        Enable Caching
                    </span>
                    <CodeBlock
                        code={`// Add to your API request
{
  "p402": {
    "cache": true,
    "cache_ttl": 3600
  }
}`}
                        language="json"
                    />
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfig(!showConfig)}
                >
                    {showConfig ? 'Hide Config' : 'Configure'}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        if (confirm('Clear all cache entries?')) {
                            fetch('/api/v2/cache/clear', { method: 'POST' })
                                .then(() => mutate());
                        }
                    }}
                >
                    Clear Cache
                </Button>
            </div>
        </Card>
    );
}

// =============================================================================
// CACHE MINI WIDGET
// =============================================================================

export function CacheMini() {
    const { data, isLoading } = useSWR<CacheStats>('/api/v2/cache/stats', fetcher);

    const hitRate = data?.hitRate ?? 0;

    if (isLoading) {
        return (
            <div className="border-2 border-black p-3 bg-white">
                <Skeleton className="h-8 w-16" />
            </div>
        );
    }

    return (
        <div className="border-2 border-black p-3 bg-white">
            <span className="text-xs font-bold uppercase text-neutral-500">CACHE</span>
            <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold">{hitRate.toFixed(0)}%</span>
                <div className="flex-grow h-2 bg-neutral-100 border border-black">
                    <div
                        className="h-full bg-[#22C55E]"
                        style={{ width: `${hitRate}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
