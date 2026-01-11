/**
 * P402 Groq Provider Adapter
 * ==========================
 * Ultra-fast inference with Groq's LPU architecture.
 * Supports Llama, Mixtral, and Gemma models.
 */

import { BaseProviderAdapter, ProviderConfig } from './base';
import {
    ModelInfo,
    CompletionRequest,
    CompletionResponse,
    StreamChunk,
    Message
} from './types';

export class GroqAdapter extends BaseProviderAdapter {
    id = 'groq';
    name = 'Groq';
    baseUrl = 'https://api.groq.com/openai/v1';

    models: ModelInfo[] = [
        // Llama 3.3 (Latest)
        {
            id: 'llama-3.3-70b-versatile',
            name: 'Llama 3.3 70B Versatile',
            tier: 'mid',
            contextWindow: 128000,
            inputCostPer1k: 0.00059,
            outputCostPer1k: 0.00079,
            capabilities: ['chat', 'function_calling', 'streaming', 'code', 'reasoning', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 32768
        },
        // Llama 3.1 Family
        {
            id: 'llama-3.1-405b-reasoning',
            name: 'Llama 3.1 405B Reasoning',
            tier: 'premium',
            contextWindow: 131072,
            inputCostPer1k: 0.00,  // Currently free on Groq
            outputCostPer1k: 0.00,
            capabilities: ['chat', 'streaming', 'code', 'reasoning', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 16384
        },
        {
            id: 'llama-3.1-70b-versatile',
            name: 'Llama 3.1 70B Versatile',
            tier: 'mid',
            contextWindow: 131072,
            inputCostPer1k: 0.00059,
            outputCostPer1k: 0.00079,
            capabilities: ['chat', 'function_calling', 'streaming', 'code', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 32768
        },
        {
            id: 'llama-3.1-8b-instant',
            name: 'Llama 3.1 8B Instant',
            tier: 'budget',
            contextWindow: 131072,
            inputCostPer1k: 0.00005,
            outputCostPer1k: 0.00008,
            capabilities: ['chat', 'function_calling', 'streaming', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Llama 3 Family
        {
            id: 'llama3-70b-8192',
            name: 'Llama 3 70B',
            tier: 'mid',
            contextWindow: 8192,
            inputCostPer1k: 0.00059,
            outputCostPer1k: 0.00079,
            capabilities: ['chat', 'function_calling', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'llama3-8b-8192',
            name: 'Llama 3 8B',
            tier: 'budget',
            contextWindow: 8192,
            inputCostPer1k: 0.00005,
            outputCostPer1k: 0.00008,
            capabilities: ['chat', 'function_calling', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Mixtral
        {
            id: 'mixtral-8x7b-32768',
            name: 'Mixtral 8x7B',
            tier: 'mid',
            contextWindow: 32768,
            inputCostPer1k: 0.00024,
            outputCostPer1k: 0.00024,
            capabilities: ['chat', 'function_calling', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 32768
        },
        // Gemma
        {
            id: 'gemma2-9b-it',
            name: 'Gemma 2 9B',
            tier: 'budget',
            contextWindow: 8192,
            inputCostPer1k: 0.00020,
            outputCostPer1k: 0.00020,
            capabilities: ['chat', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // DeepSeek (on Groq)
        {
            id: 'deepseek-r1-distill-llama-70b',
            name: 'DeepSeek R1 Distill Llama 70B',
            tier: 'mid',
            contextWindow: 128000,
            inputCostPer1k: 0.00,
            outputCostPer1k: 0.00,
            capabilities: ['chat', 'streaming', 'code', 'reasoning'],
            supportsStreaming: true,
            maxOutputTokens: 16384
        }
    ];

    constructor(config: ProviderConfig = {}) {
        super({
            apiKey: process.env.GROQ_API_KEY,
            ...config
        });
    }

    protected getAuthHeaders(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.config.apiKey}`
        };
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const model = request.model || 'llama-3.3-70b-versatile';
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

        const response = await this.fetchWithRetry<GroqResponse>(
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
        const model = request.model || 'llama-3.3-70b-versatile';

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
        response: GroqResponse,
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

interface GroqResponse {
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
