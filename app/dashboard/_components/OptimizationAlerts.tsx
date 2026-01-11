/**
 * P402 Optimization Alerts Widget
 * =================================
 * Displays AI-powered cost optimization recommendations.
 * One-click actions to apply savings.
 */

'use client';

import React from 'react';
import useSWR from 'swr';
import { Card, Button, Alert, Badge, Skeleton } from './ui';

interface Recommendation {
    id: string;
    type: 'model_switch' | 'provider_switch' | 'caching' | 'batching' | 'tier_downgrade' | 'rate_optimization';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    current: {
        provider?: string;
        model?: string;
        monthly_cost_usd?: number;
        requests?: number;
    };
    recommended: {
        provider?: string;
        model?: string;
        estimated_cost_usd?: number;
        action?: string;
    };
    potential_savings_usd: number;
    potential_savings_percent: number;
    confidence: number;
    implementation: string;
}

interface RecommendationsData {
    summary: {
        total_recommendations: number;
        high_priority: number;
        total_potential_savings_usd: number;
        average_confidence: number;
    };
    recommendations: Recommendation[];
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function OptimizationAlerts() {
    const { data, error, isLoading, mutate } = useSWR<RecommendationsData>(
        '/api/v2/analytics/recommendations',
        fetcher,
        { refreshInterval: 300000 } // Refresh every 5 min
    );

    const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
    const [expanded, setExpanded] = React.useState<string | null>(null);

    const dismissRecommendation = (id: string) => {
        setDismissed(prev => new Set([...prev, id]));
    };

    if (error) {
        return (
            <Card title="⚡ OPTIMIZATION ALERTS">
                <div className="text-center py-8 text-neutral-500">
                    Failed to load recommendations
                </div>
            </Card>
        );
    }

    if (isLoading || !data) {
        return (
            <Card title="⚡ OPTIMIZATION ALERTS">
                <div className="space-y-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                </div>
            </Card>
        );
    }

    const { summary, recommendations } = data;
    const visibleRecs = recommendations.filter(r => !dismissed.has(r.id));

    return (
        <Card
            title="⚡ OPTIMIZATION ALERTS"
            action={
                summary.total_potential_savings_usd > 0 && (
                    <Badge variant="primary">
                        SAVE ${summary.total_potential_savings_usd.toFixed(2)}/mo
                    </Badge>
                )
            }
        >
            {/* Summary Stats */}
            {summary.high_priority > 0 && (
                <div className="flex items-center gap-4 mb-6 p-3 bg-[#F59E0B]/10 border-2 border-[#F59E0B]">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <p className="font-bold text-sm">
                            {summary.high_priority} high-priority optimization{summary.high_priority > 1 ? 's' : ''} available
                        </p>
                        <p className="text-xs text-neutral-600">
                            Potential savings: ${summary.total_potential_savings_usd.toFixed(2)}/month
                        </p>
                    </div>
                </div>
            )}

            {/* Recommendations List */}
            {visibleRecs.length === 0 ? (
                <div className="text-center py-8">
                    <span className="text-4xl mb-4 block">✨</span>
                    <p className="font-bold">All optimized!</p>
                    <p className="text-sm text-neutral-500">
                        No recommendations at this time
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {visibleRecs.map(rec => (
                        <RecommendationCard
                            key={rec.id}
                            recommendation={rec}
                            isExpanded={expanded === rec.id}
                            onToggle={() => setExpanded(expanded === rec.id ? null : rec.id)}
                            onDismiss={() => dismissRecommendation(rec.id)}
                        />
                    ))}
                </div>
            )}

            {/* Refresh Button */}
            <div className="mt-6 pt-4 border-t-2 border-black flex justify-between items-center">
                <span className="text-xs text-neutral-500">
                    {summary.total_recommendations} total • {(summary.average_confidence * 100).toFixed(0)}% avg confidence
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => mutate()}
                >
                    Refresh
                </Button>
            </div>
        </Card>
    );
}

// =============================================================================
// RECOMMENDATION CARD
// =============================================================================

