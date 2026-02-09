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

describe('GET /api/health', () => {
  it('returns 200 with timestamp and uptime when DB is healthy', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.timestamp).toBeDefined();
    expect(body.uptime).toBeDefined();
    expect(body.database.status).toBe('healthy');
  });

  it('returns 503 when DB throws', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('Connection refused'));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.database.status).toBe('unhealthy');
    expect(body.database.error).toBe('Connection refused');
  });

  it('includes database.latency_ms', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const res = await GET();
    const body = await res.json();

    expect(body.database.latency_ms).toBeDefined();
    expect(typeof body.database.latency_ms).toBe('number');
  });

  it('includes total_latency_ms', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const res = await GET();
    const body = await res.json();

    expect(body.total_latency_ms).toBeDefined();
    expect(typeof body.total_latency_ms).toBe('number');
  });
});
