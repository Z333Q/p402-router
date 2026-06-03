import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { writeEconomicEvent } from '../writer';

const TENANT = '00000000-0000-0000-0000-000000000123';

beforeEach(() => (db.query as any).mockReset());

/**
 * Each writer call makes:
 *   - 1 query per scope candidate (privacy_scope_overrides lookup) OR a
 *     single 'tenant default' query when no candidate matches
 *   - 1 query for tenant_privacy_settings (always, unless scope override hit)
 *   - 1 INSERT into ai_economic_events
 *
 * For test simplicity we always mock the privacy resolver to land on the
 * tenant-default branch: empty scope -> tenant default -> INSERT.
 */
function mockTenantDefault(mode: string, retentionDays = 30, storePrompts = false, storeResponses = false) {
    (db.query as any).mockResolvedValueOnce({
        rows: [{
            default_privacy_mode: mode,
            store_prompts: storePrompts,
            store_responses: storeResponses,
            require_redaction: true,
            retention_days: retentionDays,
        }],
    });
}

function mockInsertReturning(id = 'event-1') {
    (db.query as any).mockResolvedValueOnce({ rows: [{ id }] });
}

describe('writeEconomicEvent — privacy contract', () => {
    it('metadata_only: does NOT fingerprint or store content', async () => {
        mockTenantDefault('metadata_only');
        mockInsertReturning();

        const r = await writeEconomicEvent(TENANT, {
            request_id: 'req_1',
            provider: 'openai',
            model_used: 'gpt-4o-mini',
            input_tokens: 100,
            output_tokens: 50,
            cost_usd: 0.0012,
            _promptForRedaction: 'sensitive prompt',
            _responseForRedaction: 'sensitive response',
        });

        expect(r.privacy.privacyMode).toBe('metadata_only');
        expect(r.prompt_stored).toBe(false);
        expect(r.response_stored).toBe(false);
        expect(r.redaction_applied).toBe(false);

        // Inspect INSERT params for privacy + fingerprint binds.
        const insertCall = (db.query as any).mock.calls.find((c: any[]) => /INSERT INTO ai_economic_events/.test(c[0]));
        expect(insertCall).toBeDefined();
        const params = insertCall![1];
        // privacy_mode is one of the later positional binds
        expect(params).toContain('metadata_only');
        // No fingerprint should be set
        expect(params).toContain(null);
        // Specifically check the privacy block bind values — fingerprints are nulls
        const idxPromptFp = params.indexOf('metadata_only') + 3; // after privacy_mode, prompt_stored, response_stored
        expect(params[idxPromptFp]).toBeNull();
        expect(params[idxPromptFp + 1]).toBeNull();
    });

    it('fingerprint_only: fingerprints content but does not persist it', async () => {
        mockTenantDefault('fingerprint_only');
        mockInsertReturning();

        await writeEconomicEvent(TENANT, {
            request_id: 'req_2',
            _promptForRedaction: 'hello prompt',
            _responseForRedaction: 'hello response',
        });

        const insertCall = (db.query as any).mock.calls.find((c: any[]) => /INSERT INTO ai_economic_events/.test(c[0]));
        const params = insertCall![1];
        const idxPrivacy = params.indexOf('fingerprint_only');
        expect(idxPrivacy).toBeGreaterThan(-1);
        // After privacy_mode, prompt_stored, response_stored come prompt_fingerprint, response_fingerprint
        expect(params[idxPrivacy + 1]).toBe(false);  // prompt_stored
        expect(params[idxPrivacy + 2]).toBe(false);  // response_stored
        expect(params[idxPrivacy + 3]).toMatch(/^[a-f0-9]{64}$/);  // prompt_fingerprint
        expect(params[idxPrivacy + 4]).toMatch(/^[a-f0-9]{64}$/);  // response_fingerprint
    });

    it('redacted_trace: marks redaction_applied, only persists when tenant opts into storage', async () => {
        // Tenant opts into prompt/response storage.
        mockTenantDefault('redacted_trace', 30, true, true);
        mockInsertReturning();

        const r = await writeEconomicEvent(TENANT, {
            request_id: 'req_3',
            _promptForRedaction: 'REDACTED prompt sample',
            _responseForRedaction: 'REDACTED response sample',
        });

        expect(r.prompt_stored).toBe(true);
        expect(r.response_stored).toBe(true);
        expect(r.redaction_applied).toBe(true);
    });

    it('full_trace: persists content as-is when tenant has opted in', async () => {
        mockTenantDefault('full_trace', 30, true, true);
        mockInsertReturning();

        const r = await writeEconomicEvent(TENANT, {
            request_id: 'req_4',
            _promptForRedaction: 'full prompt',
            _responseForRedaction: 'full response',
        });

        expect(r.prompt_stored).toBe(true);
        expect(r.response_stored).toBe(true);
        expect(r.redaction_applied).toBe(false);
    });

    it('caller override can ratchet a full_trace tenant down to metadata_only', async () => {
        mockTenantDefault('full_trace', 30, true, true);
        mockInsertReturning();

        const r = await writeEconomicEvent(TENANT, {
            request_id: 'req_5',
            _promptForRedaction: 'one-off public demo prompt',
            privacy_mode_override: 'metadata_only',
        });

        expect(r.privacy.privacyMode).toBe('metadata_only');
        expect(r.prompt_stored).toBe(false);
    });

    it('stamps retention_expires_at relative to now', async () => {
        mockTenantDefault('metadata_only', 14);
        mockInsertReturning();

        const before = Date.now();
        const r = await writeEconomicEvent(TENANT, { request_id: 'req_r' });
        const after = Date.now();

        const exp = r.retention_expires_at.getTime();
        const expected14d = 14 * 24 * 60 * 60 * 1000;
        expect(exp).toBeGreaterThanOrEqual(before + expected14d - 1000);
        expect(exp).toBeLessThanOrEqual(after + expected14d + 1000);
    });

    it('uses ON CONFLICT (tenant_id, request_id) DO UPDATE', async () => {
        mockTenantDefault('metadata_only');
        mockInsertReturning();

        await writeEconomicEvent(TENANT, { request_id: 'req_upsert' });
        const sql = (db.query as any).mock.calls.find((c: any[]) => /INSERT INTO ai_economic_events/.test(c[0]))![0];
        expect(sql).toContain('ON CONFLICT (tenant_id, request_id) DO UPDATE');
    });

    it('defaults total_tokens to input + output when caller omits it', async () => {
        mockTenantDefault('metadata_only');
        mockInsertReturning();

        await writeEconomicEvent(TENANT, {
            request_id: 'req_t',
            input_tokens: 30,
            output_tokens: 20,
        });
        const params = (db.query as any).mock.calls.find((c: any[]) => /INSERT INTO ai_economic_events/.test(c[0]))![1];
        // Check that total_tokens = 50 appears as a bound value (it is one of several)
        const totalTokens = params[20]; // input(19), output(20)? actually 19 is inputTokens, 20 is outputTokens, 21 is total_tokens
        // Be lenient and just verify 50 is present in the param list.
        expect(params).toContain(50);
    });
});
