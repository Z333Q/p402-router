/**
 * P402 Anthropic Provider Adapter
 * ================================
 * Full implementation of Anthropic Claude API integration.
 * Supports Claude Opus 4.5, Sonnet 4.5, Haiku 4.5, and legacy models.
 */

import { BaseProviderAdapter, ProviderConfig } from './base';
import {
    ModelInfo,
    CompletionRequest,
    CompletionResponse,
    StreamChunk,
    Message,
    ContentPart
} from './types';

export class AnthropicAdapter extends BaseProviderAdapter {
    id = 'anthropic';
    name = 'Anthropic';
    baseUrl = 'https://api.anthropic.com/v1';

    // Anthropic API version
    private apiVersion = '2024-01-01';

    models: ModelInfo[] = [
        // Claude 4.5 Family (Latest)
        {
            id: 'claude-opus-4-5-20251101',
            name: 'Claude Opus 4.5',
            tier: 'premium',
            contextWindow: 200000,
            inputCostPer1k: 0.015,
            outputCostPer1k: 0.075,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming', 'code', 'reasoning', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 32768
        },
        {
            id: 'claude-sonnet-4-5-20250929',
            name: 'Claude Sonnet 4.5',
            tier: 'mid',
            contextWindow: 200000,
            inputCostPer1k: 0.003,
            outputCostPer1k: 0.015,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming', 'code', 'reasoning', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 16384
        },
        {
            id: 'claude-haiku-4-5-20251001',
            name: 'Claude Haiku 4.5',
            tier: 'budget',
            contextWindow: 200000,
            inputCostPer1k: 0.0008,
            outputCostPer1k: 0.004,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming', 'code', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Convenience aliases
        {
            id: 'claude-opus-4-5',
            name: 'Claude Opus 4.5 (Latest)',
            tier: 'premium',
            contextWindow: 200000,
            inputCostPer1k: 0.015,
            outputCostPer1k: 0.075,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming', 'code', 'reasoning', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 32768
        },
        {
            id: 'claude-sonnet-4-5',
            name: 'Claude Sonnet 4.5 (Latest)',
            tier: 'mid',
            contextWindow: 200000,
            inputCostPer1k: 0.003,
            outputCostPer1k: 0.015,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming', 'code', 'reasoning', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 16384
        },
        {
            id: 'claude-haiku-4-5',
            name: 'Claude Haiku 4.5 (Latest)',
            tier: 'budget',
            contextWindow: 200000,
            inputCostPer1k: 0.0008,
            outputCostPer1k: 0.004,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming', 'code', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Claude 3.5 Family (Legacy but still supported)
        {
            id: 'claude-3-5-sonnet-20241022',
            name: 'Claude 3.5 Sonnet',
            tier: 'mid',
            contextWindow: 200000,
            inputCostPer1k: 0.003,
            outputCostPer1k: 0.015,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming', 'code', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        {
            id: 'claude-3-5-haiku-20241022',
            name: 'Claude 3.5 Haiku',
            tier: 'budget',
            contextWindow: 200000,
            inputCostPer1k: 0.0008,
            outputCostPer1k: 0.004,
            capabilities: ['chat', 'vision', 'streaming', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        },
        // Claude 3 Family
        {
            id: 'claude-3-opus-20240229',
            name: 'Claude 3 Opus',
            tier: 'premium',
            contextWindow: 200000,
            inputCostPer1k: 0.015,
            outputCostPer1k: 0.075,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming', 'code', 'reasoning', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 4096
        },
        {
            id: 'claude-3-sonnet-20240229',
            name: 'Claude 3 Sonnet',
            tier: 'mid',
            contextWindow: 200000,
            inputCostPer1k: 0.003,
            outputCostPer1k: 0.015,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming', 'code', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 4096
        },
        {
            id: 'claude-3-haiku-20240307',
            name: 'Claude 3 Haiku',
            tier: 'budget',
            contextWindow: 200000,
            inputCostPer1k: 0.00025,
            outputCostPer1k: 0.00125,
            capabilities: ['chat', 'vision', 'streaming', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 4096
        }
    ];

    constructor(config: ProviderConfig = {}) {
        super({
            apiKey: process.env.ANTHROPIC_API_KEY,
            ...config
        });
    }

    protected getAuthHeaders(): Record<string, string> {
        return {
            'x-api-key': this.config.apiKey || '',
            'anthropic-version': this.apiVersion
        };
    }

    // =========================================================================
    // CHAT COMPLETION
    // =========================================================================

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const model = this.resolveModel(request.model);
        const start = Date.now();

        const { system, messages } = this.convertMessages(request.messages);

        const body: any = {
            model,
            messages,
            max_tokens: request.maxTokens || 4096,
            temperature: request.temperature ?? 0.7
        };

        // Add system prompt if present
        if (system) {
            body.system = system;
        }

        // Add tools if provided
        if (request.tools && request.tools.length > 0) {
            body.tools = this.convertTools(request.tools);
            if (request.toolChoice) {
                body.tool_choice = this.convertToolChoice(request.toolChoice);
            }
        }

        // Add stop sequences
        if (request.stop) {
            body.stop_sequences = Array.isArray(request.stop) ? request.stop : [request.stop];
        }

        const response = await this.fetchWithRetry<AnthropicResponse>(
            '/messages',
            {
                method: 'POST',
                body: JSON.stringify(body)
            }
        );

        const latencyMs = Date.now() - start;
        const costUsd = this.estimateCost(
            model,
            response.usage?.input_tokens || 0,
            response.usage?.output_tokens || 0
        );

        return this.normalizeResponse(response, model, latencyMs, costUsd);
    }

    // =========================================================================
    // STREAMING
    // =========================================================================

    async *stream(request: CompletionRequest): AsyncGenerator<StreamChunk> {
        const model = this.resolveModel(request.model);
        const { system, messages } = this.convertMessages(request.messages);

        const body: any = {
            model,
            messages,
            max_tokens: request.maxTokens || 4096,
            temperature: request.temperature ?? 0.7,
            stream: true
        };

        if (system) {
            body.system = system;
        }

        if (request.tools && request.tools.length > 0) {
            body.tools = this.convertTools(request.tools);
        }

        const response = await this.fetch<Response>('/messages', {
            method: 'POST',
            body: JSON.stringify(body),
            parseJson: false
        });

        let currentId = '';
        let inputTokens = 0;
        let outputTokens = 0;

        for await (const data of this.parseSSE(response)) {
            try {
                const event = JSON.parse(data) as AnthropicStreamEvent;

                switch (event.type) {
                    case 'message_start':
                        currentId = event.message?.id || `msg_${Date.now()}`;
                        inputTokens = event.message?.usage?.input_tokens || 0;
                        break;

                    case 'content_block_delta':
                        if (event.delta?.type === 'text_delta') {
                            yield {
                                id: currentId,
                                object: 'chat.completion.chunk',
                                created: Math.floor(Date.now() / 1000),
                                model,
                                choices: [{
                                    index: 0,
                                    delta: { content: event.delta.text },
                                    finishReason: null
                                }]
                            };
                        }
                        break;

                    case 'message_delta':
                        outputTokens = event.usage?.output_tokens || 0;
                        if (event.delta?.stop_reason) {
                            yield {
                                id: currentId,
                                object: 'chat.completion.chunk',
                                created: Math.floor(Date.now() / 1000),
                                model,
                                choices: [{
                                    index: 0,
                                    delta: {},
                                    finishReason: this.mapStopReason(event.delta.stop_reason)
                                }],
                                usage: {
                                    promptTokens: inputTokens,
                                    completionTokens: outputTokens,
                                    totalTokens: inputTokens + outputTokens
                                }
                            };
                        }
                        break;
                }
            } catch {
                // Skip malformed chunks
            }
        }
    }

    // =========================================================================
    // MESSAGE CONVERSION
    // =========================================================================

    private convertMessages(messages: Message[]): { system?: string; messages: any[] } {
        let system: string | undefined;
        const converted: any[] = [];

        for (const msg of messages) {
            if (msg.role === 'system') {
                // Anthropic uses a separate system parameter
                system = typeof msg.content === 'string' 
                    ? msg.content 
                    : (msg.content as ContentPart[]).map(p => p.text).join('\n');
                continue;
            }

            const anthropicMsg: any = {
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: this.convertContent(msg.content)
            };

            converted.push(anthropicMsg);
        }

        return { system, messages: converted };
    }

    private convertContent(content: string | ContentPart[]): any {
        if (typeof content === 'string') {
            return content;
        }

        return content.map(part => {
            if (part.type === 'text') {
                return { type: 'text', text: part.text };
            }
            if (part.type === 'image_url' && part.image_url) {
                // Convert OpenAI image format to Anthropic format
                const url = part.image_url.url;
                if (url.startsWith('data:')) {
                    const [header, data] = url.split(',');
                    const mediaType = header.match(/data:(.*);/)?.[1] || 'image/png';
                    return {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mediaType,
                            data
                        }
                    };
                }
                return {
                    type: 'image',
                    source: {
                        type: 'url',
                        url
                    }
                };
            }
            return { type: 'text', text: '' };
        });
    }

    private convertTools(tools: any[]): any[] {
        return tools.map(tool => ({
            name: tool.function.name,
            description: tool.function.description,
            input_schema: tool.function.parameters
        }));
    }

    private convertToolChoice(choice: any): any {
        if (choice === 'auto') return { type: 'auto' };
        if (choice === 'none') return { type: 'none' };
        if (choice === 'required') return { type: 'any' };
        if (choice.type === 'function') {
            return { type: 'tool', name: choice.function.name };
        }
        return { type: 'auto' };
    }

    // =========================================================================
    // RESPONSE NORMALIZATION
    // =========================================================================

    private normalizeResponse(
        response: AnthropicResponse,
        model: string,
        latencyMs: number,
        costUsd: number
    ): CompletionResponse {
        const textContent = response.content
            .filter(c => c.type === 'text')
            .map(c => c.text)
            .join('');

        const toolCalls = response.content
            .filter(c => c.type === 'tool_use')
            .map(c => ({
                id: c.id!,
                type: 'function' as const,
                function: {
                    name: c.name!,
                    arguments: JSON.stringify(c.input)
                }
            }));

        return {
            id: response.id,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: response.model,
            choices: [{
                index: 0,
                message: {
                    role: 'assistant',
                    content: textContent,
                    tool_calls: toolCalls.length > 0 ? toolCalls : undefined
                },
                finishReason: this.mapStopReason(response.stop_reason)
            }],
            usage: {
                promptTokens: response.usage?.input_tokens || 0,
                completionTokens: response.usage?.output_tokens || 0,
                totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
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

    private mapStopReason(reason: string | null): 'stop' | 'length' | 'tool_calls' | null {
        if (!reason) return null;
        switch (reason) {
            case 'end_turn': return 'stop';
            case 'max_tokens': return 'length';
            case 'tool_use': return 'tool_calls';
            default: return 'stop';
        }
    }

    private resolveModel(modelId?: string): string {
        if (!modelId) return 'claude-sonnet-4-5-20250929';

        // Handle convenience aliases
        const aliases: Record<string, string> = {
            'claude-opus-4-5': 'claude-opus-4-5-20251101',
            'claude-sonnet-4-5': 'claude-sonnet-4-5-20250929',
            'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
            'claude-3-opus': 'claude-3-opus-20240229',
            'claude-3-sonnet': 'claude-3-sonnet-20240229',
            'claude-3-haiku': 'claude-3-haiku-20240307',
            'claude-3.5-sonnet': 'claude-3-5-sonnet-20241022',
            'claude-3.5-haiku': 'claude-3-5-haiku-20241022'
        };

        return aliases[modelId] || modelId;
    }

    protected async performHealthCheck(): Promise<void> {
        // Anthropic doesn't have a models endpoint, so we do a minimal message
        // In production, you might want to cache this or use a different approach
        await this.fetch('/messages', {
            method: 'POST',
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'Hi' }]
            })
        });
    }
}

// =============================================================================
// ANTHROPIC API TYPES
// =============================================================================

interface AnthropicResponse {
    id: string;
    type: 'message';
    role: 'assistant';
    model: string;
    content: Array<{
        type: 'text' | 'tool_use';
        text?: string;
        id?: string;
        name?: string;
        input?: any;
    }>;
    stop_reason: string | null;
    stop_sequence: string | null;
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
}

interface AnthropicStreamEvent {
    type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop';
    message?: {
        id: string;
        usage?: { input_tokens: number };
    };
    index?: number;
    delta?: {
        type?: string;
        text?: string;
        stop_reason?: string;
    };
    usage?: {
        output_tokens: number;
    };
}
