import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

vi.mock('@/lib/economic-events/retry-worker', () => ({
    replayOutboxRow: vi.fn(),
}));

import db from '@/lib/db';
import { replayOutboxRow } from '@/lib/economic-events/retry-worker';
import { POST } from './route';

const CRON_SECRET = 'test-cron-secret';

function req(opts: { auth?: string; batch?: string } = {}) {
    const url = opts.batch
        ? `http://localhost/api/internal/cron/economic-events/retry?batch=${opts.batch}`
        : 'http://localhost/api/internal/cron/economic-events/retry';
    return new NextRequest(url, {
        method: 'POST',
        headers: opts.auth ? { authorization: opts.auth } : {},
    });
}

beforeEach(() => {
    (db.query as any).mockReset();
    (replayOutboxRow as any).mockReset();
    process.env.CRON_SECRET = CRON_SECRET;
});

describe('POST /api/internal/cron/economic-events/retry', () => {
    it('401 when CRON_SECRET missing', async () => {
        const res = await POST(req());
        expect(res.status).toBe(401);
        expect(db.query).not.toHaveBeenCalled();
    });

    it('401 when CRON_SECRET wrong', async () => {
        const res = await POST(req({ auth: 'Bearer wrong-token' }));
        expect(res.status).toBe(401);
    });

    it('returns zero counts when no pending rows', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        const res = await POST(req({ auth: `Bearer ${CRON_SECRET}` }));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toMatchObject({
            ok: true,
            attempted: 0, resolved: 0, retried: 0, abandoned: 0, errors: 0,
        });
        expect(replayOutboxRow).not.toHaveBeenCalled();
    });

    it('replays rows and counts outcomes', async () => {
        (db.query as any).mockResolvedValueOnce({
            rows: [
                { id: 'o1', tenant_id: 't', request_id: 'r1', source: 'chat_completions', route: null, error_code: 'db_unavailable', error_message_safe: null, retry_count: 0, next_retry_at: '', payload: {} },
                { id: 'o2', tenant_id: 't', request_id: 'r2', source: 'meter_only',        route: null, error_code: 'check_violation', error_message_safe: null, retry_count: 6, next_retry_at: '', payload: {} },
                { id: 'o3', tenant_id: 't', request_id: 'r3', source: 'chat_completions', route: null, error_code: 'db_unavailable', error_message_safe: null, retry_count: 1, next_retry_at: '', payload: {} },
            ],
        });
        (replayOutboxRow as any)
            .mockResolvedValueOnce({ id: 'o1', request_id: 'r1', outcome: 'resolved',  last_error_code: null })
            .mockResolvedValueOnce({ id: 'o2', request_id: 'r2', outcome: 'abandoned', last_error_code: 'check_violation' })
            .mockResolvedValueOnce({ id: 'o3', request_id: 'r3', outcome: 'retried',   last_error_code: 'db_unavailable' });

        const res = await POST(req({ auth: `Bearer ${CRON_SECRET}` }));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toMatchObject({
            ok: true,
            attempted: 3, resolved: 1, retried: 1, abandoned: 1, errors: 0,
        });
        expect(body.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('one bad row does not break the batch (error count increments)', async () => {
        (db.query as any).mockResolvedValueOnce({
            rows: [
                { id: 'o1', tenant_id: 't', request_id: 'r1', source: 'chat_completions', route: null, error_code: '', error_message_safe: null, retry_count: 0, next_retry_at: '', payload: {} },
                { id: 'o2', tenant_id: 't', request_id: 'r2', source: 'chat_completions', route: null, error_code: '', error_message_safe: null, retry_count: 0, next_retry_at: '', payload: {} },
            ],
        });
        (replayOutboxRow as any)
            .mockRejectedValueOnce(new Error('worker exploded'))
            .mockResolvedValueOnce({ id: 'o2', request_id: 'r2', outcome: 'resolved', last_error_code: null });

        const res = await POST(req({ auth: `Bearer ${CRON_SECRET}` }));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toMatchObject({
            ok: true,
            attempted: 2, resolved: 1, retried: 0, abandoned: 0, errors: 1,
        });
    });

    it('batch parameter is clamped to [1, 500]', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        await POST(req({ auth: `Bearer ${CRON_SECRET}`, batch: '99999' }));
        const call = (db.query as any).mock.calls[0];
        expect(call[1]).toEqual([500]);

        (db.query as any).mockReset();
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        await POST(req({ auth: `Bearer ${CRON_SECRET}`, batch: '0' }));
        const call2 = (db.query as any).mock.calls[0];
        expect(call2[1]).toEqual([1]);
    });

    it('selects with FOR UPDATE SKIP LOCKED to allow parallel cron workers', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        await POST(req({ auth: `Bearer ${CRON_SECRET}` }));
        const call = (db.query as any).mock.calls[0];
        expect(call[0]).toContain('FOR UPDATE SKIP LOCKED');
        expect(call[0]).toContain(`status = 'pending'`);
        expect(call[0]).toContain('next_retry_at <= NOW()');
    });
});
