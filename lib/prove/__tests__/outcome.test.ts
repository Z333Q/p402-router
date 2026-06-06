/**
 * Slice 3J — Outcome library tests.
 *
 * Pins the V5 canonical vocabulary, the transitional superset that v2_054
 * installs, the legacy-status normalization rewrite rules, the canonical
 * source enum, the content-field rejection allow-list, and the outcome
 * tone map.
 */

import { describe, expect, it } from 'vitest';
import {
    CANONICAL_OUTCOME_STATUSES,
    CANONICAL_OUTCOME_STATUS_SET,
    CANONICAL_OUTCOME_SOURCES,
    FORBIDDEN_CONTENT_FIELDS,
    FORBIDDEN_CONTENT_FIELD_SET,
    LEGACY_OUTCOME_STATUSES,
    STORED_OUTCOME_STATUSES,
    STORED_OUTCOME_STATUS_SET,
    getOutcomeTone,
    isCanonicalSource,
    normalizeStoredStatus,
    scanForForbiddenFields,
} from '@/lib/prove/outcome';

describe('Status vocabularies', () => {
    it('V5 canonical list matches §8.3 exactly', () => {
        expect([...CANONICAL_OUTCOME_STATUSES].sort()).toEqual(
            ['accepted','escalated','failed','pending_review','rejected','revised','unknown'],
        );
    });

    it('stored superset adds the v2_051 legacy values without dropping V5 values', () => {
        for (const v of CANONICAL_OUTCOME_STATUSES) {
            expect(STORED_OUTCOME_STATUS_SET.has(v)).toBe(true);
        }
        for (const v of LEGACY_OUTCOME_STATUSES) {
            expect(STORED_OUTCOME_STATUS_SET.has(v)).toBe(true);
        }
        expect(STORED_OUTCOME_STATUSES.length).toBe(CANONICAL_OUTCOME_STATUSES.length + LEGACY_OUTCOME_STATUSES.length);
    });

    it('CANONICAL set never contains the legacy values', () => {
        for (const v of LEGACY_OUTCOME_STATUSES) {
            expect(CANONICAL_OUTCOME_STATUS_SET.has(v)).toBe(false);
        }
    });
});

describe('normalizeStoredStatus — legacy rewrite rules', () => {
    it('retried -> revised, legacy_status preserved', () => {
        expect(normalizeStoredStatus('retried')).toEqual({ status: 'revised', legacy_status: 'retried' });
    });
    it('human_reviewed -> accepted, legacy_status preserved', () => {
        expect(normalizeStoredStatus('human_reviewed')).toEqual({ status: 'accepted', legacy_status: 'human_reviewed' });
    });
    it.each(CANONICAL_OUTCOME_STATUSES.map((s) => [s]))(
        '%s passes through verbatim with legacy_status=null',
        (s) => {
            expect(normalizeStoredStatus(s)).toEqual({ status: s, legacy_status: null });
        },
    );
    it('an unknown stored value defaults to canonical "unknown" (defensive)', () => {
        expect(normalizeStoredStatus('totally_made_up')).toEqual({ status: 'unknown', legacy_status: null });
    });
});

describe('Source enum', () => {
    it('canonical sources match the brief', () => {
        expect([...CANONICAL_OUTCOME_SOURCES].sort()).toEqual(
            ['application_callback','evaluator','human_review','import','sdk','user_feedback'],
        );
    });
    it('isCanonicalSource is true for canonical values and false otherwise', () => {
        for (const v of CANONICAL_OUTCOME_SOURCES) expect(isCanonicalSource(v)).toBe(true);
        for (const v of ['mcp', 'cli', 'webhook', 'made-up']) expect(isCanonicalSource(v as never)).toBe(false);
    });
});

describe('scanForForbiddenFields — content rejection', () => {
    it('lists the spec content fields explicitly', () => {
        // The set is the contract that the writer enforces; pin every name.
        for (const f of [
            'prompt','prompts','response','responses','messages','completion',
            'content','text','file','files','document','documents',
            'chat','chat_history','transcript','request_body','response_body',
            'raw_trace','stored_content',
        ]) {
            expect(FORBIDDEN_CONTENT_FIELD_SET.has(f), `missing forbidden field: ${f}`).toBe(true);
        }
        expect(FORBIDDEN_CONTENT_FIELDS.length).toBe(FORBIDDEN_CONTENT_FIELD_SET.size);
    });

    it('passes a clean envelope', () => {
        expect(scanForForbiddenFields({
            request_id: 'r', status: 'accepted', source: 'sdk',
            metadata: { rejected_reason: 'too verbose', reviewed_by_type: 'human' },
        })).toEqual({ found: false });
    });

    it('catches top-level content fields', () => {
        expect(scanForForbiddenFields({ request_id: 'r', prompt: 'X' })).toEqual({ found: true, field: 'prompt' });
        expect(scanForForbiddenFields({ request_id: 'r', messages: [] })).toEqual({ found: true, field: 'messages' });
        expect(scanForForbiddenFields({ request_id: 'r', request_body: '...' })).toEqual({ found: true, field: 'request_body' });
    });

    it('catches metadata-level content fields with a "metadata." prefix', () => {
        expect(scanForForbiddenFields({ metadata: { transcript: '...' } }))
            .toEqual({ found: true, field: 'metadata.transcript' });
        expect(scanForForbiddenFields({ metadata: { response_body: '...' } }))
            .toEqual({ found: true, field: 'metadata.response_body' });
        expect(scanForForbiddenFields({ metadata: { stored_content: '...' } }))
            .toEqual({ found: true, field: 'metadata.stored_content' });
    });

    it('handles null/undefined/array metadata safely', () => {
        expect(scanForForbiddenFields(null).found).toBe(false);
        expect(scanForForbiddenFields(undefined).found).toBe(false);
        expect(scanForForbiddenFields({ metadata: ['array', 'rejected'] }).found).toBe(false);
    });
});

describe('getOutcomeTone', () => {
    it.each([
        ['accepted',       'green'],
        ['rejected',       'red'],
        ['revised',        'amber'],
        ['failed',         'red'],
        ['escalated',      'amber'],
        ['pending_review', 'amber'],
        ['unknown',        'gray'],
    ] as const)('%s -> %s', (status, tone) => {
        expect(getOutcomeTone(status).tone).toBe(tone);
    });
    it('null (no outcome recorded) -> gray with explanatory label', () => {
        const d = getOutcomeTone(null);
        expect(d.tone).toBe('gray');
        expect(d.label.toLowerCase()).toContain('no outcome');
    });
});
