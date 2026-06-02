// Budget-Owned API Keys — context resolver (Phase C).
//
// Takes a `Authorization: Bearer p402_live_<hex>` header, validates it against
// the api_keys table, and returns an ApiKeyContext joined with the owning
// department/employee for downstream attribution + budget enforcement.
//
// Read-only: this helper does not enforce caps; callers do that against the
// returned context. Header values (x-p402-department, x-p402-employee, etc.)
// remain overrides — but only if header_override_policy === 'allow'.

import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';
import db from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type {
    ApiKeyContext,
    ApiKeyOwnerType,
    HeaderOverridePolicy,
} from '@/lib/types/api-key';

interface ResolvedRow {
    id: string;
    tenant_id: string;
    status: 'active' | 'revoked';
    owner_type: ApiKeyOwnerType;
    department_id: string | null;
    employee_id: string | null;
    workflow_id: string | null;
    project_id: string | null;
    budget_id: string | null;
    policy_id: string | null;
    allowed_models: string[] | null;
    allowed_task_types: string[] | null;
    max_cost_per_request_usd: string | null;
    monthly_budget_usd: string | null;
    header_override_policy: HeaderOverridePolicy;
    department_monthly_budget_usd: string | null;
    employee_monthly_budget_usd: string | null;
}

const SELECT_SQL = `
    SELECT
        k.id, k.tenant_id, k.status,
        k.owner_type,
        k.department_id, k.employee_id, k.workflow_id, k.project_id,
        k.budget_id, k.policy_id,
        k.allowed_models, k.allowed_task_types,
        k.max_cost_per_request_usd, k.monthly_budget_usd,
        k.header_override_policy,
        d.budget_usd          AS department_monthly_budget_usd,
        e.monthly_budget_usd  AS employee_monthly_budget_usd
    FROM api_keys k
    LEFT JOIN departments d ON d.id = k.department_id
    LEFT JOIN employees   e ON e.id = k.employee_id
    WHERE k.key_hash = $1
    LIMIT 1
`;

function parseNumeric(v: string | null): number | null {
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function ownerIdFor(row: ResolvedRow): string | null {
    switch (row.owner_type) {
        case 'tenant':     return row.tenant_id;
        case 'department': return row.department_id;
        case 'employee':   return row.employee_id;
        case 'workflow':   return row.workflow_id;
        case 'project':    return row.project_id;
    }
}

export function rowToContext(row: ResolvedRow): ApiKeyContext {
    return {
        apiKeyId:                  row.id,
        tenantId:                  row.tenant_id,
        ownerType:                 row.owner_type,
        ownerId:                   ownerIdFor(row),
        departmentId:              row.department_id,
        employeeId:                row.employee_id,
        workflowId:                row.workflow_id,
        projectId:                 row.project_id,
        budgetId:                  row.budget_id,
        policyId:                  row.policy_id,
        allowedModels:             row.allowed_models ?? [],
        allowedTaskTypes:          row.allowed_task_types ?? [],
        maxCostPerRequestUsd:      parseNumeric(row.max_cost_per_request_usd),
        monthlyBudgetUsd:          parseNumeric(row.monthly_budget_usd),
        headerOverridePolicy:      row.header_override_policy,
        departmentMonthlyBudgetUsd: parseNumeric(row.department_monthly_budget_usd),
        employeeMonthlyBudgetUsd:   parseNumeric(row.employee_monthly_budget_usd),
    };
}

export function extractBearerKey(req: NextRequest): string | null {
    const h = req.headers.get('authorization') ?? req.headers.get('Authorization');
    if (!h) return null;
    const m = /^Bearer\s+(p402_live_[a-f0-9]{64})$/i.exec(h.trim());
    return m ? m[1]! : null;
}

export function hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Resolve a raw `p402_live_...` key to its ApiKeyContext. Returns null when no
 * Authorization header is present (lets callers fall back to other auth modes).
 * Throws ApiError('API_KEY_NOT_FOUND' | 'API_KEY_REVOKED') when a key is present
 * but unusable.
 */
export async function resolveApiKeyContext(req: NextRequest): Promise<ApiKeyContext | null> {
    const raw = extractBearerKey(req);
    if (!raw) return null;
    return resolveApiKeyContextByKey(raw);
}

export async function resolveApiKeyContextByKey(rawKey: string): Promise<ApiKeyContext> {
    const keyHash = hashKey(rawKey);
    const res = await db.query(SELECT_SQL, [keyHash]);
    const row = res.rows[0] as ResolvedRow | undefined;
    if (!row) {
        throw new ApiError({
            code: 'API_KEY_NOT_FOUND',
            status: 401,
            message: 'API key not found',
            requestId: '',
        });
    }
    if (row.status !== 'active') {
        throw new ApiError({
            code: 'API_KEY_REVOKED',
            status: 401,
            message: 'API key is revoked',
            requestId: '',
        });
    }
    return rowToContext(row);
}
