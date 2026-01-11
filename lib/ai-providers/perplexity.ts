/**
 * P402 Perplexity Provider Adapter
 * =================================
 * Perplexity provides AI models with built-in web search,
 * excellent for up-to-date information and research.
 */

import { BaseProviderAdapter, ProviderConfig } from './base';
import {
    ModelInfo,
    CompletionRequest,
    CompletionResponse,
    StreamChunk,
    Message
} from './types';

export class PerplexityAdapter extends BaseProviderAdapter {
    id = 'perplexity';
    name = 'Perplexity';
    baseUrl = 'https://api.perplexity.ai';

    models: ModelInfo[] = [
        // Sonar Models (with web search)
        {
            id: 'llama-3.1-sonar-huge-128k-online',
            name: 'Sonar Huge 128K Online',
            tier: 'premium',
            contextWindow: 127072,
            inputCostPer1k: 0.005,
            outputCostPer1k: 0.005,
            capabilities: ['chat', 'streaming', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'llama-3.1-sonar-large-128k-online',
            name: 'Sonar Large 128K Online',
            tier: 'mid',
            contextWindow: 127072,
            inputCostPer1k: 0.001,
            outputCostPer1k: 0.001,
            capabilities: ['chat', 'streaming', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'llama-3.1-sonar-small-128k-online',
            name: 'Sonar Small 128K Online',
            tier: 'budget',
            contextWindow: 127072,
            inputCostPer1k: 0.0002,
            outputCostPer1k: 0.0002,
            capabilities: ['chat', 'streaming', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Chat Models (no web search, faster)
        {
            id: 'llama-3.1-sonar-large-128k-chat',
            name: 'Sonar Large 128K Chat',
            tier: 'mid',
            contextWindow: 131072,
            inputCostPer1k: 0.001,
            outputCostPer1k: 0.001,
            capabilities: ['chat', 'streaming', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'llama-3.1-sonar-small-128k-chat',
            name: 'Sonar Small 128K Chat',
            tier: 'budget',
            contextWindow: 131072,
            inputCostPer1k: 0.0002,
            outputCostPer1k: 0.0002,
            capabilities: ['chat', 'streaming', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Base Llama models
        {
            id: 'llama-3.1-70b-instruct',
            name: 'Llama 3.1 70B Instruct',
            tier: 'mid',
            contextWindow: 131072,
            inputCostPer1k: 0.001,
            outputCostPer1k: 0.001,
            capabilities: ['chat', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'llama-3.1-8b-instruct',
            name: 'Llama 3.1 8B Instruct',
            tier: 'budget',
            contextWindow: 131072,
            inputCostPer1k: 0.0002,
            outputCostPer1k: 0.0002,
            capabilities: ['chat', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        }
    ];

    constructor(config: ProviderConfig = {}) {
        super({
            apiKey: process.env.PERPLEXITY_API_KEY,
            ...config
        });
    }

    protected getAuthHeaders(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.config.apiKey}`
        };
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const model = request.model || 'llama-3.1-sonar-small-128k-online';
        const start = Date.now();

        const body: any = {
            model,
            messages: this.formatMessages(request.messages),
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
            top_p: request.topP,
            frequency_penalty: request.frequencyPenalty,
            presence_penalty: request.presencePenalty
        };

        const response = await this.fetchWithRetry<PerplexityResponse>(
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
        const model = request.model || 'llama-3.1-sonar-small-128k-online';

        const body: any = {
            model,
            messages: this.formatMessages(request.messages),
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
            stream: true
        };

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
                            content: c.delta?.content
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
            content: typeof m.content === 'string' 
                ? m.content 
                : m.content.map((p: any) => p.text).join('\n')
        }));
    }

    private normalizeResponse(
        response: PerplexityResponse,
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
                    content: c.message.content || ''
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
        // Perplexity doesn't have a models endpoint, so do a minimal chat
        await this.fetchWithRetry('/chat/completions', {
            method: 'POST',
            body: JSON.stringify({
                model: 'llama-3.1-8b-instruct',
                messages: [{ role: 'user', content: 'hi' }],
                max_tokens: 1
            })
        });
    }
}

interface PerplexityResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string | null;
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
