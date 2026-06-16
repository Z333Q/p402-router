/**
 * Slice 3Y-Pilot-Diagnostics — error envelope contract for
 * /api/v2/chat/completions.
 *
 * Pins the fix for the empty-500 regression observed during the 3Y
 * shadow pilot: a provider exception inside handleNonStreamingResponse
 * was escaping the route's outer catch because the call site used
 * `return handle...` instead of `return await handle...`. Next.js then
 * surfaced a 500 with no body.
 *
 * This file is source-shape only. It does not boot the route. The full
 * route has many side-effect mocks (mppx, agentkit, credits) that make
 * runtime testing brittle and out of scope for the narrow bug. The
 * source-shape pins are sufficient to prevent regression of the
 * specific patterns that caused the empty-500.
 *
 * Scope confirmations (also pinned by source-shape):
 *   - the runtime route does NOT introduce any p402:tcs:enforce key
 *   - the runtime route does NOT write to ai_economic_events from a
 *     shadow code path (writes to ai_economic_events here are the
 *     existing 3M/3P recordHostedEconomicEvent path, unrelated to
 *     tenant_control_settings shadow)
 *   - the runtime route does NOT change traffic_events schema
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

function read(rel: string): string {
    return readFileSync(resolvePath(process.cwd(), rel), 'utf8');
}

const ROUTE = read('app/api/v2/chat/completions/route.ts');
const ERR   = read('lib/errors.ts');

describe('Slice 3Y-Pilot-Diagnostics — return await pattern', () => {
    it('handleNonStreamingResponse is awaited at the call site', () => {
        // The bug was `return handleNonStreamingResponse(...)` without
        // await. With await, a rejection routes to the outer catch.
        expect(ROUTE).toMatch(/return\s+await\s+handleNonStreamingResponse\s*\(/);
        // And the bare-no-await form must not exist anywhere in the file.
        expect(ROUTE).not.toMatch(/return\s+handleNonStreamingResponse\s*\(/);
    });

    it('handleStreamingResponse is awaited at the call site', () => {
        expect(ROUTE).toMatch(/return\s+await\s+handleStreamingResponse\s*\(/);
        expect(ROUTE).not.toMatch(/return\s+handleStreamingResponse\s*\(/);
    });
});

describe('Slice 3Y-Pilot-Diagnostics — outer catch envelope', () => {
    it('routes generic errors through toApiErrorResponse (structured JSON)', () => {
        // Generic errors (e.g. plain Error thrown by the Google adapter's
        // fetchGemini) fall through to toApiErrorResponse, which returns
        // a JSON envelope, not an empty body.
        expect(ROUTE).toContain('toApiErrorResponse(error, requestId)');
    });

    it('handles AIProviderError with a JSON envelope', () => {
        expect(ROUTE).toMatch(/error\s+instanceof\s+AIProviderError/);
        expect(ROUTE).toContain("'provider_error'");
    });

    it('handles BillingGuardError with a JSON envelope', () => {
        expect(ROUTE).toMatch(/error\s+instanceof\s+BillingGuardError/);
    });
});

describe('Slice 3Y-Pilot-Diagnostics — toApiErrorResponse never returns an empty body', () => {
    it('always emits a JSON body with an error field', () => {
        // The generic fallback in lib/errors.ts:toApiErrorResponse must
        // include an `error` field with type, code, message.
        expect(ERR).toMatch(/return NextResponse\.json\(/);
        expect(ERR).toContain("type: 'internal_error'");
        expect(ERR).toContain("code: 'INTERNAL_ERROR'");
        expect(ERR).toMatch(/message:\s*'An internal error occurred\.'/);
        // status 500 is a return, not the issue. The body shape is.
        expect(ERR).toMatch(/}, \{ status: 500 \}\);/);
    });

    it('never returns a NextResponse without a body when handling errors', () => {
        // Defensive grep: anywhere toApiErrorResponse exists, no path
        // produces `new Response(null, ...)` or `new NextResponse()`
        // without a body argument.
        const block = ERR.slice(ERR.indexOf('export function toApiErrorResponse'));
        expect(block).not.toMatch(/new Response\(\s*null/);
        expect(block).not.toMatch(/NextResponse\(\)/);
    });
});

describe('Slice 3Y-Pilot-Diagnostics — runtime scope confirmations', () => {
    it('chat route does not introduce any p402:tcs:enforce key', () => {
        // 3Y-Enforce remains blocked. The chat route must not even
        // reference an enforcement-toggle key by name.
        expect(ROUTE).not.toMatch(/p402:tcs:enforce/);
    });

    it('chat route does not import @/lib/runtime-control/shadow directly', () => {
        // The shadow path is reached via the billing-guard module; the
        // chat route must not bind itself to the shadow module's
        // interface (separation of concerns + 3X-Shadow isolation pin).
        expect(ROUTE).not.toMatch(/from\s+['"]@\/lib\/runtime-control\/shadow['"]/);
    });

    it('chat route does not import lib/control/configuration directly', () => {
        expect(ROUTE).not.toMatch(/from\s+['"]@\/lib\/control\/configuration['"]/);
    });

    it('chat route does not contain any new shadow_decisions or runtime_control_shadow_decisions write', () => {
        // 3X-Shadow is log-only. The chat route must NOT INSERT/UPDATE
        // into any shadow persistence table.
        expect(ROUTE).not.toMatch(/INSERT\s+INTO\s+runtime_control_shadow_decisions/i);
        expect(ROUTE).not.toMatch(/UPDATE\s+runtime_control_shadow_decisions/i);
        expect(ROUTE).not.toMatch(/shadow_decisions/);
    });

    it('chat route does not alter the traffic_events schema', () => {
        // Schema changes to traffic_events would happen in a migration,
        // not in the route. Still, defensive grep: no ALTER TABLE / CREATE
        // statements in this file.
        expect(ROUTE).not.toMatch(/ALTER\s+TABLE\s+traffic_events/i);
        expect(ROUTE).not.toMatch(/CREATE\s+TABLE\s+traffic_events/i);
    });
});

describe('migration isolation — only v2_056 may introduce runtime_control_shadow_decisions', () => {
    it('no other migration adds runtime_control_shadow_decisions or a shadow_decisions column', () => {
        const { readdirSync } = require('node:fs') as typeof import('node:fs');
        const dir = resolvePath(process.cwd(), 'scripts', 'migrations');
        const files = readdirSync(dir).filter((f: string) => f.endsWith('.sql'));
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
});
