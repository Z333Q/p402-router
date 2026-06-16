/**
 * Slice 3Z-E-Impl — Redis singleton must not silently fall back to a
 * localhost address when REDIS_URL is missing.
 *
 * Source-shape regression + stub behavioural pins.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

import { createStub } from '../redis';

const REDIS_SRC = readFileSync(
    resolvePath(process.cwd(), 'lib/redis.ts'),
    'utf8',
);
const HEALTH_SRC = readFileSync(
    resolvePath(process.cwd(), 'app/api/internal/cron/facilitators/health/route.ts'),
    'utf8',
);
const BAZAAR_SRC = readFileSync(
    resolvePath(process.cwd(), 'app/api/internal/cron/bazaar/sync/route.ts'),
    'utf8',
);

describe('3Z-E — lib/redis.ts source shape', () => {
    it('contains no localhost:6379 literal', () => {
        // The doc comment must not name the literal address either.
        // Use a slightly broken pattern so the test itself is not a
        // self-match.
        const LOCAL = ['local', 'host', ':6379'].join('');
        expect(REDIS_SRC.includes(LOCAL)).toBe(false);
    });

    it('contains no 127.0.0.1:6379 literal', () => {
        const LOOP = ['127', '.0.0.1', ':6379'].join('');
        expect(REDIS_SRC.includes(LOOP)).toBe(false);
    });

    it('still has a default export', () => {
        expect(REDIS_SRC).toMatch(/export\s+default\s+redis/);
    });

    it('only constructs ioredis when REDIS_URL is truthy', () => {
        expect(REDIS_SRC).toMatch(/url\s*\?\s*new\s+IORedis\(/);
    });
});

describe('3Z-E — cron routes source shape', () => {
    it('facilitators/health no longer constructs Redis at module scope with empty string', () => {
        expect(HEALTH_SRC).not.toMatch(/new\s+Redis\(\s*process\.env\.UPSTASH_REDIS_URL\s*\|\|\s*['"]{2}\s*\)/);
    });

    it('facilitators/health uses lazy getRedis()', () => {
        expect(HEALTH_SRC).toMatch(/async\s+function\s+getRedis\s*\(/);
        expect(HEALTH_SRC).toMatch(/await\s+getRedis\(\)/);
    });

    it('facilitators/health prefers REDIS_URL over UPSTASH_REDIS_URL', () => {
        expect(HEALTH_SRC).toMatch(/process\.env\.REDIS_URL\s*\|\|\s*process\.env\.UPSTASH_REDIS_URL/);
    });

    it('bazaar/sync no longer imports or constructs ioredis', () => {
        expect(BAZAAR_SRC).not.toMatch(/from\s+['"]ioredis['"]/);
        expect(BAZAAR_SRC).not.toMatch(/new\s+Redis\(/);
    });
});

describe('3Z-E — stub behaviour (createStub)', () => {
    it('get resolves to null', async () => {
        const r = createStub();
        await expect(r.get('any:key')).resolves.toBeNull();
    });

    it('set resolves to "OK"', async () => {
        const r = createStub();
        await expect(r.set('k', 'v')).resolves.toBe('OK');
    });

    it('setex resolves to "OK"', async () => {
        const r = createStub();
        await expect(r.setex('k', 60, 'v')).resolves.toBe('OK');
    });

    it('del resolves to 0', async () => {
        const r = createStub();
        await expect(r.del('k')).resolves.toBe(0);
    });

    it('exists resolves to 0', async () => {
        const r = createStub();
        await expect(r.exists('k')).resolves.toBe(0);
    });

    it('expire resolves to 0', async () => {
        const r = createStub();
        await expect(r.expire('k', 60)).resolves.toBe(0);
    });

    it('incr resolves to 0 (does not create false state)', async () => {
        const r = createStub();
        await expect(r.incr('k')).resolves.toBe(0);
    });

    it('keys resolves to []', async () => {
        const r = createStub();
        await expect(r.keys('p402:*')).resolves.toEqual([]);
    });

    it('duplicate returns a working stub', async () => {
        const r = createStub();
        const dup = r.duplicate();
        expect(dup).toBeDefined();
        await expect(dup.get('any')).resolves.toBeNull();
    });

    it('unknown method falls through Proxy and resolves to null', async () => {
        const r = createStub() as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
        await expect(r['someFutureCommand']!('arg')).resolves.toBeNull();
    });

    it('on() is a no-op that returns a chainable handle', async () => {
        const r = createStub();
        const ret = r.on('error', () => undefined);
        expect(ret).toBeDefined();
        // Chainable: returned handle still supports get().
        await expect((ret as unknown as { get: (k: string) => Promise<unknown> }).get('k')).resolves.toBeNull();
    });

    it('ping resolves to "PONG"', async () => {
        const r = createStub();
        await expect(r.ping()).resolves.toBe('PONG');
    });
});
