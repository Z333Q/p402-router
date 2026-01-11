import pool from './db'
import { PolicyDeny, PolicyDenyCode, deny } from './deny-codes'

export type PolicyEvalContext = {
    amount?: string // provided amount
    legacyXPayment?: boolean
    buyerId?: string
    // New fields for v1.1.0 checks
    network?: string
    scheme?: string
    asset?: string
    sessionToken?: string
    candidateProviderId?: string // For filtering candidates
    candidateModel?: string
}

export type PolicyEval = {
    policyId: string
    tenantId?: string // Link back to tenant for analytics/logging
    allow: boolean
    reasons: string[]
    appliedOverrides: string[]
    schemaVersion: '1.0.0'
    deny?: PolicyDeny
}

export class PolicyEngine {
    static async evaluate(policyId: string | undefined, context: PolicyEvalContext): Promise<PolicyEval> {
        const reasons: string[] = []
        const appliedOverrides: string[] = []

        // 1. Fetch policy
        let policy: any = null
        if (policyId) {
            try {
                const res = await pool.query("SELECT * FROM policies WHERE policy_id = $1", [policyId])
                if (res.rows.length) policy = res.rows[0]
            } catch (e) {
                console.error("Policy DB fetch error", e)
            }
        }

        // Default allow if no policy (unless strict mode enforced elsewhere)
        if (!policy) {
            reasons.push('Policy not found or not provided, fail open (default allow)')
            return {
                policyId: policyId || 'default',
                allow: true,
                reasons,
                appliedOverrides,
                schemaVersion: '1.0.0'
            }
        }

        const rules = policy.rules || {}

        // 2. Strict Header Checks (x402 Requirement)
        if (rules.denyIf?.legacyXPaymentHeader && context.legacyXPayment) {
            reasons.push('Legacy X-PAYMENT header used')
            return {
                policyId: policyId!,
                allow: false,
                reasons,
                appliedOverrides,
                schemaVersion: '1.0.0',
                deny: deny('X402_LEGACY_HEADER_X_PAYMENT', false, 'Use PAYMENT-SIGNATURE header')
            }
        }

        if (rules.denyIf?.missingPaymentSignature && context.legacyXPayment === false) {
            // Logic: If legacyXPayment is false AND we don't detect a signature (context needs explicit sig check field or assumption)
            // For now we trust the router/plan input legacyXPayment flag as derived from headers
        }

        // 3. Provider Allow/Deny List (V2 Spec 4.2)
        if (context.candidateProviderId) {
            const providerRules = rules.providers || {};
            if (providerRules.allow && Array.isArray(providerRules.allow)) {
                if (!providerRules.allow.includes(context.candidateProviderId)) {
                    return {
                        policyId: policyId!,
                        allow: false,
                        reasons: [`Provider ${context.candidateProviderId} not in allowlist`],
                        appliedOverrides,
                        schemaVersion: '1.0.0',
                        deny: deny('POLICY_PROVIDER_NOT_ALLOWED', false, 'Provider restricted by policy')
                    }
                }
            }
            if (providerRules.deny && Array.isArray(providerRules.deny)) {
                if (providerRules.deny.includes(context.candidateProviderId)) {
                    return {
                        policyId: policyId!,
                        allow: false,
                        reasons: [`Provider ${context.candidateProviderId} in denylist`],
                        appliedOverrides,
                        schemaVersion: '1.0.0',
                        deny: deny('POLICY_PROVIDER_DENIED', false, 'Provider explicitly denied')
                    }
                }
            }
        }

        // 4. Budget Checks (Session & Global)
        if (context.sessionToken) {
            // Check session validity and budget
            try {
                const sessionRes = await pool.query(
                    "SELECT * FROM agent_sessions WHERE session_token = $1 AND status = 'active'",
                    [context.sessionToken]
                );

                if (sessionRes.rows.length === 0) {
                    return {
                        policyId: policyId!,
                        allow: false,
                        reasons: ['Invalid or inactive session token'],
                        appliedOverrides,
                        schemaVersion: '1.0.0',
                        deny: deny('SESSION_INVALID', false, 'Session token invalid or expired')
                    }
                }

                const session = sessionRes.rows[0];
                const cleanAmount = parseFloat(context.amount || '0');
                const remaining = parseFloat(session.budget_total_usd) - parseFloat(session.budget_spent_usd);

                if (cleanAmount > remaining) {
                    return {
                        policyId: policyId!,
                        allow: false,
                        reasons: [`Session budget exceeded. Requested: ${cleanAmount}, Remaining: ${remaining}`],
                        appliedOverrides,
                        schemaVersion: '1.0.0',
                        deny: deny('SESSION_BUDGET_EXCEEDED', false, 'Insufficient session limits')
                    }
                }
            } catch (e) {
                console.error("Session check failed", e);
            }
        }

        // Global/Policy Budget Rule (Mock / Future)
        if (rules.budgets?.perRequest && context.amount) {
            const limit = parseFloat(rules.budgets.perRequest.replace('$', ''));
            if (parseFloat(context.amount) > limit) {
                return {
                    policyId: policyId!,
                    allow: false,
                    reasons: ['Per-request budget exceeded'],
                    appliedOverrides,
                    schemaVersion: '1.0.0',
                    deny: deny('POLICY_BUDGET_LIMIT', false, 'Request exceeds policy limit')
                }
            }
        }

        return {
            policyId: policyId!,
            tenantId: policy?.tenant_id,
            allow: true,
            reasons,
            appliedOverrides,
            schemaVersion: '1.0.0'
        }
    }
}
