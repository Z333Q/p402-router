/**
 * P402 AI21 Labs Provider Adapter
 * ================================
 * AI21 provides Jamba (hybrid Mamba-Transformer) and
 * Jurassic models with strong enterprise features.
 */

import { BaseProviderAdapter, ProviderConfig } from './base';
import {
    ModelInfo,
    CompletionRequest,
    CompletionResponse,
    StreamChunk,
    Message
} from './types';

export class AI21Adapter extends BaseProviderAdapter {
    id = 'ai21';
    name = 'AI21 Labs';
    baseUrl = 'https://api.ai21.com/studio/v1';

    models: ModelInfo[] = [
        // Jamba 1.5 (Latest - Hybrid Architecture)
        {
            id: 'jamba-1.5-large',
            name: 'Jamba 1.5 Large',
            tier: 'premium',
            contextWindow: 256000,
            inputCostPer1k: 0.002,
            outputCostPer1k: 0.008,
            capabilities: ['chat', 'function_calling', 'streaming', 'code', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 4096
        },
        {
            id: 'jamba-1.5-mini',
            name: 'Jamba 1.5 Mini',
            tier: 'mid',
            contextWindow: 256000,
            inputCostPer1k: 0.0002,
            outputCostPer1k: 0.0004,
            capabilities: ['chat', 'function_calling', 'streaming', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 4096
        },
        // Jamba Instruct (Previous gen)
        {
            id: 'jamba-instruct',
            name: 'Jamba Instruct',
            tier: 'mid',
            contextWindow: 256000,
            inputCostPer1k: 0.0005,
            outputCostPer1k: 0.0007,
            capabilities: ['chat', 'streaming', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 4096
        },
        // Jurassic-2 (Legacy but stable)
        {
            id: 'j2-ultra',
            name: 'Jurassic-2 Ultra',
            tier: 'premium',
            contextWindow: 8192,
            inputCostPer1k: 0.015,
            outputCostPer1k: 0.015,
            capabilities: ['chat', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'j2-mid',
            name: 'Jurassic-2 Mid',
            tier: 'mid',
            contextWindow: 8192,
            inputCostPer1k: 0.01,
            outputCostPer1k: 0.01,
            capabilities: ['chat', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'j2-light',
            name: 'Jurassic-2 Light',
            tier: 'budget',
            contextWindow: 8192,
            inputCostPer1k: 0.003,
            outputCostPer1k: 0.003,
            capabilities: ['chat', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        }
    ];

    constructor(config: ProviderConfig = {}) {
        super({
            apiKey: process.env.AI21_API_KEY,
            ...config
        });
    }

    protected getAuthHeaders(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.config.apiKey}`
        };
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const model = request.model || 'jamba-1.5-mini';
        const start = Date.now();

        // Use chat API for Jamba models
        if (model.startsWith('jamba')) {
            return this.completeJamba(request, model, start);
        } else {
            return this.completeJurassic(request, model, start);
        }
    }

    private async completeJamba(request: CompletionRequest, model: string, start: number): Promise<CompletionResponse> {
        const body: any = {
            model,
            messages: this.formatMessages(request.messages),
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens || 4096,
            top_p: request.topP
        };

        if (request.tools && request.tools.length > 0) {
            body.tools = request.tools;
        }

        const response = await this.fetchWithRetry<AI21ChatResponse>(
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

        return {
            id: response.id,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: response.choices.map((c, i) => ({
                index: i,
                message: {
                    role: 'assistant',
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

    private async completeJurassic(request: CompletionRequest, model: string, start: number): Promise<CompletionResponse> {
        // Convert messages to prompt for J2 models
        const prompt = this.messagesToPrompt(request.messages);

        const body: any = {
            prompt,
            temperature: request.temperature ?? 0.7,
            maxTokens: request.maxTokens || 4096,
            topP: request.topP,
            stopSequences: request.stop ? (Array.isArray(request.stop) ? request.stop : [request.stop]) : undefined
        };

        const response = await this.fetchWithRetry<AI21CompletionResponse>(
            `/${model}/complete`,
            {
                method: 'POST',
                body: JSON.stringify(body)
            }
        );

        const latencyMs = Date.now() - start;
        const text = response.completions?.[0]?.data?.text || '';
        // Rough token estimate for J2
        const inputTokens = Math.ceil(prompt.length / 4);
        const outputTokens = Math.ceil(text.length / 4);
        const costUsd = this.estimateCost(model, inputTokens, outputTokens);

        return {
            id: response.id || `ai21-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{
                index: 0,
                message: {
                    role: 'assistant',
                    content: text
                },
                finishReason: 'stop'
            }],
            usage: {
                promptTokens: inputTokens,
                completionTokens: outputTokens,
                totalTokens: inputTokens + outputTokens
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

    async *stream(request: CompletionRequest): AsyncGenerator<StreamChunk> {
        const model = request.model || 'jamba-1.5-mini';

        // Only Jamba supports streaming
        if (!model.startsWith('jamba')) {
            // Fallback to non-streaming
            const response = await this.complete(request);
            const choice = response.choices[0]!;
            const content = choice.message.content;

            yield {
                id: response.id,
                object: 'chat.completion.chunk',
                created: response.created,
                model: response.model,
                choices: [{
                    index: 0,
                    delta: {
                        content: typeof content === 'string'
                            ? content
                            : content.map(p => p.type === 'text' ? p.text : '').join('')
                    },
                    finishReason: 'stop'
                }]
            };
            return;
        }

        const body: any = {
            model,
            messages: this.formatMessages(request.messages),
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens || 4096,
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
            content: typeof m.content === 'string'
                ? m.content
                : m.content.map((p: any) => p.text).join('\n')
        }));
    }

    private messagesToPrompt(messages: Message[]): string {
        return messages.map(m => {
            const content = typeof m.content === 'string'
                ? m.content
                : m.content.map((p: any) => p.text).join('\n');

            if (m.role === 'system') return content;
            if (m.role === 'user') return `User: ${content}`;
            if (m.role === 'assistant') return `Assistant: ${content}`;
            return content;
        }).join('\n\n') + '\n\nAssistant:';
    }

    protected async performHealthCheck(): Promise<void> {
        // Check that we can access the API
        await this.fetchWithRetry('/chat/completions', {
            method: 'POST',
            body: JSON.stringify({
                model: 'jamba-1.5-mini',
                messages: [{ role: 'user', content: 'hi' }],
                max_tokens: 1
            })
        });
    }
}

interface AI21ChatResponse {
    id: string;
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

interface AI21CompletionResponse {
    id?: string;
    completions?: Array<{
        data?: {
            text?: string;
        };
    }>;
}
