import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { query } from '../../../../lib/db';

vi.mock('../../../../lib/db', () => ({
    query: vi.fn(),
}));

vi.mock('uuid', () => ({
    v4: () => 'mock-uuid',
}));

// Mock AI providers so the route doesn't try live HTTP calls
vi.mock('../../../../lib/ai-providers', () => ({
    complete: vi.fn().mockResolvedValue({
        choices: [{
            message: { role: 'assistant', content: 'I received your message and will process it.' },
            finish_reason: 'stop',
            index: 0,
        }],
        model: 'mock-model',
        p402: { costUsd: 0.0001, providerId: 'mock-provider' },
    }),
}));

// ERC-8004 validation is disabled in tests (ERC8004_ENABLE_VALIDATION not set)
vi.mock('../../../../lib/erc8004/validation-guard', () => ({
    validateAgentTrust: vi.fn().mockResolvedValue(true),
}));

// Escrow service — non-blocking, just needs to not throw
vi.mock('../../../../lib/services/escrow-service', () => ({
    createEscrow: vi.fn(),
    getEscrowByReference: vi.fn(),
    autoReleaseEscrow: vi.fn().mockResolvedValue(undefined),
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
        // Idempotency check — no cached result
        vi.mocked(query).mockResolvedValueOnce({ rowCount: 0, rows: [] } as any);
        // INSERT INTO a2a_contexts
        vi.mocked(query).mockResolvedValueOnce({ rowCount: 1, rows: [] } as any);
        // Escrow settings lookup
        vi.mocked(query).mockResolvedValueOnce({ rowCount: 0, rows: [] } as any);
        // INSERT INTO a2a_tasks
        vi.mocked(query).mockResolvedValue({ rowCount: 1, rows: [] } as any);

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
            headers: {
                'Content-Type': 'application/json',
                'X-P402-Tenant': 'tenant-123',
            },
            body: JSON.stringify(payload)
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.result.task.status.state).toBe('completed');
        expect(data.result.task.status.message.parts[0].text).toContain('received your message');

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
            headers: { 'X-P402-Tenant': 'tenant-123' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'unknown/method', id: 2 })
        });

        const res = await POST(req);
        const data = await res.json();

        expect(data.error.code).toBe(-32601); // METHOD_NOT_FOUND
    });
});
