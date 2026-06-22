import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn(), getPool: vi.fn(), end: vi.fn() },
}));

vi.mock('next-auth', () => ({
    getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
    authOptions: {},
}));

import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { GET } from './route';

const mockDb = db as unknown as { query: ReturnType<typeof vi.fn> };
const mockGetServerSession = getServerSession as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    mockDb.query.mockReset();
    mockGetServerSession.mockReset();
});

describe('GET /api/v1/onboarding/state — unauthenticated', () => {
    it('returns onboarded:true when no session exists (fail-open: layout handles login redirect)', async () => {
        mockGetServerSession.mockResolvedValueOnce(null);
        const res = await GET();
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toEqual({ onboarded: true });
        expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('returns onboarded:true when session has no tenantId', async () => {
        mockGetServerSession.mockResolvedValueOnce({ user: { email: 'a@b.test' } });
        const res = await GET();
        const body = await res.json();
        expect(body).toEqual({ onboarded: true });
        expect(mockDb.query).not.toHaveBeenCalled();
    });
});

describe('GET /api/v1/onboarding/state — authenticated', () => {
    const tenantId = '11111111-1111-1111-1111-111111111111';

    beforeEach(() => {
        mockGetServerSession.mockResolvedValue({
            user: { email: 'a@b.test', tenantId },
        });
    });

    it('returns onboarded:false when onboarded_at IS NULL', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [{ onboarded_at: null }] });
        const res = await GET();
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toEqual({ onboarded: false });
    });

    it('returns onboarded:true when onboarded_at IS NOT NULL', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [{ onboarded_at: new Date() }] });
        const res = await GET();
        const body = await res.json();
        expect(body).toEqual({ onboarded: true });
    });

    it('returns onboarded:false when the tenant row is missing', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [] });
        const res = await GET();
        const body = await res.json();
        expect(body).toEqual({ onboarded: false });
    });

    it('queries by tenant id with the expected SQL', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [{ onboarded_at: null }] });
        await GET();
        const call = mockDb.query.mock.calls[0]!;
        expect(call[0]).toMatch(/SELECT\s+onboarded_at\s+FROM\s+tenants\s+WHERE\s+id\s*=\s*\$1/i);
        expect(call[1]).toEqual([tenantId]);
    });
});

describe('GET /api/v1/onboarding/state — fail-open semantics', () => {
    it('returns onboarded:true on DB rejection (plan §10.3)', async () => {
        mockGetServerSession.mockResolvedValueOnce({
            user: { tenantId: '11111111-1111-1111-1111-111111111111' },
        });
        mockDb.query.mockRejectedValueOnce(new Error('connection refused'));
        const res = await GET();
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toEqual({ onboarded: true });
    });

    it('returns onboarded:true if getServerSession throws', async () => {
        mockGetServerSession.mockRejectedValueOnce(new Error('boom'));
        const res = await GET();
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toEqual({ onboarded: true });
    });
});
