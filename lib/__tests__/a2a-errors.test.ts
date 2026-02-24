import { describe, it, expect } from 'vitest';
import { ApiError } from '@/lib/errors';
import { toA2ARpcError, A2ARpcErrorCode } from '@/lib/a2a-errors';

describe('A2A JSON-RPC Error Mapping', () => {
    it('correctly maps a PLAN_CAP_EXCEEDED REST error to JSON-RPC -32001', () => {
        const restError = new ApiError({
            code: 'PLAN_CAP_EXCEEDED',
            status: 403,
            message: 'Monthly A2A routing cap exceeded.',
            requestId: 'req_123',
            metadata: { requiredPlan: 'pro', usagePercent: 100 }
        });

        const rpcError = toA2ARpcError(restError);

        expect(rpcError.code).toBe(A2ARpcErrorCode.PLAN_CAP_EXCEEDED);
        expect(rpcError.message).toBe('Monthly A2A routing cap exceeded.');
        expect(rpcError.data?.code).toBe('PLAN_CAP_EXCEEDED');
        expect(rpcError.data?.requiredPlan).toBe('pro');
    });

    it('correctly handles untyped unknown errors as INTERNAL_ERROR', () => {
        const unknownError = new Error('Database exploded');
        const rpcError = toA2ARpcError(unknownError);

        expect(rpcError.code).toBe(A2ARpcErrorCode.INTERNAL_ERROR);
        expect(rpcError.message).toBe('An unexpected orchestrator error occurred');
    });
});
