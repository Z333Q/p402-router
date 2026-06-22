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

// next/navigation `redirect` throws an internal Next error to halt
// execution. We mock it to throw a labeled error so we can assert which
// destination was requested without crashing the test runner.
class TestRedirectError extends Error {
    constructor(public destination: string) {
        super(`[test-redirect] ${destination}`);
    }
}
vi.mock('next/navigation', () => ({
    redirect: vi.fn((dest: string) => {
        throw new TestRedirectError(dest);
    }),
}));

vi.mock('@/lib/analytics/funnel', () => ({
    recordFunnelEvent: vi.fn().mockResolvedValue(undefined),
}));

import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { completeOnboardingAction } from '../onboarding';
import { recordFunnelEvent } from '@/lib/analytics/funnel';

const mockDb = db as unknown as { query: ReturnType<typeof vi.fn> };
const mockGetServerSession = getServerSession as unknown as ReturnType<typeof vi.fn>;
const mockRecordEvent = recordFunnelEvent as unknown as ReturnType<typeof vi.fn>;

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

function fd(entries: Record<string, string>): FormData {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) f.append(k, v);
    return f;
}

async function runExpectingRedirect(formData: FormData): Promise<string> {
    try {
        await completeOnboardingAction(formData);
        throw new Error('expected redirect() to throw');
    } catch (e) {
        if (e instanceof TestRedirectError) return e.destination;
        throw e;
    }
}

beforeEach(() => {
    mockDb.query.mockReset();
    // Default mock simulates a successful UPDATE that hits one row.
    // The 0-row case is exercised explicitly in the stale-JWT tests.
    mockDb.query.mockResolvedValue({ rows: [{ id: TENANT_ID }], rowCount: 1 });
    mockGetServerSession.mockReset();
    mockGetServerSession.mockResolvedValue({ user: { tenantId: TENANT_ID } });
    mockRecordEvent.mockReset();
    mockRecordEvent.mockResolvedValue(undefined);
});

describe('completeOnboardingAction — idempotent onboarded_at set (plan §11.2)', () => {
    it('updates tenants with COALESCE so onboarded_at is set on first call only', async () => {
        await runExpectingRedirect(fd({ goal: 'test_routing' }));
        const call = mockDb.query.mock.calls[0]!;
        const sql = call[0] as string;
        expect(sql).toMatch(/UPDATE\s+tenants/i);
        expect(sql).toMatch(/onboarded_at\s*=\s*COALESCE\s*\(\s*onboarded_at\s*,\s*NOW\(\)\s*\)/i);
        expect(call[1]).toEqual([TENANT_ID]);
    });

    it('does not produce a UPDATE that unconditionally overwrites onboarded_at', async () => {
        await runExpectingRedirect(fd({ goal: 'test_routing' }));
        const sql = mockDb.query.mock.calls[0]![0] as string;
        // The presence of COALESCE is asserted above. Negative case: assert
        // we do not emit a bare `SET onboarded_at = NOW()` without COALESCE.
        expect(sql).not.toMatch(/SET\s+onboarded_at\s*=\s*NOW\(\)\s*,/i);
        expect(sql).not.toMatch(/SET\s+onboarded_at\s*=\s*NOW\(\)\s*WHERE/i);
    });

    it('does NOT reference tenants.updated_at (column missing on production schema)', async () => {
        await runExpectingRedirect(fd({ goal: 'test_routing' }));
        const sql = mockDb.query.mock.calls[0]![0] as string;
        // 42703 "column updated_at of relation tenants does not exist"
        // observed in production 2026-06-23. Until the column is added
        // via migration, the action must not touch updated_at.
        expect(sql).not.toMatch(/updated_at/i);
    });
});

describe('completeOnboardingAction — goal-based redirects', () => {
    it('redirects test_routing -> /dashboard/playground', async () => {
        const dest = await runExpectingRedirect(fd({ goal: 'test_routing' }));
        expect(dest).toBe('/dashboard/playground');
    });

    it('redirects publish_agent -> /dashboard/bazaar/new', async () => {
        const dest = await runExpectingRedirect(fd({ goal: 'publish_agent' }));
        expect(dest).toBe('/dashboard/bazaar/new');
    });

    it('redirects enterprise_trust -> /dashboard/trust', async () => {
        const dest = await runExpectingRedirect(fd({ goal: 'enterprise_trust' }));
        expect(dest).toBe('/dashboard/trust');
    });

    it('falls back to /dashboard for unknown goal', async () => {
        const dest = await runExpectingRedirect(fd({ goal: 'something-else' }));
        expect(dest).toBe('/dashboard');
    });

    it('falls back to /dashboard when no goal is provided', async () => {
        const dest = await runExpectingRedirect(fd({}));
        expect(dest).toBe('/dashboard');
    });
});

