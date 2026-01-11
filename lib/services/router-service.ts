import { RoutingEngine } from '@/lib/router-engine'
import { PolicyEngine } from '@/lib/policy-engine'
import { startTrace, addStep, endTrace, DecisionTrace } from '@/lib/trace/decision-trace'
import { P402Analytics } from '@/lib/analytics'
import { ApiError } from '@/lib/errors'
import { SemanticCache } from '@/lib/cache-engine'

// ...

export interface PlanRequest {
    policyId?: string;
    routeId: string;
    payment: {
        network: string;
        scheme: string;
        amount: string;
        asset: string;
        legacyXPayment?: boolean;
    };
    buyer?: {
        buyerId?: string;
    };
    prompt?: string; // V2 Spec 4.4
    task?: string;
    tenantId?: string;
}

export interface PlanResponse {
    decisionId: string;
    allow: boolean;
    policy: {
        policyId: string;
        allow: boolean;
        reasons: string[];
        appliedOverrides: string[];
        schemaVersion: string;
        deny?: {
            code: string;
            message?: string;
        };
        decisionTrace: DecisionTrace;
    };
    candidates: any[]; // Using any[] for now as FacilitatorCandidate type is in RoutingEngine
    recommendedAcceptIndex: number;
}

export class RouterService {
    static async plan(requestId: string, input: PlanRequest): Promise<PlanResponse> {
        const decisionId = crypto.randomUUID()
        const trace = startTrace(decisionId)

        const { policyId, routeId, payment, buyer } = input

        try {
            addStep(trace, { kind: 'input.validated', status: 'ok', meta: { routeId, network: payment.network } })

            // 1. Evaluate Policy
            const policyResult = await PolicyEngine.evaluate(policyId, {
                amount: payment.amount,
                legacyXPayment: payment.legacyXPayment,
                network: payment.network,
                scheme: payment.scheme,
                asset: payment.asset,
                buyerId: buyer?.buyerId
            })

            addStep(trace, {
                kind: 'policy.evaluated',
                status: policyResult.allow ? 'ok' : 'deny',
                meta: {
                    policyId: policyResult.policyId,
                    reasons: policyResult.reasons,
                    denyCode: policyResult.deny?.code
                }
            })

            // If Denied, Return Early
            if (!policyResult.allow) {
                endTrace(trace)

                // Async tracking
                P402Analytics.trackPolicyViolation(
                    policyResult.deny?.code || 'GENERIC_DENY',
                    routeId,
                    buyer?.buyerId || 'anonymous'
                );

                return {
                    decisionId,
                    allow: false,
                    policy: {
                        policyId: policyResult.policyId,
                        allow: false,
                        reasons: policyResult.reasons,
                        appliedOverrides: policyResult.appliedOverrides,
                        schemaVersion: policyResult.schemaVersion,
                        deny: policyResult.deny,
                        decisionTrace: trace
                    },
                    candidates: [],
                    recommendedAcceptIndex: 0
                }
            }

            // 2. Plan Route (Score Facilitators)
            const routePlan = await RoutingEngine.plan(
                { routeId, method: 'POST', path: '/' },
                {
                    network: payment.network,
                    scheme: payment.scheme,
                    amount: payment.amount,
                    asset: payment.asset
                },
                {
                    requestId,
                    tenantId: policyResult.tenantId || (input as any).tenantId, // Fallback to input if policy has no tenantId
                    mode: 'balanced',
                    prompt: input.prompt,
                    task: input.task
                }
            )

            addStep(trace, {
                kind: 'facilitator.scored',
                status: 'ok',
                meta: {
                    candidateCount: routePlan.candidates.length,
                    topCandidate: routePlan.candidates[0]?.facilitatorId
                }
            })

            // 3. Cache Storage (Spec 4.4)
            const effectiveTenantId = policyResult.tenantId || input.tenantId;
            if (!routePlan.cacheHit && input.prompt && effectiveTenantId) {
                // We cache the entire plan response for this prompt
                // In production, you might only cache the top candidate or final execution result
                await SemanticCache.store(
                    input.prompt,
                    { candidates: routePlan.candidates, selectedId: routePlan.selectedId },
                    effectiveTenantId,
                    routePlan.candidates[0]?.facilitatorId // Optional model tracking
                );
            }

            endTrace(trace)

            // Async tracking
            P402Analytics.trackPlan(
                routeId,
                routePlan.candidates[0]?.facilitatorId || 'none',
                payment.amount,
                buyer?.buyerId || 'anonymous'
            );

            return {
                decisionId,
                allow: true,
                policy: {
                    policyId: policyResult.policyId,
                    allow: true,
                    reasons: policyResult.reasons,
                    appliedOverrides: policyResult.appliedOverrides,
                    schemaVersion: policyResult.schemaVersion,
                    decisionTrace: trace
                },
                candidates: routePlan.candidates,
                recommendedAcceptIndex: 0
            }

        } catch (e: any) {
            // Ideally we also log the error step to the trace
            addStep(trace, { kind: 'execution.error', status: 'error', meta: { message: e.message } })
            endTrace(trace)
            throw new ApiError({
                code: 'INTERNAL_ERROR',
                status: 500,
                message: 'Internal processing error',
                requestId,
                details: e.message
            });
        }
    }
}
