/**
 * Slice 3X-Shadow — kill-switch readers for the runtime shadow path.
 *
 * Two layers:
 *   - global   : p402:tcs:shadow:enabled   ("1" = shadow on)
 *   - per-tenant: p402:tcs:shadow:tenant:{tenantId}  ("1" force-on |
 *                                                     "0" force-off |
 *                                                     absent inherits global)
 *
 * No enforcement switch. This module intentionally does not read or
 * write any enforcement-toggle key. Runtime enforcement is blocked
 * until a separately approved 3Y slice introduces and tests that
 * switch under its own key namespace.
 *
 * Fail-closed on any Redis error: shadow is "off" so the runtime path
 * looks identical to today. This is the safe direction — we never
 * default to "on" on transient Redis trouble.
 */

export const GLOBAL_SHADOW_KEY = 'p402:tcs:shadow:enabled';
export function tenantShadowKey(tenantId: string): string {
    return `p402:tcs:shadow:tenant:${tenantId}`;
}

/**
 * Minimal Redis interface this module relies on. ioredis instances
 * satisfy this; tests inject a small fake. We avoid importing the
 * ioredis type so this module can be unit-tested without pulling in
 * the full client surface.
 */
export interface RedisLike {
    get(key: string): Promise<string | null>;
}

/**
 * Returns true iff shadow mode is enabled for this tenant.
 *
 * Order of decision:
 *   1. Per-tenant override "1" → on (regardless of global)
 *   2. Per-tenant override "0" → off (regardless of global)
 *   3. Global "1" → on
 *   4. Otherwise → off (default + Redis errors)
 */
export async function isShadowEnabled(
    tenantId: string,
    redis: RedisLike,
): Promise<boolean> {
    try {
        const tenantOverride = await redis.get(tenantShadowKey(tenantId));
        if (tenantOverride === '1') return true;
        if (tenantOverride === '0') return false;
        const global = await redis.get(GLOBAL_SHADOW_KEY);
        return global === '1';
    } catch {
        return false;
    }
}
