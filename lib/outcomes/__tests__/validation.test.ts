import { describe, it, expect } from 'vitest';
import {
    FORBIDDEN_METADATA_PATTERNS,
    OutcomeValidationError,
    rejectClientTenantFields,
    sanitizeMetadata,
    validateContext,
    validateOutcome,
} from '../validation';
import { ALLOWED_METADATA_KEYS } from '../types';

const validInput = () => ({
    request_id: 'req_abc123',
    outcome_type: 'request_completion' as const,
    outcome_status: 'accepted' as const,
    source: 'sdk' as const,
});

const validContext = () => ({
    tenant_id: '4f689ea1-7340-476a-878e-9f0b930e5fd4',
    reported_by: 'tenant-session',
});

describe('validation: validateContext', () => {
    it('accepts a UUID tenant_id and short reported_by', () => {
        expect(validateContext(validContext())).toEqual(validContext());
    });

    it('rejects missing tenant', () => {
        expect(() => validateContext({ tenant_id: undefined, reported_by: 'x' })).toThrow(OutcomeValidationError);
        expect(() => validateContext({ tenant_id: 'not-a-uuid', reported_by: 'x' })).toThrow(/tenant_id/);
    });

    it('rejects reported_by missing or too long', () => {
        expect(() => validateContext({ tenant_id: validContext().tenant_id, reported_by: '' })).toThrow(/reported_by/);
        expect(() => validateContext({ tenant_id: validContext().tenant_id, reported_by: 'x'.repeat(129) })).toThrow(/reported_by/);
    });
});

describe('validation: validateOutcome', () => {
    it('accepts a minimum valid outcome', () => {
        const out = validateOutcome(validInput());
        expect(out.request_id).toBe('req_abc123');
        expect(out.outcome_type).toBe('request_completion');
        expect(out.outcome_status).toBe('accepted');
        expect(out.source).toBe('sdk');
        expect(out.metadata).toEqual({});
        expect(out.quality_score).toBeNull();
        expect(out.occurred_at).toBeNull();
    });

    it('rejects missing request_id', () => {
        expect(() => validateOutcome({ ...validInput(), request_id: undefined })).toThrow(/request_id/);
    });

    it('rejects unknown outcome_type', () => {
        expect(() => validateOutcome({ ...validInput(), outcome_type: 'weird' })).toThrow(/outcome_type/);
    });

    it('rejects unknown outcome_status', () => {
        expect(() => validateOutcome({ ...validInput(), outcome_status: 'maybe' })).toThrow(/outcome_status/);
    });

    it('rejects unknown source in strict mode (default)', () => {
        expect(() => validateOutcome({ ...validInput(), source: 'curl' })).toThrow(/source/);
    });

    it('accepts any non-empty bounded string source in freeform mode', () => {
        const out = validateOutcome({ ...validInput(), source: 'webhook' }, { allowFreeformSource: true });
        expect(out.source).toBe('webhook');
    });

    it('persists null source in freeform mode when absent or non-string', () => {
        expect(validateOutcome({ ...validInput(), source: undefined }, { allowFreeformSource: true }).source).toBeNull();
        expect(validateOutcome({ ...validInput(), source: null }, { allowFreeformSource: true }).source).toBeNull();
        expect(validateOutcome({ ...validInput(), source: 42 as unknown as string }, { allowFreeformSource: true }).source).toBeNull();
        expect(validateOutcome({ ...validInput(), source: '' }, { allowFreeformSource: true }).source).toBeNull();
        expect(validateOutcome({ ...validInput(), source: 'x'.repeat(65) }, { allowFreeformSource: true }).source).toBeNull();
    });

    it('rejects out-of-range quality_score', () => {
        expect(() => validateOutcome({ ...validInput(), quality_score: 1.5 })).toThrow(/quality_score/);
        expect(() => validateOutcome({ ...validInput(), quality_score: -0.1 })).toThrow(/quality_score/);
    });

    it('accepts null and undefined quality_score', () => {
        expect(validateOutcome({ ...validInput(), quality_score: null }).quality_score).toBeNull();
        expect(validateOutcome({ ...validInput(), quality_score: undefined }).quality_score).toBeNull();
    });

    it('rejects malformed occurred_at', () => {
        expect(() => validateOutcome({ ...validInput(), occurred_at: 'tomorrow' })).toThrow(/occurred_at/);
    });

    it('preserves ISO occurred_at', () => {
        const out = validateOutcome({ ...validInput(), occurred_at: '2026-06-21T12:00:00Z' });
        expect(out.occurred_at).toBe('2026-06-21T12:00:00.000Z');
    });
});

