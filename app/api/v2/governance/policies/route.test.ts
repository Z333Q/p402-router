import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { createRequest, createJsonRequest, mockDbQuery } from '@/__tests__/test-utils';

vi.mock('@/lib/db', () => ({
  default: { query: vi.fn(), getPool: vi.fn(), end: vi.fn() },
}));

import pool from '@/lib/db';

const mockPool = pool as unknown as { query: ReturnType<typeof vi.fn> };

beforeEach(() => {
  mockPool.query.mockReset();
});

// ===========================================================================
// GET /api/v2/governance/policies
// ===========================================================================
describe('GET /api/v2/governance/policies', () => {
  it('returns policy list', async () => {
    // tenant resolution
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    // policies query
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          policy_id: 'pol_abc',
          name: 'Default',
          rules: {},
          status: 'active',
          version: '1.0.0',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        },
      ],
    });

    const req = createRequest('/api/v2/governance/policies');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.object).toBe('list');
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('pol_abc');
  });

  it('resolves tenant from header', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const req = createRequest('/api/v2/governance/policies', {
      headers: { 'x-p402-tenant': 'my-tenant' },
    });
    await GET(req);

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.any(String),
      ['my-tenant']
    );
  });

  it('returns 500 on error', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('fail'));

    const req = createRequest('/api/v2/governance/policies', {
      headers: { 'x-p402-tenant': 'tenant-1' },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.type).toBe('internal_error');
  });
});

// ===========================================================================
// POST /api/v2/governance/policies
// ===========================================================================
describe('POST /api/v2/governance/policies', () => {
  it('creates a policy and returns 201', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          policy_id: 'pol_new123',
          name: 'Cost Guard',
          rules: '{}',
          status: 'active',
          version: '1.0.0',
          created_at: '2025-01-01',
        },
      ],
    });

    const req = createJsonRequest('/api/v2/governance/policies', {
      name: 'Cost Guard',
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.object).toBe('policy');
    expect(body.id).toMatch(/^pol_/);
  });

  it('returns 400 for missing name', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });

    const req = createJsonRequest('/api/v2/governance/policies', {});
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('MISSING_NAME');
  });

  it('returns 500 on DB error', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockRejectedValueOnce(new Error('insert failed'));

    const req = createJsonRequest('/api/v2/governance/policies', {
      name: 'Test Policy',
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.type).toBe('internal_error');
  });
});
