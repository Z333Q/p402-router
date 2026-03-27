import { NextResponse } from 'next/server';

export type ApiErrorCode =
    | 'INVALID_INPUT'
    | 'INVALID_REQUEST'
    | 'UNSUPPORTED_ASSET'
    | 'UNSUPPORTED_FEATURE'
    | 'REPLAY_DETECTED'
    | 'VERIFICATION_FAILED'
    | 'NO_TREASURY'
    | 'INTERNAL_ERROR'
    | 'INVALID_RECIPIENT'
    | 'AUTHORIZATION_NOT_YET_VALID'
    | 'AUTHORIZATION_EXPIRED'
    | 'INVALID_SIGNATURE'
    | 'GAS_PRICE_TOO_HIGH'
    | 'INVALID_AUTHORIZATION'
    | 'AUTHORIZATION_USED'
    | 'ERC8004_REGISTRATION_FAILED'
    | 'ERC8004_IDENTITY_NOT_FOUND'
    | 'ERC8004_REPUTATION_UNAVAILABLE'
    | 'ERC8004_VALIDATION_FAILED'
    | 'MANDATE_NOT_FOUND'
    | 'MANDATE_INACTIVE'
    | 'MANDATE_EXPIRED'
    | 'MANDATE_BUDGET_EXCEEDED'
    | 'MANDATE_CATEGORY_DENIED'
    | 'MANDATE_SIGNATURE_INVALID'
    | 'PLAN_CAP_EXCEEDED'
    | 'PLAN_FEATURE_LOCKED'
    | 'SAFETY_SCAN_REJECTED'
    | 'SAFETY_IDENTITY_REQUIRED'
    | 'SECURITY_PACK_BLOCKED'
    | 'CDP_WALLET_ERROR'
    | 'CDP_PROVISION_FAILED'
    | 'CDP_AUTH_INVALID'
    | 'CDP_POLICY_DENIED'
    | 'RECEIPT_NOT_FOUND'
    | 'RECEIPT_EXPIRED'
    | 'RECEIPT_INSUFFICIENT_BALANCE'
    // Execute / Intelligence Layer
    | 'BUDGET_INSUFFICIENT'
    | 'BUDGET_RESERVATION_FAILED'
    | 'PLAN_GENERATION_FAILED'
    | 'NO_VALID_PLAN'
    | 'IDEMPOTENCY_CONFLICT'
    | 'EXECUTION_FAILED'

export class ApiError extends Error {
    public readonly code: ApiErrorCode
    public readonly status: number
    public readonly requestId: string
    public readonly details?: unknown
    public readonly metadata?: unknown

    constructor(args: { code: ApiErrorCode; status: number; message: string; requestId: string; details?: unknown; metadata?: unknown }) {
        super(args.message)
        this.code = args.code
        this.status = args.status
        this.requestId = args.requestId
        this.details = args.details
        this.metadata = args.metadata
    }
}

export function toApiErrorResponse(err: unknown, requestId: string) {
    console.error(`[API Error] ${requestId}:`, err)

    if (err instanceof ApiError) {
        return NextResponse.json({
            error: {
                type: 'api_error',
                code: err.code,
                message: err.message,
                details: err.details
            }
        }, { status: err.status });
    }
    return NextResponse.json({
        error: {
            type: 'internal_error',
            code: 'INTERNAL_ERROR',
            message: 'An internal error occurred.'
        }
    }, { status: 500 });
}
