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
    mockDb.query.mockResolvedValue({ rows: [] });
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
        expect(sql).toMatch(/updated_at\s*=\s*NOW\(\)/i);
        expect(call[1]).toEqual([TENANT_ID]);
    });

    it('does not produce a UPDATE that unconditionally overwrites onboarded_at', async () => {
        await runExpectingRedirect(fd({ goal: 'test_routing' }));
        const sql = mockDb.query.mock.calls[0]![0] as string;
        // The presence of COALESCE is asserted above. Negative case: assert
        // we do not emit a bare `SET onboarded_at = NOW()` without COALESCE.
        expect(sql).not.toMatch(/SET\s+onboarded_at\s*=\s*NOW\(\)\s*,/i);
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

    it('continues to redirect even when the DB update throws', async () => {
        mockDb.query.mockRejectedValueOnce(new Error('connection refused'));
        const dest = await runExpectingRedirect(fd({ goal: 'test_routing' }));
        expect(dest).toBe('/dashboard/playground');
    });
});
