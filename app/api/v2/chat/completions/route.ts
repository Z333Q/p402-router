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
import { requireTenantAccess } from '@/lib/auth';
import { BillingGuard, BillingGuardError } from '@/lib/providers/openrouter/billing-guard';
import { toApiErrorResponse } from '@/lib/errors';
import {
    checkAgentkitAccess,
    buildAgentkitChallengeExtension,
    type AgentkitCheckResult,
} from '@/lib/identity/agentkit';
import { getReputationScore } from '@/lib/identity/reputation';
import { spendCredits, getBalance, getOrCreateAccount, FREE_TRIAL_CREDITS } from '@/lib/services/credits-service';
import db from '@/lib/db';

// Fire-and-forget traffic event logger — never throws, never blocks response
function logTrafficEvent(event: {
    tenantId: string;
    requestId: string;
    provider: string;
    model: string;
    latencyMs: number;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
    cacheHit: boolean;
    statusCode: number;
}) {
    db.query(
        `INSERT INTO traffic_events
            (tenant_id, path, method, status_code, latency_ms, model, provider,
             tokens_in, tokens_out, cost_usd, cache_hit, request_id, event_type, created_at)
         VALUES ($1, $2, 'POST', $3, $4, $5, $6, $7, $8, $9, $10, $11, 'chat_completion', NOW())`,
        [
            event.tenantId,
            '/api/v2/chat/completions',
            event.statusCode,
            event.latencyMs,
            event.model,
            event.provider,
            event.tokensIn,
            event.tokensOut,
            event.costUsd,
            event.cacheHit,
            event.requestId,
        ]
    ).catch(() => { /* best-effort — never block response */ });
}

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

        // Resolve tenant
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        // Extract P402 options
        const p402Options = body.p402 || {};

        // Use session tenantId as priority, but allow body override if it matches (requireTenantAccess handles this)
        const tenantId = access.tenantId;

        // ── Layer 0: World AgentKit (proof-of-human free trial) ──────────────
        // Verified humans get free-trial access — billing guard is bypassed.
        const agentkit = await checkAgentkitAccess(req, '/api/v2/chat/completions');

        // ── Billing Guard (6-layer spending protection) ──────────────────────
        if (!agentkit.grantAccess) {
            const billingCtx = { userId: tenantId, tenantId, humanVerified: agentkit.humanVerified };
            const billingGuard = new BillingGuard();
            await billingGuard.checkRateLimit(billingCtx);
            await billingGuard.checkDailySpend(billingCtx);
            await billingGuard.checkConcurrentReservations(billingCtx);
        }

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

        // Fetch reputation score from cache (non-blocking — null if unavailable)
        const reputationScore = agentkit.humanId
            ? await getReputationScore(agentkit.humanId).catch(() => null)
            : null;

        // ── Credit balance for metadata (non-blocking) ────────────────────────
        const creditBalance = await getBalance(agentkit.humanId, tenantId).catch(() => null);

        // Handle streaming vs non-streaming
        if (body.stream) {
            return handleStreamingResponse(registry, completionRequest, routingOptions, requestId, tenantId, start, agentkit, reputationScore, creditBalance?.balance ?? null);
        } else {
            return handleNonStreamingResponse(registry, completionRequest, routingOptions, requestId, tenantId, start, agentkit, reputationScore, creditBalance?.balance ?? null);
        }

    } catch (error: any) {
        console.error(`[V2/chat/completions] Error:`, error);

        // Handle known error types
        if (error instanceof BillingGuardError) {
            // Include AgentKit challenge so agents know they can authenticate as
            // a verified human to get free-trial access instead of being blocked.
            const agentkitExtension = buildAgentkitChallengeExtension();
            return NextResponse.json({
                error: {
                    type: 'billing_error',
                    message: error.message,
                    code: error.code,
                    ...(error.retryAfterMs && { retry_after_ms: error.retryAfterMs })
                },
                ...(agentkitExtension && { agentkit_challenge: agentkitExtension })
            }, {
                status: 429,
                headers: error.retryAfterMs ? { 'Retry-After': String(Math.ceil(error.retryAfterMs / 1000)) } : {}
            });
        }

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

        // Generic error — sanitize before returning
        return toApiErrorResponse(error, requestId);
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
    startTime: number,
    agentkit: AgentkitCheckResult,
    reputationScore: number | null,
    creditBalanceBefore: number | null
) {
    // Execute completion
    const response = await registry.complete(request, options);

    // Calculate total latency
    const totalLatencyMs = Date.now() - startTime;

    const inputTokens = response.usage.promptTokens;
    const outputTokens = response.usage.completionTokens;
    const costUsd = response.p402?.costUsd ?? 0;

    // Direct cost = what the provider charges at list price for these tokens.
    // On a cache hit costUsd is near-zero; directCost reflects what a cold call
    // would have cost, so savings = directCost - costUsd is meaningful.
    const provider = response.p402?.providerId ? registry.get(response.p402.providerId) : undefined;
    const directCost = (provider && response.p402?.modelId)
        ? provider.estimateCost(response.p402.modelId, inputTokens, outputTokens)
        : costUsd;
    const savings = Math.max(0, directCost - costUsd);

    // ── Deduct credits post-response (non-blocking) ───────────────────────────
    // Credits are deducted after a successful response. If the user has credits,
    // they are consumed instead of requiring x402 payment on future requests.
    let creditsSpent = 0;
    let creditBalanceAfter: number | null = creditBalanceBefore;
    if (costUsd > 0 && (agentkit.humanId || tenantId)) {
        const spend = await spendCredits(agentkit.humanId, tenantId, costUsd, requestId).catch(() => null);
        if (spend?.success) {
            creditsSpent = spend.creditsSpent;
            creditBalanceAfter = spend.balanceAfter;
        }
    }

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
            prompt_tokens: inputTokens,
            completion_tokens: outputTokens,
            total_tokens: response.usage.totalTokens
        },
        // P402 Extensions
        p402_metadata: {
            request_id: requestId,
            tenant_id: tenantId,
            provider: response.p402?.providerId,
            model: response.p402?.modelId,
            cost_usd: costUsd,
            direct_cost: directCost,
            savings,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            latency_ms: totalLatencyMs,
            provider_latency_ms: response.p402?.latencyMs,
            cached: response.p402?.cached || false,
            routing_mode: options.mode,
            // World AgentKit
            human_verified: agentkit.humanVerified,
            human_usage_remaining: agentkit.humanVerified ? (agentkit.usageRemaining ?? null) : null,
            reputation_score: reputationScore,
            // Credits
            credits_spent: creditsSpent,
            credits_balance: creditBalanceAfter,
        }
    };

    logTrafficEvent({
        tenantId,
        requestId,
        provider: response.p402?.providerId ?? 'unknown',
        model: response.p402?.modelId ?? request.model ?? 'unknown',
        latencyMs: totalLatencyMs,
        tokensIn: inputTokens,
        tokensOut: outputTokens,
        costUsd,
        cacheHit: response.p402?.cached ?? false,
        statusCode: 200,
    });

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
    startTime: number,
    agentkit: AgentkitCheckResult,
    reputationScore: number | null,
    creditBalanceBefore: number | null
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

                // Estimate input tokens from message payload (used for cost/savings calc)
                const estimatedInputTokens = Math.ceil(JSON.stringify(request.messages).length / 4);

                let totalOutputTokens = 0;
                let firstChunkTime: number | null = null;

                for await (const chunk of generator) {
                    if (!firstChunkTime) {
                        firstChunkTime = Date.now();
                    }

                    // Track output tokens (rough estimate from content length)
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        totalOutputTokens += Math.ceil(content.length / 4);
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

                // direct_cost = list-price cost for these tokens at the selected provider.
                // cost_usd is what P402 actually charged (0 on cache hit, discounted on routing).
                const directCost = decision.provider.estimateCost(
                    decision.model.id,
                    estimatedInputTokens,
                    totalOutputTokens
                );
                const costUsd = directCost; // streaming: no separate billing yet; equals direct price
                const savings = Math.max(0, directCost - costUsd);

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
                        cost_usd: costUsd,
                        direct_cost: directCost,
                        savings,
                        input_tokens: estimatedInputTokens,
                        output_tokens: totalOutputTokens,
                        tokens_generated: totalOutputTokens,
                        latency_ms: totalLatencyMs,
                        ttfb_ms: ttfbMs,
                        cached: false,
                        routing_mode: options.mode,
                        // World AgentKit
                        human_verified: agentkit.humanVerified,
                        human_usage_remaining: agentkit.humanVerified ? (agentkit.usageRemaining ?? null) : null,
                        reputation_score: reputationScore,
                        // Credits (deducted post-stream)
                        credits_spent: Math.ceil(costUsd * 100),
                        credits_balance: creditBalanceBefore !== null ? Math.max(0, creditBalanceBefore - Math.ceil(costUsd * 100)) : null,
                    }
                };

                controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();

                logTrafficEvent({
                    tenantId,
                    requestId,
                    provider: decision.provider.id,
                    model: decision.model.id,
                    latencyMs: totalLatencyMs,
                    tokensIn: estimatedInputTokens,
                    tokensOut: totalOutputTokens,
                    costUsd,
                    cacheHit: false,
                    statusCode: 200,
                });

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
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-P402-Tenant, X-P402-Session, agentkit',
            'Access-Control-Max-Age': '86400'
        }
    });
}
