/**
 * 3AZ-3 — admin funnel rollup contract tests.
 *
 * Pins:
 *   1. Admin-only via requireAdminAccess('analytics.read').
 *   2. Stages aggregated into the 8-row V5 progression with totals,
 *      uniques, and from_prev_pct transition rates.
 *   3. Response carries Cache-Control: no-store so the operator sees
 *      fresh numbers on each load.
 *   4. Fails OPEN with zeroed stages + degraded: true on DB error.
 *   5. days param is clamped to [1, 90].
 *   6. SQL queries do NOT carry any tenant id / email / anonymous id
 *      in the response.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { dbQuery, requireAdminAccess, AdminAuthError } = vi.hoisted(() => {
    class AdminAuthError extends Error {
        constructor(message: string) {
            super(message);
            this.name = 'AdminAuthError';
        }
    }
    return {
        dbQuery: vi.fn(),
        requireAdminAccess: vi.fn(),
        AdminAuthError,
    };
});

vi.mock('@/lib/db', () => ({
    default: { query: dbQuery },
}));

vi.mock('@/lib/admin/auth', () => ({
    requireAdminAccess,
    AdminAuthError,
}));

import { NextRequest } from 'next/server';
import { GET } from './route';

function makeReq(url: string = 'http://localhost/api/admin/funnel/rollup'): NextRequest {
    return new NextRequest(url);
}

beforeEach(() => {
    dbQuery.mockReset();
    requireAdminAccess.mockReset();
    requireAdminAccess.mockResolvedValue(undefined);
});

describe('GET /api/admin/funnel/rollup — auth gate', () => {
    it('returns 401 when requireAdminAccess throws AdminAuthError', async () => {
        requireAdminAccess.mockRejectedValueOnce(new AdminAuthError('not admin'));
        const res = await GET(makeReq());
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe('Unauthorized');
        expect(dbQuery).not.toHaveBeenCalled();
    });

    it('requires the analytics.read permission', async () => {
        await GET(makeReq());
        expect(requireAdminAccess).toHaveBeenCalledWith('analytics.read');
    });

    it('re-throws unexpected (non-AdminAuthError) errors', async () => {
        requireAdminAccess.mockRejectedValueOnce(new Error('something else'));
        await expect(GET(makeReq())).rejects.toThrow('something else');
    });
});

describe('GET /api/admin/funnel/rollup — stage aggregation', () => {
    beforeEach(() => {
        // Stage rollup query + error count query
        dbQuery.mockImplementation((sql: string) => {
            if (sql.includes("'funnel.error'")) {
                return Promise.resolve({ rows: [{ total: '7' }] });
            }
            return Promise.resolve({
                rows: [
                    { event_name: 'funnel.login_view',           total: '200', uniques: '120' },
                    { event_name: 'funnel.signin_started',       total: '160', uniques: '100' },
                    { event_name: 'funnel.signin_success',       total: '155', uniques: '95'  },
                    { event_name: 'funnel.onboarding_view',      total: '150', uniques: '90'  },
                    { event_name: 'funnel.api_key_issued',       total: '120', uniques: '80'  },
                    { event_name: 'funnel.onboarding_completed', total: '100', uniques: '70'  },
                    { event_name: 'funnel.dashboard_view',       total: '99',  uniques: '69'  },
                    { event_name: 'funnel.dashboard_meaningful', total: '60',  uniques: '42'  },
                ],
            });
        });
    });

    it('returns 8 stages in canonical order', async () => {
        const res = await GET(makeReq());
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.stages).toHaveLength(8);
        expect(body.stages.map((s: { event: string }) => s.event)).toEqual([
            'funnel.login_view',
            'funnel.signin_started',
            'funnel.signin_success',
            'funnel.onboarding_view',
            'funnel.api_key_issued',
            'funnel.onboarding_completed',
            'funnel.dashboard_view',
            'funnel.dashboard_meaningful',
        ]);
    });

    it('first stage has from_prev_pct === null (no predecessor)', async () => {
        const body = await (await GET(makeReq())).json();
        expect(body.stages[0].from_prev_pct).toBeNull();
    });

    it('computes from_prev_pct from unique counts (not raw totals)', async () => {
        const body = await (await GET(makeReq())).json();
        // S1: 100 / 120 = 83.3%
        expect(body.stages[1].from_prev_pct).toBeCloseTo(83.3, 1);
        // S8: 42 / 69 = 60.9%
        expect(body.stages[7].from_prev_pct).toBeCloseTo(60.9, 1);
    });

    it('parses total + uniques as integers', async () => {
        const body = await (await GET(makeReq())).json();
        expect(body.stages[0].total).toBe(200);
        expect(body.stages[0].uniques).toBe(120);
    });

    it('reports funnel.error count separately so it does not pollute conversion math', async () => {
        const body = await (await GET(makeReq())).json();
        expect(body.errors.total).toBe(7);
    });

    it('queries funnel_events with the canonical stage list and a since timestamp', async () => {
        await GET(makeReq());
        const stageCall = dbQuery.mock.calls.find((c) =>
            (c[0] as string).includes('GROUP BY event_name')
        );
        expect(stageCall).toBeDefined();
        const params = stageCall![1] as unknown[];
        const eventNames = params[0] as string[];
        expect(eventNames).toContain('funnel.login_view');
        expect(eventNames).toContain('funnel.dashboard_meaningful');
        // since must be an ISO string
        expect(typeof params[1]).toBe('string');
        expect(params[1]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
});

describe('GET /api/admin/funnel/rollup — handles missing stages gracefully', () => {
    it('treats absent event_name rows as zero', async () => {
        // DB returns only S0 + S7 — middle stages missing
        dbQuery.mockImplementation((sql: string) => {
            if (sql.includes("'funnel.error'")) {
                return Promise.resolve({ rows: [{ total: '0' }] });
            }
            return Promise.resolve({
                rows: [
                    { event_name: 'funnel.login_view',     total: '50', uniques: '40' },
                    { event_name: 'funnel.dashboard_view', total: '10', uniques: '8'  },
                ],
            });
        });
        const body = await (await GET(makeReq())).json();
        const map = Object.fromEntries(body.stages.map((s: { event: string; total: number; uniques: number }) => [s.event, s]));
        expect(map['funnel.login_view'].total).toBe(50);
        expect(map['funnel.signin_started'].total).toBe(0);
        expect(map['funnel.signin_started'].uniques).toBe(0);
        expect(map['funnel.dashboard_view'].total).toBe(10);
    });

    it('from_prev_pct returns null when predecessor has 0 uniques (avoid div-by-zero)', async () => {
        dbQuery.mockImplementation(() =>
            Promise.resolve({
                rows: [
                    { event_name: 'funnel.signin_started', total: '5', uniques: '3' },
                ],
            })
        );
        const body = await (await GET(makeReq())).json();
        expect(body.stages[0].from_prev_pct).toBeNull();
        expect(body.stages[1].from_prev_pct).toBeNull();
    });
});

describe('GET /api/admin/funnel/rollup — window param', () => {
    beforeEach(() => {
        dbQuery.mockResolvedValue({ rows: [] });
    });

    it('defaults to days=30 when no param', async () => {
        const body = await (await GET(makeReq())).json();
        expect(body.window_days).toBe(30);
    });

    it('clamps days above 90 down to 90', async () => {
        const body = await (await GET(makeReq('http://localhost/?days=365'))).json();
        expect(body.window_days).toBe(90);
    });

    it('clamps days <= 0 to default 30', async () => {
        const body0 = await (await GET(makeReq('http://localhost/?days=0'))).json();
        const bodyNeg = await (await GET(makeReq('http://localhost/?days=-7'))).json();
        expect(body0.window_days).toBe(30);
        expect(bodyNeg.window_days).toBe(30);
    });

    it('accepts a small days value verbatim', async () => {
        const body = await (await GET(makeReq('http://localhost/?days=7'))).json();
        expect(body.window_days).toBe(7);
    });

    it('falls back to 30 for non-numeric days', async () => {
        const body = await (await GET(makeReq('http://localhost/?days=abc'))).json();
        expect(body.window_days).toBe(30);
    });
});

describe('GET /api/admin/funnel/rollup — fail open + cache headers', () => {
    it('sets Cache-Control: no-store so the operator sees fresh data', async () => {
        dbQuery.mockResolvedValue({ rows: [] });
        const res = await GET(makeReq());
        expect(res.headers.get('Cache-Control')).toMatch(/no-store/i);
        expect(res.headers.get('Pragma')).toBe('no-cache');
    });

    it('returns zeroed stages with degraded: true when the DB throws', async () => {
        dbQuery.mockRejectedValue(new Error('connection refused'));
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const res = await GET(makeReq());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.degraded).toBe(true);
        expect(body.stages).toHaveLength(8);
        for (const s of body.stages) {
            expect(s.total).toBe(0);
            expect(s.uniques).toBe(0);
        }
        expect(body.errors.total).toBe(0);
        warnSpy.mockRestore();
    });
});

describe('GET /api/admin/funnel/rollup — privacy', () => {
    it('response carries no tenant_id / email / anonymous_id / session_id', async () => {
        dbQuery.mockImplementation((sql: string) => {
            if (sql.includes("'funnel.error'")) {
                return Promise.resolve({ rows: [{ total: '0' }] });
            }
            return Promise.resolve({
                rows: [{ event_name: 'funnel.login_view', total: '1', uniques: '1' }],
            });
        });
        const res = await GET(makeReq());
        const text = await res.text();
        for (const forbidden of ['tenant_id', 'tenantId', 'email', 'anonymous_id', 'session_id', 'user_agent_hash', 'ip_class']) {
            expect(text, `${forbidden} must not appear in funnel rollup response`).not.toContain(forbidden);
        }
    });

    it('SQL never SELECTs tenant_id / anonymous_id / session_id as separate columns', async () => {
        dbQuery.mockResolvedValue({ rows: [] });
        await GET(makeReq());
        for (const call of dbQuery.mock.calls) {
            const sql = call[0] as string;
            // tenant_id may appear inside COALESCE for COUNT(DISTINCT), but
            // never as a bare SELECT projection.
            expect(sql).not.toMatch(/^\s*SELECT[\s\S]*?\btenant_id\b\s*(,|FROM)/im);
            expect(sql).not.toMatch(/SELECT\s+tenant_id\b/i);
        }
    });
});
