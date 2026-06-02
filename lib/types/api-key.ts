// Budget-Owned API Keys (Phase C of P402 Meter repositioning).
// Mirrors columns added by scripts/migrations/v2_050_budget_owned_api_keys.sql.

export type ApiKeyOwnerType = 'tenant' | 'department' | 'employee' | 'workflow' | 'project';
export type ApiKeyStatus = 'active' | 'revoked';
export type HeaderOverridePolicy = 'allow' | 'deny' | 'restricted';

// Raw row shape as returned by SELECT * FROM api_keys.
// Numerics arrive as strings from node-postgres unless a parser is registered.
export interface ApiKeyRow {
    id: string;
    tenant_id: string;
    name: string;
    key_prefix: string;
    key_hash: string;
    status: ApiKeyStatus;
    last_used_at: Date | null;
    created_at: Date;
    revoked_at: Date | null;

    // v2_040 legacy free-form attribution (deprecated; will be dropped in v2_051)
    department: string | null;
    project_name: string | null;
    employee_name: string | null;

    // v2_050 ownership + budget metadata
    owner_type: ApiKeyOwnerType;
    department_id: string | null;
    employee_id: string | null;
    workflow_id: string | null;
    project_id: string | null;
    budget_id: string | null;
    policy_id: string | null;
    allowed_models: string[];
    allowed_task_types: string[];
    max_cost_per_request_usd: string | null;
    monthly_budget_usd: string | null;
    header_override_policy: HeaderOverridePolicy;
    metadata: Record<string, unknown>;
}

// Resolved context handed to downstream code after key auth + join with
// departments/employees. Numbers are parsed; nulls survive.
export interface ApiKeyContext {
    apiKeyId: string;
    tenantId: string;
    ownerType: ApiKeyOwnerType;
    ownerId: string | null;
    departmentId: string | null;
    employeeId: string | null;
    workflowId: string | null;
    projectId: string | null;
    budgetId: string | null;
    policyId: string | null;
    allowedModels: string[];
    allowedTaskTypes: string[];
    maxCostPerRequestUsd: number | null;
    monthlyBudgetUsd: number | null;
    headerOverridePolicy: HeaderOverridePolicy;
    // Joined budget caps from owning department/employee, if any.
    departmentMonthlyBudgetUsd: number | null;
    employeeMonthlyBudgetUsd: number | null;
}

export interface ApiKeyCreateInput {
    name: string;
    ownerType: ApiKeyOwnerType;
    departmentId?: string;
    employeeId?: string;
    workflowId?: string;
    projectId?: string;
    allowedModels?: string[];
    allowedTaskTypes?: string[];
    maxCostPerRequestUsd?: number;
    monthlyBudgetUsd?: number;
    headerOverridePolicy?: HeaderOverridePolicy;
    metadata?: Record<string, unknown>;
}

export interface DepartmentRow {
    id: string;
    tenant_id: string;
    name: string;
    budget_usd: string;
    created_at: Date;
    updated_at: Date;
}

export interface EmployeeRow {
    id: string;
    tenant_id: string;
    department_id: string | null;
    external_employee_id: string | null;
    name: string;
    email: string | null;
    role: string | null;
    manager_email: string | null;
    status: 'active' | 'disabled';
    monthly_budget_usd: string | null;
    metadata: Record<string, unknown>;
    created_at: Date;
}
