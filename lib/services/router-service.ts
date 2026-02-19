import { RoutingEngine } from '@/lib/router-engine'
import { PolicyEngine } from '@/lib/policy-engine'
import { startTrace, addStep, endTrace, DecisionTrace } from '@/lib/trace/decision-trace'
import { P402Analytics } from '@/lib/analytics'
import { ApiError } from '@/lib/errors'
import { SemanticCache } from '@/lib/cache-engine'
import { AP2PolicyEngine, findActiveMandate } from '@/lib/ap2-policy-engine'

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
    mandateId?: string;  // AP2 mandate ID for budget enforcement
    agentDid?: string;   // Agent DID to look up active mandate
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
    mandate?: {
        id: string;
        remaining: number;
    };
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

            // 1.5 AP2 Mandate Enforcement
            let resolvedMandateId: string | undefined;
            let mandateRemaining: number | undefined;

            if (input.mandateId || input.agentDid) {
                let mandateId = input.mandateId;

                // If only agentDid provided, look up the active mandate
                if (!mandateId && input.agentDid) {
                    const effectiveTenantId = policyResult.tenantId || input.tenantId || '00000000-0000-0000-0000-000000000001';
                    const activeMandate = await findActiveMandate(effectiveTenantId, input.agentDid);
                    if (activeMandate) {
                        mandateId = activeMandate.id;
                    }
                }

                if (mandateId) {
                    const requestedAmount = parseFloat(payment.amount) || 0;
                    const mandateCheck = await AP2PolicyEngine.verifyMandate(mandateId, requestedAmount);

                    addStep(trace, {
                        kind: 'mandate.verified',
                        status: mandateCheck.valid ? 'ok' : 'deny',
                        meta: {
                            mandateId,
                            valid: mandateCheck.valid,
                            errorCode: mandateCheck.error?.code,
                        }
                    });

                    if (!mandateCheck.valid) {
                        endTrace(trace);

                        const errorCodeMap: Record<string, string> = {
                            'MANDATE_NOT_FOUND': 'MANDATE_NOT_FOUND',
                            'MANDATE_INACTIVE': 'MANDATE_INACTIVE',
                            'MANDATE_EXPIRED': 'MANDATE_EXPIRED',
                            'BUDGET_EXCEEDED': 'MANDATE_BUDGET_EXCEEDED',
                            'CATEGORY_NOT_ALLOWED': 'MANDATE_CATEGORY_DENIED',
                        };

                        const apiCode = errorCodeMap[mandateCheck.error?.code || ''] || 'MANDATE_INACTIVE';

                        return {
                            decisionId,
                            allow: false,
                            policy: {
                                policyId: policyResult.policyId,
                                allow: false,
                                reasons: [`AP2 Mandate denied: ${mandateCheck.error?.message || 'unknown'}`],
                                appliedOverrides: policyResult.appliedOverrides,
                                schemaVersion: policyResult.schemaVersion,
                                deny: {
                                    code: apiCode,
                                    message: mandateCheck.error?.message,
                                },
                                decisionTrace: trace
                            },
                            candidates: [],
                            recommendedAcceptIndex: 0
                        };
                    }

                    // Mandate valid — compute remaining budget for response
                    resolvedMandateId = mandateId;
                    const mandate = await AP2PolicyEngine.getMandate(mandateId);
                    if (mandate) {
                        mandateRemaining = mandate.constraints.max_amount_usd - (mandate.amount_spent_usd || 0);
                    }
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

            const response: PlanResponse = {
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
            };

            if (resolvedMandateId && mandateRemaining !== undefined) {
                response.mandate = {
                    id: resolvedMandateId,
                    remaining: mandateRemaining,
                };
            }

            return response;

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
