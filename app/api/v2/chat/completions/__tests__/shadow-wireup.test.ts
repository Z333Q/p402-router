/**
 * Slice 3Y-Shadow-Wireup — chat-route source-shape regression.
 *
 * Pins:
 *   - chat route imports emitChatShadow from the runtime-control module
 *   - the call site is in the post-allow branch, after the three
 *     existing billing-guard layers and before provider execution
 *   - the call is wrapped in try/catch
 *   - the catch body is a no-op (never throws, never blocks)
 *   - the chat route does NOT call billingGuard.preCheck (no consolidation)
 *   - the chat route does NOT call billingGuard.reserveBudget from a
 *     new path
 *   - the chat route does NOT call billingGuard.checkSingleRequestLimit
 *     from a new path
 *   - the chat route does NOT call billingGuard.checkAnomaly from a
 *     new path
 *   - the chat route does NOT reference p402:tcs:enforce*
 *   - no Optimize / savings / recommendation / proof / auto-apply
 *     strings introduced
 *   - the runtime-control modules (shadow, kill-switch, cache,
 *     chat-shadow, cost-estimate) do not reference p402:tcs:enforce*
 *   - no migration file added in this slice
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

function read(rel: string): string {
    return readFileSync(resolvePath(process.cwd(), rel), 'utf8');
}

const ROUTE = read('app/api/v2/chat/completions/route.ts');

describe('Slice 3Y-Shadow-Wireup — chat route imports emitChatShadow', () => {
    it('imports emitChatShadow from @/lib/runtime-control/chat-shadow', () => {
        expect(ROUTE).toMatch(/import\s*\{\s*emitChatShadow\s*\}\s*from\s*['"]@\/lib\/runtime-control\/chat-shadow['"]/);
    });

    it('calls emitChatShadow with tenantId, requestId, body', () => {
        // The bridge expects { tenantId, requestId, body }. Confirm the
        // call site uses these exact arg names so future refactors of
        // either side fail loudly rather than silently change behavior.
        expect(ROUTE).toMatch(/await emitChatShadow\(\{\s*tenantId\s*,\s*requestId\s*,\s*body\s*\}\)/);
    });

    it('there are exactly two call sites (mppx tenant path + primary auth path)', () => {
        const matches = ROUTE.match(/await emitChatShadow\(/g) ?? [];
        expect(matches.length).toBe(2);
    });
});

describe('Slice 3Y-Shadow-Wireup — call placement and try/catch wrapping', () => {
    it('each emitChatShadow call is wrapped in try { } catch { }', () => {
        // Source-shape: a try { ... await emitChatShadow(...) ... } catch
        // block must surround each call. The catch body is a comment-only
        // no-op by contract.
        const wrapped = ROUTE.match(/try\s*\{\s*await emitChatShadow[\s\S]+?\}\s*catch\s*\{[^}]*\}/g) ?? [];
        expect(wrapped.length).toBe(2);
    });

    it('catch body contains no throw (the wrapper must never propagate)', () => {
        const catches = ROUTE.match(/try\s*\{\s*await emitChatShadow[\s\S]+?\}\s*catch\s*\{([^}]*)\}/g) ?? [];
        for (const c of catches) {
            expect(c).not.toMatch(/\bthrow\b/);
        }
    });

    it('call site is after the existing three billing-guard layers', () => {
        // The guard sequence is:
        //   checkRateLimit -> checkDailySpend -> checkConcurrentReservations
        // The emitChatShadow call must appear AFTER these three checks.
        // We compare against the FIRST `await emitChatShadow(` invocation
        // (NOT the import statement, which would otherwise come first).
        const checkConcurrentIdx = ROUTE.indexOf('checkConcurrentReservations');
        const shadowIdx = ROUTE.indexOf('await emitChatShadow(');
        expect(checkConcurrentIdx).toBeGreaterThan(-1);
        expect(shadowIdx).toBeGreaterThan(checkConcurrentIdx);
    });
});

describe('Slice 3Y-Shadow-Wireup — no preCheck consolidation, no new enforcement', () => {
    it('chat route does NOT call billingGuard.preCheck (no consolidation)', () => {
        expect(ROUTE).not.toMatch(/billingGuard\.preCheck\s*\(/);
        expect(ROUTE).not.toMatch(/guard\.preCheck\s*\(/);
        expect(ROUTE).not.toMatch(/\.preCheck\s*\(\s*billingCtx/);
    });

    // The remaining three pre-existing enforcement methods may appear
    // elsewhere in the file as part of the mppx payment flow (those
    // calls predate this slice). The 3Y-Shadow-Wireup invariant is
    // that THIS SLICE adds no new call to them. We enforce that by
    // scanning the new shadow blocks (the two try { await
    // emitChatShadow(...) } catch { } blocks) for these patterns.
    function shadowBlocks(): string[] {
        const re = /try\s*\{\s*await emitChatShadow[\s\S]+?\}\s*catch\s*\{[^}]*\}/g;
        return ROUTE.match(re) ?? [];
    }

    it('the shadow wireup blocks do NOT call reserveBudget', () => {
        const blocks = shadowBlocks();
        expect(blocks.length).toBe(2);
        for (const b of blocks) {
            expect(b).not.toContain('reserveBudget');
        }
    });

    it('the shadow wireup blocks do NOT call checkSingleRequestLimit', () => {
        for (const b of shadowBlocks()) {
            expect(b).not.toContain('checkSingleRequestLimit');
        }
    });

    it('the shadow wireup blocks do NOT call checkAnomaly', () => {
        for (const b of shadowBlocks()) {
            expect(b).not.toContain('checkAnomaly');
        }
    });

    it('the shadow wireup blocks do NOT call any billingGuard method', () => {
        // The shadow block is read-only observation. No new billing-guard
        // method invocation is permitted inside it.
        for (const b of shadowBlocks()) {
            expect(b).not.toMatch(/billingGuard\./);
            expect(b).not.toMatch(/new BillingGuard\(/);
        }
    });

    it('chat route does NOT reference any p402:tcs:enforce key', () => {
        expect(ROUTE).not.toMatch(/p402:tcs:enforce/);
    });

    it('chat route does NOT introduce Optimize/savings/recommendation/proof/auto-apply strings', () => {
        // Defensive content guard against Slice-3X / Slice-3W marketing-style
        // claims leaking into the chat route. Existing references in
        // route.ts (if any pre-3Y) are pre-existing; we only check that
        // no NEW forbidden token was introduced by this slice.
        const guardrails = ['policy_auto_apply', 'savings_proof', 'optimize_recommend'];
        for (const token of guardrails) {
            expect(ROUTE).not.toContain(token);
        }
    });
});

describe('Slice 3Y-Shadow-Wireup — runtime-control modules stay clean', () => {
    const FILES = [
        'lib/runtime-control/shadow.ts',
        'lib/runtime-control/kill-switch.ts',
        'lib/runtime-control/cache.ts',
        'lib/runtime-control/chat-shadow.ts',
        'lib/runtime-control/cost-estimate.ts',
    ];

    it.each(FILES)('%s does not reference any p402:tcs:enforce key', (rel) => {
        expect(read(rel)).not.toMatch(/p402:tcs:enforce/);
    });

    it('chat-shadow.ts swallows internal failures with an empty catch', () => {
        const src = read('lib/runtime-control/chat-shadow.ts');
        expect(src).toMatch(/}\s*catch\s*\{/);
    });

    it('cost-estimate.ts has an outer try/catch and never throws', () => {
        const src = read('lib/runtime-control/cost-estimate.ts');
        // Function has an outer try that catches everything and returns 0.
        expect(src).toMatch(/try\s*\{[\s\S]+\}\s*catch\s*\{\s*return 0;\s*\}/);
        // No bare `throw new` lives in this module.
        expect(src).not.toMatch(/\bthrow new /);
    });
});

describe('Slice 3Y-Shadow-Wireup — no new migration, no schema changes', () => {
    it('only v2_056 may introduce runtime_control_shadow_decisions; no other migration adds a shadow_decisions column', () => {
        const dir = resolvePath(process.cwd(), 'scripts', 'migrations');
        const files = readdirSync(dir).filter((f) => f.endsWith('.sql'));
        const ALLOWED_PREFIX = 'v2_056_runtime_control_shadow_decisions';
        for (const f of files) {
            const sql = read(`scripts/migrations/${f}`);
            if (f.startsWith(ALLOWED_PREFIX)) continue; // 3AA-Impl: persistent shadow evidence.
            expect(sql, `${f} must not introduce runtime_control_shadow_decisions`)
                .not.toMatch(/runtime_control_shadow_decisions/i);
            expect(sql, `${f} must not add a shadow_decisions column`)
                .not.toMatch(/shadow_decisions/i);
        }
    });

    it('chat route does NOT introduce any ALTER/CREATE against ai_economic_events or traffic_events', () => {
        expect(ROUTE).not.toMatch(/ALTER\s+TABLE\s+ai_economic_events/i);
        expect(ROUTE).not.toMatch(/CREATE\s+TABLE\s+ai_economic_events/i);
        expect(ROUTE).not.toMatch(/ALTER\s+TABLE\s+traffic_events/i);
        expect(ROUTE).not.toMatch(/CREATE\s+TABLE\s+traffic_events/i);
    });
});
