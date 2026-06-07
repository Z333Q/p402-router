/**
 * Slice 3P — Source-shape tests for the demo-mode wiring on Mission
 * Control. We do not render the page here (the page is a heavy useQuery
 * client component); these tests inspect the page source for the
 * wiring contracts the brief requires.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
    resolve(process.cwd(), 'app', 'dashboard', 'page.tsx'),
    'utf8',
);

describe('Mission Control — demo mode wiring', () => {
    it('imports the demo helpers and primitives', () => {
        expect(SRC).toContain("from '@/lib/demo/accountability-story'");
        expect(SRC).toContain('isDemoMode');
        expect(SRC).toContain('buildDemoAccountabilityHealth');
        expect(SRC).toContain('DemoPreviewBanner');
        expect(SRC).toContain('EmptyLedgerStory');
    });

    it('reads ?demo=1 from useSearchParams (not a hard-coded boolean)', () => {
        expect(SRC).toContain('useSearchParams');
        expect(SRC).toMatch(/isDemoMode\(\s*searchParams\s*\)/);
    });

    it('disables the network fetch when demo mode is active', () => {
        // The useQuery call must be guarded by `enabled: !demoActive`.
        expect(SRC).toMatch(/enabled:\s*!\s*demoActive/);
    });

    it('renders the DemoPreviewBanner when demoActive', () => {
        expect(SRC).toMatch(/demoActive\s*&&\s*<DemoPreviewBanner/);
    });

    it('renders the EmptyLedgerStory only when NOT in demo mode and the ledger is empty', () => {
        // The empty-ledger guard checks !demoActive so we never surprise a
        // sales-demo viewer with the empty state on top of the demo data.
        expect(SRC).toMatch(/!\s*demoActive[^;]*total_events\s*===\s*0/s);
    });
});
