/**
 * Slice 3AA-Impl — route test for GET /api/v2/control/shadow-decisions.
 *
 * Pins:
 *   - 401 JSON when unauthenticated
 *   - migration_pending=true tolerated (200, not 500)
 *   - all DB queries carry the resolved tenant id as $1
 *   - response shape contains byAxis / byCode / topGaps / recent
 *   - no Optimize / savings / recommendation copy in route source
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

import { GET } from '@/app/api/v2/control/shadow-decisions/route';
import * as auth from '@/lib/auth';
import db from '@/lib/db';

const TENANT = '33333333-3333-3333-3333-333333333333';

let querySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    querySpy = vi.spyOn(db as unknown as { query: (...args: unknown[]) => unknown }, 'query');
});

afterEach(() => {
    querySpy.mockReset();
    vi.restoreAllMocks();
});

describe('GET /api/v2/control/shadow-decisions', () => {
    it('returns 401 JSON when requireTenantAccess errors', async () => {
        vi.mocked(auth.requireTenantAccess).mockResolvedValueOnce({
            error: 'Unauthorized: Missing or invalid tenant context',
            status: 401,
        });
        const res = await GET(new NextRequest('http://localhost/api/v2/control/shadow-decisions'));
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body).toHaveProperty('error');
    });

    it('returns 200 with migration_pending=true when the table is missing', async () => {
        vi.mocked(auth.requireTenantAccess).mockResolvedValueOnce({ tenantId: TENANT });
        querySpy.mockImplementation(async () => {
            const err = new Error('relation "runtime_control_shadow_decisions" does not exist') as Error & { code?: string };
            err.code = '42P01';
            throw err;
        });
        const res = await GET(new NextRequest('http://localhost/api/v2/control/shadow-decisions', {
            headers: { 'x-p402-tenant': TENANT },
        }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.migration_pending).toBe(true);
        expect(body.byAxis).toEqual([]);
        expect(body.byCode).toEqual([]);
        expect(body.topGaps).toEqual([]);
        expect(body.recent).toEqual([]);
        expect(body).toHaveProperty('window');
    });

    it('forwards tenantId as $1 to every query', async () => {
        vi.mocked(auth.requireTenantAccess).mockResolvedValueOnce({ tenantId: TENANT });
        querySpy.mockImplementation(async () => ({ rows: [] }));
        const res = await GET(new NextRequest('http://localhost/api/v2/control/shadow-decisions', {
            headers: { 'x-p402-tenant': TENANT },
        }));
        expect(res.status).toBe(200);
        const calls = (querySpy as unknown as { mock: { calls: Array<[string, unknown[]]> } }).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        for (const [text, params] of calls) {
            expect(text).toMatch(/WHERE tenant_id = \$1/);
            expect(params[0]).toBe(TENANT);
        }
    });

    it('returns a well-shaped summary when the table is present', async () => {
        vi.mocked(auth.requireTenantAccess).mockResolvedValueOnce({ tenantId: TENANT });
        querySpy.mockImplementation(async (text: string) => {
            if (text.includes('GROUP BY axis, hour')) {
                return { rows: [{ axis: 'allowed_models', hour: new Date('2026-06-15T10:00:00Z'), n: 2 }] };
            }
            if (text.includes('GROUP BY code')) {
                return { rows: [{ code: 'MODEL_NOT_ALLOWED', n: 2 }] };
            }
            if (text.includes('ratio')) {
                return { rows: [] };
            }
            // recent
            return { rows: [{
                emitted_at: new Date('2026-06-15T10:01:00Z'),
                axis: 'allowed_models',
                code: 'MODEL_NOT_ALLOWED',
                configured_value: ['openai/gpt-4o'],
                observed_value: 'deepseek/deepseek-chat',
                model_requested: 'deepseek/deepseek-chat',
                request_id: 'r1',
            }] };
        });
        const res = await GET(new NextRequest('http://localhost/api/v2/control/shadow-decisions', {
            headers: { 'x-p402-tenant': TENANT },
        }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.migration_pending).toBe(false);
        expect(body.byCode[0].code).toBe('MODEL_NOT_ALLOWED');
        expect(body.recent.length).toBe(1);
    });
});

describe('route source shape', () => {
    const SRC = readFileSync(
        resolvePath(process.cwd(), 'app/api/v2/control/shadow-decisions/route.ts'),
        'utf8',
    );
    it('does not reference p402:tcs:enforce', () => {
        expect(SRC).not.toMatch(/p402:tcs:enforce/);
    });
    it('does not contain Optimize / savings / recommendation copy', () => {
        for (const banned of ['optimize', 'savings', 'recommendation', 'auto-apply', 'savings_proof']) {
            expect(SRC.toLowerCase()).not.toContain(banned.toLowerCase());
        }
    });
});
