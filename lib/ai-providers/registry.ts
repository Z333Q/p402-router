/**
 * P402 Provider Registry
 * =======================
 * Central registry for all AI providers.
 * Handles provider selection, routing, failover, and cost optimization.
 * V2 Spec: Section 4.1 (Router Engine)
 */

import {
    AIProviderAdapter,
    ModelInfo,
    ModelCapability,
    ModelTier,
    RoutingMode,
    RoutingOptions,
    RoutingDecision,
    RoutingWeights,
    CompletionRequest,
    CompletionResponse,
    StreamChunk,
    ProviderHealth,
    AIProviderError,
    RateLimitError
} from './types';

// Import all providers
import { OpenAIAdapter } from './openai';
import { AnthropicAdapter } from './anthropic';
import { GroqAdapter } from './groq';
import { GoogleAdapter } from './google';
import { DeepSeekAdapter } from './deepseek';
import { MistralAdapter } from './mistral';
import { TogetherAdapter } from './together';
import { FireworksAdapter } from './fireworks';
import { OpenRouterAdapter } from './openrouter';
import { CohereAdapter } from './cohere';
import { PerplexityAdapter } from './perplexity';
import { AI21Adapter } from './ai21';

// =============================================================================
// ROUTING WEIGHTS PRESETS
// =============================================================================

const ROUTING_PRESETS: Record<RoutingMode, RoutingWeights> = {
    cost: { cost: 0.8, quality: 0.1, speed: 0.1 },
    quality: { cost: 0.1, quality: 0.8, speed: 0.1 },
    speed: { cost: 0.1, quality: 0.1, speed: 0.8 },
    balanced: { cost: 0.33, quality: 0.34, speed: 0.33 }
};

// Quality scores by tier (used for routing)
const TIER_QUALITY_SCORES: Record<ModelTier, number> = {
    premium: 1.0,
    mid: 0.7,
    budget: 0.4
};

// Speed scores by tier (inverse of latency expectation)
const TIER_SPEED_SCORES: Record<ModelTier, number> = {
    budget: 0.9,  // Fastest (smaller models)
    mid: 0.6,
    premium: 0.4  // Slowest (larger models)
};

// =============================================================================
// PROVIDER REGISTRY
// =============================================================================

export class ProviderRegistry {
    private providers: Map<string, AIProviderAdapter> = new Map();
    private healthCache: Map<string, { health: ProviderHealth; timestamp: number }> = new Map();
    private healthCacheTTL = 60000; // 1 minute

    constructor() {
        this.registerDefaultProviders();
    }

    // =========================================================================
    // PROVIDER MANAGEMENT
    // =========================================================================

    private registerDefaultProviders(): void {
        // Register all built-in providers
        this.register(new OpenAIAdapter());
        this.register(new AnthropicAdapter());
        this.register(new GroqAdapter());
        this.register(new GoogleAdapter());
        this.register(new DeepSeekAdapter());
        this.register(new MistralAdapter());
        this.register(new TogetherAdapter());
        this.register(new FireworksAdapter());
        this.register(new OpenRouterAdapter());
        this.register(new CohereAdapter());
        this.register(new PerplexityAdapter());
        this.register(new AI21Adapter());
    }

    register(provider: AIProviderAdapter): void {
        this.providers.set(provider.id, provider);
    }

    unregister(providerId: string): void {
        this.providers.delete(providerId);
    }

    get(providerId: string): AIProviderAdapter | undefined {
        return this.providers.get(providerId);
    }

    getAll(): AIProviderAdapter[] {
        return Array.from(this.providers.values());
    }

    // =========================================================================
    // MODEL DISCOVERY
    // =========================================================================

    getAllModels(): Array<{ provider: string; model: ModelInfo }> {
        const models: Array<{ provider: string; model: ModelInfo }> = [];

        for (const provider of this.providers.values()) {
            for (const model of provider.models) {
                models.push({ provider: provider.id, model });
            }
        }

        return models;
    }

