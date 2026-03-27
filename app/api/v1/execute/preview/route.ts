/**
 * POST /api/v1/execute/preview
 * ============================
 * Dry-run: scores all providers for the given task + mode and returns the
 * predicted winner + top alternatives with cost estimates.
 * No LLM call is made. Used by the Execute dashboard surface.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAccess } from '@/lib/auth'
import { toApiErrorResponse } from '@/lib/errors'
import { getProviderRegistry } from '@/lib/ai-providers/registry'

const ESTIMATED_INPUT_TOKENS  = 256 // conservative prompt estimate
const ESTIMATED_OUTPUT_TOKENS = 512 // conservative output estimate

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID()
    try {
        const { tenantId } = await requireTenantAccess(req)
        const body = await req.json() as { task?: string; mode?: string }

        const mode = (['cost', 'speed', 'quality', 'balanced'].includes(body.mode ?? ''))
            ? (body.mode as 'cost' | 'speed' | 'quality' | 'balanced')
            : 'balanced'

        const registry = getProviderRegistry()
        const decision  = await registry.route({
            messages: [{ role: 'user', content: body.task ?? 'preview' }],
        }, { mode })

        const winnerCost = decision.provider.estimateCost(
            decision.model.id,
            ESTIMATED_INPUT_TOKENS,
            ESTIMATED_OUTPUT_TOKENS
        )

        const alternatives = decision.alternatives.slice(0, 3).map((alt: { provider: string; model: string; score: number }) => {
            const p = registry.get(alt.provider)
            const cost = p ? p.estimateCost(alt.model, ESTIMATED_INPUT_TOKENS, ESTIMATED_OUTPUT_TOKENS) : null
            return {
                provider: alt.provider,
                model:    alt.model,
                score:    Math.round(alt.score * 100) / 100,
                estimated_cost: cost,
            }
        })

        return NextResponse.json({
            mode,
            winner: {
                provider:       decision.provider.id,
                model:          decision.model.id,
                score:          Math.round(decision.scores.total * 100) / 100,
                estimated_cost: winnerCost,
                reason:         decision.reason,
            },
            alternatives,
        }, { headers: { 'x-request-id': requestId } })
    } catch (e) {
        return toApiErrorResponse(e, requestId)
    }
}
