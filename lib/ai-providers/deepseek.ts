/**
 * P402 DeepSeek Provider Adapter
 * ===============================
 * DeepSeek API integration for R1 reasoning and coder models.
 * Known for excellent code generation and reasoning at low cost.
 */

import { BaseProviderAdapter, ProviderConfig } from './base';
import {
    ModelInfo,
    CompletionRequest,
    CompletionResponse,
    StreamChunk,
    Message
} from './types';

export class DeepSeekAdapter extends BaseProviderAdapter {
    id = 'deepseek';
    name = 'DeepSeek';
    baseUrl = 'https://api.deepseek.com/v1';

    models: ModelInfo[] = [
        // DeepSeek R1 (Reasoning)
        {
            id: 'deepseek-reasoner',
            name: 'DeepSeek R1',
            tier: 'mid',
            contextWindow: 64000,
            inputCostPer1k: 0.00055,
            outputCostPer1k: 0.00219,
            capabilities: ['chat', 'streaming', 'code', 'reasoning'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // DeepSeek Chat
        {
            id: 'deepseek-chat',
            name: 'DeepSeek Chat',
            tier: 'budget',
            contextWindow: 64000,
            inputCostPer1k: 0.00014,
            outputCostPer1k: 0.00028,
            capabilities: ['chat', 'function_calling', 'json_mode', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // DeepSeek Coder
        {
            id: 'deepseek-coder',
            name: 'DeepSeek Coder',
            tier: 'budget',
            contextWindow: 64000,
            inputCostPer1k: 0.00014,
            outputCostPer1k: 0.00028,
            capabilities: ['chat', 'function_calling', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        }
    ];

    constructor(config: ProviderConfig = {}) {
        super({
            apiKey: process.env.DEEPSEEK_API_KEY,
            ...config
        });
    }

    protected getAuthHeaders(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.config.apiKey}`
        };
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const model = request.model || 'deepseek-chat';
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

        const response = await this.fetchWithRetry<DeepSeekResponse>(
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
        const model = request.model || 'deepseek-chat';

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
        response: DeepSeekResponse,
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

interface DeepSeekResponse {
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
