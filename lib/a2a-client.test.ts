import { describe, it, expect, vi, beforeEach } from 'vitest';
import { P402A2AClient } from './a2a-client';

// Mock global fetch
global.fetch = vi.fn();

describe('P402A2AClient', () => {
    let client: P402A2AClient;

    beforeEach(() => {
        vi.clearAllMocks();
        client = new P402A2AClient({
            baseUrl: 'https://api.p402.io',
            tenantId: 'test-tenant',
            apiKey: 'test-key'
        });
    });

    describe('sendMessage', () => {
        it('should send a message with correct headers and body', async () => {
            (fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    result: { task: { id: 'task_1', status: { state: 'processing' } } }
                })
            });

            const params = {
                message: {
                    role: 'user' as any,
                    parts: [{ type: 'text' as any, text: 'Hello' }]
                }
            };

            const response = await client.sendMessage(params);

            expect(response.task.id).toBe('task_1');
            expect(fetch).toHaveBeenCalledWith(
                'https://api.p402.io/api/a2a',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'X-P402-Tenant': 'test-tenant',
                        'Authorization': 'Bearer test-key',
                        'Content-Type': 'application/json'
                    }),
                    body: expect.stringContaining('"method":"message/send"')
                })
            );
        });

        it('should throw error if API returns error', async () => {
            (fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    error: { message: 'Unauthorized access' }
                })
            });

            await expect(client.sendMessage({ message: { role: 'user' as any, parts: [] } }))
                .rejects.toThrow('Unauthorized access');
        });
    });

    describe('submitPayment', () => {
        it('should submit payment correctly', async () => {
            (fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    result: { status: 'completed' }
                })
            });

            const paymentParams = {
                payment_id: 'pay_123',
                scheme: 'onchain' as any,
                tx_hash: '0xHash'
            };

            const result = await client.submitPayment(paymentParams);

            expect(result.status).toBe('completed');
            expect(fetch).toHaveBeenCalledWith(
                'https://api.p402.io/api/a2a',
                expect.objectContaining({
                    body: expect.stringContaining('"method":"x402/payment-submitted"')
                })
            );
        });
    });
});
