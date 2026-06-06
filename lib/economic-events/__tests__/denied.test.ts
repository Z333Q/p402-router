// Slice 3E — unit tests for denied-event builder + recorder.
//
// These tests prove three payment-grade properties:
//
//   1. The ApiError.code -> (deny_code, deny_rule) mapping is total and
//      deterministic. Same code in, same shape out, no Date.now()/Math.random
//      contamination.
//   2. recordDeniedEvent NEVER throws. The three outcomes are
//      ('recorded' | 'deferred' | 'failed'), and the caller can build its
//      original ApiError response on any of them.
//   3. The truth-markers exported for the flip-readiness loader stay true at
//      module load — that import IS the compile-time proof.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    buildDeniedEventInput,
    isDenialCode,
    DENIED_EVENT_CODE_PATH_PRESENT,
    DENY_CODE_MAPPING_DETERMINISTIC,
    DENY_CODE_MAP,
    DENY_RULE_MAP,
    type DeniedApiErrorCode,
} from '@/lib/economic-events/denied';

import { recordDeniedEvent } from '@/lib/economic-events/record-denied';

// Mock the writer module — the recorder is the unit under test, not the
// real ai_economic_events INSERT path.
vi.mock('@/lib/economic-events/writer', async () => {
    const actual = await vi.importActual<typeof import('@/lib/economic-events/writer')>(
        '@/lib/economic-events/writer',
    );
    return {
        ...actual,
        writeEconomicEvent: vi.fn(),
    };
});

import { writeEconomicEvent, EconomicEventDeferredError } from '@/lib/economic-events/writer';

const writerMock = writeEconomicEvent as unknown as ReturnType<typeof vi.fn>;

const TENANT = '11111111-1111-1111-1111-111111111111';

function baseArgs(overrides: Partial<Parameters<typeof buildDeniedEventInput>[0]> = {}) {
    return {
        requestId: 'req-abc-123',
        apiKeyCtx: null,
        attribution: {
            apiKeyId:     'ak_1',
            departmentId: 'dept_1',
            employeeUuid: 'emp_1',
            projectId:    'proj_1',
            actionType:   'inference',
            taskType:     'chat_completions',
        },
        denyCode:       'API_KEY_BUDGET_EXCEEDED' as DeniedApiErrorCode,
        httpStatus:     402,
        route:          '/api/v2/chat/completions',
        modelRequested: 'gpt-4o-mini',
        taskType:       'chat_completions',
        ...overrides,
    };
}

