/**
 * Slice 3S — lib/control/configuration.ts validator + helper tests.
 *
 * Tests the pure validator and the SYSTEM_DEFAULT shape. DB-touching code
 * paths (getTenantControlSettings, upsertTenantControlSettings) are covered
 * by the route tests, which mock @/lib/db globally.
 */

import { describe, it, expect } from 'vitest';

import {
    SYSTEM_DEFAULT_CONTROL_SETTINGS,
    validatePatchInput,
    type ValidatedPatch,
} from '../configuration';

function ok(v: ReturnType<typeof validatePatchInput>): ValidatedPatch {
    if ('code' in v) {
        throw new Error(`expected ok result, got error: ${v.message}`);
    }
    return v;
}

describe('SYSTEM_DEFAULT_CONTROL_SETTINGS', () => {
    it('is the canonical empty shape — no caps, empty allowlists', () => {
        expect(SYSTEM_DEFAULT_CONTROL_SETTINGS).toEqual({
            monthly_budget_usd:         null,
            max_cost_per_request_usd:   null,
            human_review_threshold_usd: null,
            allowed_models:             [],
            allowed_task_types:         [],
        });
    });
});

describe('validatePatchInput', () => {
    it('accepts a fully-valid patch', () => {
        const r = ok(validatePatchInput({
            monthly_budget_usd:         123.45,
            max_cost_per_request_usd:   0.50,
            human_review_threshold_usd: 5,
            allowed_models:             ['gpt-4o-mini', 'claude-haiku'],
            allowed_task_types:         ['summarize'],
        }));
        expect(r.scalars).toEqual({
            monthly_budget_usd:         123.45,
            max_cost_per_request_usd:   0.50,
            human_review_threshold_usd: 5,
        });
        expect(r.arrays).toEqual({
            allowed_models:     ['gpt-4o-mini', 'claude-haiku'],
            allowed_task_types: ['summarize'],
        });
    });

    it('accepts a partial patch (only scalars)', () => {
        const r = ok(validatePatchInput({ monthly_budget_usd: 100 }));
        expect(r.scalars).toEqual({ monthly_budget_usd: 100 });
        expect(r.arrays).toEqual({});
    });

    it('accepts a partial patch (only arrays)', () => {
        const r = ok(validatePatchInput({ allowed_models: ['gpt-4o'] }));
        expect(r.arrays).toEqual({ allowed_models: ['gpt-4o'] });
        expect(r.scalars).toEqual({});
    });

    it('accepts empty arrays as "clear allowlist"', () => {
        const r = ok(validatePatchInput({ allowed_models: [], allowed_task_types: [] }));
        expect(r.arrays.allowed_models).toEqual([]);
        expect(r.arrays.allowed_task_types).toEqual([]);
    });

    it('accepts null on a scalar as explicit clear', () => {
        const r = ok(validatePatchInput({ monthly_budget_usd: null }));
        expect(r.scalars).toHaveProperty('monthly_budget_usd', null);
    });

    it('accepts an empty body (no-op patch)', () => {
        const r = ok(validatePatchInput({}));
        expect(r.scalars).toEqual({});
        expect(r.arrays).toEqual({});
    });

    it('rejects body with tenant_id field with INVALID_INPUT', () => {
        const r = validatePatchInput({ tenant_id: 'some-uuid', monthly_budget_usd: 100 });
        expect(r).toMatchObject({ code: 'INVALID_INPUT' });
        expect((r as { message: string }).message).toMatch(/tenant_id is not patchable/);
    });

    it('rejects unknown keys with INVALID_INPUT', () => {
        const r = validatePatchInput({ monthly_budget_usd: 100, mystery_field: 'oops' });
        expect(r).toMatchObject({ code: 'INVALID_INPUT' });
        expect((r as { message: string }).message).toMatch(/mystery_field/);
    });

    it('rejects non-object body', () => {
        expect(validatePatchInput('hi')).toMatchObject({ code: 'INVALID_INPUT' });
        expect(validatePatchInput(42)).toMatchObject({ code: 'INVALID_INPUT' });
        expect(validatePatchInput(null)).toMatchObject({ code: 'INVALID_INPUT' });
        expect(validatePatchInput([])).toMatchObject({ code: 'INVALID_INPUT' });
    });

    it('rejects numeric strings ("42") on scalar fields', () => {
        const r = validatePatchInput({ monthly_budget_usd: '42' });
        expect(r).toMatchObject({ code: 'INVALID_INPUT' });
        expect((r as { message: string }).message).toMatch(/must be a number or null/);
    });

    it('rejects negative scalars', () => {
        const r = validatePatchInput({ monthly_budget_usd: -1 });
        expect(r).toMatchObject({ code: 'INVALID_INPUT' });
        expect((r as { message: string }).message).toMatch(/must be >= 0/);
    });

    it('rejects non-finite scalars (NaN, Infinity)', () => {
        expect(validatePatchInput({ monthly_budget_usd: NaN }))
            .toMatchObject({ code: 'INVALID_INPUT' });
        expect(validatePatchInput({ monthly_budget_usd: Infinity }))
            .toMatchObject({ code: 'INVALID_INPUT' });
    });

    it('rejects arrays containing non-strings', () => {
        expect(validatePatchInput({ allowed_models: [1, 2, 3] }))
            .toMatchObject({ code: 'INVALID_INPUT' });
    });

    it('rejects empty / whitespace-only strings in arrays', () => {
        expect(validatePatchInput({ allowed_models: ['gpt-4o', ''] }))
            .toMatchObject({ code: 'INVALID_INPUT' });
        expect(validatePatchInput({ allowed_models: ['   '] }))
            .toMatchObject({ code: 'INVALID_INPUT' });
    });

    it('rejects duplicate entries in arrays', () => {
        const r = validatePatchInput({ allowed_models: ['gpt-4o', 'gpt-4o'] });
        expect(r).toMatchObject({ code: 'INVALID_INPUT' });
        expect((r as { message: string }).message).toMatch(/unique/);
    });

    it('rejects arrays exceeding 200 entries', () => {
        const big = Array.from({ length: 201 }, (_, i) => `model-${i}`);
        const r = validatePatchInput({ allowed_models: big });
        expect(r).toMatchObject({ code: 'INVALID_INPUT' });
        expect((r as { message: string }).message).toMatch(/200/);
    });

    it('rejects non-array on an array field', () => {
        expect(validatePatchInput({ allowed_models: 'gpt-4o' }))
            .toMatchObject({ code: 'INVALID_INPUT' });
    });

    it('trims string entries in arrays (no leading/trailing whitespace)', () => {
        const r = ok(validatePatchInput({ allowed_models: ['  gpt-4o  '] }));
        expect(r.arrays.allowed_models).toEqual(['gpt-4o']);
    });
});
