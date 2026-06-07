/**
 * Slice 3L — /api/v2/outcomes/setup route tests.
 *
 *   - tenant-scoped (every DB query carries tenant_id = $1)
 *   - read-only (no INSERT/UPDATE/DELETE/ON CONFLICT)
 *   - never references content-bearing columns
 *   - returns the full activation envelope: intro/disclaimer copy,
 *     readiness summary, thresholds, top missing segments, checklist,
 *     examples, allowed metadata, common validation errors, API info,
 *     disclaimers including writes_from_this_endpoint: false
 *   - response carries no recommendation / savings fields
 *   - example code blocks contain no content-bearing JSON keys
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v2/outcomes/setup/route';
import db from '@/lib/db';

const TENANT = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

let querySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    querySpy = vi.spyOn(db as unknown as { query: (...args: unknown[]) => unknown }, 'query');
});
afterEach(() => querySpy.mockReset());

function req(qs = ''): NextRequest {
    return new NextRequest(`http://x/api/v2/outcomes/setup${qs ? `?${qs}` : ''}`, {
        headers: { 'x-p402-tenant': TENANT },
    });
}

function mockEmptyTenant() {
    querySpy.mockImplementation(async (sql: string) => {
        if (/WITH base AS/i.test(sql) && /accepted_count/i.test(sql) && !/UNION ALL/i.test(sql)) {
            return { rows: [{
                total_events: 0, events_with_outcome: 0,
                accepted_count: 0, rejected_count: 0, revised_count: 0,
                escalated_count: 0, failed_count: 0, pending_review_count: 0, unknown_count: 0,
                total_spend_usd: 0, accepted_spend_usd: 0,
                most_recent_outcome_at: null,
            }] };
        }
        return { rows: [] };
    });
}

describe('GET /api/v2/outcomes/setup — envelope', () => {
    it('returns the full activation envelope', async () => {
        mockEmptyTenant();
        const res = await GET(req());
        expect(res.status).toBe(200);
        const body = await res.json();
        for (const k of [
            'ok','generated_at','filters_applied','intro_copy','disclaimer_copy',
            'readiness_summary','thresholds','top_missing_segments',
            'integration_checklist','examples','allowed_metadata_examples',
            'common_validation_errors','api','disclaimers',
        ]) {
            expect(body).toHaveProperty(k);
        }
        expect(body.disclaimers).toEqual({
            readiness_not_recommendation: true,
            no_savings_claim: true,
            content_displayed: false,
            writes_from_this_endpoint: false,
        });
    });

    it('empty tenant: readiness_summary status is "blocked" with no_events reason', async () => {
        mockEmptyTenant();
        const body = await (await GET(req())).json();
        expect(body.readiness_summary.status).toBe('blocked');
        expect(body.readiness_summary.reason).toBe('no_events');
        expect(body.readiness_summary.cost_per_accepted_output_usd).toBeNull();
        expect(body.readiness_summary.cost_per_accepted_insufficient_data).toBe(true);
    });

    it('response carries no recommendation / savings / route-change fields', async () => {
        mockEmptyTenant();
        const body = await (await GET(req())).json();
        const json = JSON.stringify(body).toLowerCase();
        for (const forbidden of [
            'savings_usd', 'recommended_provider', 'recommended_model',
            'route_change', 'switch_to', 'projected_savings', 'optimization_action',
        ]) {
            expect(json).not.toContain(forbidden);
        }
    });

    it('api block matches the lib helpers (single source of truth)', async () => {
        mockEmptyTenant();
        const body = await (await GET(req())).json();
        expect(body.api.write_endpoint).toBe('/api/v2/outcomes');
        expect(body.api.read_endpoint_pattern).toBe('/api/v2/prove/outcomes/<request_id>');
        expect(body.api.idempotency_key).toBe('tenant_id + request_id');
        // V5 canonical statuses are surfaced exactly.
        expect(body.api.statuses_canonical).toEqual([
            'accepted','rejected','revised','escalated','failed','pending_review','unknown',
        ]);
        // forbidden_fields includes every spec name.
        for (const f of [
            'prompt','prompts','response','responses','messages','completion',
            'content','text','file','files','document','documents',
            'chat','chat_history','transcript','request_body','response_body',
            'raw_trace','stored_content',
        ]) {
            expect(body.api.forbidden_fields).toContain(f);
        }
    });

    it('example code blocks contain no content-bearing JSON keys', async () => {
        mockEmptyTenant();
        const body = await (await GET(req())).json();
        for (const ex of body.examples as Array<{ id: string; code: string }>) {
            for (const forbidden of [
                '"prompt"','"prompts"','"response"','"responses"','"messages"',
                '"completion"','"transcript"','"request_body"','"response_body"',
                '"raw_trace"','"stored_content"','"content"',
            ]) {
                expect(ex.code, `${ex.id} must not contain ${forbidden}`).not.toContain(forbidden);
            }
        }
    });
});

describe('Read-only + tenant scope', () => {
    it('issues only SELECTs and binds tenant_id = $1 on every aggregate', async () => {
        mockEmptyTenant();
        await GET(req());
        const calls = querySpy.mock.calls as Array<[string, unknown[]?]>;
        expect(calls.length).toBeGreaterThan(0);
        for (const [sql, params] of calls) {
            expect(sql).toMatch(/^\s*(SELECT|WITH)/i);
            expect(sql).not.toMatch(/\bINSERT\b/i);
            expect(sql).not.toMatch(/\bUPDATE\b/i);
            expect(sql).not.toMatch(/\bDELETE\b/i);
            expect(sql).not.toMatch(/\bON\s+CONFLICT\b/i);
            expect(sql).toMatch(/(e\.tenant_id|\btenant_id)\s*=\s*\$1/i);
            expect(params?.[0]).toBe(TENANT);
        }
    });

    it('no query references content-bearing columns', async () => {
        mockEmptyTenant();
        await GET(req());
        for (const [sql] of querySpy.mock.calls as Array<[string]>) {
            const s = String(sql).toLowerCase();
            for (const re of [
                /\bprompt_fingerprint\b/, /\bresponse_fingerprint\b/,
                /\bprompt_text\b/, /\bresponse_text\b/,
                /\bresponse_body\b/, /\brequest_body\b/,
                /\bmessages\b/, /\bcompletion\b/, /\bcontent\b/, /\btranscript\b/,
            ]) {
                expect(s).not.toMatch(re);
            }
        }
    });
});
