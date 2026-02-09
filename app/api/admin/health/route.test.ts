import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { createRequest } from '@/__tests__/test-utils';

vi.mock('@/lib/db', () => ({
  default: { query: vi.fn(), getPool: vi.fn(), end: vi.fn() },
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

import pool from '@/lib/db';
import { getServerSession } from 'next-auth';

const mockPool = pool as unknown as { query: ReturnType<typeof vi.fn> };
const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockPool.query.mockReset();
  mockGetServerSession.mockReset();
});

describe('GET /api/admin/health', () => {
  it('returns 401 for non-admin users', async () => {
    mockGetServerSession.mockResolvedValueOnce({
      user: { isAdmin: false },
    });

    const req = createRequest('/api/admin/health');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);

    const req = createRequest('/api/admin/health');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('returns facilitator health data for admin users', async () => {
    mockGetServerSession.mockResolvedValueOnce({
      user: { isAdmin: true },
    });
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          facilitator_id: 'fac_abc',
          name: 'Test Fac',
          endpoint: 'https://example.com',
          type: 'Global',
          config_status: 'active',
          health_status: 'healthy',
          p95_verify_ms: 100,
          last_checked_at: '2025-01-01',
          tenant_name: null,
        },
      ],
    });

    const req = createRequest('/api/admin/health');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.facilitators).toHaveLength(1);
    expect(body.facilitators[0].facilitator_id).toBe('fac_abc');
  });

  it('returns 500 on DB error', async () => {
    mockGetServerSession.mockResolvedValueOnce({
      user: { isAdmin: true },
    });
    mockPool.query.mockRejectedValueOnce(new Error('DB down'));

    const req = createRequest('/api/admin/health');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('DB down');
  });
});
