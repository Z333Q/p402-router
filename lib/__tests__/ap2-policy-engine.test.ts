import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AP2PolicyEngine } from '../ap2-policy-engine';
import { query } from '../db';

vi.mock('./db', () => ({
    query: vi.fn(),
}));

describe('AP2PolicyEngine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('verifyMandate()', () => {
        it('should return error if mandate is not found', async () => {
            vi.mocked(query).mockResolvedValueOnce({ rowCount: 0, rows: [] } as any);

            const result = await AP2PolicyEngine.verifyMandate('missing-id', 1.0);
            expect(result.valid).toBe(false);
            expect(result.error?.code).toBe('MANDATE_NOT_FOUND');
        });

        it('should return error if mandate is inactive', async () => {
            vi.mocked(query).mockResolvedValueOnce({
                rowCount: 1,
                rows: [{ status: 'expired', constraints: {} }]
            } as any);

            const result = await AP2PolicyEngine.verifyMandate('mandate-expired', 1.0);
            expect(result.valid).toBe(false);
            expect(result.error?.code).toBe('MANDATE_INACTIVE');
        });

        it('should return error if mandate is expired by date', async () => {
            const pastDate = new Date();
            pastDate.setFullYear(pastDate.getFullYear() - 1);

            vi.mocked(query).mockResolvedValueOnce({
                rowCount: 1,
                rows: [{
                    status: 'active',
                    constraints: { valid_until: pastDate.toISOString() }
                }]
            } as any);

            const result = await AP2PolicyEngine.verifyMandate('mandate-date-expired', 1.0);
            expect(result.valid).toBe(false);
            expect(result.error?.code).toBe('MANDATE_EXPIRED');
        });

        it('should return error if budget is exceeded', async () => {
            vi.mocked(query).mockResolvedValueOnce({
                rowCount: 1,
                rows: [{
                    status: 'active',
                    amount_spent_usd: 9.0,
                    constraints: { max_amount_usd: 10.0 }
                }]
            } as any);

            // Requesting $2.00 when only $1.00 is left
            const result = await AP2PolicyEngine.verifyMandate('mandate-budget-low', 2.0);
            expect(result.valid).toBe(false);
            expect(result.error?.code).toBe('BUDGET_EXCEEDED');
            expect(result.error?.data.available).toBe(1.0);
        });

        it('should return error if category is not allowed', async () => {
            vi.mocked(query).mockResolvedValueOnce({
                rowCount: 1,
                rows: [{
                    status: 'active',
                    amount_spent_usd: 0,
                    constraints: {
                        max_amount_usd: 100.0,
                        allowed_categories: ['research', 'coding']
                    }
                }]
            } as any);

            const result = await AP2PolicyEngine.verifyMandate('mandate-cat', 1.0, 'gambling');
            expect(result.valid).toBe(false);
            expect(result.error?.code).toBe('CATEGORY_NOT_ALLOWED');
        });

        it('should succeed if all constraints are met', async () => {
            vi.mocked(query).mockResolvedValueOnce({
                rowCount: 1,
                rows: [{
                    status: 'active',
                    amount_spent_usd: 5.0,
                    constraints: {
                        max_amount_usd: 20.0,
                        allowed_categories: ['research']
                    }
                }]
            } as any);

            const result = await AP2PolicyEngine.verifyMandate('mandate-ok', 5.0, 'research');
            expect(result.valid).toBe(true);
        });
    });

    describe('recordUsage()', () => {
        it('should update the database with correct values', async () => {
            await AP2PolicyEngine.recordUsage('mandate-123', 0.50);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE ap2_mandates'),
                [0.50, 'mandate-123']
            );
        });
    });
});
