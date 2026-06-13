/**
 * Slice 3S — Runtime-isolation source-shape regression.
 *
 * The configuration foundation is intentionally decoupled from the
 * runtime budget-guard and the Control simulator. This test pins that
 * decoupling at the import level so a future change cannot silently
 * wire saved tenant defaults into runtime enforcement (or the simulator)
 * without an explicit, separately approved slice.
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

describe('Control simulator is unchanged by 3S', () => {
    it('does not import tenant_control_settings', () => {
        expect(SIMULATOR).not.toContain('tenant_control_settings');
    });

    it('does not import @/lib/control/configuration', () => {
        expect(SIMULATOR).not.toMatch(/from\s+['"]@\/lib\/control\/configuration['"]/);
    });
});
