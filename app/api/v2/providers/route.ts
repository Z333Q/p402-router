/**
 * P402 V2 Providers Endpoint
 * ==========================
 * Discover available providers, models, and capabilities.
 * 
 * GET /api/v2/providers - List all providers and models
 * GET /api/v2/providers?capability=vision - Filter by capability
 * GET /api/v2/providers?tier=budget - Filter by tier
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProviderRegistry, ModelCapability, ModelTier } from '@/lib/ai-providers';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const capability = searchParams.get('capability') as ModelCapability | null;
    const tier = searchParams.get('tier') as ModelTier | null;
    const providerId = searchParams.get('provider');
    const includeHealth = searchParams.get('health') === 'true';

    const registry = getProviderRegistry();
    const stats = registry.getStats();

    // Get all models
    let models = registry.getAllModels();

    // Apply filters
    if (capability) {
        models = models.filter(({ model }) => 
            model.capabilities.includes(capability)
        );
    }

    if (tier) {
        models = models.filter(({ model }) => model.tier === tier);
    }

    if (providerId) {
        models = models.filter(({ provider }) => provider === providerId);
    }

    // Group by provider
    const providerMap = new Map<string, {
        id: string;
        name: string;
        models: any[];
        health?: any;
    }>();

    for (const { provider, model } of models) {
        const providerInstance = registry.get(provider);
        if (!providerInstance) continue;

        if (!providerMap.has(provider)) {
            providerMap.set(provider, {
                id: provider,
                name: providerInstance.name,
                models: [],
                health: includeHealth ? registry.getHealthStatus(provider) : undefined
            });
        }

        providerMap.get(provider)!.models.push({
            id: model.id,
            name: model.name,
            tier: model.tier,
            context_window: model.contextWindow,
            max_output_tokens: model.maxOutputTokens,
            input_cost_per_1k: model.inputCostPer1k,
            output_cost_per_1k: model.outputCostPer1k,
            capabilities: model.capabilities,
            supports_streaming: model.supportsStreaming
        });
    }

    // Convert to array
    const providers = Array.from(providerMap.values());

    // Sort providers alphabetically
    providers.sort((a, b) => a.name.localeCompare(b.name));

    // Sort models within each provider by tier (premium > mid > budget)
    const tierOrder = { premium: 0, mid: 1, budget: 2 };
    for (const provider of providers) {
        provider.models.sort((a, b) => tierOrder[a.tier as keyof typeof tierOrder] - tierOrder[b.tier as keyof typeof tierOrder]);
    }

    return NextResponse.json({
        object: 'list',
        data: providers,
        meta: {
            total_providers: stats.totalProviders,
            total_models: models.length,
            models_by_tier: stats.modelsByTier,
            models_by_capability: stats.modelsByCapability,
            filters_applied: {
                capability: capability || null,
                tier: tier || null,
                provider: providerId || null
            }
        }
    });
}

// =============================================================================
// COST COMPARISON ENDPOINT
// =============================================================================

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { input_tokens = 1000, output_tokens = 1000, capabilities } = body;

        const registry = getProviderRegistry();

        // Get cost comparison
        const comparison = registry.compareCosts(
            input_tokens,
            output_tokens,
            capabilities
        );

        // Format response
        const results = comparison.map((item, index) => ({
            rank: index + 1,
            provider: item.provider,
            model: item.model,
            tier: item.tier,
            estimated_cost_usd: item.costUsd,
            input_cost_per_1k: item.inputCostPer1k,
            output_cost_per_1k: item.outputCostPer1k,
            // Calculate savings vs most expensive
            savings_vs_max: comparison.length > 0 
                ? Math.round((1 - item.costUsd / comparison[comparison.length - 1].costUsd) * 100)
                : 0
        }));

        // Get cheapest recommendation
        const cheapest = registry.getCheapestModel(capabilities);

        return NextResponse.json({
            object: 'cost_comparison',
            parameters: {
                input_tokens,
                output_tokens,
                capabilities: capabilities || []
            },
            recommendation: cheapest ? {
                provider: cheapest.provider,
                model: cheapest.model,
                message: `Switch to ${cheapest.model} to minimize costs`
            } : null,
            data: results,
            meta: {
                total_models_compared: results.length,
                cheapest_cost_usd: results[0]?.estimated_cost_usd || 0,
                most_expensive_cost_usd: results[results.length - 1]?.estimated_cost_usd || 0,
                potential_savings_percent: results.length > 1 
                    ? Math.round((1 - results[0].estimated_cost_usd / results[results.length - 1].estimated_cost_usd) * 100)
                    : 0
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            error: {
                type: 'invalid_request',
                message: error.message
            }
        }, { status: 400 });
    }
}
