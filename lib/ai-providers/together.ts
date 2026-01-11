/**
 * P402 Together AI Provider Adapter
 * ==================================
 * Together AI aggregates many open-source models.
 * Great for Llama, Qwen, and other open models.
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

export class TogetherAdapter extends BaseProviderAdapter {
    id = 'together';
    name = 'Together AI';
    baseUrl = 'https://api.together.xyz/v1';

    models: ModelInfo[] = [
        // Meta Llama 3.3
        {
            id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
            name: 'Llama 3.3 70B Turbo',
            tier: 'mid',
            contextWindow: 128000,
            inputCostPer1k: 0.00088,
            outputCostPer1k: 0.00088,
            capabilities: ['chat', 'function_calling', 'streaming', 'code', 'reasoning'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Meta Llama 3.1
        {
            id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
            name: 'Llama 3.1 405B Turbo',
            tier: 'premium',
            contextWindow: 130000,
            inputCostPer1k: 0.003,
            outputCostPer1k: 0.003,
            capabilities: ['chat', 'function_calling', 'streaming', 'code', 'reasoning'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
            name: 'Llama 3.1 70B Turbo',
            tier: 'mid',
            contextWindow: 130000,
            inputCostPer1k: 0.00088,
            outputCostPer1k: 0.00088,
            capabilities: ['chat', 'function_calling', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
            name: 'Llama 3.1 8B Turbo',
            tier: 'budget',
            contextWindow: 130000,
            inputCostPer1k: 0.00018,
            outputCostPer1k: 0.00018,
            capabilities: ['chat', 'function_calling', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Qwen 2.5
        {
            id: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
            name: 'Qwen 2.5 72B Turbo',
            tier: 'mid',
            contextWindow: 32768,
            inputCostPer1k: 0.0012,
            outputCostPer1k: 0.0012,
            capabilities: ['chat', 'function_calling', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'Qwen/Qwen2.5-7B-Instruct-Turbo',
            name: 'Qwen 2.5 7B Turbo',
            tier: 'budget',
            contextWindow: 32768,
            inputCostPer1k: 0.0003,
            outputCostPer1k: 0.0003,
            capabilities: ['chat', 'function_calling', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Qwen Coder
        {
            id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
            name: 'Qwen 2.5 Coder 32B',
            tier: 'mid',
            contextWindow: 32768,
            inputCostPer1k: 0.0008,
            outputCostPer1k: 0.0008,
            capabilities: ['chat', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // DeepSeek (via Together)
        {
            id: 'deepseek-ai/DeepSeek-R1',
            name: 'DeepSeek R1',
            tier: 'mid',
            contextWindow: 64000,
            inputCostPer1k: 0.003,
            outputCostPer1k: 0.007,
            capabilities: ['chat', 'streaming', 'code', 'reasoning'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
            name: 'DeepSeek R1 Distill 70B',
            tier: 'mid',
            contextWindow: 64000,
            inputCostPer1k: 0.0016,
            outputCostPer1k: 0.0016,
            capabilities: ['chat', 'streaming', 'code', 'reasoning'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Mixtral
        {
            id: 'mistralai/Mixtral-8x22B-Instruct-v0.1',
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
            id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
            name: 'Mixtral 8x7B',
            tier: 'budget',
            contextWindow: 32768,
            inputCostPer1k: 0.0006,
            outputCostPer1k: 0.0006,
            capabilities: ['chat', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // DBRX
        {
            id: 'databricks/dbrx-instruct',
            name: 'DBRX Instruct',
            tier: 'mid',
            contextWindow: 32768,
            inputCostPer1k: 0.0012,
            outputCostPer1k: 0.0012,
            capabilities: ['chat', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        }
    ];

    constructor(config: ProviderConfig = {}) {
        super({
            apiKey: process.env.TOGETHER_API_KEY,
            ...config
        });
    }

    protected getAuthHeaders(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.config.apiKey}`
        };
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const model = request.model || 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';
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

        const response = await this.fetchWithRetry<TogetherResponse>(
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
        const model = request.model || 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';

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
        const model = request.model || 'togethercomputer/m2-bert-80M-8k-retrieval';
        const inputs = Array.isArray(request.input) ? request.input : [request.input];

        const response = await this.fetchWithRetry<TogetherEmbeddingResponse>(
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
        response: TogetherResponse,
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

interface TogetherResponse {
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

interface TogetherEmbeddingResponse {
    model: string;
    data: Array<{
        embedding: number[];
    }>;
    usage?: {
        prompt_tokens: number;
        total_tokens: number;
    };
}
