/**
 * Slice 3M — /api/v2/accountability/health route tests.
 *
 *   - tenant-scoped on every issued query
 *   - read-only (no INSERT/UPDATE/DELETE/ON CONFLICT)
 *   - full envelope: overall, eight dimensions, cleanup_priorities,
 *     disclaimers including runtime_flip_unchanged + optimize_recommendations_blocked
 *   - response carries no recommendation / savings fields
 *   - SELECT projections never touch content-bearing columns
 *   - empty tenant -> blocked verdict (no events)
 *   - optimize_readiness.recommendations_enabled and savings_claims_enabled are false
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v2/accountability/health/route';
import db from '@/lib/db';

const TENANT = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

let querySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    querySpy = vi.spyOn(db as unknown as { query: (...args: unknown[]) => unknown }, 'query');
    // Sanitize 3K + 3D env so the route uses defaults.
    delete process.env.OUTCOME_MIN_COVERAGE_PCT;
    delete process.env.OUTCOME_MIN_ACCEPTED_COUNT;
    delete process.env.OUTCOME_MIN_BASELINE_DAYS;
    delete process.env.AEE_DENIED_EVENT_KIND_TEST_PROVEN;
});
afterEach(() => querySpy.mockReset());

function req(qs = ''): NextRequest {
    return new NextRequest(`http://x/api/v2/accountability/health${qs ? `?${qs}` : ''}`, {
        headers: { 'x-p402-tenant': TENANT },
    });
}

function mockEmpty() {
    querySpy.mockImplementation(async (sql: string) => {
        // Outcome coverage fetchTotals (Slice 3K)
        if (/WITH base AS/i.test(sql) && /accepted_count/i.test(sql) && /LEFT JOIN request_outcomes/i.test(sql)) {
            return { rows: [{
                total_events: 0, events_with_outcome: 0,
                accepted_count: 0, rejected_count: 0, revised_count: 0,
                escalated_count: 0, failed_count: 0, pending_review_count: 0, unknown_count: 0,
                total_spend_usd: 0, accepted_spend_usd: 0,
                most_recent_outcome_at: null,
            }] };
        }
        // Slice 3M meter row
        if (/SELECT\s+COUNT\(\*\)::int\s+AS total_events/i.test(sql) && /most_recent_event_at/i.test(sql)) {
            return { rows: [{
                total_events: 0, events_in_period: 0,
                most_recent_event_at: null, total_spend_usd: 0,
            }] };
        }
        // Outbox row
        if (/economic_event_write_failures/i.test(sql) && /outbox_pending/i.test(sql)) {
            return { rows: [{ outbox_pending: 0, outbox_abandoned: 0 }] };
        }
        // Attribution row
        if (/with_department/i.test(sql) && /unattributed_event_count/i.test(sql)) {
            return { rows: [{
                with_department: 0, with_employee: 0, with_workflow: 0,
                with_customer: 0, with_feature: 0, with_api_key: 0,
                unattributed_event_count: 0, unattributed_spend_usd: 0,
            }] };
        }
        // Evidence row
        if (/events_with_evidence/i.test(sql) && /events_missing_evidence/i.test(sql) && !/COALESCE/.test(sql)) {
            return { rows: [{ events_with_evidence: 0, events_missing_evidence: 0 }] };
        }
        // Evidence missing-by-dimension
        if (/HAVING COUNT\(\*\) FILTER \(WHERE evidence_bundle_id IS NULL\) > 0/i.test(sql)) {
            return { rows: [] };
        }
        // Control row
        if (/denied_event_count/i.test(sql) && /denied_with_deny_code/i.test(sql)) {
            return { rows: [{
                denied_event_count: 0, denied_with_deny_code: 0,
                denied_with_decision_source: 0, denied_with_deny_rule: 0,
                denied_provider_cost_usd: 0, governance_decision_set_count: 0,
            }] };
        }
        // Deny code distribution
        if (/governance_decision = 'denied'/i.test(sql) && /GROUP BY deny_code/i.test(sql)) {
            return { rows: [] };
        }
        // Source distribution
        if (/GROUP BY source/i.test(sql)) {
            return { rows: [] };
        }
        // Privacy row
        if (/prompt_stored_count/i.test(sql)) {
            return { rows: [{
                prompt_stored_count: 0, response_stored_count: 0,
                redaction_applied_count: 0, metadata_only_count: 0,
            }] };
        }
        // Privacy distribution
        if (/GROUP BY privacy_mode/i.test(sql)) {
            return { rows: [] };
        }
        // Outcome missing-segments leaderboard
        if (/UNION ALL/i.test(sql) && /missing_count/i.test(sql)) {
            return { rows: [] };
        }
        // Flip readiness loader queries (3D) — provide minimal rows.
        if (/information_schema\.columns/i.test(sql)) return { rows: [] };
        if (/information_schema\.table_constraints/i.test(sql)) return { rows: [] };
        if (/economic_event_write_failures/i.test(sql) && /recent_failures/i.test(sql)) return { rows: [{ recent_failures: 0 }] };
        if (/economic_event_write_failures/i.test(sql) && /pending/i.test(sql)) return { rows: [{ pending: 0, abandoned: 0, oldest_pending: null }] };
        // Flip readiness ai_economic_events denied probe
        if (/governance_decision = 'denied'/i.test(sql) && /LIMIT 1/i.test(sql)) return { rows: [] };
        return { rows: [] };
    });
}

// ────────────────────────────────────────────────────────────────────────
// Envelope shape
// ────────────────────────────────────────────────────────────────────────

describe('GET /api/v2/accountability/health — envelope', () => {
    it('returns ok with the full eight-dimension shape', async () => {
        mockEmpty();
        const res = await GET(req());
        expect(res.status).toBe(200);
        const body = await res.json();
        for (const k of ['ok','generated_at','period','overall','dimensions','cleanup_priorities','disclaimers']) {
            expect(body).toHaveProperty(k);
        }
        for (const dim of [
            'meter','attribution','evidence','control',
            'outcomes','privacy','runtime_flip','optimize_readiness',
        ]) {
            expect(body.dimensions).toHaveProperty(dim);
            expect(body.dimensions[dim]).toHaveProperty('status');
            expect(body.dimensions[dim]).toHaveProperty('score');
            expect(body.dimensions[dim]).toHaveProperty('explainer');
        }
        expect(body.disclaimers).toEqual({
            readiness_not_recommendation: true,
            no_savings_claim: true,
            content_displayed: false,
            runtime_flip_unchanged: true,
            optimize_recommendations_blocked: true,
        });
    });

    it('empty tenant -> overall is blocked (no events)', async () => {
        mockEmpty();
        const body = await (await GET(req())).json();
        expect(body.overall.status).toBe('blocked');
    });

    it('optimize_readiness pins recommendations_enabled and savings_claims_enabled to false', async () => {
        mockEmpty();
        const body = await (await GET(req())).json();
        expect(body.dimensions.optimize_readiness.recommendations_enabled).toBe(false);
        expect(body.dimensions.optimize_readiness.savings_claims_enabled).toBe(false);
    });

    it('response carries no recommendation / savings / route-change fields', async () => {
        mockEmpty();
        const body = await (await GET(req())).json();
        const json = JSON.stringify(body).toLowerCase();
        for (const forbidden of [
            'savings_usd', 'recommended_provider', 'recommended_model',
            'route_change', 'switch_to', 'projected_savings', 'optimization_action',
        ]) {
            expect(json).not.toContain(forbidden);
        }
    });
});

// ────────────────────────────────────────────────────────────────────────
// Read-only + tenant scope + content exclusion
// ────────────────────────────────────────────────────────────────────────

describe('Read-only + tenant scope', () => {
    it('issues only SELECTs and binds tenant_id = $1 (where tenant-scoped)', async () => {
        mockEmpty();
        await GET(req());
        const calls = querySpy.mock.calls as Array<[string, unknown[]?]>;
        for (const [sql, params] of calls) {
            expect(sql).toMatch(/^\s*(SELECT|WITH)/i);
            expect(sql).not.toMatch(/\bINSERT\b/i);
            expect(sql).not.toMatch(/\bUPDATE\b/i);
            expect(sql).not.toMatch(/\bDELETE\b/i);
            expect(sql).not.toMatch(/\bON\s+CONFLICT\b/i);
            // information_schema queries are not tenant-scoped by design.
            if (/information_schema/i.test(sql)) continue;
            expect(sql).toMatch(/tenant_id\s*=\s*\$1/i);
            expect(params?.[0]).toBe(TENANT);
        }
    });

    it('no query references content-bearing columns', async () => {
        mockEmpty();
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
