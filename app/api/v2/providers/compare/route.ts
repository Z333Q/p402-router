/**
 * P402 V2 Provider Comparison Endpoint
 * =====================================
 * Compare costs across providers for given token counts.
 * 
 * POST /api/v2/providers/compare
 * 
 * Returns models sorted by cost with special "picks" for cheapest, fastest, best value.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProviderRegistry, ModelCapability, ModelTier } from '@/lib/ai-providers';

interface CompareRequest {
    input_tokens: number;
    output_tokens: number;
    capabilities?: string[];
    exclude_providers?: string[];
    tier?: string;
}

/**
 * POST /api/v2/providers/compare
 * Compare costs across providers for a given token count
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as CompareRequest;
        const {
            input_tokens,
            output_tokens,
            capabilities = [],
            exclude_providers = [],
            tier,
        } = body;

        // Validate required fields
        if (typeof input_tokens !== 'number' || input_tokens < 0) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    message: 'Valid input_tokens required',
                    code: 'INVALID_INPUT_TOKENS'
                }
            }, { status: 400 });
        }

        if (typeof output_tokens !== 'number' || output_tokens < 0) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    message: 'Valid output_tokens required',
                    code: 'INVALID_OUTPUT_TOKENS'
                }
            }, { status: 400 });
        }

        const registry = getProviderRegistry();

        // Get all models
        let allModels = registry.getAllModels();

        // Filter by capabilities
        if (capabilities.length > 0) {
            allModels = allModels.filter(({ model }) =>
                capabilities.every(cap => model.capabilities.includes(cap as ModelCapability))
            );
        }

        // Filter by tier
        if (tier) {
            allModels = allModels.filter(({ model }) => model.tier === tier);
        }

        // Exclude providers
        if (exclude_providers.length > 0) {
            allModels = allModels.filter(({ provider }) =>
                !exclude_providers.includes(provider)
            );
        }

        // Calculate costs and build results
        const results = allModels.map(({ provider, model }) => {
            const providerInstance = registry.get(provider);
            const inputCost = (input_tokens / 1000) * model.inputCostPer1k;
            const outputCost = (output_tokens / 1000) * model.outputCostPer1k;
            const totalCost = inputCost + outputCost;

            return {
                model: `${provider}/${model.id}`,
                model_name: model.name,
                provider,
                provider_name: providerInstance?.name || provider,
                tier: model.tier,
                cost: totalCost,
                cost_breakdown: {
                    input: inputCost,
                    output: outputCost,
                },
                latency_estimate_ms: null as number | null, // Could be populated from health checks
                quality_score: getQualityScore(model.tier),
                context_window: model.contextWindow,
                input_cost_per_1k: model.inputCostPer1k,
                output_cost_per_1k: model.outputCostPer1k,
            };
        });

        // Sort by cost
        results.sort((a, b) => a.cost - b.cost);

        // Identify special picks
        const cheapest = results[0] || null;

        // Best value: highest quality/cost ratio
        const sortedByValue = [...results].sort((a, b) => {
            const aValue = a.quality_score / (a.cost || 0.0001);
            const bValue = b.quality_score / (b.cost || 0.0001);
            return bValue - aValue;
        });
        const bestValue = sortedByValue[0] || null;

        // Find "fastest" - prioritize budget/efficient tiers as proxy for speed
        const sortedBySpeed = [...results].sort((a, b) => {
            const tierSpeed: Record<string, number> = { budget: 1, mid: 2, premium: 3 };
            return (tierSpeed[a.tier] || 2) - (tierSpeed[b.tier] || 2);
        });
        const fastest = sortedBySpeed[0] || null;

        return NextResponse.json({
            object: 'provider_comparison',
            models: results.map((r, i) => ({
                rank: i + 1,
                ...r
            })),
            picks: {
                cheapest: cheapest ? {
                    model: cheapest.model,
                    provider: cheapest.provider,
                    cost: cheapest.cost,
                    reason: 'Lowest cost for specified token count'
                } : null,
                fastest: fastest ? {
                    model: fastest.model,
                    provider: fastest.provider,
                    cost: fastest.cost,
                    reason: 'Optimized for speed (smaller models)'
                } : null,
                best_value: bestValue ? {
                    model: bestValue.model,
                    provider: bestValue.provider,
                    cost: bestValue.cost,
                    quality_score: bestValue.quality_score,
                    reason: 'Best quality-to-cost ratio'
                } : null,
            },
            query: {
                input_tokens,
                output_tokens,
                capabilities,
                exclude_providers,
                tier: tier || null,
            },
            total_compared: results.length,
        });

    } catch (error: any) {
        console.error('[Providers/Compare] Error:', error);
        return NextResponse.json({
            error: {
                type: 'internal_error',
                message: error.message || 'Failed to compare providers',
                code: 'INTERNAL_ERROR'
            }
        }, { status: 500 });
    }
}

/**
 * Quality score based on tier
 */
function getQualityScore(tier: string): number {
    switch (tier) {
        case 'premium': return 100;
        case 'mid': return 75;
        case 'budget': return 50;
        default: return 50;
    }
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-P402-Tenant, X-P402-Session',
            'Access-Control-Max-Age': '86400'
        }
    });
}
