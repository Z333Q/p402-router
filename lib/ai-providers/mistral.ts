/**
 * P402 Mistral Provider Adapter
 * ==============================
 * Mistral AI integration for Mistral Large, Medium, and Small models.
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

export class MistralAdapter extends BaseProviderAdapter {
    id = 'mistral';
    name = 'Mistral AI';
    baseUrl = 'https://api.mistral.ai/v1';

    models: ModelInfo[] = [
        // Mistral Large (Latest)
        {
            id: 'mistral-large-latest',
            name: 'Mistral Large',
            tier: 'premium',
            contextWindow: 128000,
            inputCostPer1k: 0.002,
            outputCostPer1k: 0.006,
            capabilities: ['chat', 'vision', 'function_calling', 'json_mode', 'streaming', 'code', 'reasoning'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'mistral-large-2411',
            name: 'Mistral Large 24.11',
            tier: 'premium',
            contextWindow: 128000,
            inputCostPer1k: 0.002,
            outputCostPer1k: 0.006,
            capabilities: ['chat', 'vision', 'function_calling', 'json_mode', 'streaming', 'code', 'reasoning'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Pixtral Large (Vision)
        {
            id: 'pixtral-large-latest',
            name: 'Pixtral Large',
            tier: 'premium',
            contextWindow: 128000,
            inputCostPer1k: 0.002,
            outputCostPer1k: 0.006,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Mistral Small
        {
            id: 'mistral-small-latest',
            name: 'Mistral Small',
            tier: 'mid',
            contextWindow: 32000,
            inputCostPer1k: 0.0002,
            outputCostPer1k: 0.0006,
            capabilities: ['chat', 'function_calling', 'json_mode', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'mistral-small-2409',
            name: 'Mistral Small 24.09',
            tier: 'mid',
            contextWindow: 32000,
            inputCostPer1k: 0.0002,
            outputCostPer1k: 0.0006,
            capabilities: ['chat', 'function_calling', 'json_mode', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Codestral (Code)
        {
            id: 'codestral-latest',
            name: 'Codestral',
            tier: 'mid',
            contextWindow: 32000,
            inputCostPer1k: 0.0002,
            outputCostPer1k: 0.0006,
            capabilities: ['chat', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Ministral (Fast/Cheap)
        {
            id: 'ministral-8b-latest',
            name: 'Ministral 8B',
            tier: 'budget',
            contextWindow: 128000,
            inputCostPer1k: 0.0001,
            outputCostPer1k: 0.0001,
            capabilities: ['chat', 'function_calling', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'ministral-3b-latest',
            name: 'Ministral 3B',
            tier: 'budget',
            contextWindow: 128000,
            inputCostPer1k: 0.00004,
            outputCostPer1k: 0.00004,
            capabilities: ['chat', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Open Models
        {
            id: 'open-mistral-nemo',
            name: 'Mistral Nemo',
            tier: 'budget',
            contextWindow: 128000,
            inputCostPer1k: 0.00015,
            outputCostPer1k: 0.00015,
            capabilities: ['chat', 'function_calling', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'open-mixtral-8x22b',
            name: 'Mixtral 8x22B',
            tier: 'mid',
            contextWindow: 64000,
            inputCostPer1k: 0.002,
            outputCostPer1k: 0.006,
            capabilities: ['chat', 'function_calling', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'open-mixtral-8x7b',
            name: 'Mixtral 8x7B',
            tier: 'budget',
            contextWindow: 32000,
            inputCostPer1k: 0.0007,
            outputCostPer1k: 0.0007,
            capabilities: ['chat', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        }
    ];

    constructor(config: ProviderConfig = {}) {
        super({
            apiKey: process.env.MISTRAL_API_KEY,
            ...config
        });
    }

    protected getAuthHeaders(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.config.apiKey}`
        };
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const model = request.model || 'mistral-small-latest';
        const start = Date.now();

        const body: any = {
            model,
            messages: this.formatMessages(request.messages),
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
            top_p: request.topP
        };

        if (request.tools && request.tools.length > 0) {
            body.tools = request.tools;
            if (request.toolChoice) {
                body.tool_choice = request.toolChoice;
            }
        }

        if (request.responseFormat?.type === 'json_object') {
            body.response_format = { type: 'json_object' };
        }

        const response = await this.fetchWithRetry<MistralResponse>(
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
        const model = request.model || 'mistral-small-latest';

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
        const model = request.model || 'mistral-embed';
        const inputs = Array.isArray(request.input) ? request.input : [request.input];

        const response = await this.fetchWithRetry<MistralEmbeddingResponse>(
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
        response: MistralResponse,
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

interface MistralResponse {
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

interface MistralEmbeddingResponse {
    id: string;
    object: string;
    model: string;
    data: Array<{
        object: string;
        index: number;
        embedding: number[];
    }>;
    usage?: {
        prompt_tokens: number;
        total_tokens: number;
    };
}
