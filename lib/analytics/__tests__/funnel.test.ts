import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn(), getPool: vi.fn(), end: vi.fn() },
}));

import db from '@/lib/db';
import {
    FUNNEL_EVENTS,
    hashUserAgent,
    isFunnelEventName,
    recordFunnelEvent,
    sanitizeProperties,
} from '../funnel';

const mockDb = db as unknown as { query: ReturnType<typeof vi.fn> };

beforeEach(() => {
    mockDb.query.mockReset();
    mockDb.query.mockResolvedValue({ rows: [] });
});

describe('FUNNEL_EVENTS canonical list', () => {
    it('contains exactly the events declared in the 3AZ-2 plan §8.3', () => {
        expect([...FUNNEL_EVENTS]).toEqual([
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
        ]);
    });

    it('every event name begins with the funnel. prefix', () => {
        for (const name of FUNNEL_EVENTS) {
            expect(name.startsWith('funnel.')).toBe(true);
        }
    });
});

describe('isFunnelEventName', () => {
    it('accepts every canonical name', () => {
        for (const name of FUNNEL_EVENTS) {
            expect(isFunnelEventName(name)).toBe(true);
        }
    });

    it('rejects unknown / case-mismatched / non-string values', () => {
        expect(isFunnelEventName('funnel.unknown')).toBe(false);
        expect(isFunnelEventName('FUNNEL.LOGIN_VIEW')).toBe(false);
        expect(isFunnelEventName('login_view')).toBe(false);
        expect(isFunnelEventName('')).toBe(false);
        expect(isFunnelEventName(null)).toBe(false);
        expect(isFunnelEventName(undefined)).toBe(false);
        expect(isFunnelEventName(42)).toBe(false);
        expect(isFunnelEventName({ name: 'funnel.login_view' })).toBe(false);
    });
});

describe('sanitizeProperties — forbidden-key scan', () => {
    const FORBIDDEN = [
        'prompt', 'prompts',
        'response', 'responses',
        'completion', 'completions', 'completion_text',
        'messages', 'message_content',
        'content', 'text',
        'file', 'files', 'document', 'documents',
        'chat', 'chat_history', 'transcript',
        'raw_trace', 'stored_content',
        'request_body', 'response_body',
        'email', 'password', 'token', 'api_key', 'apikey',
        'ip', 'ip_address', 'remote_addr', 'user_agent',
    ];

    it.each(FORBIDDEN)('strips forbidden key %s', (key) => {
        const out = sanitizeProperties({ [key]: 'leak-this-please', kept: 'ok' });
        expect(out).not.toHaveProperty(key);
        expect(out.kept).toBe('ok');
    });

    it('strips forbidden keys regardless of case', () => {
        const out = sanitizeProperties({ Email: 'a@b.test', PROMPT: 'x', token: 'y' });
        expect(out).not.toHaveProperty('Email');
        expect(out).not.toHaveProperty('PROMPT');
        expect(out).not.toHaveProperty('token');
    });
});

describe('sanitizeProperties — value handling', () => {
    it('preserves string / number / boolean values', () => {
        expect(sanitizeProperties({ a: 'one', b: 2, c: true, d: false })).toEqual({
            a: 'one', b: 2, c: true, d: false,
        });
    });

    it('drops null / undefined values', () => {
        expect(sanitizeProperties({ a: null, b: undefined, c: 'kept' })).toEqual({ c: 'kept' });
    });

    it('drops nested objects', () => {
        expect(sanitizeProperties({ a: { nested: 'no' }, b: 'kept' })).toEqual({ b: 'kept' });
    });

    it('drops arrays', () => {
        expect(sanitizeProperties({ a: ['no'], b: 'kept' })).toEqual({ b: 'kept' });
    });

    it('drops strings longer than 200 chars', () => {
        const long = 'x'.repeat(201);
        const short = 'x'.repeat(200);
        const out = sanitizeProperties({ long, short });
        expect(out).not.toHaveProperty('long');
        expect(out.short).toBe(short);
    });

    it('caps at 32 property keys', () => {
        const big: Record<string, unknown> = {};
        for (let i = 0; i < 50; i++) big[`k${i}`] = i;
        const out = sanitizeProperties(big);
        expect(Object.keys(out).length).toBe(32);
    });

    it('returns {} for non-object input', () => {
        expect(sanitizeProperties(null)).toEqual({});
        expect(sanitizeProperties(undefined)).toEqual({});
        expect(sanitizeProperties('string')).toEqual({});
        expect(sanitizeProperties(42)).toEqual({});
        expect(sanitizeProperties([1, 2, 3])).toEqual({});
    });
});

describe('hashUserAgent', () => {
    it('returns null for null / undefined / empty', () => {
        expect(hashUserAgent(null)).toBeNull();
        expect(hashUserAgent(undefined)).toBeNull();
        expect(hashUserAgent('')).toBeNull();
    });

    it('returns a 32-char hex string for a real UA', () => {
        const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';
        const h = hashUserAgent(ua);
        expect(h).not.toBeNull();
        expect(h).toMatch(/^[0-9a-f]{32}$/);
    });

    it('is deterministic for the same input', () => {
        const ua = 'curl/8.4.0';
        expect(hashUserAgent(ua)).toBe(hashUserAgent(ua));
    });

    it('differs for different inputs (no collision in test fixture)', () => {
        const a = hashUserAgent('Mozilla/5.0');
        const b = hashUserAgent('curl/8.4.0');
        expect(a).not.toBe(b);
    });

    it('never returns the raw UA verbatim', () => {
        const ua = 'Mozilla/5.0 (suspicious-bot/1.0)';
        const h = hashUserAgent(ua);
        expect(h).not.toContain('Mozilla');
        expect(h).not.toContain('bot');
    });
});

