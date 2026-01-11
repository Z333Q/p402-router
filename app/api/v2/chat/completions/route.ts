/**
 * P402 V2 Chat Completions Endpoint
 * ==================================
 * OpenAI-compatible endpoint with P402 enhancements:
 * - Multi-provider routing
 * - Policy enforcement
 * - Semantic caching
 * - Cost tracking
 * - Payment settlement (x402)
 * 
 * V2 Spec: Section 5.1 (V2 API Surface)
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
    getProviderRegistry, 
    CompletionRequest, 
    RoutingOptions,
    AIProviderError,
    RateLimitError
} from '@/lib/ai-providers';

// =============================================================================
// REQUEST TYPES
// =============================================================================

interface V2ChatRequest {
    // OpenAI-compatible fields
    model?: string;
    messages: Array<{
        role: 'system' | 'user' | 'assistant' | 'tool';
        content: string | Array<{ type: string; text?: string; image_url?: any }>;
        name?: string;
        tool_calls?: any[];
        tool_call_id?: string;
    }>;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string | string[];
    stream?: boolean;
    tools?: any[];
    tool_choice?: any;
    response_format?: { type: 'text' | 'json_object' };
    user?: string;

    // P402 Extensions
    p402?: {
        /** Routing mode: cost, quality, speed, balanced */
        mode?: 'cost' | 'quality' | 'speed' | 'balanced';
        /** Preferred providers (ordered) */
        prefer_providers?: string[];
        /** Providers to exclude */
        exclude_providers?: string[];
        /** Required capabilities */
        require_capabilities?: string[];
        /** Maximum cost per request (USD) */
        max_cost?: number;
        /** Session ID for budget tracking */
        session_id?: string;
        /** Enable semantic caching */
        cache?: boolean;
        /** Cache TTL in seconds */
        cache_ttl?: number;
        /** Enable failover */
        failover?: boolean;
        /** Tenant ID (for multi-tenant) */
        tenant_id?: string;
    };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();
    const start = Date.now();

    try {
        // Parse request body
        const body = await req.json() as V2ChatRequest;

        // Extract P402 options
        const p402Options = body.p402 || {};
        const tenantId = p402Options.tenant_id || req.headers.get('x-p402-tenant') || 'default';

        // Build routing options
        const routingOptions: RoutingOptions = {
            mode: p402Options.mode || 'balanced',
            preferProviders: p402Options.prefer_providers,
            excludeProviders: p402Options.exclude_providers,
            requiredCapabilities: p402Options.require_capabilities as any,
            maxCostPerRequest: p402Options.max_cost,
            failover: {
                enabled: p402Options.failover !== false,
                maxRetries: 2
            }
        };

        // Build completion request
        const completionRequest: CompletionRequest = {
            messages: body.messages as any,
            model: body.model,
            temperature: body.temperature,
            maxTokens: body.max_tokens,
            topP: body.top_p,
            frequencyPenalty: body.frequency_penalty,
            presencePenalty: body.presence_penalty,
            stop: body.stop,
            stream: body.stream,
            tools: body.tools,
            toolChoice: body.tool_choice,
            responseFormat: body.response_format,
            user: body.user
        };

        // Get provider registry
        const registry = getProviderRegistry();

        // Handle streaming vs non-streaming
        if (body.stream) {
            return handleStreamingResponse(registry, completionRequest, routingOptions, requestId, tenantId, start);
        } else {
            return handleNonStreamingResponse(registry, completionRequest, routingOptions, requestId, tenantId, start);
        }

    } catch (error: any) {
        console.error(`[V2/chat/completions] Error:`, error);

        // Handle known error types
        if (error instanceof RateLimitError) {
            return NextResponse.json({
                error: {
                    type: 'rate_limit_error',
                    message: 'Rate limit exceeded. Please retry later.',
                    code: 'rate_limit',
                    provider: error.providerId,
                    retry_after_ms: error.retryAfterMs
                }
            }, { 
                status: 429,
                headers: error.retryAfterMs ? { 'Retry-After': String(Math.ceil(error.retryAfterMs / 1000)) } : {}
            });
        }

        if (error instanceof AIProviderError) {
            return NextResponse.json({
                error: {
                    type: 'provider_error',
                    message: error.message,
                    code: error.code,
                    provider: error.providerId
                }
            }, { status: error.statusCode || 500 });
        }

        // Generic error
        return NextResponse.json({
            error: {
                type: 'internal_error',
                message: error.message || 'An unexpected error occurred',
                code: 'internal_error'
            }
        }, { status: 500 });
    }
}

