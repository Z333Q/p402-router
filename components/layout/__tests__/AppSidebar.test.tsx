/**
 * V5 §21.3 Sidebar primary IA tests.
 *
 * Pins the eleven-entry primary nav and its canonical order. Source-shape
 * only (no JSX render) so the test stays fast and stable.
 */

import { describe, expect, it } from 'vitest';
import { PRIMARY_NAV, ACCOUNTABILITY_ITEMS } from '@/components/layout/AppSidebar';

describe('AppSidebar V5 primary IA', () => {
    it('lists exactly eleven entries in the canonical order', () => {
        expect(PRIMARY_NAV.map((i) => i.id)).toEqual([
            'overview', 'meter', 'monitor', 'control', 'optimize',
            'settle', 'prove', 'publish', 'developers',
            'billing', 'settings',
        ]);
    });

    it('every entry has a non-empty name and a /dashboard-rooted href', () => {
        for (const item of PRIMARY_NAV) {
            expect(item.name.length).toBeGreaterThan(0);
            expect(item.href.startsWith('/dashboard')).toBe(true);
        }
    });

    it('Overview points at the dashboard root', () => {
        const overview = PRIMARY_NAV.find((i) => i.id === 'overview');
        expect(overview?.href).toBe('/dashboard');
    });

    it('Meter points at /dashboard/meter/events', () => {
        const meter = PRIMARY_NAV.find((i) => i.id === 'meter');
        expect(meter?.href).toBe('/dashboard/meter/events');
    });

    it('Settle points at an existing settlement surface', () => {
        const settle = PRIMARY_NAV.find((i) => i.id === 'settle');
        // Until /dashboard/settle is built (T2.10), Settle resolves to the
        // existing transactions surface so deep links don't 404.
        expect(settle?.href).toMatch(/^\/dashboard\/(settle|transactions)$/);
    });

    it('Publish points at the Discovery surface', () => {
        const publish = PRIMARY_NAV.find((i) => i.id === 'publish');
        expect(publish?.href).toMatch(/^\/dashboard\/(publish|bazaar)$/);
    });

    it('Developers is the only grouped entry', () => {
        const grouped = PRIMARY_NAV.filter((i) => 'isGroup' in i && i.isGroup);
        expect(grouped).toHaveLength(1);
        expect(grouped[0]?.id).toBe('developers');
    });

    it('back-compat: ACCOUNTABILITY_ITEMS alias still exports PRIMARY_NAV', () => {
        expect(ACCOUNTABILITY_ITEMS).toBe(PRIMARY_NAV);
    });
});
