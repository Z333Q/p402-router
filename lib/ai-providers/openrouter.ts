/**
 * P402 OpenRouter Provider Adapter
 * =================================
 * OpenRouter is a meta-aggregator providing access to 200+ models
 * through a unified API. Great for fallback and model diversity.
 */

import { BaseProviderAdapter, ProviderConfig } from './base';
import {
    ModelInfo,
    CompletionRequest,
    CompletionResponse,
    StreamChunk,
    Message
} from './types';
import {
    loadLiveCatalog,
    type FetcherLike,
} from './openrouter-live-catalog';

const DEFAULT_CATALOG_TTL_MS = 60 * 60 * 1000; // 1 hour
const FAILURE_BACKOFF_MS     = 5 * 60 * 1000;  // 5 min before retrying after a failure

export interface OpenRouterAdapterConfig extends ProviderConfig {
    catalogTtlMs?:    number;
    catalogFetchImpl?: FetcherLike;
}

export class OpenRouterAdapter extends BaseProviderAdapter {
    id = 'openrouter';
    name = 'OpenRouter';
    baseUrl = 'https://openrouter.ai/api/v1';

    // Slice 3Z-B: hybrid live + static catalog state.
    private readonly catalogTtlMs:     number;
    private readonly catalogFetchImpl: FetcherLike | undefined;
    private lastCatalogRefresh: number = 0;
    private lastCatalogFailure: number = 0;
    private inflightRefresh:    Promise<void> | null = null;

