import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PolicyEngine } from '../policy-engine';
import pool from '../db';
import { deny } from '../deny-codes';

vi.mock('../db', () => ({
    default: {
        query: vi.fn(),
    },
}));

describe('PolicyEngine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('evaluate()', () => {
        it('should fail open (allow) if policy is not found', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as any);

            const result = await PolicyEngine.evaluate('missing-policy', {});
            expect(result.allow).toBe(true);
            expect(result.reasons).toContain('Policy not found or not provided, fail open (default allow)');
        });

        it('should deny legacy X-PAYMENT headers if rule is set', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({
                rows: [{
                    policy_id: 'pol-1',
                    rules: { denyIf: { legacyXPaymentHeader: true } }
                }]
            } as any);

            const result = await PolicyEngine.evaluate('pol-1', { legacyXPayment: true });
            expect(result.allow).toBe(false);
            expect(result.deny?.code).toBe('X402_LEGACY_HEADER_X_PAYMENT');
        });

        it('should enforce provider allowlist', async () => {
            vi.mocked(pool.query).mockResolvedValue({
                rows: [{
                    policy_id: 'pol-1',
                    rules: { providers: { allow: ['fac_1', 'fac_2'] } }
                }]
            } as any);

            // Allowed
            const res1 = await PolicyEngine.evaluate('pol-1', { candidateProviderId: 'fac_1' });
            expect(res1.allow).toBe(true);

            // Denied
            const res2 = await PolicyEngine.evaluate('pol-1', { candidateProviderId: 'fac_3' });
            expect(res2.allow).toBe(false);
            expect(res2.deny?.code).toBe('POLICY_PROVIDER_NOT_ALLOWED');
        });

        it('should enforce session budget limits', async () => {
            vi.mocked(pool.query)
                .mockResolvedValueOnce({ // Policy fetch
                    rows: [{ policy_id: 'pol-1', rules: {} }]
                } as any)
                .mockResolvedValueOnce({ // Session fetch
                    rows: [{
                        status: 'active',
                        budget_total_usd: '10.00',
                        budget_spent_usd: '9.50'
                    }]
                } as any);

            // Try to spend $1.00 when only $0.50 is left
            const result = await PolicyEngine.evaluate('pol-1', {
                sessionToken: 'token-abc',
                amount: '1.00'
            });

            expect(result.allow).toBe(false);
            expect(result.deny?.code).toBe('SESSION_BUDGET_EXCEEDED'); // Note: I should check if it's SESSION_BUDGET_EXCEEDED or shorter
            // Checking actual code in policy-engine.ts: it is 'SESSION_BUDGET_EXCEEDED'
        });
    });
});
