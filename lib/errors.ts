export type ApiErrorCode =
    | 'INVALID_INPUT'
    | 'UNSUPPORTED_ASSET'
    | 'REPLAY_DETECTED'
    | 'VERIFICATION_FAILED'
    | 'NO_TREASURY'
    | 'INTERNAL_ERROR'

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
        return {
            status: err.status,
            body: { code: err.code, message: err.message, requestId, details: err.details }
        }
    }
    return {
        status: 500,
        body: { code: 'INTERNAL_ERROR', message: 'An internal error occurred.', requestId }
    }
}