    models: ModelInfo[] = [
        // OpenAI via OpenRouter
        {
            id: 'openai/gpt-5.2',
            name: 'GPT-5.2 (via OpenRouter)',
            tier: 'premium',
            contextWindow: 256000,
            inputCostPer1k: 0.004,
            outputCostPer1k: 0.012,
            capabilities: ['chat', 'vision', 'function_calling', 'json_mode', 'streaming', 'reasoning'],
            supportsStreaming: true,
            maxOutputTokens: 32768
        },
        {
            id: 'openai/gpt-4o',
            name: 'GPT-4o (via OpenRouter)',
            tier: 'mid',
            contextWindow: 128000,
            inputCostPer1k: 0.002,
            outputCostPer1k: 0.006,
            capabilities: ['chat', 'vision', 'function_calling', 'json_mode', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 16384
        },
        // Anthropic via OpenRouter
        {
            id: 'anthropic/claude-4.5-opus',
            name: 'Claude 4.5 Opus (via OpenRouter)',
            tier: 'premium',
            contextWindow: 400000,
            inputCostPer1k: 0.008,
            outputCostPer1k: 0.024,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming', 'code', 'reasoning'],
            supportsStreaming: true,
            maxOutputTokens: 16384
        },
        {
            id: 'anthropic/claude-3.5-sonnet',
            name: 'Claude 3.5 Sonnet (via OpenRouter)',
            tier: 'mid',
            contextWindow: 200000,
            inputCostPer1k: 0.003,
            outputCostPer1k: 0.015,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Google via OpenRouter.
        // Reverted to the 1.5 family because the 3.x ids that previously
        // sat here are not real on OpenRouter and were rejected with HTTP
        // 400 "is not a valid model ID" (observed 2026-06-23 in
        // production from /api/v2/chat/completions when the cost-mode
        // router picked them). The 1.5 family has been stable on
        // OpenRouter since mid-2024. Live catalog refresh will replace
        // these on first request if newer ids are available.
        {
            id: 'google/gemini-pro-1.5',
            name: 'Gemini 1.5 Pro (via OpenRouter)',
            tier: 'premium',
            contextWindow: 2000000,
            inputCostPer1k: 0.00125,
            outputCostPer1k: 0.005,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'google/gemini-flash-1.5',
            name: 'Gemini 1.5 Flash (via OpenRouter)',
            tier: 'budget',
            contextWindow: 1000000,
            inputCostPer1k: 0.000075,
            outputCostPer1k: 0.0003,
            capabilities: ['chat', 'vision', 'streaming', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Meta Llama via OpenRouter
        {
            id: 'meta-llama/llama-3.3-70b-instruct',
            name: 'Llama 3.3 70B (via OpenRouter)',
            tier: 'mid',
            contextWindow: 131072,
            inputCostPer1k: 0.00035,
            outputCostPer1k: 0.0004,
            capabilities: ['chat', 'function_calling', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'meta-llama/llama-3.1-405b-instruct',
            name: 'Llama 3.1 405B (via OpenRouter)',
            tier: 'premium',
            contextWindow: 131072,
            inputCostPer1k: 0.001,
            outputCostPer1k: 0.001,
            capabilities: ['chat', 'function_calling', 'streaming', 'code', 'reasoning'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // DeepSeek via OpenRouter
        {
            id: 'deepseek/deepseek-r1',
            name: 'DeepSeek R1 (via OpenRouter)',
            tier: 'mid',
            contextWindow: 64000,
            inputCostPer1k: 0.00055,
            outputCostPer1k: 0.00219,
            capabilities: ['chat', 'streaming', 'code', 'reasoning'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'deepseek/deepseek-chat',
            name: 'DeepSeek Chat (via OpenRouter)',
            tier: 'budget',
            contextWindow: 64000,
            inputCostPer1k: 0.00014,
            outputCostPer1k: 0.00028,
            capabilities: ['chat', 'function_calling', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Mistral via OpenRouter
        {
            id: 'mistralai/mistral-large',
            name: 'Mistral Large (via OpenRouter)',
            tier: 'premium',
            contextWindow: 128000,
            inputCostPer1k: 0.002,
            outputCostPer1k: 0.006,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'mistralai/mistral-small',
            name: 'Mistral Small (via OpenRouter)',
            tier: 'mid',
            contextWindow: 32000,
            inputCostPer1k: 0.0002,
            outputCostPer1k: 0.0006,
            capabilities: ['chat', 'function_calling', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Qwen via OpenRouter
        {
            id: 'qwen/qwen-2.5-72b-instruct',
            name: 'Qwen 2.5 72B (via OpenRouter)',
            tier: 'mid',
            contextWindow: 131072,
            inputCostPer1k: 0.00035,
            outputCostPer1k: 0.0004,
            capabilities: ['chat', 'function_calling', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Perplexity models via OpenRouter
        {
            id: 'perplexity/llama-3.1-sonar-huge-128k-online',
            name: 'Sonar Huge Online (via OpenRouter)',
            tier: 'premium',
            contextWindow: 127072,
            inputCostPer1k: 0.005,
            outputCostPer1k: 0.005,
            capabilities: ['chat', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'perplexity/llama-3.1-sonar-small-128k-online',
            name: 'Sonar Small Online (via OpenRouter)',
            tier: 'mid',
            contextWindow: 127072,
            inputCostPer1k: 0.0002,
            outputCostPer1k: 0.0002,
            capabilities: ['chat', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        }
    ];

    constructor(config: OpenRouterAdapterConfig = {}) {
        super({
            apiKey: process.env.OPENROUTER_API_KEY,
            ...config
        });
        this.catalogTtlMs     = config.catalogTtlMs ?? DEFAULT_CATALOG_TTL_MS;
        this.catalogFetchImpl = config.catalogFetchImpl;
    }

    /**
     * Slice 3Z-B — refresh the OpenRouter model catalog from the live
     * /api/v1/models endpoint.
     *
     * Hybrid posture:
     *   - On success with at least one mappable model: REPLACE `this.models`.
     *     Stale ids in the static catalog (e.g. `google/gemini-3-flash`
     *     if absent from the live response) drop out automatically.
     *   - On failure (network, HTTP non-2xx, malformed response, empty
     *     mappable list): KEEP the existing catalog (initially the
     *     static one; subsequently the last successful live snapshot).
     *     Log a warning and record a failure timestamp so we don't hammer
     *     OpenRouter while it's down.
     *
     * Concurrency: only one in-flight refresh at a time; concurrent callers
     * share the same Promise. TTL gates re-fetches in the happy path; a
     * shorter backoff gates retries after a failure.
     *
     * Never throws. Safe to call fire-and-forget from a hot path.
     */
    async refreshLiveCatalog(opts: { force?: boolean } = {}): Promise<void> {
        const now = Date.now();
        if (!opts.force) {
            const sinceOk   = now - this.lastCatalogRefresh;
            const sinceFail = now - this.lastCatalogFailure;
            if (this.lastCatalogRefresh > 0 && sinceOk < this.catalogTtlMs) return;
            if (this.lastCatalogFailure > 0 && sinceFail < FAILURE_BACKOFF_MS) return;
        }
        if (this.inflightRefresh) return this.inflightRefresh;

        this.inflightRefresh = (async () => {
            try {
                const live = await loadLiveCatalog({
                    apiKey:   this.config.apiKey,
                    referer:  process.env.OPENROUTER_REFERER || 'https://p402.io',
                    fetchImpl: this.catalogFetchImpl,
                });
                if (live.length === 0) {
                    // Empty live response is treated as a failure: we never
                    // wipe the catalog and leave the route routable.
                    this.lastCatalogFailure = Date.now();
                    console.warn('[OpenRouterAdapter] live catalog returned 0 mappable rows; keeping current catalog');
                    return;
                }
                this.models = live;
                this.lastCatalogRefresh = Date.now();
            } catch (err) {
                this.lastCatalogFailure = Date.now();
                console.warn('[OpenRouterAdapter] live catalog refresh failed, keeping current catalog:', (err as Error)?.message ?? err);
            } finally {
                this.inflightRefresh = null;
            }
        })();
        return this.inflightRefresh;
    }

    /** Test/inspection helpers (no side effects). */
    getLastCatalogRefreshTs(): number { return this.lastCatalogRefresh; }
    getLastCatalogFailureTs(): number { return this.lastCatalogFailure; }

    protected getAuthHeaders(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://p402.io',
            'X-Title': 'P402 AI Orchestration'
        };
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const model = request.model || 'openai/gpt-4o-mini';
        const start = Date.now();

        const body: any = {
            model,
            messages: this.formatMessages(request.messages),
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
            top_p: request.topP,
            frequency_penalty: request.frequencyPenalty,
            presence_penalty: request.presencePenalty,
            stop: request.stop
        };

        if (request.tools && request.tools.length > 0) {
            body.tools = request.tools;
            if (request.toolChoice) {
                body.tool_choice = request.toolChoice;
            }
        }

        if (request.responseFormat) {
            body.response_format = request.responseFormat;
        }

        const response = await this.fetchWithRetry<OpenRouterResponse>(
            '/chat/completions',
            {
                method: 'POST',
                body: JSON.stringify(body)
            }
        );

        const latencyMs = Date.now() - start;
        const costUsd = this.estimateCost(
            model,
            response.usage?.prompt_tokens || 0,
            response.usage?.completion_tokens || 0
        );

        return this.normalizeResponse(response, model, latencyMs, costUsd);
    }

    async *stream(request: CompletionRequest): AsyncGenerator<StreamChunk> {
        const model = request.model || 'openai/gpt-4o-mini';

        const body: any = {
            model,
            messages: this.formatMessages(request.messages),
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
            stream: true
        };

        if (request.tools && request.tools.length > 0) {
            body.tools = request.tools;
        }

        const response = await this.fetch<Response>('/chat/completions', {
            method: 'POST',
            body: JSON.stringify(body),
            parseJson: false
        });

        for await (const data of this.parseSSE(response)) {
            try {
                const chunk = JSON.parse(data);
                yield {
                    id: chunk.id,
                    object: 'chat.completion.chunk',
                    created: chunk.created,
                    model: chunk.model,
                    choices: chunk.choices.map((c: any) => ({
                        index: c.index,
                        delta: {
                            role: c.delta?.role,
                            content: c.delta?.content,
                            tool_calls: c.delta?.tool_calls
                        },
                        finishReason: c.finish_reason
                    }))
                };
            } catch {
                // Skip malformed chunks
            }
        }
    }

    private formatMessages(messages: Message[]): any[] {
        return messages.map(m => ({
            role: m.role,
            content: m.content,
            ...(m.name && { name: m.name }),
            ...(m.tool_calls && { tool_calls: m.tool_calls }),
            ...(m.tool_call_id && { tool_call_id: m.tool_call_id })
        }));
    }

    private normalizeResponse(
        response: OpenRouterResponse,
        model: string,
        latencyMs: number,
        costUsd: number
    ): CompletionResponse {
        return {
            id: response.id,
            object: 'chat.completion',
            created: response.created,
            model: response.model,
            choices: response.choices.map((c, i) => ({
                index: i,
                message: {
                    role: c.message.role as any,
                    content: c.message.content || '',
                    tool_calls: c.message.tool_calls
                },
                finishReason: c.finish_reason as any
            })),
            usage: {
                promptTokens: response.usage?.prompt_tokens || 0,
                completionTokens: response.usage?.completion_tokens || 0,
                totalTokens: response.usage?.total_tokens || 0
            },
            p402: {
                providerId: this.id,
                modelId: model,
                costUsd,
                latencyMs,
                cached: false
            }
        };
    }

    protected async performHealthCheck(): Promise<void> {
        await this.fetch('/models', { method: 'GET' });
    }
}

interface OpenRouterResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string | null;
            tool_calls?: any[];
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
