/**
 * Canonical export-field allow-list for the Slice 3G Prove-lite Finance
 * Export route.
 *
 * Lives in a sibling `_fields.ts` (not in `route.ts`) because Next.js 15
 * route files are only allowed to export route handlers and route config
 * (GET/POST/runtime/dynamic/etc.). Hoisting `EXPORT_FIELDS` here keeps the
 * production build's route-type validator happy while preserving the
 * single-source-of-truth contract for CSV column order, JSON key order,
 * and test assertions.
 */

/**
 * Canonical export field order. Drives CSV column headers AND JSON object
 * key order. The user-facing contract is a CFO-readable row, so payment-
 * grade fields (event_time, request_id, provider, cost) come first and
 * privacy/governance fields next to them.
 */
export const EXPORT_FIELDS = [
    'event_time',
    'request_id',
    'tenant_id',
    'source',
    'route',
    'provider',
    'model_used',
    'status_code',
    'success',
    'cost_usd',
    'input_tokens',
    'output_tokens',
    'total_tokens',
    'department_id',
    'employee_id',
    'api_key_id',
    'workflow_id',
    'customer_id',
    'feature_id',
    'budget_id',
    'policy_id',
    'mandate_id',
    'governance_decision',
    'deny_code',
    'privacy_mode',
    'prompt_stored',
    'response_stored',
    'redaction_applied',
    'retention_expires_at',
    'evidence_bundle_id',
    'decision_source',    // metadata->>'decision_source'
    'deny_rule',          // metadata->>'deny_rule'
] as const;

export type ExportField = typeof EXPORT_FIELDS[number];
