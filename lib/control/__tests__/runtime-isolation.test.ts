/**
 * Slice 3S source-shape regression, updated in Slice 3W and Slice 3X-Shadow.
 *
 * After 3W, the Control simulator route reads tenant_control_settings via
 * @/lib/control/configuration.
 *
 * After 3X-Shadow, the runtime billing-guard ALSO reads tenant_control_settings
 * — but only via the explicit shadow wrapper at @/lib/runtime-control/shadow,
 * which never denies and never throws as a billing-guard error. The
 * isolation invariant is now: the billing-guard does NOT directly import
 * the configuration helper, and the shadow module returns void.
 *
 * 3Y-Enforce is still blocked. The billing-guard MUST NOT reference any
 * `p402:tcs:enforce*` Redis key.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function read(rel: string): string {
    return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

const GUARD     = read('lib/providers/openrouter/billing-guard.ts');
const SIMULATOR = read('app/api/v2/control/simulator/route.ts');

describe('billing-guard.ts shadow-only coupling to tenant_control_settings', () => {
    it('does NOT directly import @/lib/control/configuration', () => {
        // Direct import would couple the runtime to the configuration
        // module. The shadow module is the only allowed intermediary.
        expect(GUARD).not.toMatch(/from\s+['"]@\/lib\/control\/configuration['"]/);
    });

    it('does NOT reference the configuration route URL', () => {
        expect(GUARD).not.toContain('/api/v2/control/configuration');
    });

    it('does NOT reference any p402:tcs:enforce key (3Y still blocked)', () => {
        expect(GUARD).not.toMatch(/p402:tcs:enforce/);
    });

    it('reads tenant_control_settings ONLY via the shadow wrapper', () => {
        // Positive pin: 3X-Shadow's deliberate wiring exists.
        expect(GUARD).toMatch(/from\s+['"]@\/lib\/runtime-control\/shadow['"]/);
        expect(GUARD).toContain('computeAndEmitShadow');
    });
});

describe('Slice 3W — Control simulator imports the tenant-default helper (positive pin)', () => {
    it('imports getTenantControlSettings from @/lib/control/configuration', () => {
        expect(SIMULATOR).toMatch(/from\s+['"]@\/lib\/control\/configuration['"]/);
        expect(SIMULATOR).toContain('getTenantControlSettings');
    });

    it('references the tenant_control_settings spend aggregate', () => {
        expect(SIMULATOR).toMatch(/ai_economic_events/);
        expect(SIMULATOR).toMatch(/tenant_id\s*=\s*\$1/);
    });
});
