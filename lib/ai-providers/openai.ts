/**
 * P402 OpenAI Provider Adapter
 * ============================
 * Full implementation of OpenAI API integration.
 * Supports GPT-4o, GPT-4 Turbo, GPT-3.5, and embedding models.
 */

import { BaseProviderAdapter, ProviderConfig } from './base';
import {
    ModelInfo,
    CompletionRequest,
    CompletionResponse,
    CompletionChoice,
    StreamChunk,
    EmbeddingRequest,
    EmbeddingResponse,
    Message
} from './types';

export class OpenAIAdapter extends BaseProviderAdapter {
    id = 'openai';
    name = 'OpenAI';
    baseUrl = 'https://api.openai.com/v1';

    models: ModelInfo[] = [
        // GPT-5.2 Family (2026 Flagship)
        {
            id: 'gpt-5.2',
            name: 'GPT-5.2',
            tier: 'premium',
            contextWindow: 1000000, // 1M Context
            inputCostPer1k: 0.005,
            outputCostPer1k: 0.02,
            capabilities: ['chat', 'vision', 'function_calling', 'json_mode', 'streaming', 'code', 'reasoning', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 32768
        },
        {
            id: 'gpt-5.2-turbo',
            name: 'GPT-5.2 Turbo',
            tier: 'mid',
            contextWindow: 1000000,
            inputCostPer1k: 0.0005,
            outputCostPer1k: 0.002,
            capabilities: ['chat', 'vision', 'function_calling', 'json_mode', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 16384
        },
        // o3 Reasoning (State of the art reasoning)
        {
            id: 'o3-high',
            name: 'o3 High Reasoning',
            tier: 'premium',
            contextWindow: 200000,
            inputCostPer1k: 0.01,
            outputCostPer1k: 0.04,
            capabilities: ['chat', 'reasoning', 'code', 'hard_math'],
            supportsStreaming: true,
            maxOutputTokens: 100000
        },
        // Legacy GPT-4o
        {
            id: 'gpt-4o',
            name: 'GPT-4o (Legacy)',
            tier: 'budget',
            contextWindow: 128000,
            inputCostPer1k: 0.0025,
            outputCostPer1k: 0.01,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 16384
        }
    ];

    constructor(config: ProviderConfig = {}) {
        super({
            apiKey: process.env.OPENAI_API_KEY,
            ...config
        });
    }

    protected getAuthHeaders(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.config.apiKey}`
        };
    }

    // =========================================================================
    // CHAT COMPLETION
    // =========================================================================

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const model = request.model || this.getDefaultModel().id;
        const start = Date.now();

        const body: any = {
            model,
            messages: this.formatMessages(request.messages),
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
            top_p: request.topP,
            frequency_penalty: request.frequencyPenalty,
            presence_penalty: request.presencePenalty,
            stop: request.stop,
            user: request.user
        };

        // Add tools if provided
        if (request.tools && request.tools.length > 0) {
            body.tools = request.tools;
            if (request.toolChoice) {
                body.tool_choice = request.toolChoice;
            }
        }

        // Add response format if JSON mode requested
        if (request.responseFormat) {
            body.response_format = request.responseFormat;
        }

        const response = await this.fetchWithRetry<OpenAIResponse>(
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

    // =========================================================================
    // STREAMING
    // =========================================================================

    async *stream(request: CompletionRequest): AsyncGenerator<StreamChunk> {
        const model = request.model || this.getDefaultModel().id;
        const modelInfo = this.getModel(model);

        // o1 models don't support streaming
        if (modelInfo && !modelInfo.supportsStreaming) {
            const response = await this.complete(request);
            yield {
                id: response.id,
                object: 'chat.completion.chunk',
                created: response.created,
                model: response.model,
                choices: response.choices.map((c, i) => ({
                    index: i,
                    delta: { content: c.message.content as string },
                    finishReason: c.finishReason
                }))
            };
            return;
        }

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
                const chunk = JSON.parse(data) as OpenAIStreamChunk;
                yield this.normalizeStreamChunk(chunk);
            } catch {
                // Skip malformed chunks
            }
        }
    }

    // =========================================================================
    // EMBEDDINGS
    // =========================================================================

    async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
        const model = request.model || 'text-embedding-3-small';

        const body: any = {
            model,
            input: request.input
        };

        if (request.dimensions) {
            body.dimensions = request.dimensions;
        }

        const response = await this.fetchWithRetry<OpenAIEmbeddingResponse>(
            '/embeddings',
            {
                method: 'POST',
                body: JSON.stringify(body)
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
                promptTokens: response.usage.prompt_tokens,
                totalTokens: response.usage.total_tokens
            }
        };
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private formatMessages(messages: Message[]): any[] {
        return messages.map(m => {
            const formatted: any = {
                role: m.role,
                content: m.content
            };

            if (m.name) formatted.name = m.name;
            if (m.tool_calls) formatted.tool_calls = m.tool_calls;
            if (m.tool_call_id) formatted.tool_call_id = m.tool_call_id;

            return formatted;
        });
    }

    private normalizeResponse(
        response: OpenAIResponse,
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

    private normalizeStreamChunk(chunk: OpenAIStreamChunk): StreamChunk {
        return {
            id: chunk.id,
            object: 'chat.completion.chunk',
            created: chunk.created,
            model: chunk.model,
            choices: chunk.choices.map(c => ({
                index: c.index,
                delta: {
                    role: c.delta.role as any,
                    content: c.delta.content,
                    tool_calls: c.delta.tool_calls
                },
                finishReason: c.finish_reason as any
            }))
        };
    }

    protected async performHealthCheck(): Promise<void> {
        // Check models endpoint for connectivity
        await this.fetch('/models', { method: 'GET' });
    }
}

// =============================================================================
// OPENAI API TYPES
// =============================================================================

interface OpenAIResponse {
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

interface OpenAIStreamChunk {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        delta: {
            role?: string;
            content?: string;
            tool_calls?: any[];
        };
        finish_reason: string | null;
    }>;
}

interface OpenAIEmbeddingResponse {
    object: string;
    data: Array<{
        object: string;
        index: number;
        embedding: number[];
    }>;
    model: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
    };
}
