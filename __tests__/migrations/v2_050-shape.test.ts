// Layer 1 shape test for v2_050_budget_owned_api_keys.sql.
// This repo has no Postgres test fixture, so we validate the migration's
// structural contract here. Real-DB execution is covered by
// scripts/test-migration-v2_050.sh (run manually against TEST_DATABASE_URL).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SQL = readFileSync(
    join(process.cwd(), 'scripts/migrations/v2_050_budget_owned_api_keys.sql'),
    'utf-8',
);

const DOWN = readFileSync(
    join(process.cwd(), 'scripts/migrations/v2_050_down.sql'),
    'utf-8',
);

describe('v2_050_budget_owned_api_keys migration shape', () => {
    it('is wrapped in BEGIN/COMMIT for atomicity', () => {
        // Strip leading SQL comments to find the first statement.
        const noComments = SQL.replace(/^--.*$/gm, '').trim();
        expect(noComments).toMatch(/^BEGIN;/);
        expect(noComments).toMatch(/COMMIT;\s*$/);
    });

    it('renames enterprise_departments to departments and repairs tenant_id', () => {
        expect(SQL).toMatch(/ALTER TABLE enterprise_departments RENAME TO departments/);
        expect(SQL).toMatch(/ALTER COLUMN tenant_id TYPE UUID/);
        expect(SQL).toMatch(/departments_tenant_id_fkey/);
        expect(SQL).toMatch(/REFERENCES tenants\(id\) ON DELETE CASCADE/);
    });

    it('creates employees table with required columns and FKs', () => {
        expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS employees/);
        expect(SQL).toMatch(/tenant_id UUID NOT NULL REFERENCES tenants\(id\) ON DELETE CASCADE/);
        expect(SQL).toMatch(/department_id UUID REFERENCES departments\(id\) ON DELETE SET NULL/);
        expect(SQL).toMatch(/UNIQUE \(tenant_id, email\)/);
    });

    it('extends api_keys with all ownership and budget columns', () => {
        const required = [
            'owner_type TEXT NOT NULL DEFAULT \'tenant\'',
            'department_id UUID REFERENCES departments(id) ON DELETE SET NULL',
            'employee_id   UUID REFERENCES employees(id)   ON DELETE SET NULL',
            'workflow_id   TEXT',
            'project_id    TEXT',
            'budget_id     UUID',
            'policy_id     UUID',
            'allowed_models       JSONB NOT NULL DEFAULT \'[]\'::jsonb',
            'allowed_task_types   JSONB NOT NULL DEFAULT \'[]\'::jsonb',
            'max_cost_per_request_usd NUMERIC(18, 8)',
            'monthly_budget_usd       NUMERIC(18, 8)',
            'header_override_policy   TEXT NOT NULL DEFAULT \'allow\'',
        ];
        for (const clause of required) {
            expect(SQL).toContain(clause);
        }
    });

    it('preserves legacy default header_override_policy=allow for backwards compat', () => {
        // Per Decision 4: existing keys keep 'allow' (no behavior change),
        // new keys get 'restricted' at the UI layer (PR #2).
        expect(SQL).toMatch(/header_override_policy.*DEFAULT 'allow'/);
    });

    it('renames event-table employee_id VARCHAR to employee_external_ref', () => {
        expect(SQL).toMatch(/ALTER TABLE traffic_events RENAME COLUMN employee_id TO employee_external_ref/);
        expect(SQL).toMatch(/ALTER TABLE router_decisions RENAME COLUMN employee_id TO employee_external_ref/);
    });

    it('adds api_key_id and FK attribution columns to event tables', () => {
        for (const table of ['traffic_events', 'router_decisions']) {
            const block = new RegExp(`ALTER TABLE ${table}[\\s\\S]+?api_key_id\\s+UUID[\\s\\S]+?department_id UUID REFERENCES departments[\\s\\S]+?employee_id   UUID REFERENCES employees[\\s\\S]+?project_id    TEXT`);
            expect(SQL).toMatch(block);
        }
    });

    it('creates partial indexes only on non-null FK columns', () => {
        // Partial indexes keep them small while legacy nulls dominate the table.
        expect(SQL).toMatch(/CREATE INDEX IF NOT EXISTS idx_traffic_events_apikey[\s\S]+?WHERE api_key_id IS NOT NULL/);
        expect(SQL).toMatch(/CREATE INDEX IF NOT EXISTS idx_router_decisions_apikey[\s\S]+?WHERE api_key_id IS NOT NULL/);
        expect(SQL).toMatch(/CREATE INDEX IF NOT EXISTS idx_api_keys_dept_status[\s\S]+?WHERE department_id IS NOT NULL/);
    });

    it('contains no destructive operations against legacy data', () => {
        // Phase C must not DROP any legacy column or table; v2_051 handles cleanup
        // after all callers migrate to FK columns.
        expect(SQL).not.toMatch(/DROP TABLE(?! IF EXISTS departments_old)/);
        expect(SQL).not.toMatch(/DROP COLUMN(?! IF EXISTS api_key_id)/);
        expect(SQL).not.toMatch(/TRUNCATE/);
    });

    it('is idempotent (every CREATE/ALTER ADD uses IF NOT EXISTS or DO-block guards)', () => {
        const createTables = SQL.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/g) ?? [];
        for (const stmt of createTables) {
            expect(stmt).toMatch(/IF NOT EXISTS/);
        }
        const createIndexes = SQL.match(/CREATE INDEX\s+(?:IF NOT EXISTS\s+)?\w+/g) ?? [];
        for (const stmt of createIndexes) {
            expect(stmt).toMatch(/IF NOT EXISTS/);
        }
        // Renames + type coercions are wrapped in DO blocks that check first.
        expect(SQL).toMatch(/DO \$\$[\s\S]+?IF EXISTS \(SELECT 1 FROM information_schema\.tables WHERE table_name = 'enterprise_departments'\)/);
    });

    it('has a paired rollback script for the same surface', () => {
        // Each destructive new-column should be reversible in v2_050_down.sql.
        const reversibleAdds = [
            'owner_type', 'department_id', 'employee_id', 'workflow_id', 'project_id',
            'budget_id', 'policy_id', 'allowed_models', 'allowed_task_types',
            'max_cost_per_request_usd', 'monthly_budget_usd', 'header_override_policy',
            'metadata',
        ];
        for (const col of reversibleAdds) {
            expect(DOWN).toMatch(new RegExp(`DROP COLUMN IF EXISTS ${col}\\b`));
        }
        expect(DOWN).toMatch(/DROP TABLE IF EXISTS employees/);
        expect(DOWN).toMatch(/ALTER TABLE departments RENAME TO enterprise_departments/);
        expect(DOWN).toMatch(/RENAME COLUMN employee_external_ref TO employee_id/);
    });
});
