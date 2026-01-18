import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PushNotificationService } from '../push-service';
import pool from '@/lib/db';

// Mock the DB module
vi.mock('@/lib/db', () => {
    const mockQuery = vi.fn();
    return {
        query: mockQuery,
        default: {
            query: mockQuery,
            getPool: vi.fn(),
            end: vi.fn()
        }
    };
});

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('PushNotificationService', () => {
    let service: PushNotificationService;

    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockReset();
        service = new PushNotificationService();

        // Default DB mock
        vi.mocked(pool.query).mockResolvedValue({ rowCount: 0, rows: [] } as any);
    });

    describe('notify()', () => {
        it('should send notifications to matching webhooks', async () => {
            const mockConfig = {
                id: 'config-1',
                webhook_url: 'https://webhook.site/1',
                event_types: ['task.completed'],
                enabled: true,
                tenant_id: 'tenant-1',
                auth_type: 'none',
                max_retries: 0
            };

            vi.mocked(pool.query).mockResolvedValueOnce({ rowCount: 1, rows: [mockConfig] } as any);
            mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

            const results = await service.notify('task.completed', { taskId: 't1' }, 'tenant-1');

            expect(results.length).toBe(1);
            expect(results[0]!.success).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith('https://webhook.site/1', expect.objectContaining({
                method: 'POST'
            }));
        });

        it('should handle webhook failures and retries', async () => {
            const mockConfig = {
                id: 'config-1',
                webhook_url: 'https://webhook.site/1',
                event_types: ['task.completed'],
                enabled: true,
                tenant_id: 'tenant-1',
                max_retries: 1,
                retry_delay_ms: 1,
                auth_type: 'none'
            };

            vi.mocked(pool.query).mockResolvedValueOnce({ rowCount: 1, rows: [mockConfig] } as any);
            mockFetch
                .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Error' })
                .mockResolvedValueOnce({ ok: true, status: 200 });

            const results = await service.notify('task.completed', { taskId: 't1' }, 'tenant-1');

            expect(results[0]!.success).toBe(true);
            expect(results[0]!.retryCount).toBe(1);
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it.skip('should record failure when all retries fail', async () => {
            const mockConfig = {
                id: 'config-1',
                webhook_url: 'https://webhook.site/1',
                event_types: ['task.completed'],
                enabled: true,
                tenant_id: 'tenant-1',
                max_retries: 0, // No retries
                auth_type: 'none'
            };

            // 1. getMatchingConfigs
            vi.mocked(pool.query).mockResolvedValueOnce({ rowCount: 1, rows: [mockConfig] } as any);
            // 2. recordFailure (UPDATE stats)
            vi.mocked(pool.query).mockResolvedValueOnce({ rowCount: 1, rows: [] } as any);
            // 3. recordFailure (UPDATE enabled status)
            vi.mocked(pool.query).mockResolvedValueOnce({ rowCount: 1, rows: [] } as any);

            mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Error' });

            const results = await service.notify('task.completed', { taskId: 't1' }, 'tenant-1');

            expect(results[0]!.success).toBe(false);
            expect(pool.query).toHaveBeenCalledTimes(3);
        });
    });
});