    findModel(modelId: string): { provider: AIProviderAdapter; model: ModelInfo } | undefined {
        for (const provider of this.providers.values()) {
            const model = provider.getModel(modelId);
            if (model) {
                return { provider, model };
            }
        }
        return undefined;
    }

    findModelsWithCapability(capability: ModelCapability): Array<{ provider: string; model: ModelInfo }> {
        return this.getAllModels().filter(({ model }) =>
            model.capabilities.includes(capability)
        );
    }

    findModelsByTier(tier: ModelTier): Array<{ provider: string; model: ModelInfo }> {
        return this.getAllModels().filter(({ model }) => model.tier === tier);
    }

    // =========================================================================
    // ROUTING ENGINE
    // =========================================================================

    async route(request: CompletionRequest, options: RoutingOptions = { mode: 'balanced' }): Promise<RoutingDecision> {
        const weights = typeof options.mode === 'string'
            ? ROUTING_PRESETS[options.mode]
            : options.mode;

        // Get all candidate models
        let candidates = this.getAllModels();

        // Apply filters
        candidates = this.applyFilters(candidates, options);

        // Score and rank
        const scored = await this.scoreModels(candidates, weights, request);

        // Sort by total score (descending)
        scored.sort((a, b) => b.scores.total - a.scores.total);

        if (scored.length === 0) {
            throw new AIProviderError(
                'No suitable model found for the given constraints',
                'registry',
                'NO_MODEL_FOUND'
            );
        }

        const winner = scored[0];
        if (!winner) {
            throw new AIProviderError(
                'No suitable model found after scoring',
                'registry',
                'NO_MODEL_FOUND'
            );
        }

        const provider = this.providers.get(winner.providerId)!;
        const model = provider.getModel(winner.modelId)!;

        return {
            provider,
            model,
            reason: this.determineReason(weights),
            scores: winner.scores,
            alternatives: scored.slice(1, 6).map(s => ({
                provider: s.providerId,
                model: s.modelId,
                score: s.scores.total,
                disqualifyReason: undefined
            }))
        };
    }

    private applyFilters(
        candidates: Array<{ provider: string; model: ModelInfo }>,
        options: RoutingOptions
    ): Array<{ provider: string; model: ModelInfo }> {
        let filtered = candidates;

        // Filter by required capabilities
        if (options.requiredCapabilities && options.requiredCapabilities.length > 0) {
            filtered = filtered.filter(({ model }) =>
                options.requiredCapabilities!.every(cap => model.capabilities.includes(cap))
            );
        }

        // Filter by minimum context window
        if (options.minContextWindow) {
            filtered = filtered.filter(({ model }) =>
                model.contextWindow >= options.minContextWindow!
            );
        }

        // Filter by maximum tier
        if (options.maxTier) {
            const tierOrder = ['budget', 'mid', 'premium'];
            const maxIndex = tierOrder.indexOf(options.maxTier);
            filtered = filtered.filter(({ model }) =>
                tierOrder.indexOf(model.tier) <= maxIndex
            );
        }

        // Filter by preferred tier
        if (options.preferTier) {
            const preferred = filtered.filter(({ model }) => model.tier === options.preferTier);
            if (preferred.length > 0) {
                filtered = preferred;
            }
        }

        // Filter by provider preferences
        if (options.preferProviders && options.preferProviders.length > 0) {
            const preferred = filtered.filter(({ provider }) =>
                options.preferProviders!.includes(provider)
            );
            if (preferred.length > 0) {
                filtered = preferred;
            }
        }

        // Exclude providers
        if (options.excludeProviders && options.excludeProviders.length > 0) {
            filtered = filtered.filter(({ provider }) =>
                !options.excludeProviders!.includes(provider)
            );
        }

        return filtered;
    }

