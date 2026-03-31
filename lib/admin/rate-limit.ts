/**
 * Admin login rate limiter.
 * Uses the same Redis INCR+PEXPIRE pattern as lib/intelligence/api-helpers.ts.
 * Limit: 5 attempts per IP per 15-minute window.
 */
import redis from '@/lib/redis';

const MAX_ATTEMPTS = 5;
const WINDOW_MS    = 15 * 60 * 1000; // 15 minutes

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetMs: number;
}

export async function checkAdminLoginRateLimit(ip: string): Promise<RateLimitResult> {
    if (!process.env.REDIS_URL) {
        // Redis not configured — fail-open for login (fail-closed would lock out admins)
        return { allowed: true, remaining: MAX_ATTEMPTS, resetMs: 0 };
    }

    const key = `ratelimit:admin:login:${ip}`;
    try {
        const count = await redis.incr(key);
        if (count === 1) {
            await redis.pexpire(key, WINDOW_MS);
        }
        const ttlMs = await redis.pttl(key);
        const remaining = Math.max(0, MAX_ATTEMPTS - count);
        return {
            allowed:   count <= MAX_ATTEMPTS,
            remaining,
            resetMs:   ttlMs > 0 ? ttlMs : WINDOW_MS,
        };
    } catch {
        // Redis error — fail-open
        return { allowed: true, remaining: MAX_ATTEMPTS, resetMs: 0 };
    }
}

export async function clearAdminLoginRateLimit(ip: string): Promise<void> {
    if (!process.env.REDIS_URL) return;
    try {
        await redis.del(`ratelimit:admin:login:${ip}`);
    } catch { /* ignore */ }
}
