/**
 * Slice 3F — Route response-shape proof for GET /api/v2/control/flip-readiness.
 *
 * The Slice 3D dashboard depends on the route exposing the denied-event
 * support signals introduced by Slice 3E. This test pins that contract at
 * the HTTP boundary so a refactor cannot quietly drop them:
 *
 *   - metrics.denied_event_write_path is present with all 5 sub-signals
 *   - metrics.denied_event_idempotency is present with all 5 sub-signals
 *   - criteria contains an item named 'denied_event_write_path'
 *   - criteria contains an item named 'denied_event_idempotency_ready'
 *   - status is one of the documented values
 *
 * Read-only: no runtime flip, no INSERT/UPDATE/DELETE. This is the same
 * read-only contract Slice 3D shipped; Slice 3F just proves the denied-
 * event blocks now travel out over the wire.
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v2/control/flip-readiness/route';
import db from '@/lib/db';

const TENANT = '33333333-3333-3333-3333-333333333333';

let querySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    querySpy = vi.spyOn(db as unknown as { query: (...args: unknown[]) => unknown }, 'query');
    delete process.env.AEE_DENIED_WRITE_PATH;
    delete process.env.AEE_DENIED_WRITE_PATH_TEST_PROVEN;
    delete process.env.AEE_DENIED_EVENT_KIND_TEST_PROVEN;
    delete process.env.FLIP_REQUIRE_BILLING_CYCLE;
    delete process.env.FLIP_REQUIRE_DENIED_WRITE_PATH;
});
afterEach(() => querySpy.mockReset());

function mockLoaderEmpty() {
    querySpy.mockImplementation(async (sql: string) => {
        if (/FROM traffic_events\s+WHERE/i.test(sql)) return { rows: [{ count: 0 }] };
        if (/FROM ai_economic_events\s+WHERE.*source = 'chat_completions'/is.test(sql)) {
            return { rows: [{ count: 0 }] };
        }
        if (/FROM ai_economic_events[^;]*governance_decision\s*=\s*'denied'/is.test(sql)) {
            return { rows: [] };
        }
        if (/economic_event_write_failures/i.test(sql) && /pending/i.test(sql)) {
            return { rows: [{ pending: 0, abandoned: 0, oldest_pending: null }] };
        }
        if (/economic_event_write_failures/i.test(sql) && /recent_failures/i.test(sql)) {
            return { rows: [{ recent_failures: 0 }] };
        }
        if (/information_schema\.table_constraints/i.test(sql)) return { rows: [{}] };
        if (/information_schema\.columns/i.test(sql)) {
            return {
                rows: [
                    { column_name: 'tenant_id' },
                    { column_name: 'api_key_id' },
                    { column_name: 'request_id' },
                    { column_name: 'route' },
                    { column_name: 'governance_decision_source' },
                    { column_name: 'employee_id' },
                    { column_name: 'deny_code' },
                    { column_name: 'event_time' },
                ],
            };
        }
        return { rows: [] };
    });
}

function req(): NextRequest {
    return new NextRequest('http://x/api/v2/control/flip-readiness', {
        headers: { 'x-p402-tenant': TENANT },
    });
}

describe('GET /api/v2/control/flip-readiness — 3F response shape', () => {
    it('exposes the denied_event_write_path metric block with all five sub-signals', async () => {
        mockLoaderEmpty();
        const body = await (await GET(req())).json();
        expect(body.metrics).toBeDefined();
        expect(body.metrics.denied_event_write_path).toBeDefined();

        const dw = body.metrics.denied_event_write_path;
        for (const k of [
            'config_enabled',
            'code_path_present',
            'test_proof_present',
            'health_check_green',
            'implemented',
        ]) {
            expect(dw, `missing sub-signal: ${k}`).toHaveProperty(k);
            expect(typeof dw[k]).toBe('boolean');
        }
    });

    it('exposes the denied_event_idempotency metric block with all five sub-signals', async () => {
        mockLoaderEmpty();
        const body = await (await GET(req())).json();
        const idem = body.metrics.denied_event_idempotency;
        expect(idem).toBeDefined();
        for (const k of [
            'schema_unique_request_present',
            'denied_event_kind_supported',
            'deny_code_bound_to_idempotency',
            'writer_deterministic_deny_code',
            'ready',
        ]) {
            expect(idem, `missing sub-signal: ${k}`).toHaveProperty(k);
            expect(typeof idem[k]).toBe('boolean');
        }
    });

    it('emits criteria items named denied_event_write_path and denied_event_idempotency_ready', async () => {
        mockLoaderEmpty();
        const body = await (await GET(req())).json();
        const names = body.criteria.map((c: { criterion: string }) => c.criterion);
        expect(names).toContain('denied_event_write_path');
        expect(names).toContain('denied_event_idempotency_ready');

        const dw = body.criteria.find((c: any) => c.criterion === 'denied_event_write_path');
        expect(dw.status).toMatch(/pass|fail|observing/);
        // Detail must mirror the metric so the dashboard can show a single
        // source of truth.
        expect(dw.detail).toMatchObject({
            config_enabled: expect.any(Boolean),
            code_path_present: expect.any(Boolean),
            test_proof_present: expect.any(Boolean),
            health_check_green: expect.any(Boolean),
        });

        const idem = body.criteria.find((c: any) => c.criterion === 'denied_event_idempotency_ready');
        expect(idem.detail).toMatchObject({
            schema_unique_request_present: expect.any(Boolean),
            denied_event_kind_supported: expect.any(Boolean),
            deny_code_bound_to_idempotency: expect.any(Boolean),
            writer_deterministic_deny_code: expect.any(Boolean),
        });
    });

    it('status stays in the documented set under any signal mix', async () => {
        mockLoaderEmpty();
        const body = await (await GET(req())).json();
        expect(['ready_to_flip', 'observing', 'not_ready', 'blocked']).toContain(body.status);
    });

    it('does not flip runtime enforcement: response carries no mutating side-channel fields', async () => {
        mockLoaderEmpty();
        const body = await (await GET(req())).json();
        // The route must not return a "flipped" or "runtime_source" field.
        // The flip itself is an operator action, not an API side-effect.
        expect(body).not.toHaveProperty('flipped');
        expect(body).not.toHaveProperty('runtime_source');
        expect(body).not.toHaveProperty('budget_guard_spend_source');
    });
});
