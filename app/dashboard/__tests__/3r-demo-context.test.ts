/**
 * Slice 3R-A — Demo Story Context Across Core Surfaces.
 *
 * Source-shape tests for the five dashboard surfaces that did not
 * previously honor ?demo=1: meter (index redirect + events list),
 * control, settle, publish. Same pattern as
 * app/dashboard/__tests__/demo-mode.test.ts: we inspect the file source
 * for the wiring contract rather than rendering the heavy pages.
 *
 * Pins the additive invariant:
 *
 *   - Each surface mounts the shared DashboardDemoBanner with the
 *     correct surface key.
 *   - Live data paths (getCurrentTenantId, getSettlementStats,
 *     getSettlements, getPublishOverviewStats, the /api/v2/control and
 *     /api/v2/meter fetches) are preserved unchanged.
 *   - The shared shell forbids savings claims, final regulated-domain
 *     decisions, Optimize-recommendations-active language, and stored
 *     prompt/response/content surfacing.
 *   - Meter events demo mode signals filters-disabled (no fixture-filter
 *     logic was introduced by this slice).
 *   - Settle demo copy says no settlement execution.
 *   - Publish demo copy says no external publishing.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function read(rel: string): string {
    return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

const SHELL      = read('app/dashboard/_components/DashboardDemoBanner.tsx');
const METER_IDX  = read('app/dashboard/meter/page.tsx');
const METER_EVTS = read('app/dashboard/meter/events/page.tsx');
const CONTROL    = read('app/dashboard/control/page.tsx');
const SETTLE     = read('app/dashboard/settle/page.tsx');
const PUBLISH    = read('app/dashboard/publish/page.tsx');

const SURFACES = [
    { name: 'meter-events', src: METER_EVTS },
    { name: 'control',      src: CONTROL    },
    { name: 'settle',       src: SETTLE     },
    { name: 'publish',      src: PUBLISH    },
] as const;

describe('Slice 3R-A — shared DashboardDemoBanner shell', () => {
    it('is a client component using next/navigation hooks for searchParams + pathname', () => {
        expect(SHELL).toMatch(/^['"]use client['"];/);
        expect(SHELL).toContain('useSearchParams');
        expect(SHELL).toContain('usePathname');
    });

    it('reuses the canonical isDemoMode + getDemoScenario helpers (truth source)', () => {
        expect(SHELL).toContain("from '@/lib/demo/accountability-story'");
        expect(SHELL).toContain('isDemoMode');
        expect(SHELL).toContain("from '@/lib/demo/scenarios'");
        expect(SHELL).toContain('getDemoScenario');
    });

    it('reuses the canonical DemoPreviewBanner primitive', () => {
        expect(SHELL).toContain('DemoPreviewBanner');
    });

    it('returns null when demo mode is off (purely additive)', () => {
        expect(SHELL).toMatch(/if\s*\(!demoActive\)\s*return null/);
    });

    it('does not fetch, query, or call any live API', () => {
        expect(SHELL).not.toContain('useQuery');
        expect(SHELL).not.toContain('fetch(');
        expect(SHELL).not.toMatch(/from\s+['"]@\/lib\/db/);
    });

    it('forbids savings claim copy in the shell', () => {
        expect(SHELL.toLowerCase()).not.toMatch(/save \d+%|saves \d+%|reduce.*by \d+%|\d+% savings/);
        expect(SHELL.toLowerCase()).not.toContain('projected savings');
    });

    it('forbids Optimize-recommendations-active copy in the shell', () => {
        // "Optimize recommendations" may appear in negations elsewhere; this
        // shell does not name Optimize at all.
        expect(SHELL).not.toMatch(/optimize\s+(recommends|active|on|live|running)/i);
    });

    it('forbids final regulated-domain decision copy in the shell', () => {
        const lc = SHELL.toLowerCase();
        expect(lc).not.toMatch(/diagnos(is|ed)|approved for|denied for|patient (qualif|elig)|tenant approved|tenant denied|evict|conviction/);
    });

    it('forbids stored prompt/response/content surfacing in the shell', () => {
        const lc = SHELL.toLowerCase();
        expect(lc).not.toMatch(/\bprompt:\s|\bresponse:\s|\bmessages:\s|raw_trace|stored_content/);
    });

    it('declares the four surface-specific readiness notes', () => {
        for (const surface of ['meter-events', 'control', 'settle', 'publish']) {
            expect(SHELL).toContain(`'${surface}'`);
        }
    });

    it('settle note says no settlement execution and no fabricated tx hash', () => {
        expect(SHELL).toMatch(/no settlement is executed/i);
        expect(SHELL).toMatch(/no transaction hash is fabricated/i);
    });

    it('publish note says no external publishing and no Bazaar entry creation', () => {
        expect(SHELL).toMatch(/no external publishing is performed/i);
        expect(SHELL).toMatch(/no Bazaar entry is created/i);
    });

    it('meter-events note says filters are inert and no synthetic rows are fabricated', () => {
        expect(SHELL).toMatch(/does not fabricate economic-event rows/i);
        expect(SHELL).toMatch(/filters are inert in demo mode/i);
    });

    it('control note says no policy writes and no runtime enforcement change', () => {
        expect(SHELL).toMatch(/does not write policies/i);
        expect(SHELL).toMatch(/runtime enforcement/i);
    });
});

describe('Slice 3R-A — meter index redirect preserves the demo query string', () => {
    it('reads searchParams and forwards them onto /dashboard/meter/events', () => {
        expect(METER_IDX).toContain('searchParams');
        expect(METER_IDX).toContain('/dashboard/meter/events');
        // Both the with-qs and bare-redirect paths must exist.
        expect(METER_IDX).toMatch(/qs\s*\?\s*`\/dashboard\/meter\/events\?\$\{qs\}`\s*:\s*['"]\/dashboard\/meter\/events['"]/);
    });

    it('does not hard-strip the incoming query string', () => {
        // Old behavior was an unconditional redirect to a query-less path.
        // Regression guard: the bare-redirect must be the fallback, not the
        // sole path.
        expect(METER_IDX).not.toMatch(/^\s*redirect\(['"]\/dashboard\/meter\/events['"]\);\s*$/m);
    });
});

describe('Slice 3R-A — per-surface wiring', () => {
    it.each(SURFACES.map((s) => [s.name, s.src] as const))(
        '%s surface mounts <DashboardDemoBanner surface="%s" />',
        (surface, src) => {
            expect(src).toContain(`<DashboardDemoBanner surface="${surface}" />`);
            expect(src).toContain("/_components/DashboardDemoBanner");
        },
    );

    it('meter/events imports from ../../_components/DashboardDemoBanner', () => {
        expect(METER_EVTS).toContain("from '../../_components/DashboardDemoBanner'");
        expect(METER_EVTS).toContain('<DashboardDemoBanner surface="meter-events" />');
    });

    it('control imports from ../_components/DashboardDemoBanner', () => {
        expect(CONTROL).toContain("from '../_components/DashboardDemoBanner'");
        expect(CONTROL).toContain('<DashboardDemoBanner surface="control" />');
    });

    it('settle imports from ../_components/DashboardDemoBanner', () => {
        expect(SETTLE).toContain("from '../_components/DashboardDemoBanner'");
        expect(SETTLE).toContain('<DashboardDemoBanner surface="settle" />');
    });

    it('publish imports from ../_components/DashboardDemoBanner', () => {
        expect(PUBLISH).toContain("from '../_components/DashboardDemoBanner'");
        expect(PUBLISH).toContain('<DashboardDemoBanner surface="publish" />');
    });
});

describe('Slice 3R-A — live data paths are preserved (additive invariant)', () => {
    it('settle still imports getCurrentTenantId, getSettlements, getSettlementStats', () => {
        expect(SETTLE).toContain('getCurrentTenantId');
        expect(SETTLE).toContain('getSettlements');
        expect(SETTLE).toContain('getSettlementStats');
        expect(SETTLE).toContain("from '@/lib/db/queries'");
    });

    it('publish still imports getCurrentTenantId, getPublishOverviewStats', () => {
        expect(PUBLISH).toContain('getCurrentTenantId');
        expect(PUBLISH).toContain('getPublishOverviewStats');
        expect(PUBLISH).toContain("from '@/lib/db/queries'");
    });

    it('control still drives the live /api/v2/control overview useQuery', () => {
        expect(CONTROL).toContain('useQuery');
        expect(CONTROL).toMatch(/api\/v2\/control/);
    });

    it('meter/events still drives the live /api/v2/meter/events useQuery', () => {
        expect(METER_EVTS).toContain('useQuery');
        expect(METER_EVTS).toMatch(/api\/v2\/meter\/events/);
    });
});
