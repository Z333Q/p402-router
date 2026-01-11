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

export class OpenRouterAdapter extends BaseProviderAdapter {
    id = 'openrouter';
    name = 'OpenRouter';
    baseUrl = 'https://openrouter.ai/api/v1';

    models: ModelInfo[] = [
        // OpenAI via OpenRouter
        {
            id: 'openai/gpt-4o',
            name: 'GPT-4o (via OpenRouter)',
            tier: 'premium',
            contextWindow: 128000,
            inputCostPer1k: 0.005,
            outputCostPer1k: 0.015,
            capabilities: ['chat', 'vision', 'function_calling', 'json_mode', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 16384
        },
        {
            id: 'openai/gpt-4o-mini',
            name: 'GPT-4o Mini (via OpenRouter)',
            tier: 'budget',
            contextWindow: 128000,
            inputCostPer1k: 0.00015,
            outputCostPer1k: 0.0006,
            capabilities: ['chat', 'vision', 'function_calling', 'json_mode', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 16384
        },
        // Anthropic via OpenRouter
        {
            id: 'anthropic/claude-3.5-sonnet',
            name: 'Claude 3.5 Sonnet (via OpenRouter)',
            tier: 'premium',
            contextWindow: 200000,
            inputCostPer1k: 0.003,
            outputCostPer1k: 0.015,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'anthropic/claude-3-haiku',
            name: 'Claude 3 Haiku (via OpenRouter)',
            tier: 'budget',
            contextWindow: 200000,
            inputCostPer1k: 0.00025,
            outputCostPer1k: 0.00125,
            capabilities: ['chat', 'vision', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 4096
        },
        // Google via OpenRouter
        {
            id: 'google/gemini-pro-1.5',
            name: 'Gemini 1.5 Pro (via OpenRouter)',
            tier: 'premium',
            contextWindow: 2097152,
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
            contextWindow: 1048576,
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

    constructor(config: ProviderConfig = {}) {
        super({
            apiKey: process.env.OPENROUTER_API_KEY,
            ...config
        });
    }

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
