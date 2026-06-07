/**
 * Slice 3L — Outcome Capture Activation Kit (static content tests).
 *
 * The setup library is pure. These tests pin the cross-module contract:
 *
 *   - allowed statuses listed in buildSetupApiInfo() match lib/prove/outcome.ts
 *   - canonical sources match lib/prove/outcome.ts
 *   - forbidden fields match lib/prove/outcome.ts
 *   - EVERY example code snippet is content-clean — no prompt/response/
 *     messages/completion/transcript/body wording inside the example code
 *     (we allow those names INSIDE the "forbidden_fields" reference list
 *     and inside common_validation_errors, where they appear by design).
 *   - copy strings carry the required disclaimers.
 */

import { describe, expect, it } from 'vitest';

import {
    ALLOWED_METADATA_EXAMPLES,
    ALLOWED_OUTCOME_BODY_KEYS,
    COMMON_VALIDATION_ERRORS,
    EXAMPLES,
    INTEGRATION_CHECKLIST,
    SETUP_DISCLAIMER_COPY,
    SETUP_INTRO_COPY,
    buildSetupApiInfo,
} from '@/lib/prove/outcome-setup';
import {
    CANONICAL_OUTCOME_SOURCES,
    CANONICAL_OUTCOME_STATUSES,
    FORBIDDEN_CONTENT_FIELDS,
    STORED_OUTCOME_STATUSES,
} from '@/lib/prove/outcome';

describe('buildSetupApiInfo — matches lib/prove/outcome.ts', () => {
    const info = buildSetupApiInfo();

    it('write_endpoint is /api/v2/outcomes (no Prove namespace duplicate)', () => {
        expect(info.write_endpoint).toBe('/api/v2/outcomes');
        expect(info.read_endpoint_pattern).toBe('/api/v2/prove/outcomes/<request_id>');
    });

    it('idempotency_key documents the UNIQUE constraint shape', () => {
        expect(info.idempotency_key).toBe('tenant_id + request_id');
    });

    it('body_keys are the allowed top-level keys for /api/v2/outcomes', () => {
        expect(info.body_keys).toEqual([...ALLOWED_OUTCOME_BODY_KEYS]);
    });

    it('statuses_canonical matches CANONICAL_OUTCOME_STATUSES exactly', () => {
        expect(info.statuses_canonical).toEqual([...CANONICAL_OUTCOME_STATUSES]);
    });

    it('statuses_stored matches the transitional superset exactly', () => {
        expect(info.statuses_stored).toEqual([...STORED_OUTCOME_STATUSES]);
    });

    it('sources_canonical matches CANONICAL_OUTCOME_SOURCES exactly', () => {
        expect(info.sources_canonical).toEqual([...CANONICAL_OUTCOME_SOURCES]);
    });

    it('forbidden_fields matches FORBIDDEN_CONTENT_FIELDS exactly', () => {
        expect(info.forbidden_fields).toEqual([...FORBIDDEN_CONTENT_FIELDS]);
    });
});

describe('Example snippets — content-safe', () => {
    // Words that MUST NOT appear as a JSON key in an example body. We
    // look for the literal `"name":` form so that mentioning the same
    // word in plain English (e.g. "the model output") is allowed.
    const FORBIDDEN_KEY_PATTERNS = [
        '"prompt"', '"prompts"',
        '"response"', '"responses"',
        '"messages"',
        '"completion"',
        '"transcript"',
        '"request_body"', '"response_body"',
        '"raw_trace"', '"stored_content"',
        '"content"',
    ];

    it.each(EXAMPLES.map((ex) => [ex.id, ex.code] as const))(
        '%s: code block contains no content-bearing JSON keys',
        (_id, code) => {
            for (const forbidden of FORBIDDEN_KEY_PATTERNS) {
                expect(code).not.toContain(forbidden);
            }
        },
    );

    it('each example carries a non-empty title, language, description, and code', () => {
        for (const ex of EXAMPLES) {
            expect(ex.title.length).toBeGreaterThan(0);
            expect(ex.language.length).toBeGreaterThan(0);
            expect(ex.description.length).toBeGreaterThan(0);
            expect(ex.code.length).toBeGreaterThan(0);
        }
    });

    it('every example references at least one canonical V5 status', () => {
        for (const ex of EXAMPLES) {
            const used = [...CANONICAL_OUTCOME_STATUSES].some((s) => ex.code.includes(`'${s}'`) || ex.code.includes(`"${s}"`));
            expect(used, `example ${ex.id} should use a canonical status`).toBe(true);
        }
    });

    it('SDK example uses the canonical SDK source string', () => {
        const sdk = EXAMPLES.find((e) => e.id === 'sdk-typescript');
        expect(sdk?.code).toContain("source:     'sdk'");
    });
});

describe('Allowed metadata examples', () => {
    it('every example uses a content-safe key', () => {
        for (const m of ALLOWED_METADATA_EXAMPLES) {
            expect(FORBIDDEN_CONTENT_FIELDS as readonly string[]).not.toContain(m.key);
        }
    });

    it('canonical metadata samples cover the 3J brief fields', () => {
        const keys = ALLOWED_METADATA_EXAMPLES.map((m) => m.key);
        for (const required of ['user_action', 'review_queue', 'reviewed_by_type', 'human_review_status']) {
            expect(keys).toContain(required);
        }
    });
});

describe('Integration checklist', () => {
    it('contains all spec items', () => {
        const ids = INTEGRATION_CHECKLIST.map((c) => c.id);
        expect(ids).toEqual(expect.arrayContaining([
            'request-id-propagation',
            'record-three-status-paths',
            'choose-outcome-source',
            'add-quality-score',
            'metadata-content-free',
            'test-duplicate-writes',
            'verify-event-detail',
            'watch-coverage-dashboard',
        ]));
    });

    it('every item has a non-empty title and description', () => {
        for (const c of INTEGRATION_CHECKLIST) {
            expect(c.title.length).toBeGreaterThan(0);
            expect(c.description.length).toBeGreaterThan(0);
        }
    });
});

describe('Common validation errors', () => {
    it('covers the four 3J writer error codes', () => {
        const codes = COMMON_VALIDATION_ERRORS.map((e) => e.code);
        expect(codes).toEqual(expect.arrayContaining([
            'INVALID_INPUT',
            'OUTCOME_REQUEST_ID_REQUIRED',
            'INVALID_OUTCOME_STATUS',
            'INVALID_QUALITY_SCORE',
        ]));
    });

    it('INVALID_INPUT entry names the content-field rejection path', () => {
        const e = COMMON_VALIDATION_ERRORS.find((x) => x.code === 'INVALID_INPUT')!;
        expect(e.when.toLowerCase()).toContain('content-bearing');
    });
});

describe('Copy strings', () => {
    it('intro mentions outcome capture but never claims savings', () => {
        expect(SETUP_INTRO_COPY.toLowerCase()).toContain('outcome capture');
        expect(SETUP_INTRO_COPY.toLowerCase()).not.toContain('savings');
        expect(SETUP_INTRO_COPY.toLowerCase()).toContain('does not create recommendations');
    });

    it('disclaimer pins the no-savings + content-not-stored contract', () => {
        const lc = SETUP_DISCLAIMER_COPY.toLowerCase();
        expect(lc).toContain('activation guide');
        expect(lc).toContain('not an optimize recommendation');
        expect(lc).toContain('never stored');
    });
});
