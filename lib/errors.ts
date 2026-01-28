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

export class ApiError extends Error {
    public readonly code: ApiErrorCode
    public readonly status: number
    public readonly requestId: string
    public readonly details?: unknown

    constructor(args: { code: ApiErrorCode; status: number; message: string; requestId: string; details?: unknown }) {
        super(args.message)
        this.code = args.code
        this.status = args.status
        this.requestId = args.requestId
        this.details = args.details
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
