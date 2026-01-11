/**
 * P402 Fireworks AI Provider Adapter
 * ===================================
 * Fireworks provides fast inference for open-source models.
 * Known for serverless function calling and fine-tuning.
 */

import { BaseProviderAdapter, ProviderConfig } from './base';
import {
    ModelInfo,
    CompletionRequest,
    CompletionResponse,
    StreamChunk,
    EmbeddingRequest,
    EmbeddingResponse,
    Message
} from './types';

export class FireworksAdapter extends BaseProviderAdapter {
    id = 'fireworks';
    name = 'Fireworks AI';
    baseUrl = 'https://api.fireworks.ai/inference/v1';

    models: ModelInfo[] = [
        // Llama 3.3 70B
        {
            id: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
            name: 'Llama 3.3 70B',
            tier: 'mid',
            contextWindow: 131072,
            inputCostPer1k: 0.0009,
            outputCostPer1k: 0.0009,
            capabilities: ['chat', 'function_calling', 'streaming', 'code', 'reasoning'],
            supportsStreaming: true,
            maxOutputTokens: 16384
        },
        // Llama 3.1 Family
        {
            id: 'accounts/fireworks/models/llama-v3p1-405b-instruct',
            name: 'Llama 3.1 405B',
            tier: 'premium',
            contextWindow: 131072,
            inputCostPer1k: 0.003,
            outputCostPer1k: 0.003,
            capabilities: ['chat', 'function_calling', 'streaming', 'code', 'reasoning'],
            supportsStreaming: true,
            maxOutputTokens: 16384
        },
        {
            id: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
            name: 'Llama 3.1 70B',
            tier: 'mid',
            contextWindow: 131072,
            inputCostPer1k: 0.0009,
            outputCostPer1k: 0.0009,
            capabilities: ['chat', 'function_calling', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 16384
        },
        {
            id: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
            name: 'Llama 3.1 8B',
            tier: 'budget',
            contextWindow: 131072,
            inputCostPer1k: 0.0002,
            outputCostPer1k: 0.0002,
            capabilities: ['chat', 'function_calling', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 16384
        },
        // Qwen 2.5
        {
            id: 'accounts/fireworks/models/qwen2p5-72b-instruct',
            name: 'Qwen 2.5 72B',
            tier: 'mid',
            contextWindow: 32768,
            inputCostPer1k: 0.0009,
            outputCostPer1k: 0.0009,
            capabilities: ['chat', 'function_calling', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // DeepSeek R1
        {
            id: 'accounts/fireworks/models/deepseek-r1',
            name: 'DeepSeek R1',
            tier: 'mid',
            contextWindow: 64000,
            inputCostPer1k: 0.0055,
            outputCostPer1k: 0.0055,
            capabilities: ['chat', 'streaming', 'code', 'reasoning'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Mixtral
        {
            id: 'accounts/fireworks/models/mixtral-8x22b-instruct',
            name: 'Mixtral 8x22B',
            tier: 'mid',
            contextWindow: 65536,
            inputCostPer1k: 0.0012,
            outputCostPer1k: 0.0012,
            capabilities: ['chat', 'function_calling', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'accounts/fireworks/models/mixtral-8x7b-instruct',
            name: 'Mixtral 8x7B',
            tier: 'budget',
            contextWindow: 32768,
            inputCostPer1k: 0.0005,
            outputCostPer1k: 0.0005,
            capabilities: ['chat', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Firefunction (Function Calling Optimized)
        {
            id: 'accounts/fireworks/models/firefunction-v2',
            name: 'FireFunction v2',
            tier: 'mid',
            contextWindow: 8192,
            inputCostPer1k: 0.0009,
            outputCostPer1k: 0.0009,
            capabilities: ['chat', 'function_calling', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 4096
        },
        // Gemma 2
        {
            id: 'accounts/fireworks/models/gemma2-9b-it',
            name: 'Gemma 2 9B',
            tier: 'budget',
            contextWindow: 8192,
            inputCostPer1k: 0.0002,
            outputCostPer1k: 0.0002,
            capabilities: ['chat', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        }
    ];

    constructor(config: ProviderConfig = {}) {
        super({
            apiKey: process.env.FIREWORKS_API_KEY,
            ...config
        });
    }

    protected getAuthHeaders(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.config.apiKey}`
        };
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const model = request.model || 'accounts/fireworks/models/llama-v3p1-70b-instruct';
        const start = Date.now();

        const body: any = {
            model,
            messages: this.formatMessages(request.messages),
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
            top_p: request.topP,
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

        const response = await this.fetchWithRetry<FireworksResponse>(
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
        const model = request.model || 'accounts/fireworks/models/llama-v3p1-70b-instruct';

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

    async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
        const model = request.model || 'nomic-ai/nomic-embed-text-v1.5';
        const inputs = Array.isArray(request.input) ? request.input : [request.input];

        const response = await this.fetchWithRetry<FireworksEmbeddingResponse>(
            '/embeddings',
            {
                method: 'POST',
                body: JSON.stringify({
                    model,
                    input: inputs
                })
            }
        );

        return {
            object: 'list',
            data: response.data.map((d, i) => ({
                object: 'embedding',
                index: i,
                embedding: d.embedding
            })),
            model: response.model,
            usage: {
                promptTokens: response.usage?.prompt_tokens || 0,
                totalTokens: response.usage?.total_tokens || 0
            }
        };
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
        response: FireworksResponse,
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

interface FireworksResponse {
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

interface FireworksEmbeddingResponse {
    model: string;
    data: Array<{
        embedding: number[];
    }>;
    usage?: {
        prompt_tokens: number;
        total_tokens: number;
    };
}
