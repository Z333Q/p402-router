/**
 * Slice 3E — SQL-shape proof for the canonical ai_economic_events
 * idempotency contract.
 *
 * The flip-readiness gate treats `deny_code_bound_to_idempotency` as a
 * payment-grade signal: a repeat of the same denied request must NEVER
 * land as a second row with a different deny_code. That contract is
 * enforced jointly by:
 *
 *   1. The schema-side UNIQUE (tenant_id, request_id) constraint, AND
 *   2. The writer's `INSERT ... ON CONFLICT (tenant_id, request_id)`
 *      statement, which makes the constraint the only place a second
 *      arrival can land.
 *
 * Asserting (2) at the SQL-string level keeps the contract from silently
 * regressing if someone "simplifies" the writer to a plain INSERT. A
 * mocked writer returning the same id is NOT proof — it would still pass
 * if the real SQL dropped ON CONFLICT entirely.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { writeEconomicEvent } from '../writer';

const TENANT = '11111111-1111-1111-1111-111111111111';
const REQ    = 'req-shape-1';

function getInsertSql(): string {
    const call = (db.query as any).mock.calls.find((c: any[]) =>
        typeof c[0] === 'string' && /INSERT\s+INTO\s+ai_economic_events/i.test(c[0]),
    );
    expect(call, 'expected an INSERT INTO ai_economic_events call').toBeDefined();
    return call![0] as string;
}

beforeEach(() => {
    (db.query as any).mockReset();
    // privacy resolution: scope override miss + tenant default row
    (db.query as any).mockResolvedValueOnce({ rows: [] });
    (db.query as any).mockResolvedValueOnce({
        rows: [{
            default_privacy_mode: 'metadata_only',
            store_prompts: false,
            store_responses: false,
            require_redaction: true,
            retention_days: 30,
        }],
    });
    // INSERT returning row
    (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'evt_shape_1' }] });
});

describe('writer SQL shape — idempotency contract', () => {
    it('emits INSERT ... ON CONFLICT (tenant_id, request_id) for the denied-event insert', async () => {
        await writeEconomicEvent(TENANT, {
            request_id: REQ,
            governance_decision: 'denied',
            deny_code: 'API_KEY_BUDGET_EXCEEDED',
            api_key_id: 'ak_1',
            cost_usd: 0,
            status_code: 402,
            success: false,
        });

        const sql = getInsertSql();

        // The clause must be present verbatim — whitespace tolerated.
        expect(sql).toMatch(/ON\s+CONFLICT\s*\(\s*tenant_id\s*,\s*request_id\s*\)/i);

        // It must drive into DO UPDATE, not DO NOTHING — DO NOTHING would
        // silently lose the canonical upsert path for late-arriving fields.
        expect(sql).toMatch(/ON\s+CONFLICT[^;]*DO\s+UPDATE/i);

        // And the bound key columns must appear in the column list so the
        // EXCLUDED.* projection can attach them. (tenant_id, request_id)
        // are columns 1-2 in the canonical writer.
        expect(sql).toMatch(/\brequest_id\b/);
        expect(sql).toMatch(/\btenant_id\b/);
    });

    it('binds the conflict to (tenant_id, request_id) — NOT a single-column key', async () => {
        await writeEconomicEvent(TENANT, {
            request_id: REQ,
            governance_decision: 'denied',
            deny_code: 'MODEL_NOT_ALLOWED',
            api_key_id: 'ak_1',
        });

        const sql = getInsertSql();

        // Reject single-column conflict targets that would let cross-tenant
        // request_id collisions clobber each other.
        expect(sql).not.toMatch(/ON\s+CONFLICT\s*\(\s*request_id\s*\)/i);
        expect(sql).not.toMatch(/ON\s+CONFLICT\s+ON\s+CONSTRAINT/i);
    });

    it('passes request_id ($1) and tenant_id ($2) as the first two bound parameters', async () => {
        await writeEconomicEvent(TENANT, {
            request_id: REQ,
            governance_decision: 'denied',
            deny_code: 'EMPLOYEE_BUDGET_EXCEEDED',
            api_key_id: 'ak_1',
        });

        const call = (db.query as any).mock.calls.find((c: any[]) =>
            typeof c[0] === 'string' && /INSERT\s+INTO\s+ai_economic_events/i.test(c[0]),
        );
        const params = call![1] as unknown[];

        // The writer pins these as $1, $2 in the VALUES list.
        expect(params[0]).toBe(REQ);
        expect(params[1]).toBe(TENANT);
    });
});
