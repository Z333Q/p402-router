/**
 * Slice 3N — Shared dashboard language tests.
 *
 * Pins the disclaimer wording and the forbidden-phrase list. Other
 * tests scan TSX source against these constants.
 */

import { describe, expect, it } from 'vitest';
import {
    DISCLAIMER_DENIED_EVENTS,
    DISCLAIMER_METADATA_ONLY,
    DISCLAIMER_OPTIMIZE_BLOCKED,
    DISCLAIMER_READINESS_NOT_RECOMMENDATION,
    DISCLAIMER_RUNTIME_FLIP_BLOCKED,
    FORBIDDEN_PHRASES,
    PRIMARY_IA,
    PRODUCT_VOCABULARY,
} from '@/lib/dashboard/language';

describe('Canonical disclaimers', () => {
    it('metadata-only wording is exactly the brief example', () => {
        expect(DISCLAIMER_METADATA_ONLY).toBe(
            'This page uses economic metadata only. It does not display prompt or response content.',
        );
    });
    it('readiness-not-recommendation wording is exactly the brief example', () => {
        expect(DISCLAIMER_READINESS_NOT_RECOMMENDATION).toBe(
            'This is readiness analysis, not an Optimize recommendation.',
        );
    });
    it('runtime-flip-blocked wording is exactly the brief example', () => {
        expect(DISCLAIMER_RUNTIME_FLIP_BLOCKED).toBe(
            'Runtime flip remains blocked until the observation window and reconciliation gates pass.',
        );
    });
    it('denied-events wording is exactly the brief example', () => {
        expect(DISCLAIMER_DENIED_EVENTS).toBe(
            'Denied events are requests stopped before provider execution.',
        );
    });
    it('optimize-blocked disclaimer mentions Optimize and never claims savings', () => {
        const lc = DISCLAIMER_OPTIMIZE_BLOCKED.toLowerCase();
        expect(lc).toContain('optimize recommendations remain blocked');
        expect(lc).not.toContain('savings of');
        expect(lc).not.toContain('switch to');
    });
});

describe('Product vocabulary', () => {
    it('contains every brief-listed term', () => {
        for (const term of [
            'AI spend accountability', 'economic events', 'denied events',
            'outcome coverage', 'evidence coverage', 'attribution completeness',
            'runtime flip readiness', 'Optimize readiness analysis',
        ]) {
            expect(PRODUCT_VOCABULARY).toContain(term);
        }
    });
});

describe('Forbidden phrases — never appear in product copy', () => {
    it('covers every phrase from the brief', () => {
        // 'switch to' is stored as 'switch to ' (trailing space) so the
        // scanner does not false-match identifiers like 'switch_toggled'.
        // Same intent — pin the brief-listed concept here.
        const list = [...FORBIDDEN_PHRASES];
        for (const phrase of [
            'we recommend',
            'projected savings',
            'cheaper than',
            'worst user',
            'bad employee',
        ]) {
            expect(list).toContain(phrase);
        }
        expect(list.some((p) => p.trim() === 'switch to')).toBe(true);
    });

    it('every phrase is lowercase (case-folding contract)', () => {
        for (const p of FORBIDDEN_PHRASES) {
            expect(p).toBe(p.toLowerCase());
        }
    });
});

describe('Primary IA', () => {
    it('lists the 7 accountability-path entries in order', () => {
        expect(PRIMARY_IA.map((i) => i.id)).toEqual([
            'mission-control', 'meter', 'monitor', 'control',
            'prove', 'outcomes', 'accountability',
        ]);
    });
    it('Outcomes points to the Slice 3K coverage page (one canonical URL)', () => {
        expect(PRIMARY_IA.find((i) => i.id === 'outcomes')?.href).toBe('/dashboard/prove/outcomes');
    });
});
