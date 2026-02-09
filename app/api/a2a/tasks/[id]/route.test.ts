import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE } from './route';
import { createRequest } from '@/__tests__/test-utils';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  default: { query: vi.fn(), getPool: vi.fn(), end: vi.fn() },
}));

vi.mock('@/lib/push-service', () => ({
  pushNotificationService: {
    notifyTaskStateChange: vi.fn().mockResolvedValue(undefined),
  },
}));

import { query } from '@/lib/db';
import { pushNotificationService } from '@/lib/push-service';

const mockQuery = query as ReturnType<typeof vi.fn>;
const mockNotify = pushNotificationService.notifyTaskStateChange as ReturnType<typeof vi.fn>;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  mockQuery.mockReset();
  mockNotify.mockReset();
  mockNotify.mockResolvedValue(undefined);
});

// ===========================================================================
// GET /api/a2a/tasks/[id]
// ===========================================================================
describe('GET /api/a2a/tasks/[id]', () => {
  it('returns task', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'task-1', state: 'completed', context_id: 'ctx-1' }],
      rowCount: 1,
    });

    const req = createRequest('/api/a2a/tasks/task-1');
    const res = await GET(req, makeParams('task-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.task.id).toBe('task-1');
    expect(body.history).toEqual([]);
  });

  it('returns 404 for missing task', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const req = createRequest('/api/a2a/tasks/missing-task');
    const res = await GET(req, makeParams('missing-task'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Task not found');
  });

  it('includes history when ?history=true', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'task-1', state: 'completed' }],
      rowCount: 1,
    });
    mockQuery.mockResolvedValueOnce({
      rows: [
        { task_id: 'task-1', state: 'pending', timestamp: '2025-01-01T00:00:00Z' },
        { task_id: 'task-1', state: 'completed', timestamp: '2025-01-01T00:01:00Z' },
      ],
    });

    const req = createRequest('/api/a2a/tasks/task-1?history=true');
    const res = await GET(req, makeParams('task-1'));
    const body = await res.json();

    expect(body.history).toHaveLength(2);
    expect(body.history[0].state).toBe('pending');
  });

  it('returns 500 on DB error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB down'));

    const req = createRequest('/api/a2a/tasks/task-1');
    const res = await GET(req, makeParams('task-1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Internal Error');
  });
});

// ===========================================================================
// DELETE /api/a2a/tasks/[id]
// ===========================================================================
describe('DELETE /api/a2a/tasks/[id]', () => {
  it('cancels task and records state transition', async () => {
    // 1. Get task info
    mockQuery.mockResolvedValueOnce({
      rows: [{ tenant_id: 'tenant-1', context_id: 'ctx-1' }],
      rowCount: 1,
    });
    // 2. Cancel task
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'task-1' }] });
    // 3. Record state transition
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const req = createRequest('/api/a2a/tasks/task-1', { method: 'DELETE' });
    const res = await DELETE(req, makeParams('task-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.id).toBe('task-1');

    // Verify state transition was recorded
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO a2a_task_states'),
      ['task-1']
    );
  });

  it('sends push notification on cancel', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ tenant_id: 'tenant-1', context_id: 'ctx-1' }],
      rowCount: 1,
    });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'task-1' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const req = createRequest('/api/a2a/tasks/task-1', { method: 'DELETE' });
    await DELETE(req, makeParams('task-1'));

    // Push notification should be called (it's fire-and-forget with .catch)
    expect(mockNotify).toHaveBeenCalledWith({
      task_id: 'task-1',
      context_id: 'ctx-1',
      tenant_id: 'tenant-1',
      state: 'cancelled',
    });
  });

  it('returns 500 on DB error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const req = createRequest('/api/a2a/tasks/task-1', { method: 'DELETE' });
    const res = await DELETE(req, makeParams('task-1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Internal Error');
  });
});
