-- v2_050: Budget-Owned API Keys (Phase C of P402 Meter repositioning)
-- Extends api_keys with ownership + budget metadata.
-- Renames enterprise_departments -> departments (and fixes tenant_id UUID type).
-- Renames employee_id VARCHAR -> employee_external_ref on event tables (collision: new employee_id UUID FK).
-- Adds api_key_id + FK attribution columns to traffic_events and router_decisions.
-- Creates employees table.
-- Idempotent. Reversible via v2_050_down.sql (never auto-run).

BEGIN;

-- =============================================================================
-- 1. Rename enterprise_departments -> departments, fix tenant_id UUID + FK
-- =============================================================================
-- v2_040 created enterprise_departments with tenant_id VARCHAR(64) and no FK.
-- We rename + repair atomically. The USING cast fails if any tenant_id value
-- is not a valid UUID; that is intentional (alerts on bad data before commit).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enterprise_departments') THEN
        ALTER TABLE enterprise_departments RENAME TO departments;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_enterprise_depts_tenant') THEN
        ALTER INDEX idx_enterprise_depts_tenant RENAME TO idx_departments_tenant;
    END IF;
END $$;

-- Coerce tenant_id to UUID + add FK (only if not already UUID)
DO $$
DECLARE
    col_type TEXT;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'departments' AND column_name = 'tenant_id';

    IF col_type = 'character varying' THEN
        ALTER TABLE departments ALTER COLUMN tenant_id TYPE UUID USING tenant_id::uuid;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'departments' AND constraint_name = 'departments_tenant_id_fkey'
    ) THEN
        ALTER TABLE departments
            ADD CONSTRAINT departments_tenant_id_fkey
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =============================================================================
-- 2. Employees
-- =============================================================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    external_employee_id TEXT,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT,
    manager_email TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    monthly_budget_usd NUMERIC(18, 8),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_employees_tenant_dept
    ON employees (tenant_id, department_id, status);

-- =============================================================================
-- 3. Extend api_keys with ownership + budget controls
-- =============================================================================
-- header_override_policy default = 'allow' preserves legacy behavior for
-- existing keys; new keys should be created with 'restricted' (UI default).
ALTER TABLE api_keys
    ADD COLUMN IF NOT EXISTS owner_type TEXT NOT NULL DEFAULT 'tenant'
        CHECK (owner_type IN ('tenant', 'department', 'employee', 'workflow', 'project')),
    ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS employee_id   UUID REFERENCES employees(id)   ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS workflow_id   TEXT,
    ADD COLUMN IF NOT EXISTS project_id    TEXT,
    ADD COLUMN IF NOT EXISTS budget_id     UUID,
    ADD COLUMN IF NOT EXISTS policy_id     UUID,
    ADD COLUMN IF NOT EXISTS allowed_models       JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS allowed_task_types   JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS max_cost_per_request_usd NUMERIC(18, 8),
    ADD COLUMN IF NOT EXISTS monthly_budget_usd       NUMERIC(18, 8),
    ADD COLUMN IF NOT EXISTS header_override_policy   TEXT NOT NULL DEFAULT 'allow'
        CHECK (header_override_policy IN ('allow', 'deny', 'restricted')),
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_api_keys_dept_status
    ON api_keys (department_id, status)
    WHERE department_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_employee_status
    ON api_keys (employee_id, status)
    WHERE employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_owner
    ON api_keys (tenant_id, owner_type, status);

-- =============================================================================
-- 4. Rename legacy VARCHAR employee_id -> employee_external_ref on event tables
-- =============================================================================
-- Frees the employee_id name for a new UUID FK column. Existing free-form
-- header values move to employee_external_ref (no data loss).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'traffic_events'
          AND column_name = 'employee_id'
          AND data_type = 'character varying'
    ) THEN
        ALTER TABLE traffic_events RENAME COLUMN employee_id TO employee_external_ref;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'router_decisions'
          AND column_name = 'employee_id'
          AND data_type = 'character varying'
    ) THEN
        ALTER TABLE router_decisions RENAME COLUMN employee_id TO employee_external_ref;
    END IF;
END $$;

-- v2_040 created idx_router_decisions_employee on the old column; recreate against the new name.
DROP INDEX IF EXISTS idx_router_decisions_employee;
CREATE INDEX IF NOT EXISTS idx_router_decisions_employee_ext
    ON router_decisions (tenant_id, employee_external_ref)
    WHERE employee_external_ref IS NOT NULL;

-- =============================================================================
-- 5. Add api_key_id + FK attribution to event tables
-- =============================================================================
-- Legacy VARCHAR columns (department, project_name) from v2_040 remain in
-- place; they are deprecated and will be dropped in v2_051 once all callers
-- write through the new FK columns. Analytics queries continue to read them.
ALTER TABLE traffic_events
    ADD COLUMN IF NOT EXISTS api_key_id    UUID,
    ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS employee_id   UUID REFERENCES employees(id)   ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS project_id    TEXT;

ALTER TABLE router_decisions
    ADD COLUMN IF NOT EXISTS api_key_id    UUID,
    ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS employee_id   UUID REFERENCES employees(id)   ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS project_id    TEXT;

CREATE INDEX IF NOT EXISTS idx_traffic_events_apikey
    ON traffic_events (api_key_id, created_at DESC)
    WHERE api_key_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_router_decisions_apikey
    ON router_decisions (api_key_id, created_at DESC)
    WHERE api_key_id IS NOT NULL;

COMMIT;
