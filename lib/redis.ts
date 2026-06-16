/**
 * Singleton ioredis client.
 *
 * When REDIS_URL is set, the client behaves as before: lazy connect,
 * capped retries, errors silenced.
 *
 * When REDIS_URL is unset, we deliberately do NOT construct an ioredis
 * client. ioredis would otherwise connect to its built-in default and
 * spam connection-refused errors in serverless. Instead we export a
 * no-op stub that resolves every command to a benign value (null / 0
 * / "OK" / []). Existing callers already tolerate null returns and
 * treat Redis as best-effort.
 *
 * The stub does NOT make any security guard less strict. BillingGuard
 * and equivalents must continue to fail-closed at their own layer when
 * the cache is missing; this module only ensures that "missing Redis"
 * surfaces as benign values rather than connection errors.
 */

import IORedis, { type Redis as IORedisType } from 'ioredis';

export function createStub(): IORedisType {
    const explicit: Record<string, (...args: unknown[]) => unknown> = {
        get:         async () => null,
        set:         async () => 'OK',
        setex:       async () => 'OK',
        mset:        async () => 'OK',
        del:         async () => 0,
        exists:      async () => 0,
        expire:      async () => 0,
        persist:     async () => 0,
        ttl:         async () => -2,
        incr:        async () => 0,
        decr:        async () => 0,
        incrby:      async () => 0,
        decrby:      async () => 0,
        incrbyfloat: async () => '0',
        keys:        async () => [] as string[],
        scan:        async () => ['0', [] as string[]],
        lrange:      async () => [] as string[],
        lpush:       async () => 0,
        rpush:       async () => 0,
        lpop:        async () => null,
        rpop:        async () => null,
        llen:        async () => 0,
        sadd:        async () => 0,
        srem:        async () => 0,
        smembers:    async () => [] as string[],
        scard:       async () => 0,
        sismember:   async () => 0,
        hget:        async () => null,
        hset:        async () => 0,
        hdel:        async () => 0,
        hgetall:     async () => ({} as Record<string, string>),
        hincrby:     async () => 0,
        publish:     async () => 0,
        subscribe:   async () => 0,
        unsubscribe: async () => 0,
        ping:        async () => 'PONG',
        quit:        async () => 'OK',
        eval:        async () => null,
        evalsha:     async () => null,
    };

    // Chainable no-op for pipeline / multi.
    const chain: Record<string, unknown> = {};
    const chainProxy: unknown = new Proxy(chain, {
        get(_t, prop: string) {
            if (prop === 'exec') return async () => [] as unknown[];
            return () => chainProxy;
        },
    });

    const self: Record<string, unknown> = {
        ...explicit,
        on:          () => self,
        off:         () => self,
        once:        () => self,
        removeListener: () => self,
        duplicate:   () => self,
        disconnect:  () => undefined,
        pipeline:    () => chainProxy,
        multi:       () => chainProxy,
        status:      'ready',
    };

    // Proxy fallback for any method not enumerated above. Returns an
    // async function that resolves to null. This keeps the stub
    // forward-compatible with future call sites.
    return new Proxy(self, {
        get(target, prop: string) {
            if (prop in target) return (target as Record<string, unknown>)[prop];
            return async () => null;
        },
    }) as unknown as IORedisType;
}

const url = process.env.REDIS_URL;

const redis: IORedisType = url
    ? new IORedis(url, {
          lazyConnect: true,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 50, 2000),
      })
    : createStub();

if (url) {
    redis.on('error', () => {
        // Silenced. Callers already treat Redis as best-effort.
    });
}

export default redis;
