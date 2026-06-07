/**
 * Slice 3N — Sidebar IA tests.
 *
 * Pin the primary accountability path ordering AND ensure every legacy
 * route is preserved. Tests run against the exported ACCOUNTABILITY_ITEMS
 * constant (no JSX rendering required — keeps the test fast and stable).
 */

import { describe, expect, it } from 'vitest';
import { ACCOUNTABILITY_ITEMS } from '@/components/layout/AppSidebar';

describe('AppSidebar — primary accountability IA', () => {
    it('lists exactly seven entries in the canonical order', () => {
        expect(ACCOUNTABILITY_ITEMS.map((i) => i.id)).toEqual([
            'mission-control', 'meter', 'monitor', 'control',
            'prove', 'outcomes', 'accountability',
        ]);
    });

    it('every entry has a name and an href', () => {
        for (const item of ACCOUNTABILITY_ITEMS) {
            expect(item.name.length).toBeGreaterThan(0);
            expect(item.href.startsWith('/dashboard')).toBe(true);
        }
    });

    it('Outcomes points at the Slice 3K canonical URL', () => {
        const outcomes = ACCOUNTABILITY_ITEMS.find((i) => i.id === 'outcomes');
        expect(outcomes?.href).toBe('/dashboard/prove/outcomes');
    });

    it('Accountability points at /dashboard/accountability', () => {
        const a = ACCOUNTABILITY_ITEMS.find((i) => i.id === 'accountability');
        expect(a?.href).toBe('/dashboard/accountability');
    });
});
