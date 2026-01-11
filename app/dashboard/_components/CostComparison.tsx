/**
 * P402 Cost Comparison Widget
 * ============================
 * Compare costs across all providers for a given workload.
 * Interactive calculator for estimating AI spend.
 */

'use client';

import React from 'react';
import { Card, Button, Badge, Skeleton } from './ui';

interface CostResult {
    rank: number;
    provider: string;
    model: string;
    tier: string;
    estimated_cost_usd: number;
    input_cost_per_1k: number;
    output_cost_per_1k: number;
    savings_vs_max: number;
}

interface ComparisonResponse {
    object: string;
    parameters: {
        input_tokens: number;
        output_tokens: number;
        capabilities: string[];
    };
    recommendation: {
        provider: string;
        model: string;
        message: string;
    } | null;
    data: CostResult[];
    meta: {
        total_models_compared: number;
        cheapest_cost_usd: number;
        most_expensive_cost_usd: number;
        potential_savings_percent: number;
    };
}

export function CostComparison() {
    const [inputTokens, setInputTokens] = React.useState(1000);
    const [outputTokens, setOutputTokens] = React.useState(500);
    const [capabilities, setCapabilities] = React.useState<string[]>([]);
    const [results, setResults] = React.useState<ComparisonResponse | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const availableCapabilities = [
        'chat', 'vision', 'function_calling', 'streaming', 'code', 'reasoning', 'long_context'
    ];

    const compare = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/v2/providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input_tokens: inputTokens,
                    output_tokens: outputTokens,
                    capabilities: capabilities.length > 0 ? capabilities : undefined
                })
            });

            if (!response.ok) throw new Error('Failed to compare costs');

            const data = await response.json();
            setResults(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleCapability = (cap: string) => {
        setCapabilities(prev =>
            prev.includes(cap)
                ? prev.filter(c => c !== cap)
                : [...prev, cap]
        );
    };

    return (
        <Card title="COST COMPARISON">
            {/* Input Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="text-xs font-bold uppercase text-neutral-500 block mb-2">
                        Input Tokens
                    </label>
                    <input
                        type="number"
                        value={inputTokens}
                        onChange={e => setInputTokens(parseInt(e.target.value) || 0)}
                        className="w-full h-11 px-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:ring-offset-2"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold uppercase text-neutral-500 block mb-2">
                        Output Tokens
                    </label>
                    <input
                        type="number"
                        value={outputTokens}
                        onChange={e => setOutputTokens(parseInt(e.target.value) || 0)}
                        className="w-full h-11 px-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:ring-offset-2"
                    />
                </div>
            </div>

            {/* Capability Filter */}
            <div className="mb-6">
                <label className="text-xs font-bold uppercase text-neutral-500 block mb-2">
                    Required Capabilities
                </label>
                <div className="flex flex-wrap gap-2">
                    {availableCapabilities.map(cap => (
                        <button
                            key={cap}
                            onClick={() => toggleCapability(cap)}
                            className={`
                                px-3 py-1.5 text-xs font-bold uppercase border-2 border-black
                                transition-colors
                                ${capabilities.includes(cap)
                                    ? 'bg-[#B6FF2E] text-black'
                                    : 'bg-white text-neutral-600 hover:bg-neutral-100'}
                            `}
                        >
                            {cap}
                        </button>
                    ))}
                </div>
            </div>

            {/* Compare Button */}
            <Button
                onClick={compare}
                loading={loading}
                className="w-full mb-6"
            >
                Compare Costs
            </Button>

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 border-2 border-[#EF4444] bg-[#EF4444]/10 text-sm">
                    {error}
                </div>
            )}

            {/* Results */}
            {results && (
                <div>
                    {/* Summary */}
                    <div className="flex items-center justify-between mb-4 p-4 bg-[#B6FF2E]/20 border-2 border-[#B6FF2E]">
                        <div>
                            <span className="text-xs font-bold uppercase text-neutral-600">Potential Savings</span>
                            <span className="text-2xl font-extrabold block">
                                {results.meta.potential_savings_percent}%
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-neutral-500">
                                ${results.meta.cheapest_cost_usd.toFixed(6)} vs ${results.meta.most_expensive_cost_usd.toFixed(6)}
                            </span>
                        </div>
                    </div>

                    {/* Recommendation */}
                    {results.recommendation && (
                        <div className="mb-4 p-3 bg-neutral-100 border-2 border-black">
                            <span className="text-xs font-bold uppercase text-neutral-500">💡 Recommendation</span>
                            <p className="text-sm mt-1">{results.recommendation.message}</p>
                        </div>
                    )}

                    {/* Results Table */}
                    <div className="border-2 border-black overflow-x-auto">
                        <table className="w-full text-sm min-w-[600px]">
                            <thead className="bg-black text-white">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs uppercase">#</th>
                                    <th className="px-3 py-2 text-left text-xs uppercase">Provider</th>
                                    <th className="px-3 py-2 text-left text-xs uppercase">Model</th>
                                    <th className="px-3 py-2 text-left text-xs uppercase">Tier</th>
                                    <th className="px-3 py-2 text-right text-xs uppercase">Cost</th>
                                    <th className="px-3 py-2 text-right text-xs uppercase">Savings</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.data.slice(0, 15).map((result, i) => (
                                    <tr
                                        key={`${result.provider}-${result.model}`}
                                        className={`
                                            border-t border-neutral-200
                                            ${i === 0 ? 'bg-[#B6FF2E]/20' : ''}
                                        `}
                                    >
                                        <td className="px-3 py-2 font-bold">
                                            {i === 0 ? '🏆' : result.rank}
                                        </td>
                                        <td className="px-3 py-2 font-bold uppercase text-xs">
                                            {result.provider}
                                        </td>
                                        <td className="px-3 py-2 font-mono text-xs">
                                            {result.model.length > 30
                                                ? result.model.slice(0, 30) + '...'
                                                : result.model}
                                        </td>
                                        <td className="px-3 py-2">
                                            <Badge variant={
                                                result.tier === 'premium' ? 'primary' :
                                                    result.tier === 'budget' ? 'success' : 'default'
                                            }>
                                                {result.tier}
                                            </Badge>
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono font-bold">
                                            ${result.estimated_cost_usd.toFixed(6)}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {result.savings_vs_max > 0 ? (
                                                <span className="text-[#22C55E] font-bold">
                                                    -{result.savings_vs_max}%
                                                </span>
                                            ) : (
                                                <span className="text-neutral-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="text-xs text-neutral-500 mt-4 text-center">
                        Compared {results.meta.total_models_compared} models
                    </p>
                </div>
            )}
        </Card>
    );
}
