/**
 * Meter-only privacy persistence contract (V5 §27.5 / acceptance §18-19).
 *
 * What this pins:
 *   1. Top-level content fields (prompt, response, messages, file, ...) are
 *      rejected at the route boundary BEFORE any DB query, log, or cache
 *      touch happens.
 *   2. Nested content (e.g. metadata.prompt) is silently stripped — the
 *      writer never binds it to the INSERT and it never appears in any
 *      console output.
 *   3. In metadata_only mode the bound INSERT params contain ZERO sentinel
 *      content under any addressable position. The metadata JSONB bind is
 *      the sanitized object, not the caller's original.
 *   4. Caller-tightened privacy_mode (override → metadata_only) still
 *      produces a clean bound param set.
 *
 * The test scans EVERY bound param to db.query and EVERY captured console
 * output (log/info/warn/error/debug) for the sentinel string. If a sentinel
 * appears anywhere, the contract is broken.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { POST } from './route';

const TENANT = '00000000-0000-0000-0000-000000000ABC';

const PROMPT_SENTINEL   = '[[PROMPT SENTINEL 7f1a09 — would-be PHI in meter-only]]';
const RESPONSE_SENTINEL = '[[RESPONSE SENTINEL b2e44c — would-be PII in meter-only]]';
const FILE_SENTINEL     = '[[FILE SENTINEL d501ae — would-be secret in meter-only]]';
const ALL_SENTINELS = [PROMPT_SENTINEL, RESPONSE_SENTINEL, FILE_SENTINEL] as const;

function postReq(body: unknown) {
    return new NextRequest('http://localhost/api/v2/meter/events', {
        method: 'POST',
        headers: { 'x-p402-tenant': TENANT, 'content-type': 'application/json' },
        body: typeof body === 'string' ? body : JSON.stringify(body),
    });
}

function mockTenantDefault(mode = 'metadata_only', scopeMissCount = 0) {
    const q = (db.query as any);
    for (let i = 0; i < scopeMissCount; i++) q.mockResolvedValueOnce({ rows: [] });
    q.mockResolvedValueOnce({
        rows: [{
            default_privacy_mode: mode,
            store_prompts: false,
            store_responses: false,
            require_redaction: true,
            retention_days: 30,
        }],
    });
}

function mockInsertSuccess(id = 'event-persisted') {
    (db.query as any).mockResolvedValueOnce({ rows: [{ id }] });
}

function scanForSentinels(value: unknown): string[] {
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    return ALL_SENTINELS.filter((sentinel) => s.includes(sentinel));
}

/** Capture every console channel into a single array for sentinel scanning. */
function captureConsole() {
    const captured: string[] = [];
    const channels = ['log', 'info', 'warn', 'error', 'debug'] as const;
    const spies = channels.map((ch) =>
        vi.spyOn(console, ch).mockImplementation((...args: unknown[]) => {
            captured.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
        }),
    );
    return {
        captured,
        restore: () => spies.forEach((s) => s.mockRestore()),
    };
}

beforeEach(() => (db.query as any).mockReset());

describe('Meter-only privacy persistence — top-level content rejection', () => {
    it('rejects each forbidden top-level field without touching DB or console', async () => {
        const c = captureConsole();
        try {
            const forbidden = [
                'prompt', 'prompts', 'response', 'responses', 'completion',
                'messages', 'content', 'text', 'file', 'files',
                'document', 'documents', 'chat', 'chat_history', 'transcript',
            ];
            for (const field of forbidden) {
                const res = await POST(postReq({
                    request_id: `req_${field}`,
                    [field]: PROMPT_SENTINEL,
                }));
                expect(res.status).toBe(400);
                const body = await res.json();
                expect(body.error.code).toBe('INVALID_INPUT');
                expect(body.error.details.rejected_field).toBe(field);
                // The error MESSAGE names the field but never echoes the value.
                expect(scanForSentinels(JSON.stringify(body))).toEqual([]);
            }
            // No DB query of any kind.
            expect(db.query).not.toHaveBeenCalled();
            // No sentinel landed in any console channel.
            for (const line of c.captured) {
                expect(scanForSentinels(line)).toEqual([]);
            }
        } finally {
            c.restore();
        }
    });
});

