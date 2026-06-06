/**
 * Slice 3G — Semantic tone helpers.
 *
 * Mapping tests for the payment-grade color semantics. These also pin the
 * accessibility contract: every tone has a text label and a glyph so the
 * dashboard can be read without color.
 */

import { describe, expect, it } from 'vitest';
import {
    getGovernanceTone,
    getEvidenceTone,
    getPrivacyTone,
    getAttributionTone,
    getSpendRiskTone,
    getStatusCodeTone,
} from '../semantic';

describe('Governance tone mapping', () => {
    it('approved -> green', () => expect(getGovernanceTone('approved').tone).toBe('green'));
    it('denied   -> red',   () => expect(getGovernanceTone('denied').tone).toBe('red'));
    it('warned          -> amber', () => expect(getGovernanceTone('warned').tone).toBe('amber'));
    it('requires_review -> amber', () => expect(getGovernanceTone('requires_review').tone).toBe('amber'));
    it('null  -> gray',  () => expect(getGovernanceTone(null).tone).toBe('gray'));
    it('empty -> gray',  () => expect(getGovernanceTone('').tone).toBe('gray'));
    it('every descriptor carries a non-empty label + glyph', () => {
        for (const v of ['approved', 'denied', 'warned', 'requires_review', null, 'cached']) {
            const d = getGovernanceTone(v as string | null);
            expect(d.label.length).toBeGreaterThan(0);
            expect(d.glyph.length).toBeGreaterThan(0);
        }
    });
});

describe('Evidence tone mapping', () => {
    it('present -> green', () => expect(getEvidenceTone('present').tone).toBe('green'));
    it('missing -> amber', () => expect(getEvidenceTone('missing').tone).toBe('amber'));
    it('failed  -> red',   () => expect(getEvidenceTone('failed').tone).toBe('red'));
    it('n/a     -> gray',  () => expect(getEvidenceTone('not_applicable').tone).toBe('gray'));
    it('null    -> gray',  () => expect(getEvidenceTone(null).tone).toBe('gray'));
});

describe('Privacy tone mapping', () => {
    it('metadata_only    -> purple', () => expect(getPrivacyTone('metadata_only').tone).toBe('purple'));
    it('fingerprint_only -> blue',   () => expect(getPrivacyTone('fingerprint_only').tone).toBe('blue'));
    it('redacted_trace   -> amber',  () => expect(getPrivacyTone('redacted_trace').tone).toBe('amber'));
    it('full_trace       -> red',    () => expect(getPrivacyTone('full_trace').tone).toBe('red'));
    it('private_gateway  -> green',  () => expect(getPrivacyTone('private_gateway').tone).toBe('green'));
    it('unknown          -> gray',   () => expect(getPrivacyTone('does-not-exist').tone).toBe('gray'));
    it('null             -> gray',   () => expect(getPrivacyTone(null).tone).toBe('gray'));
});

describe('Attribution tone mapping', () => {
    it('attributed   -> green', () => expect(getAttributionTone('attributed').tone).toBe('green'));
    it('partial      -> amber', () => expect(getAttributionTone('partial').tone).toBe('amber'));
    it('unattributed -> red',   () => expect(getAttributionTone('unattributed').tone).toBe('red'));
    it('not_applicable -> gray', () => expect(getAttributionTone('not_applicable').tone).toBe('gray'));
    it('null         -> gray',  () => expect(getAttributionTone(null).tone).toBe('gray'));
});

describe('Spend risk tone mapping', () => {
    it('normal      -> blue',  () => expect(getSpendRiskTone('normal').tone).toBe('blue'));
    it('high        -> amber', () => expect(getSpendRiskTone('high').tone).toBe('amber'));
    it('budget_risk -> red',   () => expect(getSpendRiskTone('budget_risk').tone).toBe('red'));
    it('zero_cost   -> gray (denied)', () => expect(getSpendRiskTone('zero_cost').tone).toBe('gray'));
});

describe('Status code tone mapping', () => {
    it('200 -> green', () => expect(getStatusCodeTone(200).tone).toBe('green'));
    it('204 -> green', () => expect(getStatusCodeTone(204).tone).toBe('green'));
    it('403 -> red',   () => expect(getStatusCodeTone(403).tone).toBe('red'));
    it('500 -> red',   () => expect(getStatusCodeTone(500).tone).toBe('red'));
    it('null -> gray', () => expect(getStatusCodeTone(null).tone).toBe('gray'));
});