// =============================================================================
// NON-STREAMING RESPONSE
// =============================================================================

async function handleNonStreamingResponse(
    registry: ReturnType<typeof getProviderRegistry>,
    request: CompletionRequest,
    options: RoutingOptions,
    requestId: string,
    tenantId: string,
    startTime: number
) {
    // Execute completion
    const response = await registry.complete(request, options);

    // Calculate total latency
    const totalLatencyMs = Date.now() - startTime;

    // Format response with P402 metadata
    const p402Response = {
        id: response.id,
        object: response.object,
        created: response.created,
        model: response.model,
        choices: response.choices.map(c => ({
            index: c.index,
            message: {
                role: c.message.role,
                content: c.message.content,
                ...(c.message.tool_calls && { tool_calls: c.message.tool_calls })
            },
            finish_reason: c.finishReason
        })),
        usage: {
            prompt_tokens: response.usage.promptTokens,
            completion_tokens: response.usage.completionTokens,
            total_tokens: response.usage.totalTokens
        },
        // P402 Extensions
        p402_metadata: {
            request_id: requestId,
            tenant_id: tenantId,
            provider: response.p402?.providerId,
            model: response.p402?.modelId,
            cost_usd: response.p402?.costUsd,
            latency_ms: totalLatencyMs,
            provider_latency_ms: response.p402?.latencyMs,
            cached: response.p402?.cached || false,
            routing_mode: options.mode
        }
    };

    return NextResponse.json(p402Response, {
        headers: {
            'X-P402-Request-ID': requestId,
            'X-P402-Provider': response.p402?.providerId || 'unknown',
            'X-P402-Cost-USD': String(response.p402?.costUsd || 0),
            'X-P402-Latency-MS': String(totalLatencyMs)
        }
    });
}

// =============================================================================
// STREAMING RESPONSE (SSE)
// =============================================================================

async function handleStreamingResponse(
    registry: ReturnType<typeof getProviderRegistry>,
    request: CompletionRequest,
    options: RoutingOptions,
    requestId: string,
    tenantId: string,
    startTime: number
) {
    // Create a readable stream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Get routing decision first
                const decision = await registry.route(request, options);
                
                // Send initial P402 metadata as a comment
                controller.enqueue(encoder.encode(
                    `: P402 Request ${requestId} routed to ${decision.provider.id}/${decision.model.id}\n\n`
                ));

                // Stream from provider
                const generator = decision.provider.stream({
                    ...request,
                    model: request.model || decision.model.id
                });

                let totalTokens = 0;
                let firstChunkTime: number | null = null;

                for await (const chunk of generator) {
                    if (!firstChunkTime) {
                        firstChunkTime = Date.now();
                    }

                    // Track tokens (rough estimate from content length)
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        totalTokens += Math.ceil(content.length / 4);
                    }

                    // Format as SSE
                    const sseData = {
                        ...chunk,
                        p402_metadata: {
                            request_id: requestId,
                            provider: decision.provider.id,
                            model: decision.model.id
                        }
                    };

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
                }

                // Send final metadata chunk
                const totalLatencyMs = Date.now() - startTime;
                const ttfbMs = firstChunkTime ? firstChunkTime - startTime : totalLatencyMs;
                const estimatedCost = decision.provider.estimateCost(
                    decision.model.id,
                    Math.ceil(JSON.stringify(request.messages).length / 4),
                    totalTokens
                );

                const finalChunk = {
                    id: `chatcmpl-${requestId}`,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: decision.model.id,
                    choices: [],
                    p402_metadata: {
                        request_id: requestId,
                        tenant_id: tenantId,
                        provider: decision.provider.id,
                        model: decision.model.id,
                        cost_usd: estimatedCost,
                        latency_ms: totalLatencyMs,
                        ttfb_ms: ttfbMs,
                        tokens_generated: totalTokens,
                        cached: false,
                        routing_mode: options.mode
                    }
                };

                controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();

            } catch (error: any) {
                // Send error as SSE
                const errorChunk = {
                    error: {
                        type: error instanceof AIProviderError ? 'provider_error' : 'internal_error',
                        message: error.message,
                        code: error.code || 'stream_error'
                    }
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-P402-Request-ID': requestId
        }
    });
}

// =============================================================================
// OPTIONS (CORS)
// =============================================================================

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-P402-Tenant, X-P402-Session',
            'Access-Control-Max-Age': '86400'
        }
    });
}