describe('Meter-only privacy persistence — nested metadata sanitization', () => {
    it('strips metadata.prompt / metadata.response / metadata.file before INSERT in metadata_only mode', async () => {
        // 2 scope candidates from body (employee_id + department_id) → 2 misses
        mockTenantDefault('metadata_only', 2);
        mockInsertSuccess('evt_clean');

        const c = captureConsole();
        try {
            const res = await POST(postReq({
                request_id: 'req_nested',
                attribution: {
                    department_id: 'claims',
                    employee_id:   'emp_42',
                    action_type:   'claims_summary',
                },
                model: { provider: 'openai', model_used: 'gpt-4o-mini' },
                usage: { input_tokens: 100, output_tokens: 50, cost_usd: 0.002 },
                metadata: {
                    prompt:       PROMPT_SENTINEL,
                    response:     RESPONSE_SENTINEL,
                    messages:     [{ role: 'user', content: PROMPT_SENTINEL }],
                    file:         FILE_SENTINEL,
                    chat_history: PROMPT_SENTINEL,
                    pii:          'leaked-pii-value',
                    secret:       'sk-meter-only-abc',
                    // benign key must survive
                    correlation_id: 'corr_42',
                },
            }));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.privacy.mode).toBe('metadata_only');
            expect(body.privacy.prompt_stored).toBe(false);
            expect(body.privacy.response_stored).toBe(false);

            // Find the INSERT and scan EVERY bound parameter for sentinels.
            const insertCall = (db.query as any).mock.calls.find(
                (call: any[]) => /INSERT INTO ai_economic_events/.test(call[0]),
            );
            expect(insertCall).toBeDefined();
            const boundParams = insertCall![1];
            for (let i = 0; i < boundParams.length; i++) {
                const hits = scanForSentinels(boundParams[i]);
                expect(hits, `bound param $${i + 1} leaked: ${hits.join(', ')}`).toEqual([]);
            }
            // Also scan the SQL string itself (should never have content inlined).
            expect(scanForSentinels(insertCall![0])).toEqual([]);

            // Benign metadata key survives in the bound JSONB.
            const metadataBind = boundParams[boundParams.length - 1];
            const metadataJson = typeof metadataBind === 'string' ? metadataBind : JSON.stringify(metadataBind);
            expect(metadataJson).toContain('correlation_id');
            expect(metadataJson).toContain('corr_42');
            // Forbidden keys do NOT appear in the bound metadata.
            expect(metadataJson).not.toContain('"prompt"');
            expect(metadataJson).not.toContain('"response"');
            expect(metadataJson).not.toContain('"messages"');
            expect(metadataJson).not.toContain('"file"');
            expect(metadataJson).not.toContain('"chat_history"');
            expect(metadataJson).not.toContain('"secret"');
            expect(metadataJson).not.toContain('"pii"');
            expect(metadataJson).not.toContain('leaked-pii-value');
            expect(metadataJson).not.toContain('sk-meter-only-abc');

            // No console output anywhere leaked a sentinel.
            for (const line of c.captured) {
                expect(scanForSentinels(line)).toEqual([]);
            }
        } finally {
            c.restore();
        }
    });

    it('drops case-variant forbidden keys (Prompt, MESSAGES, Content) in metadata', async () => {
        mockTenantDefault('metadata_only');
        mockInsertSuccess();

        const res = await POST(postReq({
            request_id: 'req_case',
            metadata: {
                Prompt:   PROMPT_SENTINEL,
                MESSAGES: PROMPT_SENTINEL,
                Content:  PROMPT_SENTINEL,
                File:     FILE_SENTINEL,
                keepme:   'ok',
            },
        }));
        expect(res.status).toBe(200);

        const insertCall = (db.query as any).mock.calls.find(
            (call: any[]) => /INSERT INTO ai_economic_events/.test(call[0]),
        );
        const metadataBind = insertCall![1][insertCall![1].length - 1];
        const json = typeof metadataBind === 'string' ? metadataBind : JSON.stringify(metadataBind);
        for (const s of ALL_SENTINELS) expect(json).not.toContain(s);
        expect(json).toContain('keepme');
    });
});

