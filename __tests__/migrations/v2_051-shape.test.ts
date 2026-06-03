// Layer 1 shape test for v2_051_action_type_and_outcomes.sql.
// Real-DB execution is covered by the full-chain validator
// (scripts/test-migration-v2_050-fullchain.sh will be extended to
// run v2_051 after v2_050).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SQL = readFileSync(
    join(process.cwd(), 'scripts/migrations/v2_051_action_type_and_outcomes.sql'),
    'utf-8',
);
const DOWN = readFileSync(
    join(process.cwd(), 'scripts/migrations/v2_051_down.sql'),
    'utf-8',
);

describe('v2_051_action_type_and_outcomes migration shape', () => {
    it('is wrapped in BEGIN/COMMIT for atomicity', () => {
        const noComments = SQL.replace(/^--.*$/gm, '').trim();
        expect(noComments).toMatch(/^BEGIN;/);
        expect(noComments).toMatch(/COMMIT;\s*$/);
    });

    it('adds action_type and task_type to traffic_events', () => {
        expect(SQL).toMatch(/ALTER TABLE traffic_events[\s\S]+?ADD COLUMN IF NOT EXISTS action_type TEXT/);
        expect(SQL).toMatch(/ALTER TABLE traffic_events[\s\S]+?ADD COLUMN IF NOT EXISTS task_type   TEXT/);
    });

    it('adds action_type and task_type to router_decisions', () => {
        expect(SQL).toMatch(/ALTER TABLE router_decisions[\s\S]+?ADD COLUMN IF NOT EXISTS action_type TEXT/);
        expect(SQL).toMatch(/ALTER TABLE router_decisions[\s\S]+?ADD COLUMN IF NOT EXISTS task_type   TEXT/);
    });

    it('router_decisions action_type index uses "timestamp" not created_at', () => {
        // Production column is `timestamp`. Using created_at here would
        // recreate the pre-existing /api/v2/analytics/spend bug.
        // Match the specific CREATE INDEX statement body (between this index
        // name and the next semicolon) instead of the whole file, so the
        // assertion does not cross into the traffic_events index above.
        const m = SQL.match(/CREATE INDEX IF NOT EXISTS idx_router_decisions_action_type[\s\S]+?;/);
        expect(m).not.toBeNull();
        const stmt = m![0];
        expect(stmt).toContain('"timestamp" DESC');
        expect(stmt).not.toContain('created_at');
    });

    it('creates request_outcomes with all required columns', () => {
        expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS request_outcomes/);
        expect(SQL).toMatch(/tenant_id UUID NOT NULL REFERENCES tenants\(id\) ON DELETE CASCADE/);
        expect(SQL).toMatch(/request_id TEXT NOT NULL/);
        expect(SQL).toMatch(/UNIQUE \(tenant_id, request_id\)/);
        expect(SQL).toMatch(/metadata JSONB NOT NULL DEFAULT '\{\}'::jsonb/);
    });

    it('status CHECK enumerates exactly the 6 slice-plan values', () => {
        for (const v of ['accepted', 'rejected', 'retried', 'escalated', 'human_reviewed', 'failed']) {
            expect(SQL).toMatch(new RegExp(`'${v}'`));
        }
    });

    it('quality_score CHECK bounds value to [0,1]', () => {
        expect(SQL).toMatch(/quality_score >= 0 AND quality_score <= 1/);
        // Null allowed (callers may record without a score).
        expect(SQL).toMatch(/quality_score IS NULL OR/);
    });

    it('partial indexes only on non-null action_type and on waste/quality statuses', () => {
        expect(SQL).toMatch(/idx_traffic_events_action_type[\s\S]+?WHERE action_type IS NOT NULL/);
        expect(SQL).toMatch(/idx_router_decisions_action_type[\s\S]+?WHERE action_type IS NOT NULL/);
        expect(SQL).toMatch(/idx_request_outcomes_status[\s\S]+?WHERE status IN \('rejected', 'retried', 'failed'\)/);
    });

    it('contains no destructive ops against legacy data', () => {
        expect(SQL).not.toMatch(/DROP TABLE(?! IF EXISTS request_outcomes_old)/);
        expect(SQL).not.toMatch(/DROP COLUMN(?! IF EXISTS action_type_old)/);
        expect(SQL).not.toMatch(/TRUNCATE/);
    });

    it('is idempotent', () => {
        const createTables = SQL.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/g) ?? [];
        for (const s of createTables) {
            expect(s).toMatch(/IF NOT EXISTS/);
        }
        const createIndexes = SQL.match(/CREATE INDEX\s+(?:IF NOT EXISTS\s+)?\w+/g) ?? [];
        for (const s of createIndexes) {
            expect(s).toMatch(/IF NOT EXISTS/);
        }
        const addColumns = SQL.match(/ADD COLUMN\s+(?:IF NOT EXISTS\s+)?\w+/g) ?? [];
        for (const s of addColumns) {
            expect(s).toMatch(/IF NOT EXISTS/);
        }
    });

    it('has a paired rollback script that covers the same surface', () => {
        expect(DOWN).toMatch(/DROP TABLE IF EXISTS request_outcomes/);
        for (const col of ['action_type', 'task_type']) {
            expect(DOWN).toMatch(new RegExp(`DROP COLUMN IF EXISTS ${col}`));
        }
        expect(DOWN).toMatch(/DROP INDEX IF EXISTS idx_traffic_events_action_type/);
        expect(DOWN).toMatch(/DROP INDEX IF EXISTS idx_router_decisions_action_type/);
    });
});
