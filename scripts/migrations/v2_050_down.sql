-- v2_050 rollback. NEVER auto-run. Document-only safety net.
-- Drops the columns and tables introduced by v2_050. Data loss inevitable.
-- The employee_external_ref rename is reversed; the new UUID columns are dropped.

BEGIN;

-- Drop new indexes
DROP INDEX IF EXISTS idx_traffic_events_apikey;
DROP INDEX IF EXISTS idx_router_decisions_apikey;
DROP INDEX IF EXISTS idx_router_decisions_employee_ext;
DROP INDEX IF EXISTS idx_api_keys_owner;
DROP INDEX IF EXISTS idx_api_keys_employee_status;
DROP INDEX IF EXISTS idx_api_keys_dept_status;
DROP INDEX IF EXISTS idx_employees_tenant_dept;

-- Drop new columns on event tables
ALTER TABLE traffic_events
    DROP COLUMN IF EXISTS api_key_id,
    DROP COLUMN IF EXISTS department_id,
    DROP COLUMN IF EXISTS employee_id,
    DROP COLUMN IF EXISTS project_id;

ALTER TABLE router_decisions
    DROP COLUMN IF EXISTS api_key_id,
    DROP COLUMN IF EXISTS department_id,
    DROP COLUMN IF EXISTS employee_id,
    DROP COLUMN IF EXISTS project_id;

-- Reverse employee_external_ref rename
ALTER TABLE traffic_events   RENAME COLUMN employee_external_ref TO employee_id;
ALTER TABLE router_decisions RENAME COLUMN employee_external_ref TO employee_id;

CREATE INDEX IF NOT EXISTS idx_router_decisions_employee
    ON router_decisions (tenant_id, employee_id)
    WHERE employee_id IS NOT NULL;

-- Drop new api_keys columns
ALTER TABLE api_keys
    DROP COLUMN IF EXISTS metadata,
    DROP COLUMN IF EXISTS header_override_policy,
    DROP COLUMN IF EXISTS monthly_budget_usd,
    DROP COLUMN IF EXISTS max_cost_per_request_usd,
    DROP COLUMN IF EXISTS allowed_task_types,
    DROP COLUMN IF EXISTS allowed_models,
    DROP COLUMN IF EXISTS policy_id,
    DROP COLUMN IF EXISTS budget_id,
    DROP COLUMN IF EXISTS project_id,
    DROP COLUMN IF EXISTS workflow_id,
    DROP COLUMN IF EXISTS employee_id,
    DROP COLUMN IF EXISTS department_id,
    DROP COLUMN IF EXISTS owner_type;

-- Drop employees
DROP TABLE IF EXISTS employees;

-- Reverse departments rename (re-add VARCHAR(64) tenant_id, drop FK)
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_tenant_id_fkey;
ALTER TABLE departments ALTER COLUMN tenant_id TYPE VARCHAR(64) USING tenant_id::text;
ALTER INDEX IF EXISTS idx_departments_tenant RENAME TO idx_enterprise_depts_tenant;
ALTER TABLE departments RENAME TO enterprise_departments;

COMMIT;
