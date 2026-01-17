import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { A2AMessage, A2ATask, A2ATaskState, A2ATaskStatus } from '../../../../lib/a2a-types';
import { query } from '../../../../lib/db';
import { A2A_ERRORS, A2AError } from '../../../../lib/a2a-errors';

vi.mock('../../../../lib/db', () => ({
    query: vi.fn(),
}));

// Mock uuid
vi.mock('uuid', () => ({
    v4: () => 'mock-uuid',
}));

describe('A2A API Route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return 400-like error for invalid JSON-RPC format', async () => {
        const req = new NextRequest('https://p402.io/api/a2a', {
            method: 'POST',
            body: JSON.stringify({ method: 'invalid' }) // Missing jsonrpc
        });

        const res = await POST(req);
        const data = await res.json();

        expect(data.error.code).toBe(-32600); // INVALID_REQUEST
    });

    it('should handle message/send correctly', async () => {
        // Mock tenant resolution
        vi.mocked(query).mockResolvedValueOnce({
            rowCount: 1,
            rows: [{ id: 'tenant-123' }]
        } as any);

        // Mock context and task insertion
        vi.mocked(query).mockResolvedValue({ rowCount: 1 } as any);

        const payload = {
            jsonrpc: '2.0',
            id: 1,
            method: 'message/send',
            params: {
                message: {
                    role: 'user',
                    parts: [{ type: 'text', text: 'Hello' }]
                }
            }
        };

        const req = new NextRequest('https://p402.io/api/a2a', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.result.task.status.state).toBe('completed');
        expect(data.result.task.status.message.parts[0].text).toContain('received your message');

        // Verify DB inserts
        expect(query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO a2a_contexts'),
            expect.any(Array)
        );
        expect(query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO a2a_tasks'),
            expect.any(Array)
        );
    });

    it('should return method not found for unknown methods', async () => {
        const req = new NextRequest('https://p402.io/api/a2a', {
            method: 'POST',
            body: JSON.stringify({ jsonrpc: '2.0', method: 'unknown/method', id: 2 })
        });

        const res = await POST(req);
        const data = await res.json();

        expect(data.error.code).toBe(-32601); // METHOD_NOT_FOUND
    });
});