    private async scoreModels(
        candidates: Array<{ provider: string; model: ModelInfo }>,
        weights: RoutingWeights,
        request: CompletionRequest
    ): Promise<Array<{
        providerId: string;
        modelId: string;
        scores: { cost: number; quality: number; speed: number; total: number };
    }>> {
        // Estimate token counts for cost calculation
        const estimatedInputTokens = this.estimateTokenCount(request);
        const estimatedOutputTokens = request.maxTokens || 1000;

        // Find min/max costs for normalization
        const costs = candidates.map(({ provider, model }) => {
            const p = this.providers.get(provider)!;
            return p.estimateCost(model.id, estimatedInputTokens, estimatedOutputTokens);
        });
        const minCost = Math.min(...costs);
        const maxCost = Math.max(...costs);
        const costRange = maxCost - minCost || 1;

        const scored = candidates.map(({ provider, model }, i) => {
            const currentCost = costs[i]!;

            // Cost score (lower is better, so invert)
            const costScore = 1 - ((currentCost - minCost) / costRange);

            // Quality score from tier
            const qualityScore = TIER_QUALITY_SCORES[model.tier];

            // Speed score from tier
            const speedScore = TIER_SPEED_SCORES[model.tier];

            // Weighted total
            const total =
                (costScore * weights.cost) +
                (qualityScore * weights.quality) +
                (speedScore * weights.speed);

            return {
                providerId: provider,
                modelId: model.id,
                scores: {
                    cost: Math.round(costScore * 100) / 100,
                    quality: Math.round(qualityScore * 100) / 100,
                    speed: Math.round(speedScore * 100) / 100,
                    total: Math.round(total * 100) / 100
                }
            };
        });

        return scored;
    }

    private estimateTokenCount(request: CompletionRequest): number {
        let total = 0;
        for (const msg of request.messages) {
            if (typeof msg.content === 'string') {
                // Rough estimate: 4 chars per token
                total += Math.ceil(msg.content.length / 4);
            } else {
                for (const part of msg.content) {
                    if (part.type === 'text' && part.text) {
                        total += Math.ceil(part.text.length / 4);
                    }
                }
            }
        }
        return Math.max(total, 10);
    }

    private determineReason(weights: RoutingWeights): RoutingDecision['reason'] {
        if (weights.cost >= 0.6) return 'cost_optimal';
        if (weights.quality >= 0.6) return 'quality_optimal';
        if (weights.speed >= 0.6) return 'speed_optimal';
        return 'balanced';
    }

    // =========================================================================
    // EXECUTION WITH FAILOVER
    // =========================================================================

