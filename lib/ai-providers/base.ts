/**
 * P402 Base AI Provider Adapter
 * =============================
 * Abstract base class for all AI provider adapters.
 * Handles common functionality like error handling, retries, and cost calculation.
 */

import {
    AIProviderAdapter,
    ModelInfo,
    ModelCapability,
    CompletionRequest,
    CompletionResponse,
    StreamChunk,
    EmbeddingRequest,
    EmbeddingResponse,
    ProviderHealth,
    AIProviderError,
    RateLimitError,
    AuthenticationError
} from './types';

export interface ProviderConfig {
    apiKey?: string;
    baseUrl?: string;
    timeout?: number;
    maxRetries?: number;
    defaultModel?: string;
}

export abstract class BaseProviderAdapter implements AIProviderAdapter {
    abstract id: string;
    abstract name: string;
    abstract baseUrl: string;
    abstract models: ModelInfo[];

    protected config: ProviderConfig;
    protected lastHealthCheck?: ProviderHealth;
    protected healthCheckInterval = 60000; // 1 minute
    protected lastHealthCheckTime = 0;

    constructor(config: ProviderConfig = {}) {
        this.config = {
            timeout: 60000, // 60 seconds default
            maxRetries: 2,
            ...config
        };
    }

    // =========================================================================
    // MODEL UTILITIES
    // =========================================================================

    getModel(modelId: string): ModelInfo | undefined {
        return this.models.find(m => m.id === modelId);
    }

    supportsCapability(capability: ModelCapability): boolean {
        return this.models.some(m => m.capabilities.includes(capability));
    }

    getDefaultModel(): ModelInfo {
        // Return the first mid-tier model, or first available
        const model = this.models.find(m => m.tier === 'mid') || this.models[0];
        if (!model) throw new Error(`No models defined for provider ${this.id}`);
        return model;
    }

    getBestModelForTask(task: string, maxTier?: string): ModelInfo {
        const tierOrder = ['budget', 'mid', 'premium'];
        const maxTierIndex = maxTier ? tierOrder.indexOf(maxTier) : 2;

        // Filter by tier
        const eligible = this.models.filter(m =>
            tierOrder.indexOf(m.tier) <= maxTierIndex
        );

        // Task-based selection heuristics
        if (task.includes('code') || task.includes('programming')) {
            // Prefer models with code capability
            const codeModel = eligible.find(m => m.capabilities.includes('code'));
            if (codeModel) return codeModel;
        }

        if (task.includes('reason') || task.includes('complex') || task.includes('analysis')) {
            // Prefer premium models for reasoning
            const reasonModel = eligible.find(m =>
                m.capabilities.includes('reasoning') || m.tier === 'premium'
            );
            if (reasonModel) return reasonModel;
        }

        if (task.includes('summar') || task.includes('simple') || task.includes('classif')) {
            // Budget models are fine for simple tasks
            const budgetModel = eligible.find(m => m.tier === 'budget');
            if (budgetModel) return budgetModel;
        }

        // Default to mid-tier
        const fallback = eligible.find(m => m.tier === 'mid') || eligible[0];
        if (!fallback) throw new Error(`No eligible models found for task: ${task}`);
        return fallback;
    }

    // =========================================================================
    // COST CALCULATION
    // =========================================================================

    estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
        const model = this.getModel(modelId);
        if (!model) return 0;

        const inputCost = (inputTokens / 1000) * model.inputCostPer1k;
        const outputCost = (outputTokens / 1000) * model.outputCostPer1k;

