/**
 * Slice 3S source-shape regression, updated in Slice 3W.
 *
 * After 3W, the Control simulator route DOES read tenant_control_settings
 * via @/lib/control/configuration. The runtime budget-guard MUST still
 * NOT read it. This test fails CI if a future change wires the saved
 * tenant defaults into runtime enforcement without an explicit, separately
 * approved slice (the planned 3X-Shadow / 3Y-Enforce sequence).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function read(rel: string): string {
    return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

const GUARD     = read('lib/providers/openrouter/billing-guard.ts');
const SIMULATOR = read('app/api/v2/control/simulator/route.ts');

describe('billing-guard.ts is isolated from the Control configuration module', () => {
    it('does not import tenant_control_settings', () => {
        expect(GUARD).not.toContain('tenant_control_settings');
    });

    it('does not import @/lib/control/configuration', () => {
        expect(GUARD).not.toMatch(/from\s+['"]@\/lib\/control\/configuration['"]/);
    });

    it('does not import the configuration route module', () => {
        expect(GUARD).not.toContain('/api/v2/control/configuration');
    });
});

describe('Slice 3W — Control simulator imports the tenant-default helper (positive pin)', () => {
    it('imports getTenantControlSettings from @/lib/control/configuration', () => {
        // After 3W the simulator route MUST load tenant defaults. If this
        // assertion fails, the simulator regressed to ignoring saved
        // tenant configuration.
        expect(SIMULATOR).toMatch(/from\s+['"]@\/lib\/control\/configuration['"]/);
        expect(SIMULATOR).toContain('getTenantControlSettings');
    });

    it('references the tenant_control_settings spend aggregate', () => {
        // The route's tenant-default loader queries ai_economic_events
        // for a tenant-wide MTD aggregate. Pin that we still do it.
        expect(SIMULATOR).toMatch(/ai_economic_events/);
        expect(SIMULATOR).toMatch(/tenant_id\s*=\s*\$1/);
    });
});