describe('completeOnboardingAction — auth gate', () => {
    it('redirects to /login when session has no tenantId', async () => {
        mockGetServerSession.mockResolvedValueOnce({ user: { email: 'a@b.test' } });
        const dest = await runExpectingRedirect(fd({ goal: 'test_routing' }));
        expect(dest).toBe('/login');
        expect(mockDb.query).not.toHaveBeenCalled();
    });
});

describe('completeOnboardingAction — funnel emit', () => {
    it('emits funnel.onboarding_completed with tenantId and goal', async () => {
        await runExpectingRedirect(fd({ goal: 'test_routing' }));
        expect(mockRecordEvent).toHaveBeenCalled();
        const arg = mockRecordEvent.mock.calls[0]![0] as Record<string, unknown>;
        expect(arg.eventName).toBe('funnel.onboarding_completed');
        expect(arg.tenantId).toBe(TENANT_ID);
        expect(arg.properties).toEqual({ goal: 'test_routing' });
    });

    it('emits empty properties when no goal is supplied', async () => {
        await runExpectingRedirect(fd({}));
        const arg = mockRecordEvent.mock.calls[0]![0] as Record<string, unknown>;
        expect(arg.properties).toEqual({});
    });

    it('falls back to /login when the DB update throws (stale-JWT / column-missing defense)', async () => {
        mockDb.query.mockRejectedValueOnce(new Error('connection refused'));
        const dest = await runExpectingRedirect(fd({ goal: 'test_routing' }));
        // Defensive: the action used to redirect to /dashboard even on
        // UPDATE failure, which trapped users in the onboarding gate
        // loop when their JWT pointed at a missing tenant row. The
        // post-fix behavior is to send them to /login so the signIn
        // callback can re-provision the tenant and refresh the JWT.
        expect(dest).toBe('/login');
    });
});

describe('completeOnboardingAction — stale-JWT defense (3AZ-2 followup hotfix)', () => {
    it('redirects to /login when UPDATE matches 0 rows (tenant row missing for this tenantId)', async () => {
        mockDb.query.mockReset();
        mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const dest = await runExpectingRedirect(fd({ goal: 'test_routing' }));
        expect(dest).toBe('/login');
    });

    it('redirects to /login when UPDATE rowCount is undefined (defensive treat-as-zero)', async () => {
        mockDb.query.mockReset();
        mockDb.query.mockResolvedValueOnce({ rows: [] });  // no rowCount property
        const dest = await runExpectingRedirect(fd({ goal: 'test_routing' }));
        expect(dest).toBe('/login');
    });

    it('does NOT redirect to /login when UPDATE rowCount is 1 (normal happy path)', async () => {
        mockDb.query.mockReset();
        mockDb.query.mockResolvedValueOnce({ rows: [{ id: TENANT_ID }], rowCount: 1 });
        const dest = await runExpectingRedirect(fd({ goal: 'test_routing' }));
        expect(dest).toBe('/dashboard/playground');
    });

    it('uses RETURNING id so we can detect 0-row UPDATEs in the new defense', async () => {
        await runExpectingRedirect(fd({ goal: 'test_routing' }));
        const sql = mockDb.query.mock.calls[0]![0] as string;
        expect(sql).toMatch(/RETURNING\s+id/i);
    });

    it('does NOT fire funnel.onboarding_completed when UPDATE matches 0 rows', async () => {
        mockDb.query.mockReset();
        mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        await runExpectingRedirect(fd({ goal: 'test_routing' }));
        // Funnel emit lives inside the same try{} as the UPDATE; the
        // emit only runs after a successful rowCount > 0. A 0-row case
        // should not count as a completed onboarding for analytics.
        expect(mockRecordEvent).not.toHaveBeenCalled();
    });
});
