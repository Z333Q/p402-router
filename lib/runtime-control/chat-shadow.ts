/**
 * Slice 3Y-Shadow-Wireup — chat-route bridge to the runtime shadow path.
 *
 * Called from /api/v2/chat/completions after the existing billing-guard
 * layers have allowed the request and before the provider call. Reads
 * request-body metadata only, computes an explicitly approximate cost
 * estimate, and invokes computeAndEmitShadow. Returns Promise<void>
 * and is structurally incapable of denying the request.
 *
 * Hard rules:
 *   - Never throws. The inner try/catch is belt-and-suspenders even
 *     though computeAndEmitShadow itself never throws.
 *   - Reads body.model (string), body.messages (length-only inspection
 *     for cost estimation), body.max_tokens (number). Does NOT inspect,
 *     log, store, or forward message content as text.
 *   - Skips when tenantId is empty or body.model is not a string.
 *   - All three approved 3X-Shadow axes are surfaced via the underlying
 *     shadow module: monthly_budget_usd, max_cost_per_request_usd,
 *     allowed_models. allowed_task_types and human_review_threshold_usd
 *     remain filtered at the shadow boundary.
 */

import redis from '@/lib/redis';
import pool from '@/lib/db';

import {
    computeAndEmitShadow,
    type ShadowDependencies,
} from './shadow';
import {
    estimateModelCostUsd,
    type CostRegistryLike,
} from './cost-estimate';

interface MessageLike {
    content?: unknown;
}

export interface ChatBodyLike {
    model?: unknown;
    messages?: ReadonlyArray<MessageLike>;
    max_tokens?: unknown;
}

export interface EmitChatShadowDeps {
    redis?: ShadowDependencies['redis'];
    db?: ShadowDependencies['db'];
    registry?: CostRegistryLike;
    logger?: ShadowDependencies['logger'];
    now?: ShadowDependencies['now'];
}

export async function emitChatShadow(
    args: {
        tenantId: string | null | undefined;
        requestId: string;
        body: ChatBodyLike | undefined;
    },
    deps?: EmitChatShadowDeps,
): Promise<void> {
    try {
        if (!args.tenantId) return;

        const modelRequested = typeof args.body?.model === 'string' ? args.body.model : '';
        if (!modelRequested) return;

        const maxTokens = typeof args.body?.max_tokens === 'number' ? args.body.max_tokens : undefined;
        const estimatedCostUsd = estimateModelCostUsd(
            modelRequested,
            args.body?.messages,
            maxTokens,
            deps?.registry,
        );

        await computeAndEmitShadow(
            {
                tenantId: args.tenantId,
                requestId: args.requestId,
                estimatedCostUsd,
                modelRequested,
            },
            {
                redis:  deps?.redis  ?? redis,
                db:     deps?.db     ?? pool,
                logger: deps?.logger,
                now:    deps?.now,
            },
        );
    } catch {
        // computeAndEmitShadow already catches every internal failure
        // and emits a tcs_shadow_failed log. This outer catch is the
        // hard guarantee that nothing from the shadow surface can ever
        // surface as a runtime denial in the chat route.
    }
}
