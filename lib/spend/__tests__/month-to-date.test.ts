import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
    enforcementBuckets,
    getMonthToDateSpend,
    primaryBuckets,
    resolveSpendSource,
    type SpendQueryable,
} from '@/lib/spend/month-to-date';

function pool(...rounds: Array<Record<string, number>>): SpendQueryable & { calls: Array<{ sql: string; values?: unknown[] }> } {
    const calls: Array<{ sql: string; values?: unknown[] }> = [];
    let i = 0;
    return {
        calls,
        async query(sql: string, values?: unknown[]) {
            calls.push({ sql, values });
            const row = rounds[i++] ?? {};
            return { rows: [row] };
        },
    } as any;
}

const SCOPE = {
    tenantId: 't_1',
    apiKeyId: 'k_1',
    employeeId: 'e_1',
    departmentId: 'd_1',
};
const NOW = new Date('2026-06-15T12:00:00Z');
const MONTH_START = new Date('2026-06-01T00:00:00Z');

beforeEach(() => {
    delete process.env.BUDGET_GUARD_SPEND_SOURCE;
});

describe('resolveSpendSource', () => {
    it('returns explicit value when given', () => {
        expect(resolveSpendSource('ai_economic_events')).toBe('ai_economic_events');
        expect(resolveSpendSource('traffic_events')).toBe('traffic_events');
    });
    it('falls back to env', () => {
        process.env.BUDGET_GUARD_SPEND_SOURCE = 'ai_economic_events';
        expect(resolveSpendSource()).toBe('ai_economic_events');
    });
    it('defaults to reconciled when env unset', () => {
        expect(resolveSpendSource()).toBe('reconciled');
    });
    it('ignores invalid env values and returns reconciled', () => {
        process.env.BUDGET_GUARD_SPEND_SOURCE = 'garbage';
        expect(resolveSpendSource()).toBe('reconciled');
    });
});

describe('getMonthToDateSpend — single-source modes', () => {
    it('ai_economic_events: single query, month-start-UTC, direct attribution columns', async () => {
        const p = pool({ key_spend: 10, employee_spend: 5, department_spend: 25 });
        const r = await getMonthToDateSpend(p, SCOPE, { now: NOW, source: 'ai_economic_events' });
        expect(r.source).toBe('ai_economic_events');
        expect(p.calls).toHaveLength(1);
        expect(p.calls[0]!.sql).toMatch(/FROM ai_economic_events/);
        expect(p.calls[0]!.sql).toMatch(/event_time >= \$5/);
        expect(p.calls[0]!.values).toEqual(['t_1', 'k_1', 'e_1', 'd_1', MONTH_START]);
        expect(r).toMatchObject({ keySpendUsd: 10, employeeSpendUsd: 5, departmentSpendUsd: 25 });
    });

    it('traffic_events: single query, status_code = 200 filter', async () => {
        const p = pool({ key_spend: 7, employee_spend: 3, department_spend: 11 });
        const r = await getMonthToDateSpend(p, SCOPE, { now: NOW, source: 'traffic_events' });
        expect(r.source).toBe('traffic_events');
        expect(p.calls).toHaveLength(1);
        expect(p.calls[0]!.sql).toMatch(/FROM traffic_events/);
        expect(p.calls[0]!.sql).toMatch(/status_code = 200/);
        expect(p.calls[0]!.values).toEqual(['t_1', 'k_1', 'e_1', 'd_1', MONTH_START]);
        expect(r).toMatchObject({ keySpendUsd: 7, employeeSpendUsd: 3, departmentSpendUsd: 11 });
    });

    it('coerces NULL/undefined SUMs to 0', async () => {
        const p = pool({});
        const r = await getMonthToDateSpend(p, SCOPE, { now: NOW, source: 'ai_economic_events' });
        expect(r).toMatchObject({ keySpendUsd: 0, employeeSpendUsd: 0, departmentSpendUsd: 0 });
    });

    it('coerces null id fields in scope to null params', async () => {
        const p = pool({});
        await getMonthToDateSpend(
            p,
            { tenantId: 't_1', apiKeyId: 'k_1', employeeId: null, departmentId: null },
            { now: NOW, source: 'ai_economic_events' },
        );
        expect(p.calls[0]!.values).toEqual(['t_1', 'k_1', null, null, MONTH_START]);
    });
});

