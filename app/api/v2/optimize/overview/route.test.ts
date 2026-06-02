import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { GET } from './route';

const TENANT = '00000000-0000-0000-0000-000000000777';

function makeReq() {
    return new NextRequest('http://localhost/api/v2/optimize/overview', {
        headers: { 'x-p402-tenant': TENANT },
    });
}

beforeEach(() => {
    (db.query as any).mockReset();
});

// Per-test, the route makes up to 4 queries in this order:
//   1. MTD cost + count from traffic_events
//   2. by-provider from traffic_events (last 30d)
//   3. by-task from traffic_events (last 30d)
//   4. savings (baseline vs actual) from execute_requests — fail-soft
function mockChain(opts: {
    mtdCost?: number;
    mtdRequests?: number;
    providerRows?: Array<{ provider: string; request_count: number; total_cost_usd: number; avg_cost_usd: number }>;
    taskRows?: Array<{ task: string; request_count: number; total_cost_usd: number; avg_cost_usd: number }>;
    baseline?: number;
    actual?: number;
    savingsThrows?: boolean;
}) {
    const q = (db.query as any);
    q.mockResolvedValueOnce({ rows: [{ mtd_cost: opts.mtdCost ?? 0, mtd_requests: opts.mtdRequests ?? 0 }] });
    q.mockResolvedValueOnce({ rows: opts.providerRows ?? [] });
    q.mockResolvedValueOnce({ rows: opts.taskRows ?? [] });
    if (opts.savingsThrows) {
        q.mockRejectedValueOnce(new Error('execute_requests table missing'));
    } else {
        q.mockResolvedValueOnce({ rows: [{ baseline: opts.baseline ?? 0, actual: opts.actual ?? 0 }] });
    }
}

describe('GET /api/v2/optimize/overview', () => {
    it('returns 200 with the documented shape on empty tenant', async () => {
        mockChain({});
        const res = await GET(makeReq());
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toMatchObject({
            period_days: 30,
            actual_mtd_cost_usd: 0,
            estimated_monthly_cost_usd: 0,
            existing_savings_usd: 0,
            existing_savings_pct: 0,
            request_count_30d: 0,
            by_provider: [],
            by_task: [],
            top_expensive_tasks: [],
            open_recommendations: 0,
            recommendations_state: 'coming_soon',
        });
        expect(typeof body.coming_soon_label).toBe('string');
        expect(body.privacy_note).toContain('economics, not content');
    });

    it('projects MTD to month end linearly', async () => {
        // Force "now" to mid-month so the projection math is testable.
        const FAKE_NOW = new Date('2026-06-15T12:00:00Z'); // 15th of 30-day month
        vi.useFakeTimers();
        vi.setSystemTime(FAKE_NOW);
        try {
            mockChain({ mtdCost: 75, mtdRequests: 500 });
            const res = await GET(makeReq());
            const body = await res.json();
            // $75 on day 15 of June (30 days) → projected $150 for the month
            expect(body.actual_mtd_cost_usd).toBe(75);
            expect(body.estimated_monthly_cost_usd).toBe(150);
        } finally {
            vi.useRealTimers();
        }
    });

    it('aggregates by provider with avg cost', async () => {
        mockChain({
            providerRows: [
                { provider: 'openai',    request_count: 100, total_cost_usd: 12.5, avg_cost_usd: 0.125 },
                { provider: 'anthropic', request_count:  50, total_cost_usd:  4.0, avg_cost_usd: 0.080 },
            ],
        });
        const res = await GET(makeReq());
        const body = await res.json();
        expect(body.by_provider).toEqual([
            { provider: 'openai',    request_count: 100, total_cost_usd: 12.5, avg_cost_usd: 0.125 },
            { provider: 'anthropic', request_count:  50, total_cost_usd:  4.0, avg_cost_usd: 0.080 },
        ]);
        expect(body.request_count_30d).toBe(150);
    });

    it('top_expensive_tasks is by_task sliced to 5', async () => {
        mockChain({
            taskRows: Array.from({ length: 8 }, (_, i) => ({
                task: `task_${i}`,
                request_count: 10,
                total_cost_usd: 10 - i,
                avg_cost_usd: (10 - i) / 10,
            })),
        });
        const res = await GET(makeReq());
        const body = await res.json();
        expect(body.by_task.length).toBe(8);
        expect(body.top_expensive_tasks.length).toBe(5);
        expect(body.top_expensive_tasks[0].task).toBe('task_0');
    });

    it('computes savings from execute_requests baseline vs actual', async () => {
        mockChain({ baseline: 100, actual: 60 });
        const res = await GET(makeReq());
        const body = await res.json();
        expect(body.existing_savings_usd).toBe(40);
        expect(body.existing_savings_pct).toBe(40);
    });

    it('returns 0 savings when execute_requests query throws (fail-soft)', async () => {
        mockChain({ savingsThrows: true });
        const res = await GET(makeReq());
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.existing_savings_usd).toBe(0);
        expect(body.existing_savings_pct).toBe(0);
    });

    it('writes traffic_events queries against created_at, not router_decisions', async () => {
        mockChain({});
        await GET(makeReq());
        const calls = (db.query as any).mock.calls;
        // First three queries hit traffic_events.created_at; fourth hits execute_requests.created_at.
        expect(calls[0][0]).toContain('FROM traffic_events');
        expect(calls[0][0]).toContain('created_at');
        expect(calls[1][0]).toContain('FROM traffic_events');
        expect(calls[2][0]).toContain('FROM traffic_events');
        expect(calls[3][0]).toContain('FROM execute_requests');
        // Must NOT touch router_decisions (which uses `timestamp`, not `created_at` —
        // pre-existing bug in /api/v2/analytics/spend; do not replicate).
        for (const c of calls) {
            expect(c[0]).not.toContain('FROM router_decisions');
        }
    });

    it('always reports open_recommendations=0 until Slice 4 ships', async () => {
        mockChain({});
        const res = await GET(makeReq());
        const body = await res.json();
        expect(body.open_recommendations).toBe(0);
        expect(body.recommendations_state).toBe('coming_soon');
    });
});
