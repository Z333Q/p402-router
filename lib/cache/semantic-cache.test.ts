/**
 * Semantic Cache Test Suite
 * ==========================
 * Comprehensive tests for the embedding-based semantic caching system.
 * 
 * Tests cover:
 * - Cache get/set operations
 * - Similarity matching
 * - TTL and expiration
 * - Namespace isolation
 * - Edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SemanticCache, getSemanticCache, withCache } from './semantic-cache';
import { CompletionRequest, CompletionResponse } from '@/lib/ai-providers/types';

// Mock DB Pool
vi.mock('@/lib/db', () => ({
    default: {
        query: vi.fn()
    }
}));

// Mock fetch for embeddings
const mockFetch = vi.fn();
global.fetch = mockFetch;

import pool from '@/lib/db';

describe('SemanticCache', () => {
    let cache: SemanticCache;

    const mockRequest: CompletionRequest = {
        messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'What is the capital of France?' }
        ],
        model: 'openai/gpt-4o-mini',
        temperature: 0.7
    };

    const mockResponse: CompletionResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'openai/gpt-4o-mini',
        choices: [{
            index: 0,
            message: { role: 'assistant', content: 'The capital of France is Paris.' },
            finishReason: 'stop'
        }],
        usage: {
            promptTokens: 20,
            completionTokens: 10,
            totalTokens: 30
        }
    };

    const mockEmbedding = Array(512).fill(0).map(() => Math.random());

    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv('OPENAI_API_KEY', 'test-key');
        cache = new SemanticCache({ namespace: 'test' });

        // Mock embedding API
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                data: [{ embedding: mockEmbedding }]
            })
        });
    });

    afterEach(() => {
        vi.resetAllMocks();
        vi.unstubAllEnvs();
    });

    // =========================================================================
    // Cache GET Operations
    // =========================================================================

    describe('get()', () => {
        it('should return cache miss when no entries exist', async () => {
            vi.mocked(pool.query)
                .mockResolvedValueOnce({ rows: [] }) // Exact match
                .mockResolvedValueOnce({ rows: [] }); // Similarity search

            const result = await cache.get(mockRequest);

            expect(result.hit).toBe(false);
            expect(result.entry).toBeUndefined();
            expect(result.latencyMs).toBeGreaterThanOrEqual(0);
        });

        it('should return exact match with similarity 1.0', async () => {
            const cachedEntry = {
                id: 'cache_123',
                request_hash: 'cache_abc',
                embedding: JSON.stringify(mockEmbedding),
                response: JSON.stringify(mockResponse),
                hit_count: 5,
                created_at: new Date(),
                expires_at: new Date(Date.now() + 3600000)
            };

            vi.mocked(pool.query)
                .mockResolvedValueOnce({ rows: [cachedEntry] }) // Exact match found
                .mockResolvedValueOnce({ rowCount: 1 }); // Hit count increment

            const result = await cache.get(mockRequest);

            expect(result.hit).toBe(true);
            expect(result.similarity).toBe(1.0);
            expect(result.entry?.response.choices[0].message.content).toBe('The capital of France is Paris.');
        });

        it('should find similar entries above threshold', async () => {
            const similarEntry = {
                id: 'cache_456',
                request_hash: 'cache_def',
                embedding: JSON.stringify(mockEmbedding), // Same embedding = similarity 1.0
                response: JSON.stringify(mockResponse),
                hit_count: 3,
                created_at: new Date(),
                expires_at: new Date(Date.now() + 3600000)
            };

            vi.mocked(pool.query)
                .mockResolvedValueOnce({ rows: [] }) // No exact match
                .mockResolvedValueOnce({ rows: [similarEntry] }) // Similar entry found
                .mockResolvedValueOnce({ rowCount: 1 }); // Hit count increment

            const result = await cache.get(mockRequest);

            expect(result.hit).toBe(true);
            expect(result.similarity).toBeGreaterThanOrEqual(0.92);
        });

        it('should handle embedding generation errors gracefully', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] }); // No exact match
            mockFetch.mockRejectedValueOnce(new Error('OpenAI API error'));

            const result = await cache.get(mockRequest);

            expect(result.hit).toBe(false);
        });
    });

    // =========================================================================
    // Cache SET Operations
    // =========================================================================

    describe('set()', () => {
        it('should store response with embedding', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({ rowCount: 1 });

            await cache.set(mockRequest, mockResponse);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO semantic_cache'),
                expect.arrayContaining([
                    expect.stringContaining('cache_'),
                    'test', // namespace
                    expect.any(String), // hash
                    expect.any(String), // embedding JSON
                    expect.stringContaining('Paris'), // response JSON contains answer
                    expect.any(Date) // expires_at
                ])
            );
        });

        it('should update existing entry on conflict', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({ rowCount: 1 });

            await cache.set(mockRequest, mockResponse);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('ON CONFLICT'),
                expect.any(Array)
            );
        });

        it('should not throw on database errors', async () => {
            vi.mocked(pool.query).mockRejectedValueOnce(new Error('DB connection lost'));

            // Should not throw
            await expect(cache.set(mockRequest, mockResponse)).resolves.not.toThrow();
        });
    });

    // =========================================================================
    // Cache Invalidation
    // =========================================================================

    describe('invalidate()', () => {
        it('should clear entire namespace when no pattern provided', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({ rowCount: 10 });

            const count = await cache.invalidate();

            expect(count).toBe(10);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM semantic_cache'),
                ['test']
            );
        });

        it('should only clear matching entries when pattern provided', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({ rowCount: 3 });

            const count = await cache.invalidate('france');

            expect(count).toBe(3);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('LIKE'),
                ['test', '%france%']
            );
        });
    });

    // =========================================================================
    // Cleanup
    // =========================================================================

    describe('cleanup()', () => {
        it('should remove expired entries', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({ rowCount: 5 });

            const count = await cache.cleanup();

            expect(count).toBe(5);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('expires_at < NOW()')
            );
        });
    });

    // =========================================================================
    // Statistics
    // =========================================================================

    describe('getStats()', () => {
        it('should return cache statistics', async () => {
            vi.mocked(pool.query)
                .mockResolvedValueOnce({
                    rows: [{
                        total_entries: '100',
                        total_hits: '500',
                        avg_hits: '5.0',
                        oldest_entry: new Date('2026-01-01')
                    }]
                })
                .mockResolvedValueOnce({
                    rows: [{ namespace: 'test' }, { namespace: 'prod' }]
                });

            const stats = await cache.getStats();

            expect(stats.totalEntries).toBe(100);
            expect(stats.totalHits).toBe(500);
            expect(stats.avgHitsPerEntry).toBe(5);
            expect(stats.namespaces).toContain('test');
        });
    });

    // =========================================================================
    // Middleware Helper
    // =========================================================================

    describe('withCache()', () => {
        it('should return cached response on hit', async () => {
            const cachedEntry = {
                id: 'cache_123',
                request_hash: 'cache_abc',
                embedding: JSON.stringify(mockEmbedding),
                response: JSON.stringify(mockResponse),
                hit_count: 5,
                created_at: new Date(),
                expires_at: new Date(Date.now() + 3600000)
            };

            vi.mocked(pool.query)
                .mockResolvedValueOnce({ rows: [cachedEntry] })
                .mockResolvedValueOnce({ rowCount: 1 });

            const execute = vi.fn();
            const result = await withCache(mockRequest, execute);

            expect(result.cached).toBe(true);
            expect(execute).not.toHaveBeenCalled();
        });

        it('should execute and cache on miss', async () => {
            vi.mocked(pool.query)
                .mockResolvedValueOnce({ rows: [] }) // No exact match
                .mockResolvedValueOnce({ rows: [] }) // No similar entry
                .mockResolvedValueOnce({ rowCount: 1 }); // Cache set

            const execute = vi.fn().mockResolvedValue(mockResponse);
            const result = await withCache(mockRequest, execute);

            expect(result.cached).toBe(false);
            expect(execute).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // Edge Cases
    // =========================================================================

    describe('Edge Cases', () => {
        it('should handle empty message content', async () => {
            const emptyRequest: CompletionRequest = {
                messages: [{ role: 'user', content: '' }]
            };

            vi.mocked(pool.query).mockResolvedValue({ rows: [] });

            const result = await cache.get(emptyRequest);
            expect(result.hit).toBe(false);
        });

        it('should handle very long messages (truncation)', async () => {
            const longContent = 'x'.repeat(5000);
            const longRequest: CompletionRequest = {
                messages: [{ role: 'user', content: longContent }]
            };

            vi.mocked(pool.query).mockResolvedValue({ rows: [] });

            // Should not throw
            await expect(cache.get(longRequest)).resolves.toBeDefined();

            // Embedding call should use truncated content
            const embeddingCall = mockFetch.mock.calls.find(
                call => call[0].includes('embeddings')
            );
            if (embeddingCall) {
                const body = JSON.parse(embeddingCall[1].body);
                expect(body.input.length).toBeLessThanOrEqual(1000);
            }
        });

        it('should handle multimodal content arrays', async () => {
            const multimodalRequest: CompletionRequest = {
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Describe this image' },
                        { type: 'image_url', image_url: { url: 'https://example.com/img.png' } }
                    ]
                }]
            };

            vi.mocked(pool.query).mockResolvedValue({ rows: [] });

            await expect(cache.get(multimodalRequest)).resolves.toBeDefined();
        });

        it('should maintain namespace isolation', async () => {
            const cache1 = new SemanticCache({ namespace: 'ns1' });
            const cache2 = new SemanticCache({ namespace: 'ns2' });

            vi.mocked(pool.query).mockResolvedValue({ rows: [] });

            await cache1.get(mockRequest);
            await cache2.get(mockRequest);

            // Both queries should specify their respective namespace
            expect(pool.query).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['ns1'])
            );
            expect(pool.query).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['ns2'])
            );
        });

        it('should handle concurrent gets without race conditions', async () => {
            vi.mocked(pool.query).mockResolvedValue({ rows: [] });

            const results = await Promise.all([
                cache.get(mockRequest),
                cache.get(mockRequest),
                cache.get(mockRequest)
            ]);

            results.forEach(r => expect(r.hit).toBe(false));
        });
    });
});
