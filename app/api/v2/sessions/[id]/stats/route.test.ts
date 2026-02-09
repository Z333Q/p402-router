import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { createRequest } from '@/__tests__/test-utils';

vi.mock('@/lib/db/queries', () => ({
  getSessionAnalytics: vi.fn(),
}));

import { getSessionAnalytics } from '@/lib/db/queries';

const mockGetSessionAnalytics = getSessionAnalytics as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockGetSessionAnalytics.mockReset();
});

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/v2/sessions/[id]/stats', () => {
  it('returns stats with balance, savings, and costHistory', async () => {
    mockGetSessionAnalytics.mockResolvedValueOnce({
      requestCount: 42,
      totalCost: 2.5,
      avgLatency: 150,
      costHistory: [
        { timestamp: '2025-01-01T00:00:00Z', cost: 0.5 },
        { timestamp: '2025-01-01T01:00:00Z', cost: 1.0 },
      ],
    });

    const req = createRequest('/api/v2/sessions/sess_abc/stats');
    const res = await GET(req, makeParams('sess_abc'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.balance).toBe(10.0);
    expect(body.spent).toBe(2.5);
    expect(body.saved).toBeGreaterThanOrEqual(0);
    expect(body.requestCount).toBe(42);
    expect(body.avgLatency).toBe(150);
    expect(body.costHistory).toHaveLength(2);
    expect(body.lastUpdated).toBeDefined();
  });

  it('returns 400 for invalid ID (empty string triggers Zod)', async () => {
    const req = createRequest('/api/v2/sessions//stats');
    // Zod will fail on empty string
    const res = await GET(req, { params: Promise.resolve({ id: '' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid session ID format');
  });

  it('returns 500 on query failure', async () => {
    mockGetSessionAnalytics.mockRejectedValueOnce(new Error('DB error'));

    const req = createRequest('/api/v2/sessions/sess_abc/stats');
    const res = await GET(req, makeParams('sess_abc'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to fetch session statistics');
  });
});