describe('validation: sanitizeMetadata', () => {
    it('returns {} for null or undefined', () => {
        expect(sanitizeMetadata(null)).toEqual({});
        expect(sanitizeMetadata(undefined)).toEqual({});
    });

    it('drops keys not on the allow-list silently', () => {
        const out = sanitizeMetadata({ caller_role: 'agent', unknown_key: 'value' });
        expect(out).toEqual({ caller_role: 'agent' });
    });

    it('rejects forbidden keys with a thrown error', () => {
        for (const key of ['prompt', 'response', 'messages', 'raw_trace', 'stored_content', 'completion_text', 'request_body', 'response_body', 'completion', 'content', 'text', 'transcript']) {
            expect(() => sanitizeMetadata({ [key]: 'leak' })).toThrow(OutcomeValidationError);
        }
    });

    it('rejects forbidden synonyms via patterns', () => {
        expect(() => sanitizeMetadata({ prompt_text: 'leak' })).toThrow(/forbidden/);
        expect(() => sanitizeMetadata({ user_prompt: 'leak' })).toThrow(/forbidden/);
        expect(() => sanitizeMetadata({ response_json: 'leak' })).toThrow(/forbidden/);
        expect(() => sanitizeMetadata({ chat: 'leak' })).toThrow(/forbidden/);
        expect(() => sanitizeMetadata({ message_content: 'leak' })).toThrow(/forbidden/);
        expect(() => sanitizeMetadata({ raw_messages: 'leak' })).toThrow(/forbidden/);
    });

    it('coerces numeric metadata to integers and rejects negatives', () => {
        const out = sanitizeMetadata({ latency_to_acceptance_ms: 123.7, retry_index: 2.1 });
        expect(out.latency_to_acceptance_ms).toBe(123);
        expect(out.retry_index).toBe(2);
        expect(sanitizeMetadata({ retry_index: -1 })).toEqual({});
    });

    it('clamps quality_axes to numeric values', () => {
        const out = sanitizeMetadata({ quality_axes: { helpfulness: 0.7, junk: 'a-string', factuality: 0.5 } });
        expect(out.quality_axes).toEqual({ helpfulness: 0.7, factuality: 0.5 });
    });

    it('drops strings longer than the bound', () => {
        const out = sanitizeMetadata({ caller_workflow_step: 'a'.repeat(65) });
        expect(out).toEqual({});
    });

    it('rejects when sanitized JSON is too large', () => {
        const huge: Record<string, number> = {};
        for (let i = 0; i < 1000; i++) huge[`axis_${i}`] = i;
        expect(() => sanitizeMetadata({ quality_axes: huge })).toThrow(/exceeds/);
    });
});

describe('validation: rejectClientTenantFields', () => {
    it('rejects tenant_id from body', () => {
        expect(() => rejectClientTenantFields({ tenant_id: 'x' })).toThrow(/tenant_id/);
        expect(() => rejectClientTenantFields({ tenantId: 'x' })).toThrow(/tenant_id/);
    });

    it('passes when tenant fields are absent', () => {
        expect(() => rejectClientTenantFields({ request_id: 'r' })).not.toThrow();
        expect(() => rejectClientTenantFields(null)).not.toThrow();
    });
});

describe('validation: invariants', () => {
    it('allow-list contains exactly the 3AT §5 fields', () => {
        expect([...ALLOWED_METADATA_KEYS]).toEqual([
            'caller_workflow_step',
            'caller_role',
            'quality_axes',
            'latency_to_acceptance_ms',
            'retry_index',
            'error_class',
            'cost_attribution_hint',
        ]);
    });

    it('forbidden patterns list is non-empty and uses RegExp with /i flag', () => {
        expect(FORBIDDEN_METADATA_PATTERNS.length).toBeGreaterThan(0);
        for (const re of FORBIDDEN_METADATA_PATTERNS) expect(re.flags).toContain('i');
    });
});
