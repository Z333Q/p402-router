import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

vi.mock('@/lib/db', () => ({
  default: { query: vi.fn(), getPool: vi.fn(), end: vi.fn() },
}));

import pool from '@/lib/db';

const mockPool = pool as unknown as { query: ReturnType<typeof vi.fn> };

beforeEach(() => {
  mockPool.query.mockReset();
});

describe('GET /api/v1/bazaar', () => {
  it('returns resources, count, and timestamp', async () => {
    const fakeRows = [
      { id: 1, name: 'Resource A', rank_score: 0.9 },
      { id: 2, name: 'Resource B', rank_score: 0.8 },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: fakeRows });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.resources).toEqual(fakeRows);
    expect(body.count).toBe(2);
    expect(body.timestamp).toBeDefined();
  });

  it('returns empty resources when DB returns no rows', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.resources).toEqual([]);
    expect(body.count).toBe(0);
  });

  it('returns 500 on DB error', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('DB failure'));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to fetch bazaar resources');
  });
});
