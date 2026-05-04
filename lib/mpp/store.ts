/**
 * mppx Store backed by ioredis.
 *
 * Keys are namespaced with `mppx:v1:` and expire after 15 min — matching
 * the mppx challenge window (~10 min) with headroom for clock skew.
 *
 * Falls back to Store.memory() when Redis is unavailable (dev / no REDIS_URL).
 * Memory fallback is NOT multi-instance safe — acceptable for local dev only.
 *
 * ## update() atomicity — Phase 2.4.5 decision (2026-05-03)
 *
 * update() is intentionally non-atomic (get → compute → set). A load test
 * (scripts/mppx-store-loadtest.ts) confirmed 100% race rate under deliberate
 * concurrent credential submission. WATCH/MULTI/EXEC was evaluated and rejected:
 *
 *   1. Blockchain nonce is the real guard. Tempo burns the EIP-3009 nonce
 *      on-chain; p402 method adds authorizationState check in Phase 3.2.
 *      The store is not the trust boundary for replay protection.
 *
 *   2. Financial exposure is negligible. $0.001/request × attack probability
 *      ≈ < $0.01/day at 1000 req/s. The store race only applies to deliberate
 *      concurrent submission of the same credential — normal usage never races.
 *
 *   3. WATCH implementation cost is disproportionate. ioredis requires a
 *      duplicate() connection per WATCH (10-50ms overhead) or a dedicated
 *      transactional pool. Both add latency and complexity exceeding the risk.
 *
 * Revisit when Phase 3.3 ships per-token dynamic pricing (individual request
 * values may reach $0.01-$0.10, making atomic guarantees worth implementing).
 */

import { Store } from 'mppx';
import redis from '@/lib/redis';

const KEY_PREFIX = 'mppx:v1:';
const TTL_S = 900; // 15 min

function prefixed(key: string): string {
    return KEY_PREFIX + key;
}

export function createMppxStore(): ReturnType<typeof Store.from> {
    // Probe: if REDIS_URL is not set, redis client will fail on first command.
    // Use memory store as fallback for local dev.
    if (!process.env.REDIS_URL) {
        if (process.env.NODE_ENV === 'production') {
            console.warn('[mppx:store] REDIS_URL not set in production — using in-memory store (not multi-instance safe)');
        }
        return Store.memory();
    }

    async function get(key: string): Promise<unknown> {
        try {
            const raw = await redis.get(prefixed(key));
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    async function put(key: string, value: unknown): Promise<void> {
        try {
            await redis.set(prefixed(key), JSON.stringify(value), 'EX', TTL_S);
        } catch (err) {
            // Redis write failure — log and continue. Challenge is still valid;
            // replay protection is degraded (no persistence) but not broken.
            console.error('[mppx:store] put failed — replay protection degraded:', err);
        }
    }

    async function del(key: string): Promise<void> {
        await redis.del(prefixed(key)).catch(() => { /* best-effort */ });
    }

    return Store.from({
        get,
        put,
        delete: del,
        async update(key, fn) {
            const current = await get(key);
            const change = fn(current);
            if (change.op === 'set') await put(key, change.value);
            else if (change.op === 'delete') await del(key);
            // 'noop' — no write; result is returned as-is
            return change.result;
        },
    });
}