beforeEach(() => {
    writerMock.mockReset();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('truth markers', () => {
    it('are true at import time (compile-time proof)', () => {
        expect(DENIED_EVENT_CODE_PATH_PRESENT).toBe(true);
        expect(DENY_CODE_MAPPING_DETERMINISTIC).toBe(true);
    });
});

describe('isDenialCode', () => {
    it('accepts every key in DENY_CODE_MAP', () => {
        for (const k of Object.keys(DENY_CODE_MAP)) {
            expect(isDenialCode(k)).toBe(true);
        }
    });
    it('rejects unrelated ApiError codes', () => {
        for (const k of ['INTERNAL_ERROR', 'UNAUTHORIZED', 'NOT_FOUND', '']) {
            expect(isDenialCode(k)).toBe(false);
        }
    });
});

describe('buildDeniedEventInput — total + deterministic mapping', () => {
    it('produces an identical row for repeated calls with the same args', () => {
        const a = buildDeniedEventInput(baseArgs());
        const b = buildDeniedEventInput(baseArgs());
        expect(b).toStrictEqual(a);
    });

    it('marks the row as a denied, zero-cost, never-routed event', () => {
        const r = buildDeniedEventInput(baseArgs());
        expect(r.governance_decision).toBe('denied');
        expect(r.success).toBe(false);
        expect(r.cost_usd).toBe(0);
        expect(r.direct_cost_usd).toBe(0);
        expect(r.input_tokens).toBe(0);
        expect(r.output_tokens).toBe(0);
        expect(r.total_tokens).toBe(0);
        expect(r.provider).toBeNull();
        expect(r.model_used).toBeNull();
        expect(r.policy_id).toBeNull();
        expect(r.mandate_id).toBeNull();
    });

    it('writes decision_source=budget_guard + deny_rule into metadata, not policy_id', () => {
        for (const code of Object.keys(DENY_CODE_MAP) as DeniedApiErrorCode[]) {
            const r = buildDeniedEventInput(baseArgs({ denyCode: code }));
            expect(r.deny_code).toBe(code);
            expect(r.metadata).toEqual({
                decision_source: 'budget_guard',
                deny_rule: DENY_RULE_MAP[code],
            });
            expect(r.policy_id).toBeNull();
            expect(r.mandate_id).toBeNull();
        }
    });

    it('derives owner_type from the most specific attribution layer', () => {
        // api_key takes precedence
        expect(buildDeniedEventInput(baseArgs()).owner_type).toBe('api_key');
        // employee when no api_key
        expect(buildDeniedEventInput(baseArgs({
            attribution: {
                apiKeyId: null, departmentId: 'dept_1', employeeUuid: 'emp_1',
                projectId: null, actionType: null, taskType: null,
            },
        })).owner_type).toBe('employee');
        // department when neither api_key nor employee
        expect(buildDeniedEventInput(baseArgs({
            attribution: {
                apiKeyId: null, departmentId: 'dept_1', employeeUuid: null,
                projectId: null, actionType: null, taskType: null,
            },
        })).owner_type).toBe('department');
        // null when nothing is attributable
        expect(buildDeniedEventInput(baseArgs({
            attribution: {
                apiKeyId: null, departmentId: null, employeeUuid: null,
                projectId: null, actionType: null, taskType: null,
            },
        })).owner_type).toBeNull();
    });
});

describe('content-safety — denied event input is metadata-only', () => {
    // Payment-grade: a Control denial happens BEFORE any provider call, so
    // the event row must never carry prompt / messages / completion bodies.
    // This contract holds regardless of what the route happens to have in
    // scope (a user message, a captured response, etc.).
    const FORBIDDEN_KEYS = [
        'prompt',
        'messages',
        'completion',
        'response_body',
        'request_body',
        // The writer's content-bearing channels (consumed + dropped under
        // metadata_only). If a future refactor ever set them on a denied
        // event by mistake, the writer would still drop them — but a denied
        // row should never even carry them.
        '_promptForRedaction',
        '_responseForRedaction',
    ] as const;

    const FORBIDDEN_VALUE_NEEDLES = [
        '[[REAL PROMPT — would expose customer PII if persisted]]',
        '[[REAL MODEL OUTPUT — would expose generated content]]',
        '"role":"user"',
        '"role":"assistant"',
    ];

    it('buildDeniedEventInput emits NO content-bearing keys', () => {
        for (const code of Object.keys(DENY_CODE_MAP) as DeniedApiErrorCode[]) {
            const r = buildDeniedEventInput(baseArgs({ denyCode: code })) as unknown as Record<string, unknown>;
            for (const k of FORBIDDEN_KEYS) {
                expect(Object.prototype.hasOwnProperty.call(r, k)).toBe(false);
            }
        }
    });

    it('buildDeniedEventInput emits NO content-bearing values, even when attribution carries identifiers', () => {
        const r = buildDeniedEventInput(baseArgs()) as unknown as Record<string, unknown>;
        const serialized = JSON.stringify(r);
        for (const needle of FORBIDDEN_VALUE_NEEDLES) {
            expect(serialized).not.toContain(needle);
        }
    });

    it('recordDeniedEvent forwards a metadata-only payload to the writer (no prompt/messages/completion)', async () => {
        writerMock.mockResolvedValueOnce(undefined);
        await recordDeniedEvent(TENANT, buildDeniedEventInput(baseArgs()));
        const [, forwarded] = writerMock.mock.calls[0]!;
        const obj = forwarded as Record<string, unknown>;
        for (const k of FORBIDDEN_KEYS) {
            expect(Object.prototype.hasOwnProperty.call(obj, k)).toBe(false);
        }
        // And belt-and-suspenders: the metadata bag is bounded to the
        // decision-source + deny-rule pair. No content keys leaked there.
        expect(obj.metadata).toEqual({
            decision_source: 'budget_guard',
            deny_rule: expect.any(String),
        });
    });
});

describe('recordDeniedEvent — never throws', () => {
    it('returns "recorded" when the writer resolves', async () => {
        writerMock.mockResolvedValueOnce(undefined);
        const r = await recordDeniedEvent(TENANT, buildDeniedEventInput(baseArgs()));
        expect(r.outcome).toBe('recorded');
        expect(r.requestId).toBe('req-abc-123');
        expect(writerMock).toHaveBeenCalledTimes(1);
        expect(writerMock).toHaveBeenCalledWith(TENANT, expect.objectContaining({
            governance_decision: 'denied',
            deny_code: 'API_KEY_BUDGET_EXCEEDED',
        }));
    });

    it('returns "deferred" when the writer raises EconomicEventDeferredError (outbox absorbed it)', async () => {
        writerMock.mockRejectedValueOnce(
            new EconomicEventDeferredError('req-abc-123'),
        );
        const r = await recordDeniedEvent(TENANT, buildDeniedEventInput(baseArgs()));
        expect(r.outcome).toBe('deferred');
        expect(r.requestId).toBe('req-abc-123');
    });

    it('returns "failed" (does NOT throw) when the writer raises a generic error', async () => {
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        writerMock.mockRejectedValueOnce(new Error('connection_refused'));
        const r = await recordDeniedEvent(TENANT, buildDeniedEventInput(baseArgs()));
        expect(r.outcome).toBe('failed');
        expect(r.reason).toContain('connection_refused');
        expect(errSpy).toHaveBeenCalled();
    });

    it('never propagates the writer error so the caller can still return the original ApiError', async () => {
        writerMock.mockRejectedValueOnce(new Error('explode'));
        await expect(
            recordDeniedEvent(TENANT, buildDeniedEventInput(baseArgs())),
        ).resolves.toMatchObject({ outcome: 'failed' });
    });
});
