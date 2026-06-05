/**
 * Slice 3B — Route test for POST /api/v2/control/simulator.
 *
 * Validates:
 *   - 400 on invalid body
 *   - approve path returns APPROVED
 *   - end-to-end deny via api-key budget (hydration + evaluate)
 *   - tenant scoping: mandate from another tenant returns MANDATE_NOT_FOUND
 *     (the route's WHERE id = $1 AND tenant_id = $2 enforces this, even
 *     though AP2PolicyEngine.verifyMandate would otherwise accept the row)
 *   - privacy_note copy
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/v2/control/simulator/route';
import db from '@/lib/db';

const TENANT = '22222222-2222-2222-2222-222222222222';

let querySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    querySpy = vi.spyOn(db as unknown as { query: (...args: unknown[]) => unknown }, 'query');
});

afterEach(() => {
    querySpy.mockReset();
});

function req(body: unknown): NextRequest {
    return new NextRequest('http://x/api/v2/control/simulator', {
        method: 'POST',
        headers: {
            'x-p402-tenant': TENANT,
            'content-type': 'application/json',
        },
        body: JSON.stringify(body),
    });
}

describe('POST /api/v2/control/simulator', () => {
    it('returns 400 when body is not an object', async () => {
        const r = await POST(req(['not', 'an', 'object']));
        expect(r.status).toBe(400);
    });

    it('returns 400 when estimated_cost_usd is negative', async () => {
        const r = await POST(req({ estimated_cost_usd: -1 }));
        expect(r.status).toBe(400);
    });

    it('returns 400 when margin_floor_pct is out of [0, 100]', async () => {
        const r = await POST(req({ margin_floor_pct: 200 }));
        expect(r.status).toBe(400);
    });

    it('approves a minimal valid input with no constraints', async () => {
        const r = await POST(req({ estimated_cost_usd: 0.01 }));
        expect(r.status).toBe(200);
        const body = await r.json();
        expect(body.decision.first_definitive_decision.code).toBe('APPROVED');
        expect(body.privacy_note).toMatch(/metadata only/);
    });

    it('end-to-end: api_key_id hydrates context and triggers API_KEY_BUDGET_EXCEEDED', async () => {
        // 1) loadKeyContext SELECT api_keys row
        querySpy.mockResolvedValueOnce({
            rows: [{
                api_key_id: 'k_1',
                allowed_models: [],
                allowed_task_types: [],
                max_cost_per_request_usd: null,
                monthly_budget_usd: 10,
                employee_monthly_budget_usd: null,
                department_budget_usd: null,
                employee_id: null,
                department_id: null,
            }],
        } as never);
        // 2) MTD spend query
        querySpy.mockResolvedValueOnce({
            rows: [{ key_spend: 9.5, employee_spend: 0, department_spend: 0 }],
        } as never);

        const r = await POST(req({ api_key_id: 'k_1', estimated_cost_usd: 1.0 }));
        expect(r.status).toBe(200);
        const body = await r.json();
        expect(body.decision.first_definitive_decision.code).toBe('API_KEY_BUDGET_EXCEEDED');
        expect(body.decision.first_definitive_decision.status).toBe('denied');

        // Tenant scoping pinned: api_keys query had $1 = TENANT.
        expect(querySpy.mock.calls[0]![1]).toEqual([TENANT, 'k_1']);
        // MTD spend query was tenant-scoped.
        expect((querySpy.mock.calls[1]![1] as unknown[])[0]).toBe(TENANT);
    });

    it('mandate_id from another tenant returns MANDATE_NOT_FOUND (tenant scoping)', async () => {
        // Route's mandate lookup uses WHERE id = $1 AND tenant_id = $2.
        // If a malicious caller passes a mandate_id that exists for another
        // tenant, the SELECT returns zero rows and the simulator emits
        // MANDATE_NOT_FOUND — never trusts a cross-tenant mandate row.
        querySpy.mockResolvedValueOnce({ rows: [] } as never);

        const r = await POST(req({ mandate_id: 'mnd_other_tenant' }));
        expect(r.status).toBe(200);
        const body = await r.json();
        expect(body.decision.first_definitive_decision.code).toBe('MANDATE_NOT_FOUND');

        // Pin the tenant-scoped lookup pattern.
        const call = querySpy.mock.calls[0]!;
        const sql = call[0] as string;
        expect(sql).toMatch(/WHERE id = \$1 AND tenant_id = \$2/);
        expect(call[1]).toEqual(['mnd_other_tenant', TENANT]);
    });

    it('returns all_triggered_checks in canonical order when multiple checks fire', async () => {
        querySpy.mockResolvedValueOnce({
            rows: [{
                api_key_id: 'k_1',
                allowed_models: ['claude-sonnet-4-6'],
                allowed_task_types: [],
                max_cost_per_request_usd: 0.001,
                monthly_budget_usd: null,
                employee_monthly_budget_usd: null,
                department_budget_usd: null,
                employee_id: null,
                department_id: null,
            }],
        } as never);
        querySpy.mockResolvedValueOnce({
            rows: [{ key_spend: 0, employee_spend: 0, department_spend: 0 }],
        } as never);

        const r = await POST(req({
            api_key_id: 'k_1',
            model_requested: 'gpt-4o',
            estimated_cost_usd: 0.5,
            margin_floor_pct: 90,
            revenue_usd: 0.6,
            human_review_required: true,
        }));
        expect(r.status).toBe(200);
        const body = await r.json();
        const codes = body.decision.all_triggered_checks.map((h: { code: string }) => h.code);
        // Canonical order: MODEL < MAX_COST < MARGIN < HUMAN.
        expect(codes).toEqual([
            'MODEL_NOT_ALLOWED',
            'MAX_COST_PER_REQUEST_EXCEEDED',
            'MARGIN_FLOOR_NOT_MET',
            'HUMAN_REVIEW_REQUIRED',
        ]);
        expect(body.decision.first_definitive_decision.code).toBe('MODEL_NOT_ALLOWED');
    });
});
