// Slice 3E — denied-event input builder.
//
// Pure helper that maps a pre-routing enforcement violation into the
// canonical EconomicEventInput shape for writeEconomicEvent. The output
// is metadata-only: no prompt or response content. cost_usd is 0 because
// the provider was never called.
//
// The mapping from ApiError.code to deny_code and deny_rule is the static
// proof of deterministic denials. The same ApiError.code always produces
// the same deny_code AND the same deny_rule. The flip-readiness loader
// imports CODE_PATH_PRESENT and DENY_CODE_MAPPING_DETERMINISTIC from this
// module as compile-time markers — old DB rows cannot certify the current
// deployed code path; importing this module does.

import type { ApiKeyContext } from '@/lib/types/api-key';
import type { EconomicEventInput, Scope } from './types';

/** Static marker the flip-readiness loader imports. True only when this
 *  module is reachable in the running build — proves the denied-event
 *  code path is compiled in, regardless of whether any denied row has
 *  ever been written. */
export const DENIED_EVENT_CODE_PATH_PRESENT = true as const;

/** Static marker: the ApiError.code -> deny_code mapping below is a
 *  total function over the budget-guard deny codes. Same input always
 *  yields same output. */
export const DENY_CODE_MAPPING_DETERMINISTIC = true as const;

/** ApiError.code values that represent runtime Control denials emitted by
 *  budget-guard. The route uses isDenialCode() to decide whether to
 *  record a denied event. */
export const DENY_CODE_MAP = {
    MODEL_NOT_ALLOWED:              'MODEL_NOT_ALLOWED',
    TASK_TYPE_NOT_ALLOWED:          'TASK_TYPE_NOT_ALLOWED',
    API_KEY_BUDGET_EXCEEDED:        'API_KEY_BUDGET_EXCEEDED',
    EMPLOYEE_BUDGET_EXCEEDED:       'EMPLOYEE_BUDGET_EXCEEDED',
    DEPARTMENT_BUDGET_EXCEEDED:     'DEPARTMENT_BUDGET_EXCEEDED',
    MAX_COST_PER_REQUEST_EXCEEDED:  'MAX_COST_PER_REQUEST_EXCEEDED',
} as const satisfies Record<string, string>;

export type DeniedApiErrorCode = keyof typeof DENY_CODE_MAP;

/** Specific rule that produced the denial. Surfaced in
 *  metadata.deny_rule on the ai_economic_events row so auditors can see
 *  which configured limit triggered. */
export const DENY_RULE_MAP: Record<DeniedApiErrorCode, string> = {
    MODEL_NOT_ALLOWED:              'api_key.allowed_models',
    TASK_TYPE_NOT_ALLOWED:          'api_key.allowed_task_types',
    API_KEY_BUDGET_EXCEEDED:        'api_key.monthly_budget_usd',
    EMPLOYEE_BUDGET_EXCEEDED:       'employee.monthly_budget_usd',
    DEPARTMENT_BUDGET_EXCEEDED:     'department.monthly_budget_usd',
    MAX_COST_PER_REQUEST_EXCEEDED:  'api_key.max_cost_per_request_usd',
};

export function isDenialCode(code: string): code is DeniedApiErrorCode {
    return Object.prototype.hasOwnProperty.call(DENY_CODE_MAP, code);
}

export interface DeniedAttribution {
    apiKeyId: string | null;
    departmentId: string | null;
    employeeUuid: string | null;
    projectId: string | null;
    actionType: string | null;
    taskType: string | null;
}

export interface BuildDeniedEventArgs {
    requestId: string;
    apiKeyCtx: ApiKeyContext | null;
    attribution: DeniedAttribution;
    denyCode: DeniedApiErrorCode;
    httpStatus: number;
    route: string;
    modelRequested: string | null;
    taskType: string | null;
}

/**
 * Build the EconomicEventInput for a runtime Control denial. Metadata
 * only. cost_usd = 0 (provider was never called). decision_source and
 * deny_rule are written to metadata so policy_id/mandate_id stay NULL
 * when the denial did not come from a real AP2 policy or mandate.
 */
export function buildDeniedEventInput(args: BuildDeniedEventArgs): EconomicEventInput {
    const denyRule = DENY_RULE_MAP[args.denyCode];
    const ownerType: Scope | null = args.attribution.apiKeyId
        ? 'api_key'
        : args.attribution.employeeUuid
            ? 'employee'
            : args.attribution.departmentId
                ? 'department'
                : null;

    return {
        request_id: args.requestId,
        source: 'chat_completions',
        _route: args.route,

        api_key_id:    args.attribution.apiKeyId    ?? null,
        owner_type:    ownerType,
        owner_id:      args.attribution.apiKeyId
                       ?? args.attribution.employeeUuid
                       ?? args.attribution.departmentId
                       ?? null,
        department_id: args.attribution.departmentId ?? null,
        employee_id:   args.attribution.employeeUuid ?? null,
        project_id:    args.attribution.projectId    ?? null,

        action_type:   args.attribution.actionType ?? null,
        task_type:     args.attribution.taskType   ?? null,

        provider:        null,
        model_requested: args.modelRequested,
        model_used:      null,

        input_tokens:  0,
        output_tokens: 0,
        total_tokens:  0,

        cost_usd:        0,
        direct_cost_usd: 0,

        status_code: args.httpStatus,
        success:     false,

        // Authority for the decision is recorded in metadata, NOT
        // policy_id/mandate_id. budget-guard is not an AP2 policy.
        policy_id:  null,
        mandate_id: null,

        governance_decision: 'denied',
        deny_code:           args.denyCode,

        metadata: {
            decision_source: 'budget_guard',
            deny_rule: denyRule,
        },
    };
}
