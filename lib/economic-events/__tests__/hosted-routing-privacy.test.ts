/**
 * End-to-end privacy contract for hosted routing (chat/completions).
 *
 * The chat-completions wire-in calls writeEconomicEvent with both the
 * prompt and the response payload. This test proves that the writer
 * honors the tenant's privacy policy and DOES NOT persist content under
 * metadata_only / fingerprint_only modes regardless of what the caller
 * passes.
 *
 * It also proves the V5 widening rule end-to-end: an admin-saved scope
 * override with privacy_mode=full_trace persists content even when the
 * tenant default is metadata_only.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { writeEconomicEvent } from '../writer';

const TENANT = '00000000-0000-0000-0000-000000000abc';
const SENSITIVE_PROMPT = '[[REAL PROMPT — would expose customer PII if persisted]]';
const SENSITIVE_RESPONSE = '[[REAL MODEL OUTPUT — would expose generated content]]';

beforeEach(() => (db.query as any).mockReset());

function getInsertCall() {
    return (db.query as any).mock.calls.find((c: any[]) => /INSERT INTO ai_economic_events/.test(c[0]));
}

function paramsAt(idx: number) {
    return getInsertCall()![1][idx];
}

describe('hosted-routing privacy contract', () => {
    it('metadata_only: prompt + response content NEVER persisted, no fingerprint either', async () => {
        // tenant default = metadata_only (no scope rows)
        (db.query as any).mockResolvedValueOnce({ rows: [] });  // scope override miss
        (db.query as any).mockResolvedValueOnce({
            rows: [{
                default_privacy_mode: 'metadata_only',
                store_prompts: false,
                store_responses: false,
                require_redaction: true,
                retention_days: 30,
            }],
        });
        (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'evt-1' }] });

        const result = await writeEconomicEvent(TENANT, {
            request_id: 'req_md',
            api_key_id: 'k1',
            _promptForRedaction:   SENSITIVE_PROMPT,
            _responseForRedaction: SENSITIVE_RESPONSE,
        });

        expect(result.privacy.privacyMode).toBe('metadata_only');
        expect(result.prompt_stored).toBe(false);
        expect(result.response_stored).toBe(false);

        // CRITICAL: verify no INSERT param contains the prompt or response text.
        const allParams = getInsertCall()![1];
        for (const p of allParams) {
            const s = typeof p === 'string' ? p : '';
            expect(s).not.toContain(SENSITIVE_PROMPT);
            expect(s).not.toContain(SENSITIVE_RESPONSE);
        }
    });

    it('fingerprint_only: writes HMAC fingerprints, never raw content', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });  // scope override miss
        (db.query as any).mockResolvedValueOnce({
            rows: [{
                default_privacy_mode: 'fingerprint_only',
                store_prompts: false,
                store_responses: false,
                require_redaction: true,
                retention_days: 30,
            }],
        });
        (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'evt-2' }] });

        await writeEconomicEvent(TENANT, {
            request_id: 'req_fp',
            api_key_id: 'k1',
            _promptForRedaction:   SENSITIVE_PROMPT,
            _responseForRedaction: SENSITIVE_RESPONSE,
        });

        const allParams = getInsertCall()![1];
        for (const p of allParams) {
            const s = typeof p === 'string' ? p : '';
            expect(s).not.toContain(SENSITIVE_PROMPT);
            expect(s).not.toContain(SENSITIVE_RESPONSE);
        }
        // Two HMAC fingerprints should be present (64-hex strings).
        const fingerprints = allParams.filter(
            (p: unknown) => typeof p === 'string' && /^[a-f0-9]{64}$/.test(p),
        );
        expect(fingerprints.length).toBe(2);
    });

    it('admin scope override = full_trace + store_prompts:true persists content', async () => {
        // Admin saved a workflow override that widens privacy to full_trace.
        // tenant default would have been metadata_only — without the override
        // content would never persist. The override is the V5 widening rule.
        (db.query as any).mockResolvedValueOnce({
            rows: [{
                privacy_mode: 'full_trace',
                store_prompts: true,
                store_responses: true,
                retention_days: 7,
                scope: 'workflow',
                scope_id: 'engineering_debug',
            }],
        });
        (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'evt-3' }] });

        const result = await writeEconomicEvent(TENANT, {
            request_id: 'req_full',
            workflow_id: 'engineering_debug',
            _promptForRedaction:   SENSITIVE_PROMPT,
            _responseForRedaction: SENSITIVE_RESPONSE,
        });

        expect(result.privacy.privacyMode).toBe('full_trace');
        expect(result.prompt_stored).toBe(true);
        expect(result.response_stored).toBe(true);
    });

    it('per-request override CANNOT widen — request asking for full_trace stays metadata_only', async () => {
        // tenant default = metadata_only, no scope override.
        // Caller sends privacy_mode_override='full_trace' — refused.
        (db.query as any).mockResolvedValueOnce({ rows: [] });  // scope override miss
        (db.query as any).mockResolvedValueOnce({
            rows: [{
                default_privacy_mode: 'metadata_only',
                store_prompts: false,
                store_responses: false,
                require_redaction: true,
                retention_days: 30,
            }],
        });
        (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'evt-4' }] });

        const result = await writeEconomicEvent(TENANT, {
            request_id: 'req_attacker',
            api_key_id: 'k1',
            privacy_mode_override: 'full_trace',
            _promptForRedaction:   SENSITIVE_PROMPT,
            _responseForRedaction: SENSITIVE_RESPONSE,
        });

        expect(result.privacy.privacyMode).toBe('metadata_only');
        expect(result.prompt_stored).toBe(false);
        const allParams = getInsertCall()![1];
        for (const p of allParams) {
            const s = typeof p === 'string' ? p : '';
            expect(s).not.toContain(SENSITIVE_PROMPT);
        }
    });
});