describe('Meter-only privacy persistence — caller-tightened privacy_mode', () => {
    it('override to metadata_only against a full_trace tenant still strips nested metadata', async () => {
        mockTenantDefault('full_trace');  // tenant default is full_trace
        mockInsertSuccess();

        const res = await POST(postReq({
            request_id: 'req_override',
            privacy_mode: 'metadata_only',
            metadata: {
                prompt: PROMPT_SENTINEL,
                kept:   'value',
            },
        }));
        expect(res.status).toBe(200);
        const body = await res.json();
        // Even though tenant default is full_trace, caller-tightened to
        // metadata_only AND the metadata sanitizer ran.
        expect(body.privacy.mode).toBe('metadata_only');
        expect(body.privacy.prompt_stored).toBe(false);

        const insertCall = (db.query as any).mock.calls.find(
            (call: any[]) => /INSERT INTO ai_economic_events/.test(call[0]),
        );
        for (const p of insertCall![1]) {
            expect(scanForSentinels(p)).toEqual([]);
        }
    });
});

describe('Meter-only privacy persistence — deferred-outbox path', () => {
    it('on primary INSERT failure, the outbox bound params contain ZERO sentinels', async () => {
        // tenant default → INSERT fails (check constraint) → outbox succeeds
        (db.query as any)
            .mockResolvedValueOnce({
                rows: [{
                    default_privacy_mode: 'metadata_only',
                    store_prompts: false, store_responses: false,
                    require_redaction: true, retention_days: 30,
                }],
            })
            .mockRejectedValueOnce(Object.assign(
                new Error(`CHECK violation: "${PROMPT_SENTINEL}"`),
                { code: '23514' },
            ))
            .mockResolvedValueOnce({ rows: [{ id: 'outbox-1', retry_count: 0 }] });

        const c = captureConsole();
        try {
            const res = await POST(postReq({
                request_id: 'req_deferred_sentinel',
                metadata: {
                    prompt:       PROMPT_SENTINEL,
                    response:     RESPONSE_SENTINEL,
                    file:         FILE_SENTINEL,
                    keep_this:    'safe-value',
                },
            }));
            expect(res.status).toBe(202);
            const body = await res.json();
            expect(body.deferred).toBe(true);
            expect(body.event_id).toBeUndefined();
            expect(body.privacy.prompt_stored).toBe(false);

            // The outbox INSERT is the third db.query call.
            const outboxCall = (db.query as any).mock.calls[2];
            expect(/INSERT INTO economic_event_write_failures/.test(outboxCall[0])).toBe(true);
            for (let i = 0; i < outboxCall[1].length; i++) {
                const hits = scanForSentinels(outboxCall[1][i]);
                expect(hits, `outbox bind $${i + 1} leaked: ${hits.join(', ')}`).toEqual([]);
            }
            // error_message_safe (bind index 5) must be redacted but present.
            expect(typeof outboxCall[1][5]).toBe('string');
            expect(outboxCall[1][5]).not.toContain(PROMPT_SENTINEL);

            // Benign metadata still survives in the outbox payload (last bind).
            const payload = outboxCall[1][outboxCall[1].length - 1];
            expect(payload).toContain('keep_this');
            expect(payload).toContain('safe-value');

            // No console line carries any sentinel.
            for (const line of c.captured) {
                expect(scanForSentinels(line)).toEqual([]);
            }
        } finally {
            c.restore();
        }
    });
});
