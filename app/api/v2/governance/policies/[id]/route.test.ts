import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from './route';
import { createRequest, createJsonRequest, mockDbQuery } from '@/__tests__/test-utils';

vi.mock('@/lib/db', () => ({
  default: { query: vi.fn(), getPool: vi.fn(), end: vi.fn() },
}));

import pool from '@/lib/db';

const mockPool = pool as unknown as { query: ReturnType<typeof vi.fn> };

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  mockPool.query.mockReset();
});

// ===========================================================================
// GET /api/v2/governance/policies/[id]
// ===========================================================================
describe('GET /api/v2/governance/policies/[id]', () => {
  it('returns a policy', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
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
      rowCount: 1,
    });

    const req = createRequest('/api/v2/governance/policies/pol_abc');
    const res = await GET(req, makeParams('pol_abc'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.object).toBe('policy');
    expect(body.id).toBe('pol_abc');
    expect(body.name).toBe('Default');
  });

  it('returns 404 for missing policy', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const req = createRequest('/api/v2/governance/policies/pol_missing');
    const res = await GET(req, makeParams('pol_missing'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.type).toBe('not_found');
  });
});

// ===========================================================================
// PATCH /api/v2/governance/policies/[id]
// ===========================================================================
describe('PATCH /api/v2/governance/policies/[id]', () => {
  it('updates name, rules, status, and version', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          policy_id: 'pol_abc',
          name: 'Updated Name',
          rules: '{"max": 100}',
          status: 'active',
          version: '2.0.0',
        },
      ],
      rowCount: 1,
    });

    const req = createJsonRequest(
      '/api/v2/governance/policies/pol_abc',
      { name: 'Updated Name', rules: { max: 100 }, version: '2.0.0' },
      { method: 'PATCH' }
    );
    const res = await PATCH(req, makeParams('pol_abc'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.updated).toBe(true);
    expect(body.name).toBe('Updated Name');
  });

  it('returns 404 for missing policy', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const req = createJsonRequest(
      '/api/v2/governance/policies/pol_missing',
      { name: 'X' },
      { method: 'PATCH' }
    );
    const res = await PATCH(req, makeParams('pol_missing'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.type).toBe('not_found');
  });
});

// ===========================================================================
// DELETE /api/v2/governance/policies/[id]
// ===========================================================================
describe('DELETE /api/v2/governance/policies/[id]', () => {
  it('soft-deletes (status=revoked)', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockResolvedValueOnce({
      rows: [{ policy_id: 'pol_abc', status: 'revoked' }],
      rowCount: 1,
    });

    const req = createRequest('/api/v2/governance/policies/pol_abc', {
      method: 'DELETE',
    });
    const res = await DELETE(req, makeParams('pol_abc'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('revoked');
    expect(body.deleted).toBe(true);
  });

  it('returns 404 for missing policy', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const req = createRequest('/api/v2/governance/policies/pol_missing', {
      method: 'DELETE',
    });
    const res = await DELETE(req, makeParams('pol_missing'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.type).toBe('not_found');
  });
});
