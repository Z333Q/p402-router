import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { replayOutboxRow, inputFromPayload, type PendingOutboxRow } from '../retry-worker';

const TENANT = '00000000-0000-0000-0000-000000000abc';
const SENTINEL = '[[SENTINEL c0ffee — would be content if leaked]]';

beforeEach(() => (db.query as any).mockReset());

function pendingRow(over: Partial<PendingOutboxRow> = {}): PendingOutboxRow {
    return {
        id: 'outbox-1',
        tenant_id: TENANT,
        request_id: 'req_retry_1',
        source: 'chat_completions',
        route:  '/api/v2/chat/completions',
        error_code: 'db_unavailable',
        error_message_safe: 'connection terminated',
        retry_count: 0,
        next_retry_at: '2026-06-04T00:00:00Z',
        payload: {
            request_id: 'req_retry_1',
            api_key_id: 'k_1',
            department_id: 'claims',
            provider: 'openai',
            model_used: 'gpt-4o-mini',
            input_tokens: 100,
            output_tokens: 50,
            cost_usd: 0.002,
            metadata: { external_correlation_id: 'corr_42' },
        },
        ...over,
    };
}

describe('inputFromPayload', () => {
    it('reconstructs allowlisted fields with correct types', () => {
        const input = inputFromPayload({
            request_id: 'r',
            api_key_id: 'k',
            department_id: 'd1',
            cost_usd: 0.005,
            input_tokens: 100,
            output_tokens: 50,
            governance_decision: 'approved',
            quality_score: 0.9,
        });
        expect(input.request_id).toBe('r');
        expect(input.cost_usd).toBe(0.005);
        expect(input.governance_decision).toBe('approved');
        expect(input.quality_score).toBe(0.9);
    });

    it('drops _promptForRedaction even if a bad row contains it', () => {
        // Should be impossible (allowlist), but defense in depth.
        const input = inputFromPayload({
            request_id: 'r',
            _promptForRedaction:   SENTINEL,
            _responseForRedaction: SENTINEL,
        } as any);
        expect((input as any)._promptForRedaction).toBeUndefined();
        expect((input as any)._responseForRedaction).toBeUndefined();
    });

    it('ignores unknown privacy_mode_override values', () => {
        const input = inputFromPayload({
            request_id: 'r',
            privacy_mode_override: 'wide_open',
        });
        expect(input.privacy_mode_override).toBeUndefined();
    });
});

describe('replayOutboxRow — resolved path', () => {
    it('replays successfully and marks row resolved', async () => {
        // Inside writeEconomicEvent:
        //   1. scope override (api_key) — miss
        //   2. tenant default — metadata_only
        //   3. primary INSERT — success
        // Then the worker UPDATEs the outbox row to resolved.
        (db.query as any)
            .mockResolvedValueOnce({ rows: [] })  // scope override miss #1 (api_key)
            .mockResolvedValueOnce({ rows: [] })  // scope override miss #2 (department)
            .mockResolvedValueOnce({
                rows: [{
                    default_privacy_mode: 'metadata_only',
                    store_prompts: false, store_responses: false,
                    require_redaction: true, retention_days: 30,
                }],
            })
            .mockResolvedValueOnce({ rows: [{ id: 'evt-1' }] })  // primary INSERT
            .mockResolvedValueOnce({ rowCount: 1 });             // UPDATE outbox to resolved

        const r = await replayOutboxRow(pendingRow());
        expect(r.outcome).toBe('resolved');
        expect(r.last_error_code).toBeNull();

        // The final UPDATE writes status='resolved'.
        const updateCall = (db.query as any).mock.calls[4];
        expect(updateCall[0]).toContain(`status = 'resolved'`);
        expect(updateCall[1]).toEqual(['outbox-1']);
    });

    it('privacy is RE-RESOLVED at replay time (not the original policy)', async () => {
        // Worker passes the reconstructed input through writeEconomicEvent
        // which calls resolveTenantPrivacy with the CURRENT tenant settings.
        // Here we simulate: tenant changed default to full_trace + opts in.
        // Replay should use full_trace, not the original metadata_only.
        (db.query as any)
            .mockResolvedValueOnce({ rows: [] })  // scope override miss #1 (api_key)
            .mockResolvedValueOnce({ rows: [] })  // scope override miss #2 (department)
            .mockResolvedValueOnce({
                rows: [{
                    default_privacy_mode: 'full_trace',
                    store_prompts: true, store_responses: true,
                    require_redaction: false, retention_days: 7,
                }],
            })
            .mockResolvedValueOnce({ rows: [{ id: 'evt-2' }] })
            .mockResolvedValueOnce({ rowCount: 1 });

        const r = await replayOutboxRow(pendingRow());
        expect(r.outcome).toBe('resolved');

        // The 4th query is the ai_economic_events INSERT (after 2 scope
        // misses + tenant default). It should bind privacy_mode='full_trace'
        // (the CURRENT policy), not metadata_only (the original attempt's).
        const insertCall = (db.query as any).mock.calls[3];
        const params = insertCall[1];
        expect(params).toContain('full_trace');
    });
});

describe('replayOutboxRow — retry / abandon path', () => {
    it('on replay failure, reads back the row and reports "retried"', async () => {
        // writeEconomicEvent fails again → recordWriteFailure UPSERTs the
        // row and increments retry_count to 1. Worker then reads the row
        // back to determine outcome.
        (db.query as any)
            .mockResolvedValueOnce({ rows: [] })  // scope miss #1 (api_key)
            .mockResolvedValueOnce({ rows: [] })  // scope miss #2 (department)
            .mockResolvedValueOnce({               // tenant default
                rows: [{
                    default_privacy_mode: 'metadata_only',
                    store_prompts: false, store_responses: false,
                    require_redaction: true, retention_days: 30,
                }],
            })
            .mockRejectedValueOnce(Object.assign(new Error('still down'), { code: '08006' }))  // primary INSERT fail
            .mockResolvedValueOnce({ rows: [{ id: 'outbox-1', retry_count: 1 }] })             // recordWriteFailure
            .mockResolvedValueOnce({ rows: [{ retry_count: 1, status: 'pending', error_code: 'db_unavailable' }] }); // read-back

        const r = await replayOutboxRow(pendingRow({ retry_count: 0 }));
        expect(r.outcome).toBe('retried');
        expect(r.last_error_code).toBe('db_unavailable');
    });

    it('on replay failure that reaches abandon threshold, reports "abandoned"', async () => {
        (db.query as any)
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [{
                    default_privacy_mode: 'metadata_only',
                    store_prompts: false, store_responses: false,
                    require_redaction: true, retention_days: 30,
                }],
            })
            .mockRejectedValueOnce(new Error('still down'))
            .mockResolvedValueOnce({ rows: [{ id: 'outbox-1', retry_count: 7 }] })
            .mockResolvedValueOnce({ rows: [{ retry_count: 7, status: 'abandoned', error_code: 'unknown' }] });

        const r = await replayOutboxRow(pendingRow({ retry_count: 6 }));
        expect(r.outcome).toBe('abandoned');
    });
});
