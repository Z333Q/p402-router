-- v2_040: Enterprise attribution
-- Adds department/project/employee columns to router_decisions and api_keys.
-- Creates enterprise_departments table for per-dept budget caps.

ALTER TABLE router_decisions
  ADD COLUMN IF NOT EXISTS department VARCHAR(64),
  ADD COLUMN IF NOT EXISTS project_name VARCHAR(128),
  ADD COLUMN IF NOT EXISTS employee_id VARCHAR(128);

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS department VARCHAR(64),
  ADD COLUMN IF NOT EXISTS project_name VARCHAR(128),
  ADD COLUMN IF NOT EXISTS employee_name VARCHAR(128);

ALTER TABLE traffic_events
  ADD COLUMN IF NOT EXISTS department VARCHAR(64),
  ADD COLUMN IF NOT EXISTS project_name VARCHAR(128),
  ADD COLUMN IF NOT EXISTS employee_id VARCHAR(128);

CREATE TABLE IF NOT EXISTS enterprise_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  budget_usd DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_depts_tenant
  ON enterprise_departments(tenant_id);

CREATE INDEX IF NOT EXISTS idx_router_decisions_dept
  ON router_decisions(tenant_id, department)
  WHERE department IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_router_decisions_employee
  ON router_decisions(tenant_id, employee_id)
  WHERE employee_id IS NOT NULL;
