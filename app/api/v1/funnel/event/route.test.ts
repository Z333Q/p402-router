import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn(), getPool: vi.fn(), end: vi.fn() },
}));

import db from '@/lib/db';
import { POST } from './route';

const mockDb = db as unknown as { query: ReturnType<typeof vi.fn> };

function makeReq(body: unknown, headers: Record<string, string> = {}): Request {
    return new Request('https://example.test/api/v1/funnel/event', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body),
    });
}

beforeEach(() => {
    mockDb.query.mockReset();
    mockDb.query.mockResolvedValue({ rows: [] });
});

describe('POST /api/v1/funnel/event — happy path', () => {
    it('accepts a known event and writes to funnel_events', async () => {
        const res = await POST(
            makeReq({ eventName: 'funnel.login_view', properties: { provider: 'google' } })
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toEqual({ ok: true });
        expect(mockDb.query).toHaveBeenCalledTimes(1);
        const params = mockDb.query.mock.calls[0]![1] as unknown[];
        expect(params[3]).toBe('funnel.login_view');
    });

    it('accepts every event from the canonical list', async () => {
        const names = [
            'funnel.login_view',
            'funnel.signin_started',
            'funnel.signin_success',
            'funnel.onboarding_view',
            'funnel.role_selected',
            'funnel.api_key_issued',
            'funnel.onboarding_completed',
            'funnel.dashboard_view',
            'funnel.dashboard_meaningful',
            'funnel.error',
        ];
        for (const name of names) {
            mockDb.query.mockClear();
            const res = await POST(makeReq({ eventName: name }));
            expect(res.status, `failed for ${name}`).toBe(200);
            expect(mockDb.query, `no write for ${name}`).toHaveBeenCalledTimes(1);
        }
    });

    it('forwards anonymousId and sessionId when provided', async () => {
        await POST(
            makeReq({
                eventName: 'funnel.signin_started',
                anonymousId: 'anon-123',
                sessionId: 'sess-xyz',
            })
        );
        const params = mockDb.query.mock.calls[0]![1] as unknown[];
        expect(params[1]).toBe('anon-123');
        expect(params[2]).toBe('sess-xyz');
    });
});

describe('POST /api/v1/funnel/event — rejection', () => {
    it('rejects unknown event names with 400', async () => {
        const res = await POST(makeReq({ eventName: 'funnel.unknown_event' }));
        expect(res.status).toBe(400);
        expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('rejects malformed JSON with 400', async () => {
        const res = await POST(makeReq('{ not json'));
        expect(res.status).toBe(400);
        expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('rejects a missing eventName with 400', async () => {
        const res = await POST(makeReq({ properties: { provider: 'google' } }));
        expect(res.status).toBe(400);
        expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('rejects an oversized eventName (>64 chars) with 400', async () => {
        const long = 'funnel.' + 'x'.repeat(100);
        const res = await POST(makeReq({ eventName: long }));
        expect(res.status).toBe(400);
        expect(mockDb.query).not.toHaveBeenCalled();
    });
});

describe('POST /api/v1/funnel/event — privacy guarantees', () => {
    it('drops forbidden property keys before writing to DB', async () => {
        await POST(
            makeReq({
                eventName: 'funnel.signin_started',
                properties: {
                    provider: 'google',
                    email: 'leak@p402-smoke.invalid',
                    password: 'leak',
                    api_key: 'leak',
                    prompt: 'leak',
                },
            })
        );
        const params = mockDb.query.mock.calls[0]![1] as unknown[];
        const props = JSON.parse(params[4] as string) as Record<string, unknown>;
        expect(props).toEqual({ provider: 'google' });
    });

    it('hashes the user-agent header; never writes raw UA', async () => {
        await POST(
            makeReq(
                { eventName: 'funnel.login_view' },
                { 'user-agent': 'Mozilla/5.0 (suspicious/1.0)' }
            )
        );
        const params = mockDb.query.mock.calls[0]![1] as unknown[];
        const uaHash = params[5] as string | null;
        expect(uaHash).toMatch(/^[0-9a-f]{32}$/);
        expect(uaHash).not.toContain('Mozilla');
        expect(uaHash).not.toContain('suspicious');
    });

    it('classifies x-forwarded-for to ipv4 / ipv6 / null but never writes raw IP', async () => {
        // ipv4
        await POST(
            makeReq(
                { eventName: 'funnel.login_view' },
                { 'x-forwarded-for': '203.0.113.5' }
            )
        );
        expect(mockDb.query.mock.calls.at(-1)![1][6]).toBe('ipv4');

        mockDb.query.mockClear();

        // ipv6
        await POST(
            makeReq(
                { eventName: 'funnel.login_view' },
                { 'x-forwarded-for': '2001:db8::1' }
            )
        );
        expect(mockDb.query.mock.calls.at(-1)![1][6]).toBe('ipv6');

        mockDb.query.mockClear();

        // missing header
        await POST(makeReq({ eventName: 'funnel.login_view' }));
        expect(mockDb.query.mock.calls.at(-1)![1][6]).toBeNull();
    });

    it('never writes a raw IP address into the params or properties', async () => {
        await POST(
            makeReq(
                {
                    eventName: 'funnel.login_view',
                    properties: { ip: '198.51.100.1', remote_addr: '198.51.100.1' },
                },
                { 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }
            )
        );
        const params = mockDb.query.mock.calls[0]![1] as unknown[];
        for (const p of params) {
            if (typeof p !== 'string') continue;
            expect(p).not.toContain('198.51.100.1');
            expect(p).not.toContain('10.0.0.1');
        }
        const props = JSON.parse(params[4] as string) as Record<string, unknown>;
        expect(props).not.toHaveProperty('ip');
        expect(props).not.toHaveProperty('remote_addr');
    });
});

describe('POST /api/v1/funnel/event — resilience', () => {
    it('returns 200 even when the DB write fails (analytics must not block)', async () => {
        mockDb.query.mockRejectedValueOnce(new Error('boom'));
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const res = await POST(makeReq({ eventName: 'funnel.login_view' }));
        expect(res.status).toBe(200);
        warnSpy.mockRestore();
    });
});

describe('funnel event route source-shape — no scope creep', () => {
    const SRC = readFileSync(join(__dirname, 'route.ts'), 'utf8');

    it('does not import any third-party analytics SDK', () => {
        expect(SRC).not.toMatch(/from\s+['"](posthog-js|posthog-node|@segment\/analytics-node|mixpanel|amplitude|@growthbook\/growthbook)['"]/i);
    });

    it('does not import the Stripe SDK', () => {
        expect(SRC).not.toMatch(/from\s+['"]stripe['"]/);
    });

    it('does not update tenants or billing tables', () => {
        expect(SRC).not.toMatch(/UPDATE\s+tenants\s+SET/i);
        expect(SRC).not.toMatch(/billing_subscriptions/i);
        expect(SRC).not.toMatch(/processed_webhook_events/i);
    });

    it('declares dynamic = force-dynamic (no caching of POST telemetry)', () => {
        expect(SRC).toMatch(/export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/);
    });
});
