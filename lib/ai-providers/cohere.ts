/**
 * P402 Cohere Provider Adapter
 * ============================
 * Cohere specializes in enterprise NLP with strong
 * RAG capabilities and Command models.
 */

import { BaseProviderAdapter, ProviderConfig } from './base';
import {
    ModelInfo,
    CompletionRequest,
    CompletionResponse,
    StreamChunk,
    EmbeddingRequest,
    EmbeddingResponse,
    Message,
    ContentPart
} from './types';

export class CohereAdapter extends BaseProviderAdapter {
    id = 'cohere';
    name = 'Cohere';
    baseUrl = 'https://api.cohere.ai/v1';

    models: ModelInfo[] = [
        // Command R+ (Flagship)
        {
            id: 'command-r-plus',
            name: 'Command R+',
            tier: 'premium',
            contextWindow: 128000,
            inputCostPer1k: 0.003,
            outputCostPer1k: 0.015,
            capabilities: ['chat', 'function_calling', 'streaming', 'code', 'reasoning'],
            supportsStreaming: true,
            maxOutputTokens: 4096
        },
        // Command R (Balanced)
        {
            id: 'command-r',
            name: 'Command R',
            tier: 'mid',
            contextWindow: 128000,
            inputCostPer1k: 0.0005,
            outputCostPer1k: 0.0015,
            capabilities: ['chat', 'function_calling', 'streaming', 'code'],
            supportsStreaming: true,
            maxOutputTokens: 4096
        },
        // Command (Legacy but still good)
        {
            id: 'command',
            name: 'Command',
            tier: 'mid',
            contextWindow: 4096,
            inputCostPer1k: 0.001,
            outputCostPer1k: 0.002,
            capabilities: ['chat', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 4096
        },
        // Command Light (Fast/Cheap)
        {
            id: 'command-light',
            name: 'Command Light',
            tier: 'budget',
            contextWindow: 4096,
            inputCostPer1k: 0.0003,
            outputCostPer1k: 0.0006,
            capabilities: ['chat', 'streaming'],
            supportsStreaming: true,
            maxOutputTokens: 4096
        },
        // Command Nightly (Preview)
        {
            id: 'command-r-plus-08-2024',
            name: 'Command R+ (08-2024)',
            tier: 'premium',
            contextWindow: 128000,
            inputCostPer1k: 0.003,
            outputCostPer1k: 0.015,
            capabilities: ['chat', 'function_calling', 'streaming', 'code', 'reasoning'],
            supportsStreaming: true,
            maxOutputTokens: 4096
        }
    ];

    constructor(config: ProviderConfig = {}) {
        super({
            apiKey: process.env.COHERE_API_KEY,
            ...config
        });
    }

    protected getAuthHeaders(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.config.apiKey}`
        };
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const model = request.model || 'command-r';
        const start = Date.now();

        // Convert messages to Cohere format
        const { preamble, chatHistory, message } = this.convertMessages(request.messages);

        const body: any = {
            model,
            message,
            chat_history: chatHistory,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
            p: request.topP,
            stop_sequences: request.stop ? (Array.isArray(request.stop) ? request.stop : [request.stop]) : undefined
        };

        if (preamble) {
            body.preamble = preamble;
        }

        if (request.tools && request.tools.length > 0) {
            body.tools = this.convertTools(request.tools);
        }

        const response = await this.fetchWithRetry<CohereResponse>(
            '/chat',
            {
                method: 'POST',
                body: JSON.stringify(body)
            }
        );

        const latencyMs = Date.now() - start;
        const inputTokens = response.meta?.billed_units?.input_tokens || 0;
        const outputTokens = response.meta?.billed_units?.output_tokens || 0;
        const costUsd = this.estimateCost(model, inputTokens, outputTokens);

        return this.normalizeResponse(response, model, latencyMs, costUsd, inputTokens, outputTokens);
    }

    async *stream(request: CompletionRequest): AsyncGenerator<StreamChunk> {
        const model = request.model || 'command-r';
        const { preamble, chatHistory, message } = this.convertMessages(request.messages);

        const body: any = {
            model,
            message,
            chat_history: chatHistory,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
            stream: true
        };

        if (preamble) {
            body.preamble = preamble;
        }

        const response = await this.fetch<Response>('/chat', {
            method: 'POST',
            body: JSON.stringify(body),
            parseJson: false
        });

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';
        let chunkIndex = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;

                    try {
                        const event = JSON.parse(line);

                        if (event.event_type === 'text-generation') {
                            yield {
                                id: `cohere-${Date.now()}-${chunkIndex++}`,
                                object: 'chat.completion.chunk',
                                created: Math.floor(Date.now() / 1000),
                                model,
                                choices: [{
                                    index: 0,
                                    delta: { content: event.text },
                                    finishReason: null
                                }]
                            };
                        } else if (event.event_type === 'stream-end') {
                            yield {
                                id: `cohere-${Date.now()}-${chunkIndex++}`,
                                object: 'chat.completion.chunk',
                                created: Math.floor(Date.now() / 1000),
                                model,
                                choices: [{
                                    index: 0,
                                    delta: {},
                                    finishReason: 'stop'
                                }]
                            };
                        }
                    } catch {
                        // Skip malformed lines
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
        const model = request.model || 'embed-english-v3.0';
        const inputs = Array.isArray(request.input) ? request.input : [request.input];

        const response = await this.fetchWithRetry<CohereEmbedResponse>(
            '/embed',
            {
                method: 'POST',
                body: JSON.stringify({
                    model,
                    texts: inputs,
                    input_type: 'search_document',
                    truncate: 'END'
                })
            }
        );

        return {
            object: 'list',
            data: response.embeddings.map((emb, i) => ({
                object: 'embedding',
                index: i,
                embedding: emb
            })),
            model,
            usage: {
                promptTokens: response.meta?.billed_units?.input_tokens || 0,
                totalTokens: response.meta?.billed_units?.input_tokens || 0
            }
        };
    }

    private convertMessages(messages: Message[]): {
        preamble?: string;
        chatHistory: any[];
        message: string;
    } {
        let preamble: string | undefined;
        const chatHistory: any[] = [];
        let lastUserMessage = '';

        for (const [i, msg] of messages.entries()) {
            const content = typeof msg.content === 'string'
                ? msg.content
                : (msg.content as ContentPart[]).map(p => p.text).join('\n');

            if (msg.role === 'system') {
                preamble = content;
            } else if (i === messages.length - 1 && msg.role === 'user') {
                // Last user message goes in 'message' field
                lastUserMessage = content;
            } else {
                chatHistory.push({
                    role: msg.role === 'assistant' ? 'CHATBOT' : 'USER',
                    message: content
                });
            }
        }

        return { preamble, chatHistory, message: lastUserMessage };
    }

    private convertTools(tools: any[]): any[] {
        return tools.map(tool => ({
            name: tool.function.name,
            description: tool.function.description,
            parameter_definitions: this.convertParameters(tool.function.parameters)
        }));
    }

    private convertParameters(params: any): Record<string, any> {
        if (!params?.properties) return {};

        const definitions: Record<string, any> = {};
        const required = params.required || [];

        for (const [name, schema] of Object.entries(params.properties) as any[]) {
            definitions[name] = {
                type: schema.type,
                description: schema.description,
                required: required.includes(name)
            };
        }

        return definitions;
    }

    private normalizeResponse(
        response: CohereResponse,
        model: string,
        latencyMs: number,
        costUsd: number,
        inputTokens: number,
        outputTokens: number
    ): CompletionResponse {
        return {
            id: response.generation_id || `cohere-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{
                index: 0,
                message: {
                    role: 'assistant',
                    content: response.text,
                    tool_calls: response.tool_calls?.map((tc, i) => ({
                        id: `call_${i}`,
                        type: 'function' as const,
                        function: {
                            name: tc.name,
                            arguments: JSON.stringify(tc.parameters)
                        }
                    }))
                },
                finishReason: response.finish_reason === 'COMPLETE' ? 'stop' : 'stop'
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

    protected async performHealthCheck(): Promise<void> {
        await this.fetch('/models', { method: 'GET' });
    }
}

interface CohereResponse {
    text: string;
    generation_id?: string;
    finish_reason?: string;
    tool_calls?: Array<{
        name: string;
        parameters: any;
    }>;
    meta?: {
        billed_units?: {
            input_tokens: number;
            output_tokens: number;
        };
    };
}

interface CohereEmbedResponse {
    embeddings: number[][];
    meta?: {
        billed_units?: {
            input_tokens: number;
        };
    };
}
