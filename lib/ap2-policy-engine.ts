import { AP2Mandate, MandateConstraints } from './a2a-types';
import { query } from './db';
import { pushNotificationService } from './push-service';

export interface AP2PolicyContext {
    tenant_id: string;
    category?: string;
    requested_amount_usd: number;
    metadata?: any;
}

export interface AP2PolicyResult {
    allowed: boolean;
    mandate_id?: string;
    error?: {
        code: string;
        message: string;
        data?: any;
    };
}

// Minimal in-memory or DB-based policy engine for Mandates
// In a real implementation, this would verify signatures (EIP-712).
// For now, we simulate constraint checking.

export class AP2PolicyEngine {

    /**
     * verifyMandate checks if a mandate is valid for a given requested amount and category.
     * It does NOT deduce balance, just validates.
     */
    static async verifyMandate(
        mandateId: string,
        requestedAmountUsd: number,
        category?: string
    ): Promise<{ valid: boolean; error?: { code: string; message: string; data?: any } }> {

        // 1. Fetch mandate
        // In real world, we might fetch from on-chain or local DB cache.
        // Here we query our new ap2_mandates table.
        const res = await query('SELECT * FROM ap2_mandates WHERE id = $1', [mandateId]);
        if (res.rowCount === 0) {
            return { valid: false, error: { code: 'MANDATE_NOT_FOUND', message: 'Mandate not found' } };
        }

        const mandate = res.rows[0]; // Raw DB row
        const constraints = mandate.constraints as MandateConstraints;

        // 2. Check Status
        if (mandate.status !== 'active') {
            return { valid: false, error: { code: 'MANDATE_INACTIVE', message: `Mandate is ${mandate.status}` } };
        }

        // 3. Check Expiration
        if (constraints.valid_until && new Date(constraints.valid_until) < new Date()) {
            return { valid: false, error: { code: 'MANDATE_EXPIRED', message: 'Mandate expired' } };
        }

        // 4. Check Budget
        const currentSpent = Number(mandate.amount_spent_usd || 0);
        const available = constraints.max_amount_usd - currentSpent;

        if (requestedAmountUsd > available) {
            return {
                valid: false,
                error: {
                    code: 'BUDGET_EXCEEDED',
                    message: 'Budget exceeded',
                    data: {
                        mandate_id: mandateId,
                        available: available,
                        requested: requestedAmountUsd
                    }
                }
            };
        }

        // 5. Check Category
        if (category && constraints.allowed_categories) {
            if (!constraints.allowed_categories.includes(category)) {
                return { valid: false, error: { code: 'CATEGORY_NOT_ALLOWED', message: `Category '${category}' not allowed` } };
            }
        }

        return { valid: true };
    }

    /**
     * getMandate retrieves the full mandate details.
     */
    static async getMandate(mandateId: string): Promise<AP2Mandate | null> {
        const res = await query('SELECT * FROM ap2_mandates WHERE id = $1', [mandateId]);
        if (res.rowCount === 0) return null;
        return res.rows[0] as AP2Mandate;
    }

    /**
     * recordUsage updates the mandate usage.
     * Should be called inside a transaction ideally.
     */
    static async recordUsage(mandateId: string, amountUsd: number): Promise<void> {
        const res = await query(
            `UPDATE ap2_mandates 
             SET amount_spent_usd = amount_spent_usd + $1,
                 updated_at = NOW()
             WHERE id = $2
             RETURNING id, tenant_id, constraints, amount_spent_usd`,
            [amountUsd, mandateId]
        );

        if (res.rowCount && res.rowCount > 0) {
            const mandate = res.rows[0];
            const constraints = mandate.constraints as MandateConstraints;

            // Check for budget exhaustion
            if (Number(mandate.amount_spent_usd) >= constraints.max_amount_usd) {
                pushNotificationService.notifyBudgetExhausted({
                    context_id: `ctx_mandate_${mandate.id}`,
                    tenant_id: mandate.tenant_id,
                    budget_total_usd: constraints.max_amount_usd,
                    budget_used_usd: Number(mandate.amount_spent_usd)
                }).catch((err: any) => console.error('Push Notification Error (Budget):', err));

                // Auto-update status to exhausted
                await query("UPDATE ap2_mandates SET status = 'exhausted' WHERE id = $1", [mandateId]);
            }
        }
    }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export async function validateMandate(mandateId: string, requestedAmountUsd: number, category?: string) {
    return AP2PolicyEngine.verifyMandate(mandateId, requestedAmountUsd, category);
}

export async function findActiveMandate(tenantId: string, agentDid: string, category?: string) {
    const res = await query(
        `SELECT * FROM ap2_mandates 
         WHERE tenant_id = $1 
           AND agent_did = $2 
           AND status = 'active'
         ORDER BY created_at DESC LIMIT 1`,
        [tenantId, agentDid]
    );
    return res.rows[0] || null;
}

export async function recordMandateUsage(mandateId: string, amountUsd: number) {
    return AP2PolicyEngine.recordUsage(mandateId, amountUsd);
}

export async function getMandateBudgetStatus(mandateId: string) {
    const mandate = await AP2PolicyEngine.getMandate(mandateId);
    if (!mandate) return null;
    return {
        total: mandate.constraints.max_amount_usd,
        spent: mandate.amount_spent_usd,
        remaining: mandate.constraints.max_amount_usd - mandate.amount_spent_usd
    };
}

export async function enforceAP2Policy(context: AP2PolicyContext): Promise<AP2PolicyResult> {
    const mandate = await findActiveMandate(context.tenant_id, context.metadata?.agent_did, context.category);
    if (!mandate) {
        return { allowed: false, error: { code: 'NO_ACTIVE_MANDATE', message: 'No active mandate found for this agent' } };
    }

    const validation = await validateMandate(mandate.id, context.requested_amount_usd, context.category);
    if (!validation.valid) {
        return { allowed: false, mandate_id: mandate.id, error: validation.error };
    }

    return { allowed: true, mandate_id: mandate.id };
}

export function createAP2PolicyMiddleware() {
    // Standard middleware wrapper if needed
    return async (context: AP2PolicyContext) => {
        return enforceAP2Policy(context);
    };
}
