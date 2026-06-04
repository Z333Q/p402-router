import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { GET } from './route';

const TENANT = '00000000-0000-0000-0000-000000000def';

function req(qs = '') {
    return new NextRequest(`http://localhost/api/v2/audit/economic-event-coverage${qs}`, {
        headers: { 'x-p402-tenant': TENANT },
    });
}

beforeEach(() => (db.query as any).mockReset());

describe('GET /api/v2/audit/economic-event-coverage', () => {
    it('happy path: returns shape + coverage_pct + outbox depth', async () => {
        (db.query as any)
            // 1. hosted_requests count
            .mockResolvedValueOnce({ rows: [{ count: 1000 }] })
            // 2. economic_events count
            .mockResolvedValueOnce({ rows: [{ count: 985 }] })
            // 3. outbox depth aggregate
            .mockResolvedValueOnce({ rows: [{ pending: 15, abandoned: 2, oldest_pending_age_seconds: 120 }] })
            // 4. recent failures
            .mockResolvedValueOnce({
                rows: [
                    { id: 'o1', request_id: 'r1', source: 'chat_completions', route: '/api/v2/chat/completions',
                      error_code: 'db_unavailable', error_message_safe: 'connection terminated',
                      retry_count: 1, status: 'pending', created_at: '2026-06-04T00:00:00Z', next_retry_at: '2026-06-04T00:05:00Z' },
                ],
            });

        const res = await GET(req());
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toMatchObject({
            hosted_requests: 1000,
            economic_events: 985,
            coverage_pct: 98.5,
            outbox: { pending: 15, abandoned: 2, oldest_pending_age_seconds: 120 },
        });
        expect(body.recent_failures).toHaveLength(1);
        expect(body.recent_failures[0].error_code).toBe('db_unavailable');
        // Privacy: error_message_safe is short, no content
        expect(body.recent_failures[0].error_message_safe.length).toBeLessThanOrEqual(256);
        expect(body.period.since).toBeDefined();
        expect(body.period.until).toBeDefined();
    });

    it('100% coverage when hosted_requests == economic_events', async () => {
        (db.query as any)
            .mockResolvedValueOnce({ rows: [{ count: 50 }] })
            .mockResolvedValueOnce({ rows: [{ count: 50 }] })
            .mockResolvedValueOnce({ rows: [{ pending: 0, abandoned: 0, oldest_pending_age_seconds: null }] })
            .mockResolvedValueOnce({ rows: [] });

        const res = await GET(req());
        const body = await res.json();
        expect(body.coverage_pct).toBe(100);
        expect(body.outbox.oldest_pending_age_seconds).toBeNull();
    });

    it('0% coverage when hosted_requests > 0 but no economic events', async () => {
        (db.query as any)
            .mockResolvedValueOnce({ rows: [{ count: 100 }] })
            .mockResolvedValueOnce({ rows: [{ count: 0 }] })
            .mockResolvedValueOnce({ rows: [{ pending: 0, abandoned: 0, oldest_pending_age_seconds: null }] })
            .mockResolvedValueOnce({ rows: [] });

        const res = await GET(req());
        const body = await res.json();
        expect(body.coverage_pct).toBe(0);
    });

    it('coverage_pct = 0 when neither hosted nor events exist (no division by zero)', async () => {
        (db.query as any)
            .mockResolvedValueOnce({ rows: [{ count: 0 }] })
            .mockResolvedValueOnce({ rows: [{ count: 0 }] })
            .mockResolvedValueOnce({ rows: [{ pending: 0, abandoned: 0, oldest_pending_age_seconds: null }] })
            .mockResolvedValueOnce({ rows: [] });

        const res = await GET(req());
        const body = await res.json();
        expect(body.coverage_pct).toBe(0);
    });

    it('fails soft when ai_economic_events table is missing', async () => {
        (db.query as any)
            .mockResolvedValueOnce({ rows: [{ count: 100 }] })
            .mockRejectedValueOnce(new Error('relation "ai_economic_events" does not exist'))
            // outbox queries still expected (table independent)
            .mockResolvedValueOnce({ rows: [{ pending: 0, abandoned: 0, oldest_pending_age_seconds: null }] })
            .mockResolvedValueOnce({ rows: [] });

        const res = await GET(req());
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.hosted_requests).toBe(100);
        expect(body.economic_events).toBe(0);
        expect(body.coverage_pct).toBe(0);
    });

    it('fails soft when economic_event_write_failures table is missing', async () => {
        (db.query as any)
            .mockResolvedValueOnce({ rows: [{ count: 100 }] })
            .mockResolvedValueOnce({ rows: [{ count: 100 }] })
            .mockRejectedValueOnce(new Error('relation "economic_event_write_failures" does not exist'));

        const res = await GET(req());
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.outbox).toEqual({ pending: 0, abandoned: 0, oldest_pending_age_seconds: null });
        expect(body.recent_failures).toEqual([]);
    });

    it('binds since/until query params', async () => {
        (db.query as any)
            .mockResolvedValueOnce({ rows: [{ count: 1 }] })
            .mockResolvedValueOnce({ rows: [{ count: 1 }] })
            .mockResolvedValueOnce({ rows: [{ pending: 0, abandoned: 0, oldest_pending_age_seconds: null }] })
            .mockResolvedValueOnce({ rows: [] });

        await GET(req('?since=2026-05-01T00:00:00Z&until=2026-06-01T00:00:00Z'));
        const hostedCall = (db.query as any).mock.calls[0];
        expect(hostedCall[1][1].toISOString()).toBe('2026-05-01T00:00:00.000Z');
        expect(hostedCall[1][2].toISOString()).toBe('2026-06-01T00:00:00.000Z');
    });
});
