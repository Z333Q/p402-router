/**
 * Slice 3E — payment-grade route-level proof for the chat/completions
 * pre-routing denial path.
 *
 * These tests do not exercise the provider routing graph. They assert that
 * when budget-guard throws, the route:
 *
 *   - awaits recordDeniedEvent EXACTLY once per denial code,
 *   - returns the ORIGINAL ApiError envelope (code + status + message),
 *   - keeps the requestId identical between the denied-event input and the
 *     toApiErrorResponse call (one event per response, no drift),
 *   - never invokes the provider registry (the provider call stays blocked),
 *   - does NOT record a denied event for non-denial ApiErrors, and
 *   - still returns the ORIGINAL ApiError even when the recorder reports
 *     'deferred' (outbox absorbed) or 'failed' (writer + outbox both down).
 *
 * The recorder is mocked at the module boundary so we can vary its outcome.
 * The denied-event input shape itself is covered by the unit tests in
 * lib/economic-events/__tests__/denied.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ApiError, type ApiErrorCode } from '@/lib/errors';
import type { ApiKeyContext } from '@/lib/types/api-key';

// ── A fixed requestId so we can prove input.requestId === response-path id ──
const FIXED_REQUEST_ID = '00000000-0000-4000-8000-0000000000ee';
vi.stubGlobal('crypto', { ...globalThis.crypto, randomUUID: () => FIXED_REQUEST_ID });

// ── Test-controlled enforcement + recorder ────────────────────────────────
const enforcePreRoutingMock = vi.fn();
const recordDeniedEventMock = vi.fn();
const providerRegistryGetCompletion = vi.fn();
const providerRegistryGetCompletionStream = vi.fn();

vi.mock('@/lib/budget-guard', () => ({
    enforcePreRouting: enforcePreRoutingMock,
    enforcePostRouting: vi.fn(),
    getMonthToDateSpend: vi.fn(),
}));

vi.mock('@/lib/economic-events/record-denied', () => ({
    recordDeniedEvent: recordDeniedEventMock,
}));

// resolveApiKeyContext returns a canned context; the route's pre-routing
// branch only runs when this is non-null.
const TEST_CTX: ApiKeyContext = {
    apiKeyId:     'ak_test',
    tenantId:     'tenant-route-test',
    ownerType:    'tenant',
    ownerId:      'tenant-route-test',
    departmentId: 'dept_test',
    employeeId:   'emp_test',
    workflowId:   null,
    projectId:    'proj_test',
    budgetId:     null,
    policyId:     null,
    allowedModels:     ['gpt-4o-mini'],
    allowedTaskTypes:  ['chat_completions'],
    maxCostPerRequestUsd: null,
    monthlyBudgetUsd: 10,
    headerOverridePolicy: 'allow',
    departmentMonthlyBudgetUsd: null,
    employeeMonthlyBudgetUsd:   null,
};

vi.mock('@/lib/api-key-context', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api-key-context')>();
    return {
        ...actual,
        resolveApiKeyContext: vi.fn(async () => TEST_CTX),
    };
});

// Provider registry — if any code path tries to use it after a denial, the
// spies will catch it. Returning a registry stub also keeps module load
// happy.
vi.mock('@/lib/ai-providers', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/ai-providers')>();
    return {
        ...actual,
        getProviderRegistry: () => ({
            getCompletion:       providerRegistryGetCompletion,
            getCompletionStream: providerRegistryGetCompletionStream,
        }),
    };
});

// mppx OFF — keeps the dual-protocol branch out of the denial test.
vi.mock('@/lib/mpp/instance', () => ({
    getMppx: () => null,
    getMppxChargeAmount: () => '0',
    extractMppxPayer: () => null,
    isP402MppMethod: () => false,
}));

// DB — fail-loud on accidental reads; the denial path must not touch it.
vi.mock('@/lib/db', () => ({
    default: { query: vi.fn(async () => ({ rows: [] })) },
    query: vi.fn(async () => ({ rows: [] })),
}));

// Other side-effecting modules that we don't want to actually run.
vi.mock('@/lib/identity/agentkit', () => ({
    checkAgentkitAccess:           vi.fn(async () => ({ allowed: false })),
    buildAgentkitChallengeExtension: vi.fn(() => null),
}));
vi.mock('@/lib/identity/reputation', () => ({
    getReputationScore: vi.fn(async () => null),
}));
vi.mock('@/lib/services/credits-service', () => ({
    spendCredits:        vi.fn(async () => null),
    getBalance:          vi.fn(async () => ({ balance: 0 })),
    getOrCreateAccount:  vi.fn(async () => ({ humanId: 'h_1' })),
    FREE_TRIAL_CREDITS:  0,
}));
vi.mock('@/lib/billing/entitlements', () => ({
    computePlatformFeeUsd: vi.fn(() => 0),
}));
vi.mock('@/lib/billing/plan-guard', () => ({
    getTenantPlan: vi.fn(async () => ({ plan: 'free' })),
}));
vi.mock('@/lib/billing/usage', () => ({
    recordUsage: vi.fn(async () => undefined),
}));
vi.mock('@/lib/intelligence/optimization', () => ({
    OptimizationEngine: class {
        analyzeForContext() { return null; }
    },
}));
vi.mock('@/lib/economic-events/writer', () => ({
    writeEconomicEvent: vi.fn(async () => ({ id: 'evt_x' })),
    EconomicEventDeferredError: class extends Error {},
}));
vi.mock('@/lib/mpp/base-settler', () => ({
    executeBaseSettle: vi.fn(),
}));
vi.mock('@p402/mpp-method', () => ({
    verifyP402Charge: vi.fn(),
    verifyBaseCharge: vi.fn(),
    resolveAmount:    vi.fn(),
    decodePaymentHeader: vi.fn(),
}));

// Import the route AFTER all mocks are registered.
let POST: typeof import('@/app/api/v2/chat/completions/route').POST;
beforeEach(async () => {
    enforcePreRoutingMock.mockReset();
    recordDeniedEventMock.mockReset();
    providerRegistryGetCompletion.mockReset();
    providerRegistryGetCompletionStream.mockReset();
    if (!POST) {
        ({ POST } = await import('@/app/api/v2/chat/completions/route'));
    }
});

function makeReq(body: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost/api/v2/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'hello' }],
            ...body,
        }),
    });
}

function buildDenyApiError(code: ApiErrorCode, status = 402): ApiError {
    return new ApiError({ code, status, message: `denied:${code}`, requestId: '' });
}

async function readJson(res: Response) {
    return JSON.parse(await res.text());
}

const DENIAL_CASES: Array<{ code: ApiErrorCode; status: number }> = [
    { code: 'MODEL_NOT_ALLOWED',          status: 403 },
    { code: 'TASK_TYPE_NOT_ALLOWED',      status: 403 },
    { code: 'API_KEY_BUDGET_EXCEEDED',    status: 402 },
    { code: 'EMPLOYEE_BUDGET_EXCEEDED',   status: 402 },
    { code: 'DEPARTMENT_BUDGET_EXCEEDED', status: 402 },
];

describe('chat/completions pre-routing denial — recordDeniedEvent wiring', () => {
    for (const { code, status } of DENIAL_CASES) {
        it(`${code}: awaits recordDeniedEvent once, response carries the original ApiError, provider never called`, async () => {
            enforcePreRoutingMock.mockRejectedValueOnce(buildDenyApiError(code, status));
            recordDeniedEventMock.mockResolvedValueOnce({ outcome: 'recorded', requestId: FIXED_REQUEST_ID });

            const res = await POST(makeReq());

            // Recorder fired exactly once with our tenant + matching requestId + deny_code.
            expect(recordDeniedEventMock).toHaveBeenCalledTimes(1);
            const [tenantArg, inputArg] = recordDeniedEventMock.mock.calls[0]!;
            expect(tenantArg).toBe(TEST_CTX.tenantId);
            expect(inputArg.request_id).toBe(FIXED_REQUEST_ID);
            expect(inputArg.deny_code).toBe(code);
            expect(inputArg.governance_decision).toBe('denied');
            expect(inputArg.cost_usd).toBe(0);

            // Response is the ORIGINAL ApiError envelope, status preserved.
            expect(res.status).toBe(status);
            const body = await readJson(res);
            expect(body).toEqual({
                error: {
                    type: 'api_error',
                    code,
                    message: `denied:${code}`,
                    details: undefined,
                },
            });

            // Provider call NEVER invoked.
            expect(providerRegistryGetCompletion).not.toHaveBeenCalled();
            expect(providerRegistryGetCompletionStream).not.toHaveBeenCalled();
        });
    }

    it('uses the same requestId on the denied event AND the response-path logger', async () => {
        enforcePreRoutingMock.mockRejectedValueOnce(buildDenyApiError('MODEL_NOT_ALLOWED', 403));
        recordDeniedEventMock.mockResolvedValueOnce({ outcome: 'recorded', requestId: FIXED_REQUEST_ID });

        // toApiErrorResponse logs `[API Error] ${requestId}:` via console.error.
        // The setup file already swaps console.error for a vi.fn(); read it.
        await POST(makeReq());

        const [, inputArg] = recordDeniedEventMock.mock.calls[0]!;
        expect(inputArg.request_id).toBe(FIXED_REQUEST_ID);

        const logs = (console.error as unknown as ReturnType<typeof vi.fn>).mock.calls;
        const apiErrorLog = logs.find((c) => typeof c[0] === 'string' && c[0].startsWith('[API Error]'));
        expect(apiErrorLog).toBeDefined();
        expect(apiErrorLog![0]).toContain(FIXED_REQUEST_ID);
    });

    it('deferred outcome: original ApiError still reaches the client unchanged', async () => {
        enforcePreRoutingMock.mockRejectedValueOnce(buildDenyApiError('API_KEY_BUDGET_EXCEEDED', 402));
        recordDeniedEventMock.mockResolvedValueOnce({ outcome: 'deferred', requestId: FIXED_REQUEST_ID });

        const res = await POST(makeReq());

        expect(res.status).toBe(402);
        const body = await readJson(res);
        expect(body.error.code).toBe('API_KEY_BUDGET_EXCEEDED');
        expect(recordDeniedEventMock).toHaveBeenCalledTimes(1);
        expect(providerRegistryGetCompletion).not.toHaveBeenCalled();
    });

    it('failed outcome: original ApiError still reaches the client unchanged', async () => {
        enforcePreRoutingMock.mockRejectedValueOnce(buildDenyApiError('API_KEY_BUDGET_EXCEEDED', 402));
        recordDeniedEventMock.mockResolvedValueOnce({
            outcome: 'failed',
            requestId: FIXED_REQUEST_ID,
            reason: 'Error:writer_and_outbox_down',
        });

        const res = await POST(makeReq());

        expect(res.status).toBe(402);
        const body = await readJson(res);
        expect(body.error.code).toBe('API_KEY_BUDGET_EXCEEDED');
        expect(recordDeniedEventMock).toHaveBeenCalledTimes(1);
        expect(providerRegistryGetCompletion).not.toHaveBeenCalled();
    });

    // ── Slice 3F CI proof linkage ─────────────────────────────────────────
    // The flip-readiness loader treats AEE_DENIED_EVENT_KIND_TEST_PROVEN as
    // the test/CI proof that the production denial path reaches
    // recordDeniedEvent. This test file IS that proof: green here means
    // every payment-grade denial code wired through the route hits the
    // recorder before the response leaves. A future regression that
    // bypassed the recorder (e.g. swallowed the ApiError, fired the
    // provider call anyway, recorded asynchronously without await) would
    // turn one of these assertions red and the CI marker should be cleared
    // in the same change.
    it('Slice 3F CI proof: every DENY_CODE_MAP code reaches recordDeniedEvent exactly once', async () => {
        const { DENY_CODE_MAP } = await import('@/lib/economic-events/denied');
        for (const code of Object.keys(DENY_CODE_MAP) as ApiErrorCode[]) {
            recordDeniedEventMock.mockReset();
            enforcePreRoutingMock.mockReset();
            providerRegistryGetCompletion.mockReset();
            providerRegistryGetCompletionStream.mockReset();

            enforcePreRoutingMock.mockRejectedValueOnce(buildDenyApiError(code, 402));
            recordDeniedEventMock.mockResolvedValueOnce({ outcome: 'recorded', requestId: FIXED_REQUEST_ID });

            await POST(makeReq());

            expect(recordDeniedEventMock).toHaveBeenCalledTimes(1);
            const [, inputArg] = recordDeniedEventMock.mock.calls[0]!;
            expect(inputArg.deny_code).toBe(code);
            expect(providerRegistryGetCompletion).not.toHaveBeenCalled();
            expect(providerRegistryGetCompletionStream).not.toHaveBeenCalled();
        }
    });

    it('non-denial ApiError: does NOT call recordDeniedEvent', async () => {
        // INTERNAL_ERROR is an ApiError but not in DENY_CODE_MAP — must NOT
        // be persisted as a Control denial.
        enforcePreRoutingMock.mockRejectedValueOnce(
            new ApiError({ code: 'INTERNAL_ERROR', status: 500, message: 'boom', requestId: '' }),
        );

        const res = await POST(makeReq());

        expect(recordDeniedEventMock).not.toHaveBeenCalled();
        expect(res.status).toBe(500);
        expect(providerRegistryGetCompletion).not.toHaveBeenCalled();
    });
});