        return Math.round((inputCost + outputCost) * 1000000) / 1000000; // Round to 6 decimal places
    }

    // =========================================================================
    // HTTP UTILITIES
    // =========================================================================

    protected async fetch<T>(
        endpoint: string,
        options: RequestInit & { parseJson?: boolean } = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const { parseJson = true, ...fetchOptions } = options;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders(),
                    ...fetchOptions.headers
                }
            });

            clearTimeout(timeout);

            if (!response.ok) {
                await this.handleErrorResponse(response);
            }

            if (parseJson) {
                return await response.json() as T;
            }

            return response as unknown as T;
        } catch (error: any) {
            clearTimeout(timeout);

            if (error.name === 'AbortError') {
                throw new AIProviderError(
                    'Request timed out',
                    this.id,
                    'TIMEOUT',
                    408,
                    true
                );
            }

            if (error instanceof AIProviderError) {
                throw error;
            }

            throw new AIProviderError(
                error.message || 'Network error',
                this.id,
                'NETWORK_ERROR',
                undefined,
                true
            );
        }
    }

    protected async fetchWithRetry<T>(
        endpoint: string,
        options: RequestInit = {},
        retries = this.config.maxRetries || 2
    ): Promise<T> {
        let lastError: Error | undefined;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await this.fetch<T>(endpoint, options);
            } catch (error: any) {
                lastError = error;

                // Don't retry non-retryable errors
                if (error instanceof AIProviderError && !error.retryable) {
                    throw error;
                }

                // Exponential backoff for retries
                if (attempt < retries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    protected abstract getAuthHeaders(): Record<string, string>;

    protected async handleErrorResponse(response: Response): Promise<never> {
        let errorBody: any;
        try {
            errorBody = await response.json();
        } catch {
            errorBody = { message: response.statusText };
        }

        const message = errorBody.error?.message || errorBody.message || 'Unknown error';

        switch (response.status) {
            case 401:
            case 403:
                throw new AuthenticationError(this.id);
            case 429:
                const retryAfter = response.headers.get('retry-after');
                throw new RateLimitError(
                    this.id,
                    retryAfter ? parseInt(retryAfter) * 1000 : undefined
                );
            case 404:
                throw new AIProviderError(message, this.id, 'NOT_FOUND', 404, false);
            case 500:
            case 502:
            case 503:
                throw new AIProviderError(message, this.id, 'SERVER_ERROR', response.status, true);
            default:
                throw new AIProviderError(message, this.id, 'API_ERROR', response.status, false);
        }
    }

    // =========================================================================
    // STREAMING UTILITIES
    // =========================================================================

    protected async *parseSSE(response: Response): AsyncGenerator<string> {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data && data !== '[DONE]') {
                            yield data;
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    // =========================================================================
    // HEALTH CHECK
    // =========================================================================

    async checkHealth(): Promise<ProviderHealth> {
        const now = Date.now();

        // Return cached health if recent
        if (this.lastHealthCheck && (now - this.lastHealthCheckTime) < this.healthCheckInterval) {
            return this.lastHealthCheck;
        }

        const start = now;

        try {
            // Minimal request to check connectivity
            await this.performHealthCheck();

            const latency = Date.now() - start;

            this.lastHealthCheck = {
                status: 'healthy',
                latencyP50Ms: latency,
                latencyP95Ms: Math.round(latency * 1.5),
                successRate: 1.0,
                lastCheckedAt: new Date().toISOString()
            };
        } catch (error: any) {
            this.lastHealthCheck = {
                status: error instanceof RateLimitError ? 'degraded' : 'down',
                latencyP50Ms: 0,
                latencyP95Ms: 0,
                successRate: 0,
                lastCheckedAt: new Date().toISOString(),
                errorMessage: error.message
            };
        }

        this.lastHealthCheckTime = now;
        return this.lastHealthCheck;
    }

    protected async performHealthCheck(): Promise<void> {
        // Default: Just check if we can list models or make a minimal API call
        // Subclasses can override for provider-specific health checks
        await this.fetch('/models', { method: 'GET' });
    }

    // =========================================================================
    // ABSTRACT METHODS
    // =========================================================================

    abstract complete(request: CompletionRequest): Promise<CompletionResponse>;
    abstract stream(request: CompletionRequest): AsyncGenerator<StreamChunk>;

    // Optional embedding support
    async embed?(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}
