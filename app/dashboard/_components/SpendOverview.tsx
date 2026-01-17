/**
 * P402 Spend Overview Widget
 * ===========================
 * "Show the money" - Main cost intelligence dashboard.
 * Displays spend breakdown, trends, and provider distribution.
 */

'use client';

import React from 'react';
import useSWR from 'swr';
import { Card, Stat, ProgressBar, Skeleton, Badge } from './ui';

interface SpendData {
    summary: {
        total_requests: number;
        total_cost_usd: number;
        avg_cost_per_request: number;
        projected_monthly_cost: number;
    };
    by_provider: Array<{
        provider: string;
        requests: number;
        cost_usd: number;
        percentage: number;
    }>;
    by_task: Array<{
        task: string;
        requests: number;
        cost_usd: number;
        percentage: number;
    }>;
    period: {
        days: number;
        start: string;
        end: string;
    };
}

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = new Error('An error occurred while fetching the data.');
        // Attach extra info to the error object.
        (error as any).info = await res.json().catch(() => ({}));
        (error as any).status = res.status;
        throw error;
    }
    return res.json();
};

export function SpendOverview() {
    const { data, error, isLoading } = useSWR<SpendData>(
        '/api/v2/analytics/spend?period=30d',
        fetcher,
        { refreshInterval: 60000 }
    );

    if (error) {
        return (
            <Card title="COST INTELLIGENCE">
                <div className="text-center py-8 text-neutral-500">
                    Failed to load spend data
                </div>
            </Card>
        );
    }

    if (isLoading || !data || !data.summary) {
        return (
            <Card title="COST INTELLIGENCE">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-10" />
                    <Skeleton className="h-32" />
                </div>
            </Card>
        );
    }

    const { summary, by_provider = [], by_task = [], period } = data;

    // Calculate daily average and today's estimated spend
    const dailyAverage = summary.total_cost_usd / period.days;
    const todayEstimate = dailyAverage; // Simplified - would need real-time data

    return (
        <Card title="COST INTELLIGENCE">
            {/* Top Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Stat
                    label="TODAY (EST)"
                    value={todayEstimate.toFixed(4)}
                    prefix="$"
                    size="md"
                />
                <Stat
                    label={`LAST ${period.days} DAYS`}
                    value={summary.total_cost_usd.toFixed(4)}
                    prefix="$"
                    size="md"
                />
                <Stat
                    label="PROJECTED/MONTH"
                    value={summary.projected_monthly_cost.toFixed(2)}
                    prefix="$"
                    size="md"
                />
                <Stat
                    label="AVG/REQUEST"
                    value={summary.avg_cost_per_request.toFixed(6)}
                    prefix="$"
                    size="md"
                />
            </div>

            {/* Requests Count */}
            <div className="flex items-center gap-4 mb-8 py-3 border-y-2 border-black">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Total Requests
                </span>
                <span className="text-2xl font-extrabold font-mono">
                    {summary.total_requests.toLocaleString()}
                </span>
            </div>

            {/* Provider Breakdown */}
            <div className="mb-8">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-4">
                    BY PROVIDER
                </h3>
                {by_provider.length === 0 ? (
                    <p className="text-sm text-neutral-500">No provider data yet</p>
                ) : (
                    <div className="space-y-3">
                        {by_provider.slice(0, 5).map(provider => (
                            <ProviderBar
                                key={provider.provider}
                                name={provider.provider}
                                amount={provider.cost_usd}
                                percent={provider.percentage}
                                requests={provider.requests}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Task Breakdown */}
            <div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-4">
                    BY TASK TYPE
                </h3>
                {by_task.length === 0 ? (
                    <p className="text-sm text-neutral-500">No task data yet</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {by_task.map(task => (
                            <div
                                key={task.task}
                                className="border-2 border-black px-3 py-2 bg-neutral-50"
                            >
                                <span className="text-xs font-bold uppercase block">
                                    {task.task}
                                </span>
                                <span className="text-lg font-extrabold">
                                    ${task.cost_usd.toFixed(4)}
                                </span>
                                <span className="text-xs text-neutral-500 ml-2">
                                    ({task.percentage}%)
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
}

// =============================================================================
// PROVIDER BAR COMPONENT
// =============================================================================

interface ProviderBarProps {
    name: string;
    amount: number;
    percent: number;
    requests: number;
}

function ProviderBar({ name, amount, percent, requests }: ProviderBarProps) {
    // Provider colors
    const providerColors: Record<string, string> = {
        openai: '#10A37F',
        anthropic: '#D4A574',
        google: '#4285F4',
        groq: '#F55036',
        deepseek: '#0066FF',
        mistral: '#FF7000',
        together: '#6366F1',
        fireworks: '#FF4500',
        openrouter: '#8B5CF6',
        cohere: '#39594D',
        perplexity: '#1FB8CD',
        ai21: '#FF6B6B'
    };

    const color = providerColors[name.toLowerCase()] || '#B6FF2E';

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="sm:w-24 flex-shrink-0">
                <span className="text-[11px] sm:text-sm font-bold uppercase">{name}</span>
            </div>
            <div className="flex-grow">
                <div className="h-4 sm:h-6 bg-neutral-100 border-2 border-black relative">
                    <div
                        className="h-full transition-all duration-300"
                        style={{
                            width: `${Math.max(percent, 2)}%`,
                            backgroundColor: color
                        }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] sm:text-xs font-bold">
                        {percent}%
                    </span>
                </div>
            </div>
            <div className="sm:w-28 text-right flex-shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                <span className="text-sm font-extrabold font-mono">
                    ${amount.toFixed(4)}
                </span>
                <span className="text-[10px] text-neutral-500 sm:block">
                    {requests.toLocaleString()} req
                </span>
            </div>
        </div>
    );
}

// =============================================================================
// SPEND MINI WIDGET (for compact display)
// =============================================================================

export function SpendMini() {
    const { data, isLoading, error } = useSWR<SpendData>(
        '/api/v2/analytics/spend?period=7d',
        fetcher
    );

    if (isLoading || error || !data || !data.summary) {
        return (
            <div className="border-2 border-black p-3 bg-white min-w-[120px]">
                <div className="animate-pulse flex flex-col gap-2">
                    <div className="h-3 w-12 bg-neutral-100" />
                    <div className="h-6 w-20 bg-neutral-100" />
                </div>
            </div>
        );
    }

    return (
        <div className="border-2 border-black p-3 bg-white flex items-center justify-between min-w-[150px]">
            <div>
                <span className="text-xs font-bold uppercase text-neutral-500">
                    7-DAY SPEND
                </span>
                <span className="text-xl font-extrabold block">
                    ${data.summary.total_cost_usd.toFixed(2)}
                </span>
            </div>
            <div className="ml-4">
                <Badge variant={data.summary.total_cost_usd < 10 ? 'success' : 'warning'}>
                    {data.summary.total_requests} REQ
                </Badge>
            </div>
        </div>
    );
}
