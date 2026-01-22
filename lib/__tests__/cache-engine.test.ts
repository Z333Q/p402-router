import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SemanticCache } from '../cache-engine';
import pool from '../db';

vi.mock('../db', () => ({
    default: {
        query: vi.fn(),
    },
}));

describe('SemanticCache', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('generateHash()', () => {
        it('should generate consistent SHA256 hashes for the same input', () => {
            const h1 = SemanticCache.generateHash('hello world');
            const h2 = SemanticCache.generateHash('hello world');
            const h3 = SemanticCache.generateHash('hello world '); // whitespace difference

            expect(h1).toBe(h2);
            expect(h1).not.toBe(h3);
            expect(h1).toHaveLength(64); // SHA256 length in hex
        });
    });

    describe('lookup()', () => {
        it('should return found: true on a database hit', async () => {
            // Mock the SELECT query
            vi.mocked(pool.query).mockResolvedValue({
                rows: [{ response: { text: 'cached' } }]
            } as any);

            const result = await SemanticCache.lookup('test prompt', 'tenant-1');

            expect(result.found).toBe(true);
            expect(result.response).toEqual({ text: 'cached' });
            // The update query follows, but we already have our result
        });

        it('should return found: false on a database miss', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as any);

            const result = await SemanticCache.lookup('test prompt', 'tenant-1');
            expect(result.found).toBe(false);
        });
    });

    describe('store()', () => {
        it('should insert or update the cache entry', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({ rowCount: 1 } as any);

            const response = { ans: 42 };
            await SemanticCache.store('prompt', response, 'tenant-1', 'gpt-4o');

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO semantic_cache'),
                [
                    'tenant-1',
                    expect.any(String), // hash
                    'prompt',
                    JSON.stringify(response),
                    'gpt-4o',
                    null // embedding (fails in test because mock generateEmbedding returns [])
                ]
            );
        });
    });
});