interface RecommendationCardProps {
    recommendation: Recommendation;
    isExpanded: boolean;
    onToggle: () => void;
    onDismiss: () => void;
}

function RecommendationCard({ recommendation: rec, isExpanded, onToggle, onDismiss }: RecommendationCardProps) {
    const priorityStyles = {
        high: 'border-[#EF4444] bg-[#EF4444]/5',
        medium: 'border-[#F59E0B] bg-[#F59E0B]/5',
        low: 'border-neutral-300 bg-neutral-50'
    };

    const typeIcons: Record<string, string> = {
        model_switch: '🔄',
        provider_switch: '🔀',
        caching: '💾',
        batching: '📦',
        tier_downgrade: '📉',
        rate_optimization: '⚡'
    };

    return (
        <div className={`border-2 ${priorityStyles[rec.priority]} p-4`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">{typeIcons[rec.type] || '💡'}</span>
                    <div>
                        <h4 className="font-bold text-sm">{rec.title}</h4>
                        <p className="text-xs text-neutral-600 mt-1">{rec.description}</p>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <Badge variant={rec.priority === 'high' ? 'danger' : rec.priority === 'medium' ? 'warning' : 'default'}>
                        {rec.priority}
                    </Badge>
                </div>
            </div>

            {/* Savings Highlight */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-3 px-4 bg-[#B6FF2E]/20 border-2 border-[#B6FF2E] mb-3">
                <div className="flex-grow">
                    <span className="text-xs font-bold uppercase text-neutral-600">Potential Savings</span>
                    <span className="text-xl font-extrabold block">
                        ${rec.potential_savings_usd.toFixed(2)}/mo
                    </span>
                </div>
                <div className="text-2xl font-extrabold text-[#22C55E]">
                    -{rec.potential_savings_percent}%
                </div>
                <div className="sm:text-right">
                    <span className="text-xs text-neutral-500">Confidence</span>
                    <span className="text-sm font-bold block">{(rec.confidence * 100).toFixed(0)}%</span>
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-neutral-200">
                    {/* Current vs Recommended */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="p-3 bg-neutral-100 border border-neutral-200">
                            <span className="text-xs font-bold uppercase text-neutral-500">Current</span>
                            {rec.current.provider && (
                                <p className="text-sm font-mono">{rec.current.provider}</p>
                            )}
                            {rec.current.model && (
                                <p className="text-sm font-mono">{rec.current.model}</p>
                            )}
                            {rec.current.monthly_cost_usd !== undefined && (
                                <p className="text-sm font-bold">${rec.current.monthly_cost_usd.toFixed(2)}/mo</p>
                            )}
                        </div>
                        <div className="p-3 bg-[#B6FF2E]/20 border border-[#B6FF2E]">
                            <span className="text-xs font-bold uppercase text-neutral-500">Recommended</span>
                            {rec.recommended.provider && (
                                <p className="text-sm font-mono">{rec.recommended.provider}</p>
                            )}
                            {rec.recommended.model && (
                                <p className="text-sm font-mono">{rec.recommended.model}</p>
                            )}
                            {rec.recommended.estimated_cost_usd !== undefined && (
                                <p className="text-sm font-bold">${rec.recommended.estimated_cost_usd.toFixed(2)}/mo</p>
                            )}
                            {rec.recommended.action && (
                                <p className="text-sm">{rec.recommended.action}</p>
                            )}
                        </div>
                    </div>

                    {/* Implementation */}
                    <div className="p-3 bg-[#141414] text-[#F5F5F5] border-2 border-black">
                        <span className="text-xs font-bold uppercase text-neutral-400 block mb-2">
                            Implementation
                        </span>
                        <code className="text-sm font-mono">{rec.implementation}</code>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-4">
                <Button
                    size="sm"
                    variant="primary"
                    onClick={onToggle}
                >
                    {isExpanded ? 'Hide Details' : 'View Details'}
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDismiss}
                >
                    Dismiss
                </Button>
            </div>
        </div>
    );
}
