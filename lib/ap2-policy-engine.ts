import { AP2Mandate, MandateConstraints } from './a2a-types';
import { query } from './db';

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
     * recordUsage updates the mandate usage.
     * Should be called inside a transaction ideally.
     */
    static async recordUsage(mandateId: string, amountUsd: number): Promise<void> {
        await query(
            `UPDATE ap2_mandates 
             SET amount_spent_usd = amount_spent_usd + $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [amountUsd, mandateId]
        );
    }
}
