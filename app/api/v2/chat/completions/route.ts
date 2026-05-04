/**
 * P402 V2 Chat Completions Endpoint
 * ==================================
 * OpenAI-compatible endpoint with P402 enhancements:
 * - Multi-provider routing
 * - Policy enforcement
 * - Semantic caching
 * - Cost tracking
 * - Payment settlement (x402 + mppx/tempo dual-protocol)
 *
 * Payment paths (when USE_MPP_METHOD=true):
 *   Authorization: Payment <...>  → mppx/tempo charge path
 *   Existing tenant API key       → billing guard path (unchanged)
 *   Neither                       → dual 402 (WWW-Authenticate + X-PAYMENT-REQUIRED)
 *
 * x402 backwards-compat policy: X-PAYMENT headers accepted through May 2027.
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
import { BillingGuard, BillingGuardError, BillingContext } from '@/lib/providers/openrouter/billing-guard';
import { toApiErrorResponse } from '@/lib/errors';
import {
    checkAgentkitAccess,
    buildAgentkitChallengeExtension,
    type AgentkitCheckResult,
} from '@/lib/identity/agentkit';
import { getReputationScore } from '@/lib/identity/reputation';
import { spendCredits, getBalance, getOrCreateAccount, FREE_TRIAL_CREDITS } from '@/lib/services/credits-service';
import db from '@/lib/db';
import { getMppx, getMppxChargeAmount, extractMppxPayer, isP402MppMethod } from '@/lib/mpp/instance';
import { verifyP402Charge, verifyBaseCharge, resolveAmount, decodePaymentHeader } from '@p402/mpp-method';
import type { P402ChargeCredential, BaseChargeCredential, ComposeResult } from '@p402/mpp-method';
import { executeBaseSettle } from '@/lib/mpp/base-settler';
import { BASE_USDC_ADDRESS } from '@/lib/constants';

// x402 payment requirements emitted in the dual-402 challenge for Base mainnet.
// Clients supporting x402 can pre-pay; verification on this endpoint ships in Phase 2.3.
const X402_CHALLENGE_BASE = {
    x402Version: 2,
    accepts: [{
        scheme: 'exact',
        network: 'eip155:8453',
        maxAmountRequired: '1000',
        resource: 'https://p402.io/api/v2/chat/completions',
        description: 'P402 AI Chat Completions — 1 mUSDC per request',
        payTo: process.env.P402_TREASURY_ADDRESS ?? '0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6',
        asset: BASE_USDC_ADDRESS,
    }],
} as const;

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
    // Phase 3.3 — mppx payment analytics (optional)
    paymentRail?: string;
    chargeAmountRaw?: bigint;
    analyticsTag?: string;
}) {
    if (event.paymentRail) {
        console.info('[mppx:analytics] charge settled', {
            rail: event.paymentRail,
            chargeAmountRaw: event.chargeAmountRaw?.toString(),
            analyticsTag: event.analyticsTag,
            tenantId: event.tenantId,
            requestId: event.requestId,
        });
    }
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
        /** Arbitrary analytics tag forwarded to P402 analytics (Phase 3.3) */
        analyticsTag?: string;
    };
}

// =============================================================================
// REQUEST BUILDERS (shared between mppx and API-key paths)
// =============================================================================

function buildCompletionRequest(body: V2ChatRequest): CompletionRequest {
    return {
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
        user: body.user,
    };
}

