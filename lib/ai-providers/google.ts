/**
 * P402 Google Gemini Provider Adapter
 * ====================================
 * Full implementation of Google's Gemini API.
 * Supports Gemini 3.0, 2.0, and embedding models.
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

export class GoogleAdapter extends BaseProviderAdapter {
    id = 'google';
    name = 'Google AI';
    baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    models: ModelInfo[] = [
        // Gemini 3.0 (2026 Flagship)
        {
            id: 'gemini-3.0-ultra',
            name: 'Gemini 3.0 Ultra',
            tier: 'premium',
            contextWindow: 10000000, // 10M Context
            inputCostPer1k: 0.002,
            outputCostPer1k: 0.008,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming', 'code', 'reasoning', 'long_context', 'audio', 'video'],
            supportsStreaming: true,
            maxOutputTokens: 32768
        },
        {
            id: 'gemini-3.0-pro',
            name: 'Gemini 3.0 Pro',
            tier: 'mid',
            contextWindow: 5000000, // 5M Context
            inputCostPer1k: 0.0005,
            outputCostPer1k: 0.0015,
            capabilities: ['chat', 'vision', 'function_calling', 'streaming', 'code', 'reasoning', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 16384
        },
        {
            id: 'gemini-3.0-flash',
            name: 'Gemini 3.0 Flash',
            tier: 'budget',
            contextWindow: 2000000,
            inputCostPer1k: 0.00005,
            outputCostPer1k: 0.0002,
            capabilities: ['chat', 'vision', 'streaming', 'long_context'],
            supportsStreaming: true,
            maxOutputTokens: 8192
        }
    ];

    constructor(config: ProviderConfig = {}) {
        super({
            apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY,
            ...config
        });
    }

    protected getAuthHeaders(): Record<string, string> {
        // Google uses query param for API key, not header
        return {};
    }

    private getApiUrl(endpoint: string): string {
        return `${this.baseUrl}${endpoint}?key=${this.config.apiKey}`;
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const model = request.model || 'gemini-3.0-flash';
        const start = Date.now();

        const { systemInstruction, contents } = this.convertMessages(request.messages);

        const body: any = {
            contents,
            generationConfig: {
                temperature: request.temperature ?? 0.7,
                maxOutputTokens: request.maxTokens || 8192,
                topP: request.topP,
                stopSequences: request.stop ? (Array.isArray(request.stop) ? request.stop : [request.stop]) : undefined
            }
        };

        if (systemInstruction) {
            body.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        if (request.tools && request.tools.length > 0) {
            body.tools = [{ functionDeclarations: this.convertTools(request.tools) }];
        }

        const response = await this.fetchGemini<GeminiResponse>(
            `/models/${model}:generateContent`,
            {
                method: 'POST',
                body: JSON.stringify(body)
            }
        );

        const latencyMs = Date.now() - start;
        const usage = response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
        const costUsd = this.estimateCost(model, usage.promptTokenCount, usage.candidatesTokenCount);

        return this.normalizeResponse(response, model, latencyMs, costUsd);
    }

    async *stream(request: CompletionRequest): AsyncGenerator<StreamChunk> {
        const model = request.model || 'gemini-3.0-flash';
        const { systemInstruction, contents } = this.convertMessages(request.messages);

        const body: any = {
            contents,
            generationConfig: {
                temperature: request.temperature ?? 0.7,
                maxOutputTokens: request.maxTokens || 8192
            }
        };

        if (systemInstruction) {
            body.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        const url = this.getApiUrl(`/models/${model}:streamGenerateContent`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

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

                // Gemini streams JSON array chunks
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed === '[' || trimmed === ']' || trimmed === ',') continue;

                    try {
                        // Remove trailing comma if present
                        const jsonStr = trimmed.replace(/,$/, '');
                        const chunk = JSON.parse(jsonStr) as GeminiResponse;

                        if (chunk.candidates?.[0]?.content?.parts) {
                            const text = chunk.candidates[0].content.parts
                                .filter((p: any) => p.text)
                                .map((p: any) => p.text)
                                .join('');

                            yield {
                                id: `gemini-${Date.now()}-${chunkIndex++}`,
                                object: 'chat.completion.chunk',
                                created: Math.floor(Date.now() / 1000),
                                model,
                                choices: [{
                                    index: 0,
                                    delta: { content: text },
                                    finishReason: chunk.candidates[0].finishReason === 'STOP' ? 'stop' : null
                                }]
                            };
                        }
                    } catch {
                        // Skip malformed chunks
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
        const model = request.model || 'text-embedding-004';
        const inputs = Array.isArray(request.input) ? request.input : [request.input];

        const response = await this.fetchGemini<GeminiEmbeddingResponse>(
            `/models/${model}:batchEmbedContents`,
            {
                method: 'POST',
                body: JSON.stringify({
                    requests: inputs.map(text => ({
                        model: `models/${model}`,
                        content: { parts: [{ text }] }
                    }))
                })
            }
        );

        return {
            object: 'list',
            data: response.embeddings.map((e, i) => ({
                object: 'embedding',
                index: i,
                embedding: e.values
            })),
            model,
            usage: {
                promptTokens: inputs.reduce((acc, t) => acc + Math.ceil(t.length / 4), 0),
                totalTokens: inputs.reduce((acc, t) => acc + Math.ceil(t.length / 4), 0)
            }
        };
    }

    private async fetchGemini<T>(endpoint: string, options: RequestInit): Promise<T> {
        const url = this.getApiUrl(endpoint);
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
        }

        return response.json();
    }

    private convertMessages(messages: Message[]): { systemInstruction?: string; contents: any[] } {
        let systemInstruction: string | undefined;
        const contents: any[] = [];

        for (const msg of messages) {
            if (msg.role === 'system') {
                systemInstruction = typeof msg.content === 'string'
                    ? msg.content
                    : (msg.content as ContentPart[]).map(p => p.text).join('\n');
                continue;
            }

            const role = msg.role === 'assistant' ? 'model' : 'user';
            const parts = this.convertContent(msg.content);

            contents.push({ role, parts });
        }

        return { systemInstruction, contents };
    }

    private convertContent(content: string | ContentPart[]): any[] {
        if (typeof content === 'string') {
            return [{ text: content }];
        }

        return content.map(part => {
            if (part.type === 'text') {
                return { text: part.text };
            }
            if (part.type === 'image_url' && part.image_url) {
                const url = part.image_url.url;
                if (url.startsWith('data:')) {
                    const parts = url.split(',');
                    const header = parts[0];
                    const data = parts[1];
                    if (!header || !data) return { text: '' };

                    const mimeType = header.match(/data:(.*);/)?.[1] || 'image/png';
                    return {
                        inlineData: { mimeType, data }
                    };
                }
                return { fileData: { fileUri: url } };
            }
            return { text: '' };
        });
    }

    private convertTools(tools: any[]): any[] {
        return tools.map(tool => ({
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters
        }));
    }

    private normalizeResponse(
        response: GeminiResponse,
        model: string,
        latencyMs: number,
        costUsd: number
    ): CompletionResponse {
        const candidate = response.candidates?.[0];
        const textContent = candidate?.content?.parts
            ?.filter((p: any) => p.text)
            .map((p: any) => p.text)
            .join('') || '';

        const toolCalls = candidate?.content?.parts
            ?.filter((p: any) => p.functionCall)
            .map((p: any, i: number) => ({
                id: `call_${i}`,
                type: 'function' as const,
                function: {
                    name: p.functionCall.name,
                    arguments: JSON.stringify(p.functionCall.args)
                }
            })) || [];

        const usage = response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };

        return {
            id: `gemini-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{
                index: 0,
                message: {
                    role: 'assistant',
                    content: textContent,
                    tool_calls: toolCalls.length > 0 ? toolCalls : undefined
                },
                finishReason: this.mapFinishReason(candidate?.finishReason)
            }],
            usage: {
                promptTokens: usage.promptTokenCount,
                completionTokens: usage.candidatesTokenCount,
                totalTokens: usage.totalTokenCount
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

    private mapFinishReason(reason?: string): 'stop' | 'length' | 'tool_calls' | null {
        if (!reason) return null;
        switch (reason) {
            case 'STOP': return 'stop';
            case 'MAX_TOKENS': return 'length';
            case 'TOOL_CODE': return 'tool_calls';
            default: return 'stop';
        }
    }

    protected async performHealthCheck(): Promise<void> {
        await this.fetchGemini('/models', { method: 'GET' });
    }
}

interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
                functionCall?: { name: string; args: any };
            }>;
            role?: string;
        };
        finishReason?: string;
    }>;
    usageMetadata?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
    };
}

interface GeminiEmbeddingResponse {
    embeddings: Array<{
        values: number[];
    }>;
}
