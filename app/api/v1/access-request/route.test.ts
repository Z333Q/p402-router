import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn(), getPool: vi.fn(), end: vi.fn() },
}));

vi.mock('@/lib/notifications', () => ({
    Notifications: {
        notifyAccessRequest: vi.fn().mockResolvedValue(undefined),
    },
}));

import pool from '@/lib/db';
import { POST } from './route';

const mockPool = pool as unknown as { query: ReturnType<typeof vi.fn> };

function makeReq(body: Record<string, unknown>): Request {
    return new Request('https://example.test/api/v1/access-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
}

/** Pull the parameter array out of the most recent INSERT call. */
function lastInsertParams(): unknown[] {
    const call = mockPool.query.mock.calls.at(-1);
    if (!call) throw new Error('no db.query call recorded');
    return call[1] as unknown[];
}

/** Indexes into the param array for the new columns (zero-based). */
const I_EMAIL = 0;
const I_COMPANY = 1;
const I_ROLE = 2;
const I_RPD = 3;
const I_INTENT = 4;
const I_RESOLVED = 5;
const I_PLAN_ID = 6;
const I_OFFER_ID = 7;

beforeEach(() => {
    mockPool.query.mockReset();
    mockPool.query.mockResolvedValue({ rows: [] });
});

describe('POST /api/v1/access-request — pricing intent persistence', () => {
    it('build intent → intent=build, resolved=build, plan_id=build, offer_id=null', async () => {
        const res = await POST(makeReq({ email: 'a@b.test', intent: 'build' }));
        expect(res.status).toBe(200);
        const p = lastInsertParams();
        expect(p[I_INTENT]).toBe('build');
        expect(p[I_RESOLVED]).toBe('build');
        expect(p[I_PLAN_ID]).toBe('build');
        expect(p[I_OFFER_ID]).toBeNull();
    });

    it('growth intent persists plan_id=growth', async () => {
        await POST(makeReq({ email: 'a@b.test', intent: 'growth' }));
        const p = lastInsertParams();
        expect(p[I_PLAN_ID]).toBe('growth');
        expect(p[I_OFFER_ID]).toBeNull();
    });

    it('scale intent persists plan_id=scale', async () => {
        await POST(makeReq({ email: 'a@b.test', intent: 'scale' }));
        const p = lastInsertParams();
        expect(p[I_PLAN_ID]).toBe('scale');
        expect(p[I_OFFER_ID]).toBeNull();
    });

    it('enterprise intent persists plan_id=enterprise', async () => {
        await POST(makeReq({ email: 'a@b.test', intent: 'enterprise' }));
        const p = lastInsertParams();
        expect(p[I_PLAN_ID]).toBe('enterprise');
        expect(p[I_OFFER_ID]).toBeNull();
    });

    it('ai-spend-audit intent persists offer_id=ai_spend_audit', async () => {
        await POST(makeReq({ email: 'a@b.test', intent: 'ai-spend-audit' }));
        const p = lastInsertParams();
        expect(p[I_PLAN_ID]).toBeNull();
        expect(p[I_OFFER_ID]).toBe('ai_spend_audit');
    });

    it('paid-pilot intent persists offer_id=paid_pilot', async () => {
        await POST(makeReq({ email: 'a@b.test', intent: 'paid-pilot' }));
        const p = lastInsertParams();
        expect(p[I_OFFER_ID]).toBe('paid_pilot');
    });

    it('regulated-pilot intent persists offer_id=regulated_pilot', async () => {
        await POST(makeReq({ email: 'a@b.test', intent: 'regulated-pilot' }));
        const p = lastInsertParams();
        expect(p[I_OFFER_ID]).toBe('regulated_pilot');
    });
});

describe('POST /api/v1/access-request — legacy intent persistence', () => {
    it('legacy developer → intent=developer, resolved=build, plan_id=build', async () => {
        await POST(makeReq({ email: 'a@b.test', intent: 'developer' }));
        const p = lastInsertParams();
        expect(p[I_INTENT]).toBe('developer');
        expect(p[I_RESOLVED]).toBe('build');
        expect(p[I_PLAN_ID]).toBe('build');
        expect(p[I_OFFER_ID]).toBeNull();
    });

    it('legacy business → intent=business, resolved=scale, plan_id=scale', async () => {
        await POST(makeReq({ email: 'a@b.test', intent: 'business' }));
        const p = lastInsertParams();
        expect(p[I_INTENT]).toBe('business');
        expect(p[I_RESOLVED]).toBe('scale');
        expect(p[I_PLAN_ID]).toBe('scale');
    });

    it('legacy proof-sprint → intent=proof-sprint, resolved=ai-spend-audit, offer_id=ai_spend_audit', async () => {
        await POST(makeReq({ email: 'a@b.test', intent: 'proof-sprint' }));
        const p = lastInsertParams();
        expect(p[I_INTENT]).toBe('proof-sprint');
        expect(p[I_RESOLVED]).toBe('ai-spend-audit');
        expect(p[I_OFFER_ID]).toBe('ai_spend_audit');
        expect(p[I_PLAN_ID]).toBeNull();
    });
});

describe('POST /api/v1/access-request — unknown / missing intent', () => {
    it('unknown intent persists sanitized raw, resolved=null, plan_id=null, offer_id=null', async () => {
        const res = await POST(makeReq({ email: 'a@b.test', intent: 'totally-not-real' }));
        expect(res.status).toBe(200);
        const p = lastInsertParams();
        expect(p[I_INTENT]).toBe('totally-not-real');
        expect(p[I_RESOLVED]).toBeNull();
        expect(p[I_PLAN_ID]).toBeNull();
        expect(p[I_OFFER_ID]).toBeNull();
    });

    it('missing intent persists all four new fields as null', async () => {
        const res = await POST(makeReq({ email: 'a@b.test' }));
        expect(res.status).toBe(200);
        const p = lastInsertParams();
        expect(p[I_INTENT]).toBeNull();
        expect(p[I_RESOLVED]).toBeNull();
        expect(p[I_PLAN_ID]).toBeNull();
        expect(p[I_OFFER_ID]).toBeNull();
    });

    it('whitespace-only intent persists as null', async () => {
        await POST(makeReq({ email: 'a@b.test', intent: '   ' }));
        const p = lastInsertParams();
        expect(p[I_INTENT]).toBeNull();
        expect(p[I_RESOLVED]).toBeNull();
    });
});

describe('POST /api/v1/access-request — client-supplied plan_id / offer_id are not trusted', () => {
    it('spoofed plan_id is ignored; plan_id derived from intent', async () => {
        await POST(makeReq({
            email: 'a@b.test',
            intent: 'build',
            plan_id: 'enterprise',
        }));
        const p = lastInsertParams();
        expect(p[I_PLAN_ID]).toBe('build');
    });

    it('spoofed offer_id is ignored; offer_id derived from intent', async () => {
        await POST(makeReq({
            email: 'a@b.test',
            intent: 'paid-pilot',
            offer_id: 'regulated_pilot',
        }));
        const p = lastInsertParams();
        expect(p[I_OFFER_ID]).toBe('paid_pilot');
    });

    it('spoofed plan_id with unknown intent does not leak a plan_id', async () => {
        await POST(makeReq({
            email: 'a@b.test',
            intent: 'mystery',
            plan_id: 'enterprise',
            offer_id: 'paid_pilot',
        }));
        const p = lastInsertParams();
        expect(p[I_PLAN_ID]).toBeNull();
        expect(p[I_OFFER_ID]).toBeNull();
    });

    it('spoofed resolved_intent in body is ignored', async () => {
        await POST(makeReq({
            email: 'a@b.test',
            intent: 'developer',
            resolved_intent: 'enterprise',
        }));
        const p = lastInsertParams();
        expect(p[I_RESOLVED]).toBe('build');
    });
});

describe('POST /api/v1/access-request — forbidden content fields are dropped', () => {
    it('prompt / response / messages / raw_trace / request_body / response_body never reach SQL', async () => {
        await POST(makeReq({
            email: 'a@b.test',
            intent: 'build',
            prompt: 'top secret',
            response: 'leak me',
            messages: [{ role: 'user', content: 'leak' }],
            raw_trace: 'leak',
            request_body: 'leak',
            response_body: 'leak',
            stored_content: 'leak',
            completion_text: 'leak',
        }));
        const p = lastInsertParams();
        for (const value of p) {
            if (typeof value !== 'string') continue;
            expect(value.toLowerCase()).not.toContain('leak');
            expect(value.toLowerCase()).not.toContain('secret');
        }
    });
});

describe('POST /api/v1/access-request — existing fields still work', () => {
    it('passes email, company, role, rpd through to the INSERT in the original positions', async () => {
        await POST(makeReq({
            email: 'a@b.test',
            company: 'Acme',
            role: 'CTO',
            rpd: '100',
            intent: 'build',
        }));
        const p = lastInsertParams();
        expect(p[I_EMAIL]).toBe('a@b.test');
        expect(p[I_COMPANY]).toBe('Acme');
        expect(p[I_ROLE]).toBe('CTO');
        expect(p[I_RPD]).toBe('100');
    });

    it('returns 400 on invalid email regardless of intent', async () => {
        const res = await POST(makeReq({ email: 'not-an-email', intent: 'build' }));
        expect(res.status).toBe(400);
        expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('rejects an oversized intent (longer than 80 chars) at the schema layer', async () => {
        const longIntent = 'x'.repeat(81);
        const res = await POST(makeReq({ email: 'a@b.test', intent: longIntent }));
        expect(res.status).toBe(400);
        expect(mockPool.query).not.toHaveBeenCalled();
    });
});

describe('access-request route source-shape — no scope creep', () => {
    const SRC = readFileSync(join(__dirname, 'route.ts'), 'utf-8');

    it('does not import the Stripe SDK', () => {
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

    it('does not enable Build checkout', () => {
        expect(SRC).not.toMatch(/STRIPE_PRICE_ID_BUILD/i);
        expect(SRC).not.toMatch(/BILLING_CHECKOUT_ENABLED/i);
        expect(SRC).not.toMatch(/checkout\.sessions\.create/i);
    });

    it('does not surface Developer or Business legacy SKU prices', () => {
        expect(SRC).not.toMatch(/\$249\b/);
        expect(SRC).not.toMatch(/\$2,500\b/);
    });

    it('does not surface a Proof Sprint public checkout', () => {
        expect(SRC).not.toMatch(/proof_sprint/);
    });

    it('contains no unsupported public claims', () => {
        expect(SRC).not.toMatch(/verified[\s_-]+savings/i);
        expect(SRC).not.toMatch(/guaranteed savings/i);
        expect(SRC).not.toMatch(/auto[\s_-]?apply/i);
        expect(SRC).not.toMatch(/SOC ?2 compliant/i);
        expect(SRC).not.toMatch(/HIPAA compliant/i);
        expect(SRC).not.toMatch(/ISO ?\d+ certified/i);
        expect(SRC).not.toMatch(/runtime enforcement (active|live|enabled)/i);
    });
});
