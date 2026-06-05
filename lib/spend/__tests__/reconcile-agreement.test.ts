/**
 * Slice 3C — cross-source agreement.
 *
 * When the two underlying tables hold identical spend for a tenant, the
 * shared spend service must return identical buckets across modes for the
 * api_key, employee, and department scopes. (Workflow is dashboard-only in
 * Slice 3C — runtime budget-guard does not enforce at workflow level.)
 *
 * The test uses a fake pool that returns the same row for either FROM
 * clause: this proves the service's *interface* contract is symmetric. A
 * separate production reconciliation will prove the data agrees in real DBs.
 */

import { describe, it, expect } from 'vitest';

import {
    enforcementBuckets,
    getMonthToDateSpend,
    primaryBuckets,
    type SpendQueryable,
} from '@/lib/spend/month-to-date';

function symmetricPool(row: Record<string, number>): SpendQueryable {
    return {
        async query() {
            return { rows: [row] };
        },
    };
}

const NOW = new Date('2026-06-15T12:00:00Z');

describe('source agreement when underlying data matches', () => {
    const cases = [
        { name: 'api_key scope',    scope: { tenantId: 't_1', apiKeyId: 'k_1',  employeeId: null, departmentId: null }, row: { key_spend: 42, employee_spend: 0,  department_spend: 0 } },
        { name: 'employee scope',   scope: { tenantId: 't_1', apiKeyId: null,   employeeId: 'e_1', departmentId: null }, row: { key_spend: 0,  employee_spend: 17, department_spend: 0 } },
        { name: 'department scope', scope: { tenantId: 't_1', apiKeyId: null,   employeeId: null,  departmentId: 'd_1' }, row: { key_spend: 0,  employee_spend: 0,  department_spend: 91 } },
    ];

    for (const { name, scope, row } of cases) {
        it(`${name}: ai_economic_events and traffic_events return identical buckets`, async () => {
            const p = symmetricPool(row);
            const aee = await getMonthToDateSpend(p, scope, { now: NOW, source: 'ai_economic_events' });
            const tev = await getMonthToDateSpend(p, scope, { now: NOW, source: 'traffic_events' });
            expect(primaryBuckets(aee)).toEqual(primaryBuckets(tev));
        });

        it(`${name}: reconciled delta is zero and enforcement equals primary`, async () => {
            const p = symmetricPool(row);
            const r = await getMonthToDateSpend(p, scope, { now: NOW, source: 'reconciled' });
            if (r.source !== 'reconciled') throw new Error('expected reconciled');
            expect(r.delta).toEqual({ keySpendUsd: 0, employeeSpendUsd: 0, departmentSpendUsd: 0 });
            // When sources agree, the visibility and enforcement views match.
            expect(enforcementBuckets(r)).toEqual(primaryBuckets(r));
        });
    }
});
