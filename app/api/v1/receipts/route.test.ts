import { describe, it, expect, beforeEach } from 'vitest';
import { POST, GET, PUT, OPTIONS } from './route';
import { NextRequest } from 'next/server';

function createRequest(url: string, options: RequestInit = {}) {
    return new NextRequest(new URL(url, 'https://p402.io'), options);
}

describe('Receipts API', () => {
    describe('POST /api/v1/receipts', () => {
        it('should create a receipt with valid data', async () => {
            const req = createRequest('/api/v1/receipts', {
                method: 'POST',
                body: JSON.stringify({
                    txHash: '0x' + 'a'.repeat(64),
                    sessionId: 'session_123',
                    amount: 10.50,
                    metadata: {
                        payer: '0x1234567890123456789012345678901234567890',
                        network: 'base',
                        token: 'USDC'
                    }
                })
            });

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.receiptId).toMatch(/^rcpt_/);
            expect(data.amount).toBe(10.50);
            expect(data.network).toBe('base');
            expect(data.token).toBe('USDC');
            expect(data.validUntil).toBeDefined();
        });

        it('should reject missing txHash', async () => {
            const req = createRequest('/api/v1/receipts', {
                method: 'POST',
                body: JSON.stringify({
                    sessionId: 'session_123',
                    amount: 10.50
                })
            });

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data.success).toBe(false);
        });

        it('should reject negative amount', async () => {
            const req = createRequest('/api/v1/receipts', {
                method: 'POST',
                body: JSON.stringify({
                    txHash: '0x' + 'a'.repeat(64),
                    sessionId: 'session_123',
                    amount: -5
                })
            });

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data.success).toBe(false);
        });

        it('should reject missing sessionId', async () => {
            const req = createRequest('/api/v1/receipts', {
                method: 'POST',
                body: JSON.stringify({
                    txHash: '0x' + 'a'.repeat(64),
                    amount: 10
                })
            });

            const res = await POST(req);
            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/v1/receipts', () => {
        it('should return 400 when receipt_id is missing', async () => {
            const req = createRequest('/api/v1/receipts');

            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data.error).toContain('receipt_id');
        });

        it('should return 404 for non-existent receipt', async () => {
            const req = createRequest('/api/v1/receipts?receipt_id=rcpt_nonexistent');

            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(404);
            expect(data.success).toBe(false);
        });

        it('should retrieve a previously created receipt', async () => {
            // Create first
            const createReq = createRequest('/api/v1/receipts', {
                method: 'POST',
                body: JSON.stringify({
                    txHash: '0x' + 'b'.repeat(64),
                    sessionId: 'session_456',
                    amount: 25.00
                })
            });
            const createRes = await POST(createReq);
            const { receiptId } = await createRes.json();

            // Retrieve
            const getReq = createRequest(`/api/v1/receipts?receipt_id=${receiptId}`);
            const getRes = await GET(getReq);
            const data = await getRes.json();

            expect(getRes.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.receipt.id).toBe(receiptId);
            expect(data.receipt.amount).toBe(25.00);
        });
    });

    describe('PUT /api/v1/receipts', () => {
        it('should return 400 when receipt_id is missing', async () => {
            const req = createRequest('/api/v1/receipts', {
                method: 'PUT',
                body: JSON.stringify({ action: 'mark_used' })
            });

            const res = await PUT(req);
            expect(res.status).toBe(400);
        });

        it('should return 400 for invalid action', async () => {
            // Create a receipt first
            const createReq = createRequest('/api/v1/receipts', {
                method: 'POST',
                body: JSON.stringify({
                    txHash: '0x' + 'c'.repeat(64),
                    sessionId: 'session_789',
                    amount: 5.00
                })
            });
            const createRes = await POST(createReq);
            const { receiptId } = await createRes.json();

            const req = createRequest('/api/v1/receipts', {
                method: 'PUT',
                body: JSON.stringify({ receipt_id: receiptId, action: 'invalid_action' })
            });

            const res = await PUT(req);
            expect(res.status).toBe(400);
        });
    });

    describe('OPTIONS /api/v1/receipts', () => {
        it('should return CORS headers', async () => {
            const res = await OPTIONS();

            expect(res.status).toBe(200);
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
            expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
            expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
        });
    });
});
