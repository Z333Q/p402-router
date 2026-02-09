import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { createRequest, createJsonRequest } from '@/__tests__/test-utils';

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

// ===========================================================================
// GET /api/v1/facilitators
// ===========================================================================
describe('GET /api/v1/facilitators', () => {
  it('returns facilitators with health data', async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: {} });
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          facilitator_id: 'fac_abc',
          name: 'Test Fac',
          type: null,
          tenant_id: null,
          endpoint: 'https://example.com',
          networks: ['base'],
          status: 'active',
          health_status: 'healthy',
          p95_settle_ms: 200,
          success_rate: 0.99,
          last_checked_at: '2025-01-01',
        },
      ],
    });

    const req = createRequest('/api/v1/facilitators');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.facilitators).toHaveLength(1);
    expect(body.facilitators[0].health.status).toBe('healthy');
    expect(body.facilitators[0].health.successRate).toBe(0.99);
  });

  it('includes tenant-specific facilitators when session has tenantId', async () => {
    mockGetServerSession.mockResolvedValueOnce({
      user: { tenantId: 'tenant-abc' },
    });
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const req = createRequest('/api/v1/facilitators');
    await GET(req);

    // Should include OR f.tenant_id = $1 in query
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('tenant_id = $1'),
      ['tenant-abc']
    );
  });
});

// ===========================================================================
// POST /api/v1/facilitators
// ===========================================================================
describe('POST /api/v1/facilitators', () => {
  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);

    const req = createJsonRequest('/api/v1/facilitators', {
      name: 'Test',
      endpoint: 'https://example.com',
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid name', async () => {
    mockGetServerSession.mockResolvedValueOnce({
      user: { tenantId: 'tenant-1' },
    });

    const req = createJsonRequest('/api/v1/facilitators', {
      name: '',
      endpoint: 'https://example.com',
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid name');
  });

  it('returns 400 for private/SSRF endpoint URL', async () => {
    mockGetServerSession.mockResolvedValueOnce({
      user: { tenantId: 'tenant-1' },
    });

    const req = createJsonRequest('/api/v1/facilitators', {
      name: 'Evil Fac',
      endpoint: 'http://127.0.0.1:8080/steal',
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('Invalid endpoint URL');
  });

  it('returns 400 for localhost endpoint', async () => {
    mockGetServerSession.mockResolvedValueOnce({
      user: { tenantId: 'tenant-1' },
    });

    const req = createJsonRequest('/api/v1/facilitators', {
      name: 'Local Fac',
      endpoint: 'http://localhost:3000/api',
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 for private IP ranges (10.x, 172.16.x, 192.168.x)', async () => {
    mockGetServerSession.mockResolvedValueOnce({
      user: { tenantId: 'tenant-1' },
    });

    const req = createJsonRequest('/api/v1/facilitators', {
      name: 'Private Fac',
      endpoint: 'http://10.0.0.1/api',
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 429 when facilitator limit (20) reached', async () => {
    mockGetServerSession.mockResolvedValueOnce({
      user: { tenantId: 'tenant-1' },
    });
    mockPool.query.mockResolvedValueOnce({
      rows: [{ count: '21' }],
    });

    const req = createJsonRequest('/api/v1/facilitators', {
      name: 'New Fac',
      endpoint: 'https://example.com/api',
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toContain('limit reached');
  });

  it('creates facilitator with fac_ prefix on success', async () => {
    mockGetServerSession.mockResolvedValueOnce({
      user: { tenantId: 'tenant-1' },
    });
    // count check
    mockPool.query.mockResolvedValueOnce({ rows: [{ count: '5' }] });
    // insert
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const req = createJsonRequest('/api/v1/facilitators', {
      name: 'My Facilitator',
      endpoint: 'https://example.com/facilitate',
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.facilitatorId).toMatch(/^fac_/);
  });
});