    async complete(
        request: CompletionRequest,
        options: RoutingOptions = { mode: 'balanced' }
    ): Promise<CompletionResponse> {
        const maxRetries = options.failover?.maxRetries ?? 2;
        const tried: string[] = [];

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Route request (excluding already-tried providers)
                const routeOptions: RoutingOptions = {
                    ...options,
                    excludeProviders: [...(options.excludeProviders || []), ...tried]
                };

                const decision = await this.route(request, routeOptions);
                tried.push(decision.provider.id);

                // Execute request
                const response = await decision.provider.complete({
                    ...request,
                    model: request.model || decision.model.id
                });

                return response;
            } catch (error: any) {
                // If rate limited or retryable, continue to next provider
                if (error instanceof RateLimitError || error.retryable) {
                    if (attempt < maxRetries) {
                        continue;
                    }
                }
                throw error;
            }
        }

        throw new AIProviderError(
            'All providers failed',
            'registry',
            'ALL_PROVIDERS_FAILED'
        );
    }

    async *stream(
        request: CompletionRequest,
        options: RoutingOptions = { mode: 'balanced' }
    ): AsyncGenerator<StreamChunk> {
        // Route to best provider
        const decision = await this.route(request, options);

        // Execute stream
        const generator = decision.provider.stream({
            ...request,
            model: request.model || decision.model.id
        });

        for await (const chunk of generator) {
            yield chunk;
        }
    }

    // =========================================================================
    // HEALTH CHECKING
    // =========================================================================

    async checkAllHealth(): Promise<Map<string, ProviderHealth>> {
        const results = new Map<string, ProviderHealth>();

        await Promise.all(
            Array.from(this.providers.entries()).map(async ([id, provider]) => {
                try {
                    const health = await provider.checkHealth();
                    results.set(id, health);
                    this.healthCache.set(id, { health, timestamp: Date.now() });
                } catch {
                    const failedHealth: ProviderHealth = {
                        status: 'down',
                        latencyP50Ms: 0,
                        latencyP95Ms: 0,
                        successRate: 0,
                        lastCheckedAt: new Date().toISOString(),
                        errorMessage: 'Health check failed'
                    };
                    results.set(id, failedHealth);
                    this.healthCache.set(id, { health: failedHealth, timestamp: Date.now() });
                }
            })
        );

        return results;
    }

    getHealthStatus(providerId: string): ProviderHealth | undefined {
        const cached = this.healthCache.get(providerId);
        if (cached && (Date.now() - cached.timestamp) < this.healthCacheTTL) {
            return cached.health;
        }
        return undefined;
    }

    // =========================================================================
    // COST ANALYSIS
    // =========================================================================

    compareCosts(
        inputTokens: number,
        outputTokens: number,
        capabilities?: ModelCapability[]
    ): Array<{
        provider: string;
        model: string;
        tier: ModelTier;
        costUsd: number;
        inputCostPer1k: number;
        outputCostPer1k: number;
    }> {
        let models = this.getAllModels();

        if (capabilities && capabilities.length > 0) {
            models = models.filter(({ model }) =>
                capabilities.every(cap => model.capabilities.includes(cap))
            );
        }

        const results = models.map(({ provider, model }) => {
            const p = this.providers.get(provider)!;
            const costUsd = p.estimateCost(model.id, inputTokens, outputTokens);

            return {
                provider,
                model: model.id,
                tier: model.tier,
                costUsd,
                inputCostPer1k: model.inputCostPer1k,
                outputCostPer1k: model.outputCostPer1k
            };
        });

        // Sort by cost
        results.sort((a, b) => a.costUsd - b.costUsd);

        return results;
    }

    getCheapestModel(capabilities?: ModelCapability[]): { provider: string; model: string; costPer1kTotal: number } | undefined {
        let models = this.getAllModels();

        if (capabilities && capabilities.length > 0) {
            models = models.filter(({ model }) =>
                capabilities.every(cap => model.capabilities.includes(cap))
            );
        }

        if (models.length === 0) return undefined;

        // Sort by average cost per 1k tokens
        models.sort((a, b) => {
            const costA = a.model.inputCostPer1k + a.model.outputCostPer1k;
            const costB = b.model.inputCostPer1k + b.model.outputCostPer1k;
            return costA - costB;
        });

        const cheapest = models[0]!;
        return {
            provider: cheapest.provider,
            model: cheapest.model.id,
            costPer1kTotal: cheapest.model.inputCostPer1k + cheapest.model.outputCostPer1k
        };
    }

    // =========================================================================
    // STATISTICS
    // =========================================================================

    getStats(): {
        totalProviders: number;
        totalModels: number;
        modelsByTier: Record<ModelTier, number>;
        modelsByCapability: Record<string, number>;
    } {
        const models = this.getAllModels();

        const modelsByTier: Record<ModelTier, number> = {
            budget: 0,
            mid: 0,
            premium: 0
        };

        const modelsByCapability: Record<string, number> = {};

        for (const { model } of models) {
            modelsByTier[model.tier]++;

            for (const cap of model.capabilities) {
                modelsByCapability[cap] = (modelsByCapability[cap] || 0) + 1;
            }
        }

        return {
            totalProviders: this.providers.size,
            totalModels: models.length,
            modelsByTier,
            modelsByCapability
        };
    }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let registry: ProviderRegistry | null = null;

export function getProviderRegistry(): ProviderRegistry {
    if (!registry) {
        registry = new ProviderRegistry();
    }
    return registry;
}

export function resetProviderRegistry(): void {
    registry = null;
}
