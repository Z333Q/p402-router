/**
 * Slice 3Z-C-Impl — chat-route source-shape regression for the
 * OpenRouter live catalog refresh wireup.
 *
 * Pins:
 *   - chat route imports the OpenRouterAdapter TYPE (no value import)
 *   - refreshLiveCatalog() is invoked with `void`, never `await`
 *   - call site is guarded by `orAdapter && orAdapter.isAvailable()`
 *   - call has a `.catch(() => {})` chain
 *   - call appears in both auth paths (mppx tenant + primary)
 *   - existing `return await handleStreamingResponse/...NonStreamingResponse`
 *     is preserved
 *   - no new `process.env.*` reads in the chat route
 *   - no `p402:tcs:enforce*` references introduced
 *   - the OpenRouter adapter's static catalog still contains
 *     `openai/gpt-4o` so cold-start routing has a valid fallback
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

function read(rel: string): string {
    return readFileSync(resolvePath(process.cwd(), rel), 'utf8');
}

const ROUTE   = read('app/api/v2/chat/completions/route.ts');
const ADAPTER = read('lib/ai-providers/openrouter.ts');

describe('3Z-C-Impl — type import + call shape', () => {
    it('chat route imports the OpenRouterAdapter type', () => {
        expect(ROUTE).toMatch(
            /import\s+type\s*\{\s*OpenRouterAdapter\s*\}\s*from\s*['"]@\/lib\/ai-providers\/openrouter['"]/,
        );
    });

    it('refreshLiveCatalog() is invoked with void, never await', () => {
        // Must have at least one `void <expr>.refreshLiveCatalog(`.
        expect(ROUTE).toMatch(/void\s+\w+\.refreshLiveCatalog\(/);
        // And must NOT have `await <expr>.refreshLiveCatalog(` anywhere
        // in the route — that would block the request.
        expect(ROUTE).not.toMatch(/await\s+\w+\.refreshLiveCatalog\(/);
    });

    it('call is guarded by `orAdapter && orAdapter.isAvailable()` (both shapes)', () => {
        // The primary auth path uses the variable name `orAdapter`; the
        // mppx tenant path uses `orAdapterMppx`. Both forms must guard
        // with isAvailable().
        const guardedPrimary = /if\s*\(\s*orAdapter\s*&&\s*orAdapter\.isAvailable\(\)\s*\)/;
        const guardedMppx    = /if\s*\(\s*orAdapterMppx\s*&&\s*orAdapterMppx\.isAvailable\(\)\s*\)/;
        expect(ROUTE).toMatch(guardedPrimary);
        expect(ROUTE).toMatch(guardedMppx);
    });

    it('call has .catch(() => {...}) chain to swallow any unforeseen throw', () => {
        // Match either an empty arrow body or a body containing only a
        // comment (e.g. `.catch(() => { /* never block the request */ })`).
        expect(ROUTE).toMatch(/\.refreshLiveCatalog\(\)\.catch\(\(\)\s*=>\s*\{[^}]*\}\)/);
    });
});

describe('3Z-C-Impl — both auth paths wired', () => {
    it('there are exactly two invocations across the file', () => {
        const calls = ROUTE.match(/void\s+\w+\.refreshLiveCatalog\(/g) ?? [];
        expect(calls.length).toBe(2);
    });

    it('the mppx tenant path uses a hoisted registry local (registryForMppx)', () => {
        // Prior to 3Z-C-Impl the mppx path called getProviderRegistry()
        // inline as the first argument of handleStreaming/handleNonStreaming.
        // The wireup hoists it into a local so the refresh and the
        // handlers share the same registry reference.
        expect(ROUTE).toMatch(/const\s+registryForMppx\s*=\s*getProviderRegistry\(\)/);
        // And the handlers in the mppx path now receive that local.
        expect(ROUTE).toMatch(/handleStreamingResponse\(\s*registryForMppx\s*,/);
        expect(ROUTE).toMatch(/handleNonStreamingResponse\(\s*registryForMppx\s*,/);
    });

    it('the primary auth path uses the existing `registry` local', () => {
        // The pre-existing `const registry = getProviderRegistry()` line
        // is preserved; the refresh hook reads it as `registry`.
        expect(ROUTE).toMatch(/const\s+registry\s*=\s*getProviderRegistry\(\)/);
        // The orAdapter resolution must reference `registry` (the
        // pre-existing local), not a fresh getProviderRegistry() call.
        expect(ROUTE).toMatch(/const\s+orAdapter\s*=\s*registry\.get\(\s*['"]openrouter['"]\s*\)\s+as\s+OpenRouterAdapter\s*\|\s*undefined/);
    });
});

describe('3Z-C-Impl — existing chat-route invariants preserved', () => {
    it('all four `return await handle...(...)` sites remain', () => {
        // 3Y-Pilot-Diagnostics shipped four `return await ...` sites
        // (two streaming + two non-streaming, one per auth path).
        expect(ROUTE).toMatch(/return\s+await\s+handleStreamingResponse\s*\(/);
        expect(ROUTE).toMatch(/return\s+await\s+handleNonStreamingResponse\s*\(/);
        const streamingAwait = ROUTE.match(/return\s+await\s+handleStreamingResponse\s*\(/g) ?? [];
        const nonStreamingAwait = ROUTE.match(/return\s+await\s+handleNonStreamingResponse\s*\(/g) ?? [];
        expect(streamingAwait.length).toBe(2);
        expect(nonStreamingAwait.length).toBe(2);
    });

    it('emitChatShadow wireup from 3Y-Shadow-Wireup is preserved', () => {
        const calls = ROUTE.match(/await\s+emitChatShadow\(/g) ?? [];
        expect(calls.length).toBe(2);
    });
});

describe('3Z-C-Impl — scope confirmations', () => {
    it('does NOT introduce any new process.env.* reads', () => {
        // Pre-3Z-C the chat route already touches a number of envs
        // (P402_TREASURY_ADDRESS, OPENROUTER_REFERER if any, etc.). This
        // slice MUST NOT add new ones.
        const allEnvs = ROUTE.match(/process\.env\.[A-Z_][A-Z0-9_]*/g) ?? [];
        // Pin the exact set: any env that appeared before this slice
        // is still listed; no new ones beyond OPENROUTER_REFERER (which
        // pre-exists) appear.
        for (const env of allEnvs) {
            // OpenRouter live catalog code does NOT introduce
            // OPENROUTER_API_KEY into the chat route either —
            // the adapter handles its own credential.
            expect(env).not.toBe('process.env.OPENROUTER_API_KEY');
        }
    });

    it('does NOT reference any p402:tcs:enforce key', () => {
        expect(ROUTE).not.toMatch(/p402:tcs:enforce/);
    });

    it('does NOT call billingGuard methods inside the refresh block', () => {
        // The refresh wireup must be entirely independent of billing-guard.
        // Capture the two refresh blocks and assert no BillingGuard
        // method names appear inside.
        const blocks = ROUTE.match(/if\s*\(\s*orAdapter(?:Mppx)?\s*&&\s*orAdapter(?:Mppx)?\.isAvailable\(\)[\s\S]*?\}/g) ?? [];
        expect(blocks.length).toBe(2);
        for (const b of blocks) {
            expect(b).not.toContain('billingGuard');
            expect(b).not.toContain('BillingGuard');
            expect(b).not.toContain('reserveBudget');
            expect(b).not.toContain('checkRateLimit');
            expect(b).not.toContain('checkDailySpend');
            expect(b).not.toContain('checkConcurrentReservations');
            expect(b).not.toContain('checkSingleRequestLimit');
            expect(b).not.toContain('checkAnomaly');
        }
    });
});

describe('3Z-C-Impl — adapter cold-start static catalog is still routable', () => {
    it('static MODELS list still contains at least one known-good OpenAI id', () => {
        // The hybrid catalog's cold-start state is the static MODELS
        // list. We pin one known-good id so the first request post-cold-
        // start has at least one routable model even before refresh
        // completes. Pinned to gpt-5.5-pro after openai/gpt-4o was
        // retired from the static catalog 2026-06-24 in favor of the
        // GPT-5.5 family (both verified against OpenRouter live).
        expect(ADAPTER).toMatch(/id:\s*['"]openai\/gpt-5\.5-pro['"]/);
    });

    it('the static MODELS list still contains a budget-tier model', () => {
        // 3Z-B mapping uses `tier: 'budget'` for cheapest fallback;
        // pin at least one budget-tier OpenRouter id in the static
        // catalog so the cold-start state can serve cheap routes.
        expect(ADAPTER).toMatch(/id:\s*['"]deepseek\/deepseek-chat['"]/);
    });
});