describe('getMonthToDateSpend — reconciled mode', () => {
    it('runs both queries and returns primary, legacy, delta, enforcement', async () => {
        const p = pool(
            { key_spend: 100, employee_spend: 50, department_spend: 200 }, // ai_economic_events
            { key_spend: 80,  employee_spend: 40, department_spend: 180 }, // traffic_events
        );
        const r = await getMonthToDateSpend(p, SCOPE, { now: NOW, source: 'reconciled' });
        if (r.source !== 'reconciled') throw new Error('expected reconciled');
        expect(r.primary).toMatchObject({
            source: 'ai_economic_events',
            keySpendUsd: 100, employeeSpendUsd: 50, departmentSpendUsd: 200,
        });
        expect(r.legacy).toMatchObject({
            source: 'traffic_events',
            keySpendUsd: 80, employeeSpendUsd: 40, departmentSpendUsd: 180,
        });
        expect(r.delta).toEqual({
            keySpendUsd: 20, employeeSpendUsd: 10, departmentSpendUsd: 20,
        });
        // Slice 3C invariant: enforcement is the legacy buckets.
        expect(r.enforcement).toEqual({
            keySpendUsd: 80, employeeSpendUsd: 40, departmentSpendUsd: 180,
        });
        expect(p.calls).toHaveLength(2);
    });

    it('reports negative delta when traffic_events is higher than ai_economic_events', async () => {
        const p = pool(
            { key_spend: 5,  employee_spend: 0, department_spend: 0 },  // primary
            { key_spend: 60, employee_spend: 0, department_spend: 0 },  // legacy
        );
        const r = await getMonthToDateSpend(p, SCOPE, { now: NOW, source: 'reconciled' });
        if (r.source !== 'reconciled') throw new Error('expected reconciled');
        expect(r.delta.keySpendUsd).toBe(-55);
        // Still enforces against legacy — the safety-path invariant.
        expect(r.enforcement.keySpendUsd).toBe(60);
    });

    it('does not weaken enforcement when ai_economic_events is empty but traffic_events has spend', async () => {
        // Critical Slice 3C invariant: if writer coverage is incomplete,
        // primary will be 0 but enforcement must remain against legacy.
        const p = pool(
            { key_spend: 0,  employee_spend: 0,  department_spend: 0 },   // primary empty
            { key_spend: 999, employee_spend: 999, department_spend: 999 }, // legacy
        );
        const r = await getMonthToDateSpend(p, SCOPE, { now: NOW, source: 'reconciled' });
        if (r.source !== 'reconciled') throw new Error('expected reconciled');
        expect(r.primary).toMatchObject({ keySpendUsd: 0, employeeSpendUsd: 0, departmentSpendUsd: 0 });
        expect(r.enforcement).toEqual({
            keySpendUsd: 999, employeeSpendUsd: 999, departmentSpendUsd: 999,
        });
        // Delta surfaces the gap so operators know reconciliation is not done.
        expect(r.delta.keySpendUsd).toBe(-999);
    });
});

describe('helpers', () => {
    it('enforcementBuckets returns the legacy buckets in reconciled mode', () => {
        const r = {
            source: 'reconciled' as const,
            primary: { source: 'ai_economic_events' as const, keySpendUsd: 100, employeeSpendUsd: 50, departmentSpendUsd: 200 },
            legacy:  { source: 'traffic_events'    as const, keySpendUsd: 80,  employeeSpendUsd: 40, departmentSpendUsd: 180 },
            delta:   { keySpendUsd: 20, employeeSpendUsd: 10, departmentSpendUsd: 20 },
            enforcement: { keySpendUsd: 80, employeeSpendUsd: 40, departmentSpendUsd: 180 },
        };
        expect(enforcementBuckets(r)).toEqual({ keySpendUsd: 80, employeeSpendUsd: 40, departmentSpendUsd: 180 });
    });

    it('primaryBuckets returns the primary buckets in reconciled mode', () => {
        const r = {
            source: 'reconciled' as const,
            primary: { source: 'ai_economic_events' as const, keySpendUsd: 100, employeeSpendUsd: 50, departmentSpendUsd: 200 },
            legacy:  { source: 'traffic_events'    as const, keySpendUsd: 80,  employeeSpendUsd: 40, departmentSpendUsd: 180 },
            delta:   { keySpendUsd: 20, employeeSpendUsd: 10, departmentSpendUsd: 20 },
            enforcement: { keySpendUsd: 80, employeeSpendUsd: 40, departmentSpendUsd: 180 },
        };
        expect(primaryBuckets(r)).toEqual({ keySpendUsd: 100, employeeSpendUsd: 50, departmentSpendUsd: 200 });
    });

    it('single-source result: both helpers return the same buckets', () => {
        const r = { source: 'ai_economic_events' as const, keySpendUsd: 1, employeeSpendUsd: 2, departmentSpendUsd: 3 };
        expect(enforcementBuckets(r)).toEqual({ keySpendUsd: 1, employeeSpendUsd: 2, departmentSpendUsd: 3 });
        expect(primaryBuckets(r)).toEqual({ keySpendUsd: 1, employeeSpendUsd: 2, departmentSpendUsd: 3 });
    });
});
