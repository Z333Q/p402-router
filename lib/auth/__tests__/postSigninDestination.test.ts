import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn(), getPool: vi.fn(), end: vi.fn() },
}));

import db from '@/lib/db';
import { getPostSigninDestination } from '../postSigninDestination';

const mockDb = db as unknown as { query: ReturnType<typeof vi.fn> };

beforeEach(() => {
    mockDb.query.mockReset();
});

describe('getPostSigninDestination — missing tenantId', () => {
    it('routes null tenantId to /onboarding', async () => {
        const dest = await getPostSigninDestination(null);
        expect(dest).toBe('/onboarding');
        expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('routes undefined tenantId to /onboarding', async () => {
        const dest = await getPostSigninDestination(undefined);
        expect(dest).toBe('/onboarding');
        expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('routes empty-string tenantId to /onboarding', async () => {
        const dest = await getPostSigninDestination('');
        expect(dest).toBe('/onboarding');
        expect(mockDb.query).not.toHaveBeenCalled();
    });
});

describe('getPostSigninDestination — DB rows', () => {
    it('returns /onboarding when the tenant row does not exist', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [] });
        const dest = await getPostSigninDestination('11111111-1111-1111-1111-111111111111');
        expect(dest).toBe('/onboarding');
    });

    it('returns /onboarding when onboarded_at is NULL', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [{ onboarded_at: null }] });
        const dest = await getPostSigninDestination('11111111-1111-1111-1111-111111111111');
        expect(dest).toBe('/onboarding');
    });

    it('returns /dashboard when onboarded_at is a Date', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [{ onboarded_at: new Date() }] });
        const dest = await getPostSigninDestination('11111111-1111-1111-1111-111111111111');
        expect(dest).toBe('/dashboard');
    });

    it('returns /dashboard when onboarded_at is an ISO string', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [{ onboarded_at: '2026-06-22T00:00:00.000Z' }] });
        const dest = await getPostSigninDestination('11111111-1111-1111-1111-111111111111');
        expect(dest).toBe('/dashboard');
    });

    it('queries tenants by id with the expected SQL', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [{ onboarded_at: null }] });
        await getPostSigninDestination('11111111-1111-1111-1111-111111111111');
        const call = mockDb.query.mock.calls[0]!;
        expect(call[0]).toMatch(/SELECT\s+onboarded_at\s+FROM\s+tenants\s+WHERE\s+id\s*=\s*\$1/i);
        expect(call[1]).toEqual(['11111111-1111-1111-1111-111111111111']);
    });
});

describe('getPostSigninDestination — fail-open semantics (plan §10.3)', () => {
    it('returns /dashboard on db.query rejection', async () => {
        mockDb.query.mockRejectedValueOnce(new Error('connection refused'));
        const dest = await getPostSigninDestination('11111111-1111-1111-1111-111111111111');
        expect(dest).toBe('/dashboard');
    });

    it('returns /dashboard when the query throws synchronously', async () => {
        mockDb.query.mockImplementationOnce(() => {
            throw new Error('boom');
        });
        const dest = await getPostSigninDestination('11111111-1111-1111-1111-111111111111');
        expect(dest).toBe('/dashboard');
    });
});
