import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE, PATCH } from './route';
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
// GET /api/v2/sessions/[id]
// ===========================================================================
describe('GET /api/v2/sessions/[id]', () => {
  it('returns session with budget and meta', async () => {
    const futureDate = new Date(Date.now() + 3600_000).toISOString();
    // tenant resolution
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    // session query
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          session_token: 'sess_abc',
          tenant_id: 'tenant-1',
          agent_id: 'agent-1',
          wallet_address: '0x123',
          budget_total_usd: '100.00',
          budget_spent_usd: '25.00',
          budget_remaining: '75.00',
          policies: {},
          status: 'active',
          created_at: '2025-01-01',
          expires_at: futureDate,
        },
      ],
      rowCount: 1,
    });

    const req = createRequest('/api/v2/sessions/sess_abc', {
      headers: { 'x-p402-tenant': 'default' },
    });
    const res = await GET(req, makeParams('sess_abc'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.object).toBe('session');
    expect(body.budget.total_usd).toBe(100);
    expect(body.budget.used_usd).toBe(25);
    expect(body.meta.is_active).toBe(true);
    expect(body.meta.time_remaining_seconds).toBeGreaterThan(0);
  });

  it('returns 404 for missing session', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const req = createRequest('/api/v2/sessions/sess_missing');
    const res = await GET(req, makeParams('sess_missing'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.type).toBe('not_found');
  });

  it('auto-expires stale sessions', async () => {
    const pastDate = new Date(Date.now() - 3600_000).toISOString();
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          session_token: 'sess_stale',
          tenant_id: 'tenant-1',
          agent_id: null,
          wallet_address: null,
          budget_total_usd: '10.00',
          budget_spent_usd: '5.00',
          policies: {},
          status: 'active',
          created_at: '2025-01-01',
          expires_at: pastDate,
        },
      ],
      rowCount: 1,
    });
    // Auto-expire update
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const req = createRequest('/api/v2/sessions/sess_stale');
    const res = await GET(req, makeParams('sess_stale'));
    const body = await res.json();

    expect(body.status).toBe('expired');
    expect(body.meta.is_expired).toBe(true);
    // Should have called the UPDATE query
    expect(mockPool.query).toHaveBeenCalledTimes(3);
  });
});

// ===========================================================================
// DELETE /api/v2/sessions/[id]
// ===========================================================================
describe('DELETE /api/v2/sessions/[id]', () => {
  it('ends an active session', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          session_token: 'sess_active',
          budget_total_usd: '100.00',
          budget_spent_usd: '30.00',
          status: 'ended',
        },
      ],
    });

    const req = createRequest('/api/v2/sessions/sess_active', { method: 'DELETE' });
    const res = await DELETE(req, makeParams('sess_active'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('ended');
    expect(body.final_budget.unused_usd).toBe(70);
  });

  it('returns 404 for non-existent session', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    // update returns no rows
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    // existence check returns no rows
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const req = createRequest('/api/v2/sessions/sess_missing', { method: 'DELETE' });
    const res = await DELETE(req, makeParams('sess_missing'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.type).toBe('not_found');
  });

  it('returns 400 for already-ended session', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // update fails
    mockPool.query.mockResolvedValueOnce({ rows: [{ status: 'ended' }] }); // check

    const req = createRequest('/api/v2/sessions/sess_ended', { method: 'DELETE' });
    const res = await DELETE(req, makeParams('sess_ended'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.type).toBe('invalid_request');
    expect(body.error.message).toContain('already ended');
  });
});

// ===========================================================================
// PATCH /api/v2/sessions/[id]
// ===========================================================================
describe('PATCH /api/v2/sessions/[id]', () => {
  it('adds budget', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          session_token: 'sess_abc',
          budget_total_usd: '150.00',
          budget_spent_usd: '10.00',
          policies: '{}',
          expires_at: '2025-01-02',
        },
      ],
    });

    const req = createJsonRequest(
      '/api/v2/sessions/sess_abc',
      { add_budget_usd: 50 },
      { method: 'PATCH' }
    );
    const res = await PATCH(req, makeParams('sess_abc'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.updated).toBe(true);
    expect(body.budget.total_usd).toBe(150);
  });

  it('extends hours', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          session_token: 'sess_abc',
          budget_total_usd: '100.00',
          budget_spent_usd: '10.00',
          policies: '{}',
          expires_at: '2025-01-03',
        },
      ],
    });

    const req = createJsonRequest(
      '/api/v2/sessions/sess_abc',
      { extend_hours: 24 },
      { method: 'PATCH' }
    );
    const res = await PATCH(req, makeParams('sess_abc'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.updated).toBe(true);
  });

  it('updates policy', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          session_token: 'sess_abc',
          budget_total_usd: '100.00',
          budget_spent_usd: '10.00',
          policies: '{"max_per_request":5}',
          expires_at: '2025-01-02',
        },
      ],
    });

    const req = createJsonRequest(
      '/api/v2/sessions/sess_abc',
      { policy: { max_per_request: 5 } },
      { method: 'PATCH' }
    );
    const res = await PATCH(req, makeParams('sess_abc'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.updated).toBe(true);
  });

  it('returns 400 for empty update', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });

    const req = createJsonRequest(
      '/api/v2/sessions/sess_abc',
      {},
      { method: 'PATCH' }
    );
    const res = await PATCH(req, makeParams('sess_abc'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toBe('No updates provided');
  });

  it('returns 404 for inactive session', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // no active session

    const req = createJsonRequest(
      '/api/v2/sessions/sess_ended',
      { add_budget_usd: 10 },
      { method: 'PATCH' }
    );
    const res = await PATCH(req, makeParams('sess_ended'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.message).toBe('Active session not found');
  });
});
