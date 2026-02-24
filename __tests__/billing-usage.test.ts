import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as usageHandler } from '@/app/api/v2/billing/usage/route';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';

vi.mock('next-auth');
vi.mock('@/lib/db');

describe('Billing Usage Aggregation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should aggregate costs from both router_decisions and a2a_tasks', async () => {
        const tenantId = 'tenant-123';
        (getServerSession as any).mockResolvedValue({
            user: { tenantId }
        });

        // Mock tenant plan
        (db.query as any).mockImplementation((query: string) => {
            if (query.includes('SELECT plan FROM tenants')) {
                return { rows: [{ plan: 'free' }] };
            }
            if (query.includes('COALESCE')) {
                // Return $1.50 from decisions + $2.00 from tasks
                return { rows: [{ total_spend: '3.50' }] };
            }
            return { rows: [] };
        });

        const req = new Request('http://localhost/api/v2/billing/usage');
        const res = await usageHandler(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.currentUsageUsd).toBe(3.50);
        expect(data.maxSpendUsd).toBe(5.00);
        expect(data.usagePercent).toBe(70);
    });

    it('should respect Pro plan limits', async () => {
        const tenantId = 'tenant-123';
        (getServerSession as any).mockResolvedValue({
            user: { tenantId }
        });

        (db.query as any).mockImplementation((query: string) => {
            if (query.includes('SELECT plan FROM tenants')) {
                return { rows: [{ plan: 'pro' }] };
            }
            if (query.includes('COALESCE')) {
                return { rows: [{ total_spend: '100.00' }] };
            }
            return { rows: [] };
        });

        const req = new Request('http://localhost/api/v2/billing/usage');
        const res = await usageHandler(req);
        const data = await res.json();

        expect(data.maxSpendUsd).toBe(5000.00);
        expect(data.usagePercent).toBe(2);
    });
});
