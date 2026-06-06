/**
 * Slice 3J — Migration SQL shape proof.
 *
 * Pins v2_054 + its down at the SQL string level so a refactor cannot
 * silently strip the transitional superset or break the rollback. We
 * do not execute Postgres here — we read the file and assert the shape
 * of the CHECK constraint that the migration installs.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { STORED_OUTCOME_STATUSES } from '@/lib/prove/outcome';

function readMigration(name: string): string {
    return readFileSync(resolve(process.cwd(), 'scripts', 'migrations', name), 'utf8');
}

/**
 * Strip SQL line comments so the "must / must not contain" checks below
 * are about EXECUTABLE SQL, not commentary. The v2_054_down comment
 * intentionally names the values an operator must look for before running
 * the migration; that prose should not pollute the shape proof.
 */
function stripSqlComments(sql: string): string {
    return sql.split('\n').map((line) => line.replace(/--.*$/, '')).join('\n');
}

describe('v2_054 — transitional superset migration', () => {
    const sql = stripSqlComments(readMigration('v2_054_request_outcomes_status_superset.sql'));

    it('drops the existing CHECK constraint first (idempotent)', () => {
        expect(sql).toMatch(/DROP CONSTRAINT IF EXISTS request_outcomes_status_check/i);
    });

    it('adds a CHECK whose IN list covers EVERY value in STORED_OUTCOME_STATUSES', () => {
        expect(sql).toMatch(/ADD CONSTRAINT request_outcomes_status_check/i);
        for (const v of STORED_OUTCOME_STATUSES) {
            expect(sql, `must list '${v}' in the CHECK`).toMatch(new RegExp(`'${v}'`));
        }
    });

    it('wraps the change in a transaction', () => {
        expect(sql).toMatch(/BEGIN;[\s\S]*COMMIT;/);
    });
});

describe('v2_054 down — restores v2_051 6-value CHECK', () => {
    const sql = stripSqlComments(readMigration('v2_054_down.sql'));

    it('restores exactly the six v2_051 values, no V5-only ones', () => {
        for (const v of ['accepted','rejected','retried','escalated','human_reviewed','failed']) {
            expect(sql).toMatch(new RegExp(`'${v}'`));
        }
        for (const v of ['revised','pending_review','unknown']) {
            expect(sql).not.toMatch(new RegExp(`'${v}'`));
        }
    });

    it('drops + adds inside one transaction', () => {
        expect(sql).toMatch(/DROP CONSTRAINT IF EXISTS request_outcomes_status_check/i);
        expect(sql).toMatch(/ADD CONSTRAINT request_outcomes_status_check/i);
        expect(sql).toMatch(/BEGIN;[\s\S]*COMMIT;/);
    });
});