describe('recordFunnelEvent — DB shape', () => {
    it('writes to funnel_events with the seven expected params', async () => {
        await recordFunnelEvent({
            eventName: 'funnel.login_view',
            tenantId: '11111111-1111-1111-1111-111111111111',
            anonymousId: 'anon-abc',
            sessionId: 'sess-xyz',
            properties: { provider: 'google' },
            userAgent: 'Mozilla/5.0',
            ipClass: 'ipv4',
        });
        expect(mockDb.query).toHaveBeenCalledTimes(1);
        const call = mockDb.query.mock.calls[0]!;
        const sql = call[0] as string;
        const params = call[1] as unknown[];
        expect(sql).toMatch(/INSERT\s+INTO\s+funnel_events/i);
        expect(params.length).toBe(7);
        expect(params[0]).toBe('11111111-1111-1111-1111-111111111111');
        expect(params[1]).toBe('anon-abc');
        expect(params[2]).toBe('sess-xyz');
        expect(params[3]).toBe('funnel.login_view');
        expect(JSON.parse(params[4] as string)).toEqual({ provider: 'google' });
        expect(params[5]).toMatch(/^[0-9a-f]{32}$/);
        expect(params[6]).toBe('ipv4');
    });

    it('forbidden property keys never reach the SQL params', async () => {
        await recordFunnelEvent({
            eventName: 'funnel.signin_started',
            properties: {
                provider: 'google',
                email: 'leak@p402-smoke.invalid',
                password: 'leak',
                token: 'leak',
                prompt: 'leak',
            },
        });
        const params = mockDb.query.mock.calls[0]![1] as unknown[];
        const props = JSON.parse(params[4] as string) as Record<string, unknown>;
        expect(props).toEqual({ provider: 'google' });
        expect(props).not.toHaveProperty('email');
        expect(props).not.toHaveProperty('password');
        expect(props).not.toHaveProperty('token');
        expect(props).not.toHaveProperty('prompt');
    });

    it('never writes a raw user-agent or raw IP', async () => {
        await recordFunnelEvent({
            eventName: 'funnel.login_view',
            userAgent: 'Mozilla/5.0 (special-bot/1.0)',
            ipClass: 'ipv6',
            properties: { ip: '203.0.113.5', user_agent: 'leak' },
        });
        const params = mockDb.query.mock.calls[0]![1] as unknown[];
        const props = JSON.parse(params[4] as string) as Record<string, unknown>;
        expect(props).not.toHaveProperty('ip');
        expect(props).not.toHaveProperty('user_agent');
        // user_agent_hash is param[5]: must be a hash, never the raw UA
        const uaHash = params[5] as string;
        expect(uaHash).not.toContain('Mozilla');
        expect(uaHash).not.toContain('bot');
        // ip_class is param[6]: must be the family token only
        expect(params[6]).toBe('ipv6');
    });

    it('coerces unknown ipClass values to null', async () => {
        await recordFunnelEvent({
            eventName: 'funnel.login_view',
            ipClass: 'tor' as unknown as 'ipv4',
        });
        const params = mockDb.query.mock.calls[0]![1] as unknown[];
        expect(params[6]).toBeNull();
    });

    it('treats empty / non-string event name as a noop', async () => {
        await recordFunnelEvent({ eventName: '' });
        await recordFunnelEvent({ eventName: 0 as unknown as string });
        expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('truncates event names longer than 64 chars before write', async () => {
        const long = 'funnel.' + 'x'.repeat(100);
        await recordFunnelEvent({ eventName: long });
        const params = mockDb.query.mock.calls[0]![1] as unknown[];
        expect((params[3] as string).length).toBeLessThanOrEqual(64);
    });
});

describe('recordFunnelEvent — fire-and-forget contract', () => {
    it('never throws on db.query failure (analytics must not block)', async () => {
        mockDb.query.mockRejectedValueOnce(new Error('boom — connection refused'));
        await expect(
            recordFunnelEvent({ eventName: 'funnel.login_view' })
        ).resolves.toBeUndefined();
    });

    it('logs at warn level on failure with a sanitized message', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        mockDb.query.mockRejectedValueOnce(new Error('boom'));
        await recordFunnelEvent({ eventName: 'funnel.login_view' });
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });
});

describe('funnel.ts source-shape — no scope creep', () => {
    const SRC = readFileSync(join(__dirname, '..', 'funnel.ts'), 'utf8');

    it('does not import any third-party analytics SDK', () => {
        expect(SRC).not.toMatch(/from\s+['"](posthog-js|posthog-node|@segment\/analytics-node|mixpanel|amplitude|@growthbook\/growthbook)['"]/i);
    });

    it('does not call into Stripe SDK', () => {
        expect(SRC).not.toMatch(/from\s+['"]stripe['"]/);
        expect(SRC).not.toMatch(/stripe\.(checkout|subscriptions|webhooks|billingPortal|customers)/i);
    });

    it('does not update tenants.plan', () => {
        expect(SRC).not.toMatch(/UPDATE\s+tenants\s+SET\s+plan/i);
    });

    it('does not write to billing tables', () => {
        expect(SRC).not.toMatch(/billing_subscriptions/i);
        expect(SRC).not.toMatch(/processed_webhook_events/i);
    });

    it('contains no unsupported claims', () => {
        expect(SRC).not.toMatch(/verified[\s_-]+savings/i);
        expect(SRC).not.toMatch(/guaranteed savings/i);
        expect(SRC).not.toMatch(/auto[\s_-]?apply/i);
        expect(SRC).not.toMatch(/SOC ?2 compliant/i);
        expect(SRC).not.toMatch(/HIPAA compliant/i);
        expect(SRC).not.toMatch(/ISO ?\d+ certified/i);
    });
});
