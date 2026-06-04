/**
 * Privacy contract for the v2_053 outbox.
 *
 * Hard rules being pinned here:
 *   1. The sanitizer's output contains NO sentinel content strings.
 *   2. A primary INSERT failure routes content-free metadata into the outbox.
 *   3. error_message_safe is short, redacted, and contains NO sentinel.
 *   4. Forbidden metadata keys (prompt, response, messages, content, file,
 *      document, transcript, chat_history, pii, phi, secret, source_code,
 *      _promptForRedaction, _responseForRedaction) are dropped — even if a
 *      caller stuffs them into `metadata`.
 *
 * The tests scan the FULL serialized JSON of the bound payload + every
 * bound parameter to the outbox INSERT for the sentinel string. If a
 * sentinel ever leaks, this test fails.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import {
    sanitizePayload,
    safeErrorMessage,
    classifyError,
    recordWriteFailure,
} from '../outbox';
import { writeEconomicEvent } from '../writer';
import type { EconomicEventInput } from '../types';

const TENANT = '00000000-0000-0000-0000-000000000777';

// Distinctive sentinels — if any of these strings appears anywhere in a
// bound INSERT parameter, the privacy contract is violated.
const PROMPT_SENTINEL   = '[[PROMPT SENTINEL 04f3c1 — would-be PHI]]';
const RESPONSE_SENTINEL = '[[RESPONSE SENTINEL 9a82de — would-be PII]]';
const FILE_SENTINEL     = '[[FILE SENTINEL c7d1e0 — would-be secret]]';

beforeEach(() => (db.query as any).mockReset());

// ─────────────────────────────────────────────────────────────────────────────
// sanitizePayload
// ─────────────────────────────────────────────────────────────────────────────

describe('sanitizePayload', () => {
    it('strips _promptForRedaction and _responseForRedaction', () => {
        const out = sanitizePayload({
            request_id: 'r',
            _promptForRedaction:   PROMPT_SENTINEL,
            _responseForRedaction: RESPONSE_SENTINEL,
        } as any);
        const json = JSON.stringify(out);
        expect(json).not.toContain(PROMPT_SENTINEL);
        expect(json).not.toContain(RESPONSE_SENTINEL);
        expect((out as any)._promptForRedaction).toBeUndefined();
        expect((out as any)._responseForRedaction).toBeUndefined();
    });

    it('drops forbidden metadata keys (prompt, response, content, etc.)', () => {
        const out = sanitizePayload({
            request_id: 'r',
            metadata: {
                prompt:        PROMPT_SENTINEL,
                response:      RESPONSE_SENTINEL,
                messages:      [{ role: 'user', content: PROMPT_SENTINEL }],
                content:       PROMPT_SENTINEL,
                file:          FILE_SENTINEL,
                document:      FILE_SENTINEL,
                chat_history:  PROMPT_SENTINEL,
                transcript:    PROMPT_SENTINEL,
                pii:           'leaked-pii',
                phi:           'leaked-phi',
                secret:        'sk-abc-123',
                source_code:   'function exploit() {}',
                // benign field MUST survive
                external_correlation_id: 'corr_42',
            },
        });
        const json = JSON.stringify(out);
        // Sentinels gone
        for (const s of [PROMPT_SENTINEL, RESPONSE_SENTINEL, FILE_SENTINEL]) {
            expect(json).not.toContain(s);
        }
        expect(json).not.toContain('leaked-pii');
        expect(json).not.toContain('leaked-phi');
        expect(json).not.toContain('sk-abc-123');
        expect(json).not.toContain('function exploit');
        // Benign survives
        expect((out as any).metadata?.external_correlation_id).toBe('corr_42');
    });

    it('drops case-variants like Prompt, MESSAGES', () => {
        const out = sanitizePayload({
            request_id: 'r',
            metadata: {
                Prompt:   PROMPT_SENTINEL,
                MESSAGES: PROMPT_SENTINEL,
                Content:  PROMPT_SENTINEL,
            } as any,
        });
        expect(JSON.stringify(out)).not.toContain(PROMPT_SENTINEL);
    });

    it('keeps allowlisted metadata fields', () => {
        const out = sanitizePayload({
            request_id: 'r',
            api_key_id: 'k_1',
            owner_type: 'department',
            department_id: 'claims',
            cost_usd: 0.005,
            input_tokens: 100, output_tokens: 50,
            governance_decision: 'approved',
        });
        expect(out.request_id).toBe('r');
        expect(out.api_key_id).toBe('k_1');
        expect(out.department_id).toBe('claims');
        expect(out.cost_usd).toBe(0.005);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// safeErrorMessage
// ─────────────────────────────────────────────────────────────────────────────

describe('safeErrorMessage', () => {
    it('strips quoted strings that could echo sensitive bound values', () => {
        const msg = `INSERT failed because column had value "${PROMPT_SENTINEL}"`;
        const safe = safeErrorMessage(new Error(msg));
        expect(safe).not.toContain(PROMPT_SENTINEL);
    });

    it('strips single-quoted strings too', () => {
        const msg = `duplicate key value violates unique constraint '${RESPONSE_SENTINEL}'`;
        const safe = safeErrorMessage(new Error(msg));
        expect(safe).not.toContain(RESPONSE_SENTINEL);
    });

    it('truncates to 256 chars', () => {
        const safe = safeErrorMessage(new Error('x'.repeat(1000)));
        expect(safe.length).toBeLessThanOrEqual(256);
    });

    it('collapses whitespace + newlines into single spaces', () => {
        const safe = safeErrorMessage(new Error('line1\n\n\nline2\t\ttabs'));
        expect(safe).toBe('line1 line2 tabs');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// classifyError
// ─────────────────────────────────────────────────────────────────────────────

describe('classifyError', () => {
    it('maps SQLSTATE codes', () => {
        expect(classifyError({ code: '23514' })).toBe('check_violation');
        expect(classifyError({ code: '23505' })).toBe('unique_violation');
        expect(classifyError({ code: '23503' })).toBe('fk_violation');
        expect(classifyError({ code: '23502' })).toBe('not_null_violation');
        expect(classifyError({ code: '08006' })).toBe('db_unavailable');
        expect(classifyError({ code: '57014' })).toBe('timeout');
    });

    it('detects connection errors by message when code is missing', () => {
        expect(classifyError(new Error('ECONNREFUSED 127.0.0.1:5432'))).toBe('db_unavailable');
        expect(classifyError(new Error('connection terminated unexpectedly'))).toBe('db_unavailable');
    });

    it('falls back to unknown', () => {
        expect(classifyError({})).toBe('unknown');
        expect(classifyError(new Error('some weird thing'))).toBe('unknown');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// recordWriteFailure — bound parameters NEVER contain sentinels
// ─────────────────────────────────────────────────────────────────────────────

describe('recordWriteFailure — privacy contract', () => {
    it('outbox INSERT parameters contain ZERO sentinel content', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'outbox-1', retry_count: 0 }] });

        await recordWriteFailure({
            tenantId: TENANT,
            source: 'chat_completions',
            route:  '/api/v2/chat/completions',
            input: {
                request_id: 'req_test',
                api_key_id: 'k_1',
                department_id: 'claims',
                provider: 'openai', model_used: 'gpt-4o-mini',
                input_tokens: 100, output_tokens: 50, cost_usd: 0.002,
                _promptForRedaction:   PROMPT_SENTINEL,
                _responseForRedaction: RESPONSE_SENTINEL,
                metadata: {
                    prompt:       PROMPT_SENTINEL,
                    response:     RESPONSE_SENTINEL,
                    messages:     [{ role: 'user', content: PROMPT_SENTINEL }],
                    file:         FILE_SENTINEL,
                    chat_history: PROMPT_SENTINEL,
                    benign:       'this should survive',
                },
            } as EconomicEventInput,
            error: new Error(`check constraint violated for "${PROMPT_SENTINEL}"`),
        });

        const call = (db.query as any).mock.calls[0];
        const allParams = call[1];

        // Every bound parameter — scan for ALL sentinels.
        for (const p of allParams) {
            const s = typeof p === 'string' ? p : JSON.stringify(p);
            expect(s).not.toContain(PROMPT_SENTINEL);
            expect(s).not.toContain(RESPONSE_SENTINEL);
            expect(s).not.toContain(FILE_SENTINEL);
        }
        // Benign metadata survived
        const payloadIdx = allParams.length - 1;
        expect(allParams[payloadIdx]).toContain('benign');
    });

    it('error_message_safe is short and contains no sentinel', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'x', retry_count: 0 }] });
        await recordWriteFailure({
            tenantId: TENANT,
            source: 'meter_only',
            input: { request_id: 'r' } as EconomicEventInput,
            error: new Error(`Postgres said "${PROMPT_SENTINEL}" is invalid`),
        });
        const call = (db.query as any).mock.calls[0];
        const errorMessageSafe = call[1][5];  // bind index of error_message_safe
        expect(errorMessageSafe).not.toContain(PROMPT_SENTINEL);
        expect(errorMessageSafe.length).toBeLessThanOrEqual(256);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// End-to-end: writer fails primary INSERT, outbox catches the content-free row
// ─────────────────────────────────────────────────────────────────────────────

describe('writeEconomicEvent — end-to-end durability', () => {
    it('on primary INSERT failure: outbox row exists with no content; writer throws EconomicEventDeferredError', async () => {
        // 1. scope override lookup (api_key) — miss
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        // 2. tenant default
        (db.query as any).mockResolvedValueOnce({
            rows: [{
                default_privacy_mode: 'metadata_only',
                store_prompts: false, store_responses: false,
                require_redaction: true, retention_days: 30,
            }],
        });
        // 3. primary INSERT into ai_economic_events FAILS
        (db.query as any).mockRejectedValueOnce(Object.assign(
            new Error(`CHECK violation involving "${PROMPT_SENTINEL}"`),
            { code: '23514' },
        ));
        // 4. outbox INSERT succeeds
        (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'outbox-1', retry_count: 0 }] });

        await expect(writeEconomicEvent(TENANT, {
            request_id: 'req_x',
            api_key_id: 'k_1',
            _promptForRedaction:   PROMPT_SENTINEL,
            _responseForRedaction: RESPONSE_SENTINEL,
            metadata: { prompt: PROMPT_SENTINEL, benign: 'ok' },
        } as EconomicEventInput)).rejects.toMatchObject({
            name: 'EconomicEventDeferredError',
            deferredToOutbox: true,
            request_id: 'req_x',
        });

        // The fourth call is the outbox INSERT (after scope-override miss
        // + tenant default + primary INSERT fail). Scan its params.
        const outboxCall = (db.query as any).mock.calls[3];
        const params = outboxCall[1];
        for (const p of params) {
            const s = typeof p === 'string' ? p : JSON.stringify(p);
            expect(s).not.toContain(PROMPT_SENTINEL);
            expect(s).not.toContain(RESPONSE_SENTINEL);
        }
        // Sanity: tenant + request_id bound correctly
        expect(params[0]).toBe(TENANT);
        expect(params[1]).toBe('req_x');
        // payload at last bind contains benign metadata but no sentinels
        const payload = params[params.length - 1];
        expect(payload).toContain('benign');
    });

    it('if both primary INSERT and outbox INSERT fail, the original error re-throws (last-resort path)', async () => {
        (db.query as any).mockResolvedValueOnce({
            rows: [{
                default_privacy_mode: 'metadata_only',
                store_prompts: false, store_responses: false,
                require_redaction: true, retention_days: 30,
            }],
        });
        (db.query as any).mockRejectedValueOnce(new Error('primary down'));
        (db.query as any).mockRejectedValueOnce(new Error('outbox down too'));

        await expect(writeEconomicEvent(TENANT, {
            request_id: 'req_total_loss',
        } as EconomicEventInput)).rejects.toThrow('primary down');
    });
});
