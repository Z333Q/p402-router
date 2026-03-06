import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { createRequest, createJsonRequest, mockDbQuery } from '@/__tests__/test-utils';

vi.mock('@/lib/db', () => ({
  default: { query: vi.fn(), getPool: vi.fn(), end: vi.fn() },
}));

import pool from '@/lib/db';

const mockPool = pool as unknown as { query: ReturnType<typeof vi.fn> };

const MANDATE_ROW = {
  id: 'mnd_abc123',
  type: 'payment',
  user_did: 'did:p402:tenant:tenant-1',
  agent_did: 'did:p402:agent:agent-1',
  constraints: { max_amount_usd: 50 },
  amount_spent_usd: '0.00',
  status: 'active',
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
};

beforeEach(() => {
  mockPool.query.mockReset();
});

// ===========================================================================
// GET /api/v2/governance/mandates
// ===========================================================================
describe('GET /api/v2/governance/mandates', () => {
  it('returns active mandates for tenant', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] }); // tenant resolution
    mockPool.query.mockResolvedValueOnce({ rows: [MANDATE_ROW] });

    const req = createRequest('/api/v2/governance/mandates');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.object).toBe('list');
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('mnd_abc123');
    expect(body.data[0].amount_spent_usd).toBe(0);
  });

  it('filters by status query param', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const req = createRequest('/api/v2/governance/mandates?status=exhausted', {
      headers: { 'x-p402-tenant': 'tenant-1' },
    });
    await GET(req);

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.any(String),
      ['tenant-1', 'exhausted']
    );
  });

  it('defaults to status=active', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const req = createRequest('/api/v2/governance/mandates', {
      headers: { 'x-p402-tenant': 'tenant-1' },
    });
    await GET(req);

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.any(String),
      ['tenant-1', 'active']
    );
  });

  it('returns 500 on DB error without leaking message', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('relation "ap2_mandates" does not exist'));

    const req = createRequest('/api/v2/governance/mandates', {
      headers: { 'x-p402-tenant': 'tenant-1' },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.type).toBe('internal_error');
    // Must NOT expose raw DB error string to callers
    expect(body.error.message).not.toMatch(/ap2_mandates/);
  });
});

// ===========================================================================
// POST /api/v2/governance/mandates
// ===========================================================================
describe('POST /api/v2/governance/mandates', () => {
  it('creates a mandate and returns 201', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] }); // tenant resolution
    mockPool.query.mockResolvedValueOnce({ rows: [MANDATE_ROW] });

    const req = createJsonRequest('/api/v2/governance/mandates', {
      user_did: 'did:p402:tenant:tenant-1',
      agent_did: 'did:p402:agent:agent-1',
      constraints: { max_amount_usd: 50 },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.object).toBe('mandate');
    expect(body.id).toBe('mnd_abc123');
    expect(body.status).toBe('active');
  });

  it('returns 400 when user_did is missing', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });

    const req = createJsonRequest('/api/v2/governance/mandates', {
      agent_did: 'did:p402:agent:agent-1',
      constraints: { max_amount_usd: 10 },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('MISSING_DIDS');
  });

  it('returns 400 when agent_did is missing', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });

    const req = createJsonRequest('/api/v2/governance/mandates', {
      user_did: 'did:p402:tenant:tenant-1',
      constraints: { max_amount_usd: 10 },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('MISSING_DIDS');
  });

  it('returns 400 when constraints is missing', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });

    const req = createJsonRequest('/api/v2/governance/mandates', {
      user_did: 'did:p402:tenant:tenant-1',
      agent_did: 'did:p402:agent:agent-1',
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('MISSING_CONSTRAINTS');
  });

  it('returns 500 on DB error without leaking message', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'));

    const req = createJsonRequest('/api/v2/governance/mandates', {
      user_did: 'did:p402:tenant:tenant-1',
      agent_did: 'did:p402:agent:agent-1',
      constraints: { max_amount_usd: 100 },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.type).toBe('internal_error');
    expect(body.error.message).not.toMatch(/constraint/);
  });

  it('mandate id has mnd_ prefix', async () => {
    mockDbQuery(mockPool, { rows: [{ id: 'tenant-1' }] });
    mockPool.query.mockResolvedValueOnce({ rows: [MANDATE_ROW] });

    const req = createJsonRequest('/api/v2/governance/mandates', {
      user_did: 'did:p402:tenant:tenant-1',
      agent_did: 'did:p402:agent:agent-1',
      constraints: { max_amount_usd: 25 },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(body.id).toMatch(/^mnd_/);
  });
});
