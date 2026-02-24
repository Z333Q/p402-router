import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoutingEngine } from '@/lib/router-engine';
import { A2AMiddleware } from '@/lib/a2a-middleware';
import pool from '@/lib/db';
import { checkUsageLimit, BillingError } from '@/lib/billing/enforcement';

vi.mock('@/lib/db');

describe('Hard Usage Enforcement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('checkUsageLimit utility', () => {
        it('should throw LIMIT_EXCEEDED if over free plan limit ($5.00)', async () => {
            (pool.query as any).mockImplementation((query: string) => {
                if (query.includes('SELECT plan FROM tenants')) {
                    return { rows: [{ plan: 'free' }] };
                }
                if (query.includes('COALESCE')) {
                    return { rows: [{ total_spend: '5.01' }] };
                }
                return { rows: [] };
            });

            await expect(checkUsageLimit('tenant-123')).rejects.toThrow(BillingError);
            await expect(checkUsageLimit('tenant-123')).rejects.toThrow('Monthly spend limit of $5.00 reached');
        });

        it('should NOT throw if under free plan limit', async () => {
            (pool.query as any).mockImplementation((query: string) => {
                if (query.includes('SELECT plan FROM tenants')) {
                    return { rows: [{ plan: 'free' }] };
                }
                if (query.includes('COALESCE')) {
                    return { rows: [{ total_spend: '4.99' }] };
                }
                return { rows: [] };
            });

            await expect(checkUsageLimit('tenant-123')).resolves.not.toThrow();
        });

        it('should NOT throw for Pro plan at $10.00 spend', async () => {
            (pool.query as any).mockImplementation((query: string) => {
                if (query.includes('SELECT plan FROM tenants')) {
                    return { rows: [{ plan: 'pro' }] };
                }
                if (query.includes('COALESCE')) {
                    return { rows: [{ total_spend: '10.00' }] };
                }
                return { rows: [] };
            });

            await expect(checkUsageLimit('tenant-123')).resolves.not.toThrow();
        });
    });

    describe('RoutingEngine Integration', () => {
        it('should block planning if limit reached', async () => {
            (pool.query as any).mockImplementation((query: string) => {
                if (query.includes('SELECT plan FROM tenants')) {
                    return { rows: [{ plan: 'free' }] };
                }
                if (query.includes('COALESCE')) {
                    return { rows: [{ total_spend: '5.01' }] };
                }
                return { rows: [] };
            });

            await expect(RoutingEngine.plan(
                { routeId: 'r1', method: 'GET', path: '/test' },
                { network: 'base', scheme: 'x402', amount: '1', asset: 'USDC' },
                { tenantId: 'tenant-123', requestId: 'req-1' }
            )).rejects.toThrow(BillingError);

            // Verify a decision record was inserted with failure
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO router_decisions'),
                expect.arrayContaining(['usage_limit_reached', false])
            );
        });
    });

    describe('A2AMiddleware Integration', () => {
        it('should block task creation if limit reached', async () => {
            (pool.query as any).mockImplementation((query: string) => {
                if (query.includes('SELECT plan FROM tenants')) {
                    return { rows: [{ plan: 'free' }] };
                }
                if (query.includes('COALESCE')) {
                    return { rows: [{ total_spend: '50.00' }] };
                }
                return { rows: [] };
            });

            const middleware = new A2AMiddleware('tenant-123');
            await expect(middleware.createTask({
                tenantId: 'tenant-123',
                message: { id: 'm1', type: 'task', content: {} }
            })).rejects.toThrow(BillingError);
        });
    });
});