function buildRoutingOptions(body: V2ChatRequest, p402?: V2ChatRequest['p402']): RoutingOptions {
    const opts = p402 ?? body.p402 ?? {};
    return {
        mode: opts.mode ?? 'balanced',
        preferProviders: opts.prefer_providers,
        excludeProviders: opts.exclude_providers,
        requiredCapabilities: opts.require_capabilities as any,
        maxCostPerRequest: opts.max_cost,
        failover: { enabled: opts.failover !== false, maxRetries: 2 },
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

        // ── mppx dual-protocol payment gate ──────────────────────────────────
        // Runs before tenant auth so mppx-paying clients don't need an API key.
        const mppx = getMppx();
        if (mppx) {
            const authHeader = req.headers.get('authorization') ?? '';

            if (authHeader.startsWith('Payment ')) {
                // mppx-paying client: verify payment, run AI call, attach receipt.
                const payerAddress = extractMppxPayer(authHeader);
                const syntheticTenantId = payerAddress
                    ? `mppx:${payerAddress.toLowerCase()}`
                    : 'mppx:anon';
                const treasury =
                    process.env.P402_TREASURY_ADDRESS ?? '0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6';
                const chargeAmount = getMppxChargeAmount();

                if (isP402MppMethod()) {
                    // ── Phase 3.2: multi-rail compose path (p402Charge + baseCharge) ──────────
                    // mppx.compose() validates credential schema and dispatches to the method
                    // that matches the client's Authorization header. On success (status 200)
                    // we run business logic and attach the receipt via withReceipt().
                    // Cast required: MppxGateway = TempoInstance; multi-rail uses compose(), not .charge().
                    const composeResult = await (mppx as any).compose(
                        ['p402/charge', { amount: chargeAmount, recipient: treasury }],
                        ['base/charge', { amount: chargeAmount, recipient: treasury }],
                    )(req) as ComposeResult;

                    if (composeResult.status === 402) {
                        return (composeResult as { status: 402; challenge: Response }).challenge;
                    }

                    // Phase 3.1 — Billing Guard (layers 1-3) for mppx-paying clients
                    const billingCtx: BillingContext = { userId: syntheticTenantId };
                    const guard = new BillingGuard();
                    try {
                        await guard.checkRateLimit(billingCtx);
                        await guard.checkDailySpend(billingCtx);
                        await guard.checkConcurrentReservations(billingCtx);
                    } catch (err) {
                        if (err instanceof BillingGuardError) {
                            console.warn('[mppx:alert] WARN billing_guard_rejection', {
                                code: err.code,
                                userId: syntheticTenantId,
                                retryAfterMs: err.retryAfterMs,
                                requestId,
                                timestamp: new Date().toISOString(),
                            });
                            return new Response(
                                JSON.stringify({
                                    error: { type: 'billing_error', message: err.message, code: err.code },
                                }),
                                {
                                    status: 429,
                                    headers: {
                                        'Content-Type': 'application/json',
                                        ...(err.retryAfterMs
                                            ? { 'Retry-After': String(Math.ceil(err.retryAfterMs / 1000)) }
                                            : {}),
                                    },
                                }
                            );
                        }
                        throw err;
                    }
                    // Phase 3.3 — resolve exact bigint, derive float for BillingGuard (safe: max charge << MAX_SAFE_INTEGER)
                    const mppxChargeAmountRaw = resolveAmount({ amount: chargeAmount, decimals: 6 });
                    const mppxChargeAmount = Number(mppxChargeAmountRaw) / 1e6;
                    const reservation = await guard.reserveBudget(billingCtx, mppxChargeAmount);

                    // Phase 3.2 — Dispatch to the correct verifier based on credential method
                    const { method: credMethod, payload: credPayload, challengeId: credChallengeId } =
                        decodePaymentHeader(authHeader);
                    if (credMethod === 'base') {
                        await verifyBaseCharge({
                            request: { recipient: treasury, amount: chargeAmount },
                            credential: { payload: credPayload as BaseChargeCredential },
                            challengeId: credChallengeId ?? requestId,
                            onSettle: executeBaseSettle,
                        }).catch((err: unknown) => {
                            throw new Error(`[mppx:base] verifyBaseCharge failed: ${String(err)}`);
                        });
                    } else {
                        await verifyP402Charge({
                            request: { recipient: treasury, amount: chargeAmount },
                            credential: { payload: credPayload as P402ChargeCredential },
                            challengeId: credChallengeId ?? requestId,
                        }).catch((err: unknown) => {
                            throw new Error(`[mppx:p402] verifyP402Charge failed: ${String(err)}`);
                        });
                    }

                    // Phase 3.3 — analytics tag (chargeAmountRaw reuses mppxChargeAmountRaw from above)
                    const mppxPaymentMeta: MppxPaymentMeta = {
                        rail: credMethod ?? 'p402',
                        chargeAmountRaw: mppxChargeAmountRaw,
                        analyticsTag: body.p402?.analyticsTag,
                    };

                    // Guard passed — run the AI routing path
                    const agentkit = await checkAgentkitAccess(req, '/api/v2/chat/completions');
                    let aiResponse: Response;
                    try {
                        if (body.stream) {
                            aiResponse = await handleStreamingResponse(
                                getProviderRegistry(), buildCompletionRequest(body),
                                buildRoutingOptions(body), requestId, syntheticTenantId,
                                start, agentkit, null, null, mppxPaymentMeta,
                            );
                        } else {
                            aiResponse = await handleNonStreamingResponse(
                                getProviderRegistry(), buildCompletionRequest(body),
                                buildRoutingOptions(body), requestId, syntheticTenantId,
                                start, agentkit, null, null, mppxPaymentMeta,
                            );
                        }
                    } catch (err) {
                        guard.releaseReservation(billingCtx, reservation.reservationId).catch(() => {});
                        throw err;
                    }

                    guard.finalizeSpend(billingCtx, reservation.reservationId, mppxChargeAmount)
                        .catch(err => console.warn('[mppx:billing] finalizeSpend failed:', err));

                    return (composeResult as { status: 200; withReceipt: (r: Response) => Response })
                        .withReceipt(aiResponse);
                }

                // ── Tempo path (USE_P402_MPP_METHOD=false) — use .charge() shorthand ─────────
                // Single charge intent (tempo only) so the shorthand is available.
                return await mppx.charge({ amount: chargeAmount })(
                    async (_payingReq: Request) => {
                        // Billing Guard (Phase 3.1 layers 1-3) — same logic as multi-rail path
                        const billingCtx: BillingContext = { userId: syntheticTenantId };
                        const guard = new BillingGuard();
                        try {
                            await guard.checkRateLimit(billingCtx);
                            await guard.checkDailySpend(billingCtx);
                            await guard.checkConcurrentReservations(billingCtx);
                        } catch (err) {
                            if (err instanceof BillingGuardError) {
                                console.warn('[mppx:alert] WARN billing_guard_rejection', {
                                    code: err.code,
                                    userId: syntheticTenantId,
                                    retryAfterMs: err.retryAfterMs,
                                    requestId,
                                    timestamp: new Date().toISOString(),
                                });
                                return new Response(
                                    JSON.stringify({
                                        error: { type: 'billing_error', message: err.message, code: err.code },
                                    }),
                                    {
                                        status: 429,
                                        headers: {
                                            'Content-Type': 'application/json',
                                            ...(err.retryAfterMs
                                                ? { 'Retry-After': String(Math.ceil(err.retryAfterMs / 1000)) }
                                                : {}),
                                        },
                                    }
                                );
                            }
                            throw err;
                        }
                        // Phase 3.3 — bigint-clean charge amount
                        const tempoChargeAmountRaw = resolveAmount({ amount: chargeAmount, decimals: 6 });
                        const mppxChargeAmount = Number(tempoChargeAmountRaw) / 1e6;
                        const reservation = await guard.reserveBudget(billingCtx, mppxChargeAmount);

                        const tempoPaymentMeta: MppxPaymentMeta = {
                            rail: 'tempo',
                            chargeAmountRaw: tempoChargeAmountRaw,
                            analyticsTag: body.p402?.analyticsTag,
                        };

                        const agentkit = await checkAgentkitAccess(req, '/api/v2/chat/completions');
                        let aiResponse: Response;
                        try {
                            if (body.stream) {
                                aiResponse = await handleStreamingResponse(
                                    getProviderRegistry(), buildCompletionRequest(body),
                                    buildRoutingOptions(body), requestId, syntheticTenantId,
                                    start, agentkit, null, null, tempoPaymentMeta,
                                );
                            } else {
                                aiResponse = await handleNonStreamingResponse(
                                    getProviderRegistry(), buildCompletionRequest(body),
                                    buildRoutingOptions(body), requestId, syntheticTenantId,
                                    start, agentkit, null, null, tempoPaymentMeta,
                                );
                            }
                        } catch (err) {
                            guard.releaseReservation(billingCtx, reservation.reservationId).catch(() => {});
                            throw err;
                        }

                        guard.finalizeSpend(billingCtx, reservation.reservationId, mppxChargeAmount)
                            .catch(err => console.warn('[mppx:billing] finalizeSpend failed:', err));

                        return aiResponse;
                    }
                )(req);
            }

            // No mppx credential — try tenant auth. If that also fails → dual 402.
            const access = await requireTenantAccess(req);
            if (access.error) {
                const x402Header = Buffer.from(JSON.stringify(X402_CHALLENGE_BASE)).toString('base64');
                const treasury =
                    process.env.P402_TREASURY_ADDRESS ?? '0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6';
                try {
                    if (isP402MppMethod()) {
                        // Multi-rail: compose presents p402 + base challenges simultaneously
                        const mppx402 = await (mppx as any).compose(
                            ['p402/charge', { amount: getMppxChargeAmount(), recipient: treasury }],
                            ['base/charge', { amount: getMppxChargeAmount(), recipient: treasury }],
                        )(req) as ComposeResult;
                        const challengeRes = (mppx402 as Extract<ComposeResult, { status: 402 }>).challenge;
                        const headers = new Headers(challengeRes.headers);
                        headers.set('X-PAYMENT-REQUIRED', x402Header);
                        headers.set('Access-Control-Allow-Origin', '*');
                        return new Response(challengeRes.body, { status: 402, headers });
                    } else {
                        // Tempo: charge shorthand generates a challenge when no credential is present
                        const mppx402 = await mppx.charge({ amount: getMppxChargeAmount() })(
                            async () => new Response()
                        )(req);
                        const headers = new Headers(mppx402.headers);
                        headers.set('X-PAYMENT-REQUIRED', x402Header);
                        headers.set('Access-Control-Allow-Origin', '*');
                        return new Response(mppx402.body, { status: 402, headers });
                    }
                } catch {
                    // mppx challenge generation failed — fall back to x402-only 402
                    return new Response(JSON.stringify({ error: 'Payment required' }), {
                        status: 402,
                        headers: {
                            'Content-Type': 'application/json',
                            'X-PAYMENT-REQUIRED': x402Header,
                            'Access-Control-Allow-Origin': '*',
                        },
                    });
                }
            }

            // Tenant auth succeeded — fall through to existing billing-guard flow.
            const p402Options = body.p402 ?? {};
            const tenantId = access.tenantId;
            const agentkit = await checkAgentkitAccess(req, '/api/v2/chat/completions');
            if (!agentkit.grantAccess) {
                const billingCtx = { userId: tenantId, tenantId, humanVerified: agentkit.humanVerified };
                const billingGuard = new BillingGuard();
                await billingGuard.checkRateLimit(billingCtx);
                await billingGuard.checkDailySpend(billingCtx);
                await billingGuard.checkConcurrentReservations(billingCtx);
            }
            const reputationScore = agentkit.humanId
                ? await getReputationScore(agentkit.humanId).catch(() => null)
                : null;
            const creditBalance = await getBalance(agentkit.humanId, tenantId).catch(() => null);
            if (body.stream) {
                return handleStreamingResponse(
                    getProviderRegistry(), buildCompletionRequest(body),
                    buildRoutingOptions(body, p402Options), requestId, tenantId,
                    start, agentkit, reputationScore, creditBalance?.balance ?? null,
                );
            }
            return handleNonStreamingResponse(
                getProviderRegistry(), buildCompletionRequest(body),
                buildRoutingOptions(body, p402Options), requestId, tenantId,
                start, agentkit, reputationScore, creditBalance?.balance ?? null,
            );
        }

        // ── Existing tenant auth flow (USE_MPP_METHOD=false) ─────────────────
        // Resolve tenant
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const p402Options = body.p402 ?? {};
        const tenantId = access.tenantId;

        // ── Layer 0: World AgentKit (proof-of-human free trial) ──────────────
        const agentkit = await checkAgentkitAccess(req, '/api/v2/chat/completions');

        // ── Billing Guard (6-layer spending protection) ──────────────────────
        if (!agentkit.grantAccess) {
            const billingCtx = { userId: tenantId, tenantId, humanVerified: agentkit.humanVerified };
            const billingGuard = new BillingGuard();
            await billingGuard.checkRateLimit(billingCtx);
            await billingGuard.checkDailySpend(billingCtx);
            await billingGuard.checkConcurrentReservations(billingCtx);
        }

        const routingOptions = buildRoutingOptions(body, p402Options);
        const completionRequest = buildCompletionRequest(body);
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

// Phase 3.3 — mppx payment metadata threaded through handlers
interface MppxPaymentMeta {
    rail: string;
    chargeAmountRaw: bigint;
    analyticsTag?: string;
}

async function handleNonStreamingResponse(
    registry: ReturnType<typeof getProviderRegistry>,
    request: CompletionRequest,
    options: RoutingOptions,
    requestId: string,
    tenantId: string,
    startTime: number,
    agentkit: AgentkitCheckResult,
    reputationScore: number | null,
    creditBalanceBefore: number | null,
    paymentMeta?: MppxPaymentMeta,
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
            // Phase 3.3 — mppx payment analytics
            ...(paymentMeta && {
                payment_rail: paymentMeta.rail,
                charge_amount_raw: paymentMeta.chargeAmountRaw.toString(),
                analytics_tag: paymentMeta.analyticsTag ?? null,
            }),
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
        paymentRail: paymentMeta?.rail,
        chargeAmountRaw: paymentMeta?.chargeAmountRaw,
        analyticsTag: paymentMeta?.analyticsTag,
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
    creditBalanceBefore: number | null,
    paymentMeta?: MppxPaymentMeta,
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
                        // Phase 3.3 — mppx payment analytics
                        ...(paymentMeta && {
                            payment_rail: paymentMeta.rail,
                            charge_amount_raw: paymentMeta.chargeAmountRaw.toString(),
                            analytics_tag: paymentMeta.analyticsTag ?? null,
                        }),
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
                    paymentRail: paymentMeta?.rail,
                    chargeAmountRaw: paymentMeta?.chargeAmountRaw,
                    analyticsTag: paymentMeta?.analyticsTag,
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
