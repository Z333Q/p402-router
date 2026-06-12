import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SemanticCache } from '../cache-engine';
import pool from '../db';

vi.mock('../db', () => ({
    default: {
        query: vi.fn(),
    },
}));

// Disable real embedding calls in all tests; assert the absence of calls
// individually where it matters. Re-installed in beforeEach so vi.clearAllMocks
// can't drop the implementation between tests.
let embeddingSpy: ReturnType<typeof vi.spyOn>;

const TENANT = 'tenant-1';
const PROMPT = 'test prompt';

function mockTenantEnabled(enabled: boolean | null) {
    // If `null`, simulate the "no row" case → enabled === undefined.
    if (enabled === null) {
        vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as any);
    } else {
        vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{ enabled }] } as any);
    }
}

describe('SemanticCache', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.mocked(pool.query).mockReset();
        embeddingSpy = vi.spyOn(SemanticCache, 'generateEmbedding').mockImplementation(async () => []);
    });

    describe('generateHash()', () => {
        it('generates consistent SHA256 hashes for the same input', () => {
            const h1 = SemanticCache.generateHash('hello world');
            const h2 = SemanticCache.generateHash('hello world');
            const h3 = SemanticCache.generateHash('hello world '); // whitespace differs
            expect(h1).toBe(h2);
            expect(h1).not.toBe(h3);
            expect(h1).toHaveLength(64);
        });
    });

    describe('lookup() privacy gate', () => {
        it('skips on undefined privacy mode without any DB or embedding call', async () => {
            const res = await SemanticCache.lookup(PROMPT, TENANT);
            expect(res).toEqual({ found: false, skipped: 'privacy_mode' });
            expect(pool.query).not.toHaveBeenCalled();
            expect(embeddingSpy).not.toHaveBeenCalled();
        });

        it('skips on metadata_only', async () => {
            const res = await SemanticCache.lookup(PROMPT, TENANT, 'metadata_only');
            expect(res).toEqual({ found: false, skipped: 'privacy_mode' });
            expect(pool.query).not.toHaveBeenCalled();
            expect(embeddingSpy).not.toHaveBeenCalled();
        });

        it('skips on fingerprint_only (hard skip per Slice E Option A)', async () => {
            const res = await SemanticCache.lookup(PROMPT, TENANT, 'fingerprint_only');
            expect(res).toEqual({ found: false, skipped: 'privacy_mode' });
            expect(pool.query).not.toHaveBeenCalled();
            expect(embeddingSpy).not.toHaveBeenCalled();
        });

        it('skips on private_gateway', async () => {
            const res = await SemanticCache.lookup(PROMPT, TENANT, 'private_gateway');
            expect(res).toEqual({ found: false, skipped: 'privacy_mode' });
            expect(pool.query).not.toHaveBeenCalled();
            expect(embeddingSpy).not.toHaveBeenCalled();
        });

        it('skips on unknown privacy mode (defensive)', async () => {
            const res = await SemanticCache.lookup(PROMPT, TENANT, 'not_a_mode' as never);
            expect(res).toEqual({ found: false, skipped: 'privacy_mode' });
            expect(pool.query).not.toHaveBeenCalled();
            expect(embeddingSpy).not.toHaveBeenCalled();
        });
    });

    describe('lookup() tenant opt-in gate', () => {
        it('skips when intelligence_cache_config row is missing', async () => {
            mockTenantEnabled(null);
            const res = await SemanticCache.lookup(PROMPT, TENANT, 'redacted_trace');
            expect(res).toEqual({ found: false, skipped: 'tenant_disabled' });
            expect(embeddingSpy).not.toHaveBeenCalled();
            // Only the opt-in lookup query should have run.
            expect(pool.query).toHaveBeenCalledTimes(1);
        });

        it('skips when enabled === false', async () => {
            mockTenantEnabled(false);
            const res = await SemanticCache.lookup(PROMPT, TENANT, 'redacted_trace');
            expect(res).toEqual({ found: false, skipped: 'tenant_disabled' });
            expect(embeddingSpy).not.toHaveBeenCalled();
            expect(pool.query).toHaveBeenCalledTimes(1);
        });

        it('skips when enabled is truthy-non-boolean (defensive: must be exactly true)', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{ enabled: 1 }] } as any);
            const res = await SemanticCache.lookup(PROMPT, TENANT, 'redacted_trace');
            expect(res).toEqual({ found: false, skipped: 'tenant_disabled' });
            expect(embeddingSpy).not.toHaveBeenCalled();
        });

        it('skips when DB throws (fail-closed)', async () => {
            vi.mocked(pool.query).mockRejectedValueOnce(new Error('db down'));
            const res = await SemanticCache.lookup(PROMPT, TENANT, 'full_trace');
            expect(res).toEqual({ found: false, skipped: 'tenant_disabled' });
            expect(embeddingSpy).not.toHaveBeenCalled();
        });
    });

    describe('lookup() allowed paths', () => {
        it('runs lookup on redacted_trace + enabled=true (exact hit)', async () => {
            mockTenantEnabled(true);
            // Exact-match query
            vi.mocked(pool.query).mockResolvedValueOnce({
                rows: [{ response: { text: 'cached' } }],
            } as any);
            // Usage-stats update (fire-and-forget)
            vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as any);

            const res = await SemanticCache.lookup(PROMPT, TENANT, 'redacted_trace');
            expect(res.found).toBe(true);
            expect(res.response).toEqual({ text: 'cached' });
            expect(res.score).toBe(1.0);
        });

        it('runs lookup on full_trace + enabled=true (miss falls through to semantic search)', async () => {
            mockTenantEnabled(true);
            // Exact miss
            vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as any);

            const res = await SemanticCache.lookup(PROMPT, TENANT, 'full_trace');
            // generateEmbedding returns [] via the spy, so semantic search short-circuits.
            expect(res.found).toBe(false);
            expect(res.skipped).toBeUndefined();
            expect(embeddingSpy).toHaveBeenCalled();
        });
    });

    describe('store() privacy + tenant gate', () => {
        it('is a no-op on undefined privacy mode (no DB, no embedding)', async () => {
            await SemanticCache.store(PROMPT, { ans: 1 }, TENANT, 'gpt-4o');
            expect(pool.query).not.toHaveBeenCalled();
            expect(embeddingSpy).not.toHaveBeenCalled();
        });

        it('is a no-op on metadata_only', async () => {
            await SemanticCache.store(PROMPT, { ans: 1 }, TENANT, 'gpt-4o', 'metadata_only');
            expect(pool.query).not.toHaveBeenCalled();
            expect(embeddingSpy).not.toHaveBeenCalled();
        });

        it('is a no-op on fingerprint_only', async () => {
            await SemanticCache.store(PROMPT, { ans: 1 }, TENANT, 'gpt-4o', 'fingerprint_only');
            expect(pool.query).not.toHaveBeenCalled();
            expect(embeddingSpy).not.toHaveBeenCalled();
        });

        it('is a no-op on private_gateway', async () => {
            await SemanticCache.store(PROMPT, { ans: 1 }, TENANT, 'gpt-4o', 'private_gateway');
            expect(pool.query).not.toHaveBeenCalled();
            expect(embeddingSpy).not.toHaveBeenCalled();
        });

        it('is a no-op on unknown mode', async () => {
            await SemanticCache.store(PROMPT, { ans: 1 }, TENANT, 'gpt-4o', 'bogus' as never);
            expect(pool.query).not.toHaveBeenCalled();
            expect(embeddingSpy).not.toHaveBeenCalled();
        });

        it('is a no-op on redacted_trace when tenant row missing (no INSERT, no embedding)', async () => {
            mockTenantEnabled(null);
            await SemanticCache.store(PROMPT, { ans: 1 }, TENANT, 'gpt-4o', 'redacted_trace');
            // Only the opt-in lookup ran; no INSERT.
            expect(pool.query).toHaveBeenCalledTimes(1);
            const calls = vi.mocked(pool.query).mock.calls;
            expect(calls[0]?.[0]).not.toContain('INSERT INTO semantic_cache');
            expect(embeddingSpy).not.toHaveBeenCalled();
        });

        it('is a no-op on redacted_trace when enabled=false', async () => {
            mockTenantEnabled(false);
            await SemanticCache.store(PROMPT, { ans: 1 }, TENANT, 'gpt-4o', 'redacted_trace');
            const calls = vi.mocked(pool.query).mock.calls;
            for (const c of calls) {
                expect(String(c[0])).not.toContain('INSERT INTO semantic_cache');
            }
            expect(embeddingSpy).not.toHaveBeenCalled();
        });

        it('inserts on full_trace + enabled=true', async () => {
            mockTenantEnabled(true);
            // INSERT
            vi.mocked(pool.query).mockResolvedValueOnce({ rowCount: 1 } as any);

            await SemanticCache.store(PROMPT, { ans: 42 }, TENANT, 'gpt-4o', 'full_trace');

            const calls = vi.mocked(pool.query).mock.calls;
            const insertCall = calls.find(c => String(c[0]).includes('INSERT INTO semantic_cache'));
            expect(insertCall).toBeDefined();
            expect(embeddingSpy).toHaveBeenCalledTimes(1);
        });
    });
});
