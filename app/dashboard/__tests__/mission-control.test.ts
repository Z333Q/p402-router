/**
 * Slice 3O — Mission Control 2.0 source-shape tests.
 *
 * We avoid rendering the page itself (the page is a heavy useQuery client
 * component); these tests inspect the TSX source of /dashboard/page.tsx
 * and the PRODUCT_PATH constant to pin the buyer narrative.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    DISCLAIMER_METADATA_ONLY,
    DISCLAIMER_OPTIMIZE_BLOCKED,
    DISCLAIMER_RUNTIME_FLIP_BLOCKED,
    FORBIDDEN_PHRASES,
    PRODUCT_PATH,
} from '@/lib/dashboard/language';

const PAGE_SRC = readFileSync(
    resolve(process.cwd(), 'app', 'dashboard', 'page.tsx'),
    'utf8',
);

describe('PRODUCT_PATH — Slice 3O canonical order', () => {
    it('lists Meter -> Monitor -> Control -> Prove -> Outcomes -> Accountability in order', () => {
        expect(PRODUCT_PATH.map((p) => p.id)).toEqual([
            'meter', 'monitor', 'control', 'prove', 'outcomes', 'accountability',
        ]);
    });

    it('every entry has a non-empty purpose, href, and next_step', () => {
        for (const p of PRODUCT_PATH) {
            expect(p.purpose.length).toBeGreaterThan(0);
            expect(p.href.startsWith('/dashboard')).toBe(true);
            expect(p.next_step_href.startsWith('/dashboard')).toBe(true);
            expect(p.next_step_label.length).toBeGreaterThan(0);
        }
    });

    it('Outcomes points at the Slice 3K coverage URL', () => {
        expect(PRODUCT_PATH.find((p) => p.id === 'outcomes')?.href).toBe('/dashboard/prove/outcomes');
    });
});

describe('Mission Control page — header copy', () => {
    it('uses the exact 3O title', () => {
        expect(PAGE_SRC).toContain('AI Spend Accountability Command Center');
    });

    it('uses the exact 3O purpose line', () => {
        expect(PAGE_SRC).toContain(
            'Meter usage, monitor budgets, control spend, prove economic events, and prepare for outcome-based optimization.',
        );
    });

    it('imports and renders the three required disclaimers', () => {
        expect(PAGE_SRC).toContain('DISCLAIMER_METADATA_ONLY');
        expect(PAGE_SRC).toContain('DISCLAIMER_OPTIMIZE_BLOCKED');
        expect(PAGE_SRC).toContain('DISCLAIMER_RUNTIME_FLIP_BLOCKED');
    });
});

describe('Mission Control page — disclaimer content', () => {
    it('language constants encode the metadata-only contract verbatim', () => {
        expect(DISCLAIMER_METADATA_ONLY).toMatch(/economic metadata only/);
        expect(DISCLAIMER_METADATA_ONLY).toMatch(/does not display prompt or response content/);
    });

    it('language constants encode the runtime-flip-blocked contract verbatim', () => {
        expect(DISCLAIMER_RUNTIME_FLIP_BLOCKED).toMatch(/Runtime flip remains blocked/);
        expect(DISCLAIMER_RUNTIME_FLIP_BLOCKED).toMatch(/observation window/);
    });

    it('language constants encode the optimize-blocked contract verbatim', () => {
        expect(DISCLAIMER_OPTIMIZE_BLOCKED).toMatch(/Optimize recommendations remain blocked/);
    });
});

describe('Mission Control page — required sections', () => {
    it.each([
        'system-status-strip',
        'product-path',
        'cleanup-panel',
        'readiness-gates',
        'recent-activity',
        'buyer-narrative',
        'next-actions',
    ])('renders the %s section', (id) => {
        expect(PAGE_SRC).toContain(`data-testid="${id}"`);
    });

    it('declares a role card for each of the four roles', () => {
        for (const role of ['CFO', 'Engineering lead', 'Compliance / procurement', 'Operator']) {
            expect(PAGE_SRC).toContain(role);
        }
    });
});

describe('Mission Control page — forbidden phrases never appear', () => {
    function stripComments(src: string): string {
        return src
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    }
    const cleaned = stripComments(PAGE_SRC).toLowerCase();

    it.each(FORBIDDEN_PHRASES.map((p) => [p]))('%s does not appear in the page source', (phrase) => {
        expect(cleaned).not.toContain(phrase);
    });
});
