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
// GET /api/v2/sessions
// ===========================================================================
describe('GET /api/v2/sessions', () => {
  it('returns a list of sessions', async () => {
    // 1st call: tenant resolution
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    // 2nd call: session list
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          session_token: 'sess_abc',
          tenant_id: 'tenant-1',
          agent_id: 'agent-1',
          wallet_address: '0x123',
          budget_total_usd: '100.00',
          budget_spent_usd: '10.00',
          budget_remaining: '90.00',
          policies: {},
          status: 'active',
          created_at: '2025-01-01',
          expires_at: '2025-01-02',
        },
      ],
    });

    const req = createRequest('/api/v2/sessions');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.object).toBe('list');
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('sess_abc');
    expect(body.data[0].budget.total_usd).toBe(100);
  });

  it('resolves tenant from x-p402-tenant header', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const req = createRequest('/api/v2/sessions', {
      headers: { 'x-p402-tenant': 'my-tenant-uuid' },
    });
    await GET(req);

    // Should NOT call tenant resolution query when header is a real UUID
    // The first query call should be the session list with the provided tenant
    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });

  it('falls back to default tenant when header is "default"', async () => {
    mockDbQuery(mockPool, { rows: [] }); // tenant resolution
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // session list

    const req = createRequest('/api/v2/sessions', {
      headers: { 'x-p402-tenant': 'default' },
    });
    await GET(req);

    // Should call tenant resolution as first query
    expect(mockPool.query).toHaveBeenCalledTimes(2);
  });

  it('filters by status param', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const req = createRequest('/api/v2/sessions?status=ended', {
      headers: { 'x-p402-tenant': 'tenant-1' },
    });
    await GET(req);

    // Check the second arg passed to the query
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.any(String),
      ['tenant-1', 'ended']
    );
  });

  it('returns empty list on error', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('fail'));

    const req = createRequest('/api/v2/sessions', {
      headers: { 'x-p402-tenant': 'tenant-1' },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(body.object).toBe('list');
    expect(body.data).toEqual([]);
  });
});

// ===========================================================================
// POST /api/v2/sessions
// ===========================================================================
describe('POST /api/v2/sessions', () => {
  it('creates a session and returns 201', async () => {
    // tenant resolution
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    // insert
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          session_token: 'sess_generated123',
          tenant_id: 'tenant-1',
          agent_id: 'my-agent',
          wallet_address: null,
          budget_total_usd: '50.00',
          budget_spent_usd: '0',
          policies: '{}',
          status: 'active',
          created_at: '2025-01-01',
          expires_at: '2025-01-02',
        },
      ],
    });

    const req = createJsonRequest('/api/v2/sessions', {
      agent_id: 'my-agent',
      budget_usd: 50,
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.object).toBe('session');
    expect(body.session_key).toBeDefined();
  });

  it('validates budget must be > 0', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });

    const req = createJsonRequest('/api/v2/sessions', {
      budget_usd: 0,
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.type).toBe('invalid_request');
  });

  it('validates budget must be <= 10000', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });

    const req = createJsonRequest('/api/v2/sessions', {
      budget_usd: 10001,
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('generates sess_ prefixed token', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          session_token: 'sess_test123',
          tenant_id: 'tenant-1',
          agent_id: null,
          wallet_address: null,
          budget_total_usd: '10.00',
          budget_spent_usd: '0',
          policies: '{}',
          status: 'active',
          created_at: '2025-01-01',
          expires_at: '2025-01-02',
        },
      ],
    });

    const req = createJsonRequest('/api/v2/sessions', { budget_usd: 10 });
    const res = await POST(req);
    const body = await res.json();

    expect(body.id).toMatch(/^sess_/);
  });

  it('returns 500 on DB error', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockRejectedValueOnce(new Error('insert failed'));

    const req = createJsonRequest('/api/v2/sessions', { budget_usd: 10 });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.type).toBe('internal_error');
  });
});
