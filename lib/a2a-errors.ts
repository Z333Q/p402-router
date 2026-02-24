import { ApiError, type ApiErrorCode } from '@/lib/errors';

export const A2A_ERRORS = {
    PARSE_ERROR: { code: -32700, message: 'Parse error' },
    INVALID_REQUEST: { code: -32600, message: 'Invalid Request' },
    METHOD_NOT_FOUND: { code: -32601, message: 'Method not found' },
    INVALID_PARAMS: { code: -32602, message: 'Invalid params' },
    INTERNAL_ERROR: { code: -32603, message: 'Internal error' },

    // Application Errors
    TASK_NOT_FOUND: { code: -32001, message: 'Task not found' },
    UNAUTHORIZED: { code: -32004, message: 'Unauthorized' },
    BUDGET_EXCEEDED: { code: -32005, message: 'Budget exceeded' },
    PROVIDER_ERROR: { code: -32006, message: 'Provider error' },
    PAYMENT_REQUIRED: { code: -32007, message: 'Payment required' },
};

export class A2AError extends Error {
    code: number;
    data?: any;

    constructor(err: { code: number, message: string }, data?: any) {
        super(err.message);
        this.code = err.code;
        this.data = data;
    }

    toJSON(id: string | number | null = null) {
        return {
            jsonrpc: '2.0',
            error: {
                code: this.code,
                message: this.message,
                data: this.data
            },
            id
        };
    }
}

// JSON-RPC 2.0 Standard and custom server error blocks
export enum A2ARpcErrorCode {
    PARSE_ERROR = -32700,
    INVALID_REQUEST = -32600,
    METHOD_NOT_FOUND = -32601,
    INVALID_PARAMS = -32602,
    INTERNAL_ERROR = -32603,

    // P402 Custom Billing & Safety Errors (Server Error Range)
    PLAN_CAP_EXCEEDED = -32001,
    PLAN_FEATURE_LOCKED = -32002,
    SUBSCRIPTION_PAST_DUE = -32003,
    MANDATE_BUDGET_EXCEEDED = -32004,
    SECURITY_PACK_BLOCKED = -32005,
}

export interface A2ARpcErrorPayload {
    code: number;
    message: string;
    data?: {
        code: ApiErrorCode;
        requiredPlan?: string;
        upgradePath?: string;
        usagePercent?: number;
        [key: string]: unknown;
    };
}

// Map your REST errors into A2A-safe JSON-RPC payloads
export function toA2ARpcError(error: unknown): A2ARpcErrorPayload {
    if (error instanceof ApiError) {
        let rpcCode = A2ARpcErrorCode.INTERNAL_ERROR;

        // Map business logic errors to JSON-RPC codes
        switch (error.code) {
            case 'PLAN_CAP_EXCEEDED':
                rpcCode = A2ARpcErrorCode.PLAN_CAP_EXCEEDED;
                break;
            case 'PLAN_FEATURE_LOCKED':
                rpcCode = A2ARpcErrorCode.PLAN_FEATURE_LOCKED;
                break;
            case 'MANDATE_BUDGET_EXCEEDED':
                rpcCode = A2ARpcErrorCode.MANDATE_BUDGET_EXCEEDED;
                break;
            // Add other mappings as S4/S5 expand...
        }

        return {
            code: rpcCode,
            message: error.message,
            data: {
                code: error.code,
                ...(error.metadata || {}), // Passes upgrade paths directly to the agent's context
            },
        };
    }

    // Fallback for unhandled exceptions
    return {
        code: A2ARpcErrorCode.INTERNAL_ERROR,
        message: 'An unexpected orchestrator error occurred',
    };
}
