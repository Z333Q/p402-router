export type PolicyDenyCode =
    | 'X402_LEGACY_HEADER_X_PAYMENT'
    | 'X402_INVALID_SIGNATURE'
    | 'X402_AMOUNT_BELOW_REQUIRED'
    | 'X402_UNSUPPORTED_NETWORK'
    | 'X402_UNSUPPORTED_ASSET'
    | 'X402_NO_SCHEME_REGISTERED'
    | 'X402_FACILITATOR_DOWN'
    | 'X402_KYT_REJECTED'
    | 'POLICY_PROVIDER_NOT_ALLOWED'
    | 'POLICY_PROVIDER_DENIED'
    | 'SESSION_INVALID'
    | 'SESSION_BUDGET_EXCEEDED'
    | 'POLICY_BUDGET_LIMIT'

export type PolicyDeny = {
    code: PolicyDenyCode
    retryable: boolean
    detail?: string
}

export function deny(code: PolicyDenyCode, retryable: boolean, detail?: string): PolicyDeny {
    return { code, retryable, detail }
}
