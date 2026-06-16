/**
 * Slice 3X-Shadow — runtime-shape regression.
 *
 * After 3X-Shadow, billing-guard.ts DOES import the shadow module so it
 * can run the read-only shadow path on the allow branch. The shadow
 * module never returns a denial; the guard's return type stays a
 * Reservation. This test pins those structural invariants.
 *
 * Critical guard: billing-guard MUST NOT reference any
 * `p402:tcs:enforce*` Redis key, and MUST NOT import enforcement
 * helpers that read tenant_control_settings.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function read(rel: string): string {
    return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

const GUARD  = read('lib/providers/openrouter/billing-guard.ts');
const SHADOW = read('lib/runtime-control/shadow.ts');
const KS     = read('lib/runtime-control/kill-switch.ts');
const CACHE  = read('lib/runtime-control/cache.ts');

describe('billing-guard.ts shadow wiring', () => {
    it('imports computeAndEmitShadow from the runtime-control module', () => {
        expect(GUARD).toMatch(/from\s+['"]@\/lib\/runtime-control\/shadow['"]/);
        expect(GUARD).toContain('computeAndEmitShadow');
    });

    it('calls computeAndEmitShadow only when tenantId is present', () => {
        expect(GUARD).toMatch(/if\s*\(\s*ctx\.tenantId\s*\)/);
    });

    it('wraps the shadow call in a try/catch (no propagation guarantee)', () => {
        // Source-shape pin: the outer try/catch around computeAndEmitShadow
        // must exist so the shadow path can never propagate as a deny.
        expect(GUARD).toMatch(/try\s*{[\s\S]*computeAndEmitShadow[\s\S]*}\s*catch/);
    });

    it('never references any p402:tcs:enforce key', () => {
        // The enforce switch belongs to 3Y. The guard MUST NOT read or
        // write any enforce key in 3X-Shadow.
        expect(GUARD).not.toMatch(/p402:tcs:enforce/);
    });

    it('preCheck still returns a Reservation (existing contract unchanged)', () => {
        expect(GUARD).toMatch(/async preCheck\([^)]*\): Promise<Reservation>/);
        // The end of preCheck still returns the existing reservation
        // value, never a value derived from the shadow path.
        expect(GUARD).toMatch(/return reservation;\s*}\s*}/);
    });
});

describe('shadow module isolation guarantees', () => {
    it('shadow.ts does not import the billing-guard', () => {
        expect(SHADOW).not.toMatch(/from\s+['"]@\/lib\/providers\/openrouter\/billing-guard['"]/);
    });

    it('shadow.ts does not reference any enforce key', () => {
        expect(SHADOW).not.toMatch(/p402:tcs:enforce/);
    });

    it('shadow.ts never throws as a deny — it only logs', () => {
        // Source-shape pin: the only error-shaped exit is structured logging.
        // The function signature must return void (no error payload).
        expect(SHADOW).toMatch(/export async function computeAndEmitShadow[\s\S]*: Promise<void>/);
        // No BillingGuardError import or instantiation.
        expect(SHADOW).not.toContain('BillingGuardError');
        // No `throw new` anywhere in the body.
        expect(SHADOW).not.toMatch(/\bthrow new /);
    });

    it('kill-switch does not read or write any enforce key', () => {
        expect(KS).not.toMatch(/p402:tcs:enforce/);
    });

    it('cache module does not perform any UPDATE / INSERT / DELETE against the canonical ledger', () => {
        // The cache reads ai_economic_events for the MTD aggregate (SELECT only).
        expect(CACHE).toMatch(/SELECT[\s\S]+FROM ai_economic_events/);
        expect(CACHE).not.toMatch(/INSERT\s+INTO ai_economic_events/i);
        expect(CACHE).not.toMatch(/UPDATE\s+ai_economic_events/i);
        expect(CACHE).not.toMatch(/DELETE\s+FROM ai_economic_events/i);
    });
});

describe('migration isolation', () => {
    it('only v2_056 may introduce runtime_control_shadow_decisions; no migration introduces a shadow_decisions COLUMN on any other table', () => {
        const { readdirSync } = require('node:fs') as typeof import('node:fs');
        const migrationsDir = resolve(process.cwd(), 'scripts', 'migrations');
        const files = readdirSync(migrationsDir).filter((f: string) => f.endsWith('.sql'));
        const ALLOWED_PREFIX = 'v2_056_runtime_control_shadow_decisions';
        for (const f of files) {
            const sql = read(`scripts/migrations/${f}`);
            if (f.startsWith(ALLOWED_PREFIX)) continue; // 3AA-Impl: persistent shadow evidence.
            expect(sql, `${f} must not introduce runtime_control_shadow_decisions`)
                .not.toMatch(/runtime_control_shadow_decisions/i);
            // Other migrations must not introduce a `shadow_decisions` column on any unrelated table.
            expect(sql, `${f} must not introduce a shadow_decisions column`)
                .not.toMatch(/shadow_decisions/i);
        }
    });
});
