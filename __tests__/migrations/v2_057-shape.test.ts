// Layer 1 shape test for v2_057_request_outcomes_extension.sql.
// Real-DB execution is gated behind operator-approved migrate:apply
// commands per DEPLOYMENT.md §1. No DB connection runs in this test.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const UP_PATH = join(ROOT, 'scripts/migrations/v2_057_request_outcomes_extension.sql');
const DOWN_PATH = join(ROOT, 'scripts/migrations/v2_057_request_outcomes_extension_down.sql');

const UP = readFileSync(UP_PATH, 'utf-8');
const DOWN = readFileSync(DOWN_PATH, 'utf-8');

const FORBIDDEN_CONTENT_COLUMNS = [
    'prompt', 'prompts',
    'response', 'responses',
    'completion', 'completions', 'completion_text',
    'messages', 'message_content',
    'content', 'text',
    'file', 'files', 'document', 'documents',
    'chat', 'chat_history', 'transcript',
    'raw_trace', 'stored_content',
    'request_body', 'response_body',
] as const;

const ADDED_COLUMNS = ['outcome_type', 'reported_by', 'occurred_at'] as const;

describe('v2_057_request_outcomes_extension — up migration shape', () => {
    it('migration file exists', () => {
        expect(existsSync(UP_PATH)).toBe(true);
    });

    it('is wrapped in BEGIN/COMMIT', () => {
        expect(UP).toMatch(/\bBEGIN\s*;/i);
        expect(UP).toMatch(/\bCOMMIT\s*;/i);
    });

    it('only ALTERs request_outcomes', () => {
        const alters = UP.match(/\bALTER\s+TABLE\s+([a-zA-Z_]\w*)/gi) ?? [];
        expect(alters.length).toBeGreaterThan(0);
        for (const stmt of alters) {
            expect(stmt.toLowerCase()).toMatch(/\balter\s+table\s+request_outcomes\b/);
        }
    });

    it('adds exactly the three planned columns, all nullable', () => {
        for (const col of ADDED_COLUMNS) {
            const re = new RegExp(`ADD\\s+COLUMN\\s+IF\\s+NOT\\s+EXISTS\\s+${col}\\s+(TEXT|TIMESTAMPTZ)\\b`, 'i');
            expect(UP, `missing ADD COLUMN for ${col}`).toMatch(re);
        }
    });

    it('declares no NOT NULL on the added columns', () => {
        // Capture the ALTER TABLE statement and check for NOT NULL on any
        // ADD COLUMN inside it.
        const block = UP.match(/ALTER\s+TABLE\s+request_outcomes[\s\S]*?;/i);
        expect(block).not.toBeNull();
        const text = block?.[0] ?? '';
        for (const col of ADDED_COLUMNS) {
            const re = new RegExp(`ADD\\s+COLUMN\\s+IF\\s+NOT\\s+EXISTS\\s+${col}\\s+\\S+[^,]*\\bNOT\\s+NULL\\b`, 'i');
            expect(text, `${col} must not be NOT NULL`).not.toMatch(re);
        }
    });

    it('introduces no forbidden content-bearing columns', () => {
        // Strip comments and check only DDL: each ADD COLUMN line declares
        // `<col_name> <TYPE>`. We look for the forbidden name as the column
        // identifier (after IF NOT EXISTS), not as a type word.
        const ddl = UP
            .split('\n')
            .filter((l) => !l.trim().startsWith('--'))
            .join('\n');
        for (const col of FORBIDDEN_CONTENT_COLUMNS) {
            const re = new RegExp(`ADD\\s+COLUMN\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${col}\\b`, 'i');
            expect(ddl, `forbidden column ${col} found`).not.toMatch(re);
        }
    });

    it('adds no CHECK constraints, indexes, or foreign keys', () => {
        expect(UP).not.toMatch(/\bADD\s+CONSTRAINT\b/i);
        expect(UP).not.toMatch(/\bCHECK\s*\(/i);
        expect(UP).not.toMatch(/\bCREATE\s+INDEX\b/i);
        expect(UP).not.toMatch(/\bFOREIGN\s+KEY\b/i);
    });

    it('contains no CREATE TABLE or DROP TABLE', () => {
        expect(UP).not.toMatch(/\bCREATE\s+TABLE\b/i);
        expect(UP).not.toMatch(/\bDROP\s+TABLE\b/i);
    });

    it('contains no data backfill (no UPDATE, no INSERT)', () => {
        expect(UP).not.toMatch(/\bUPDATE\s+\w+\s+SET\b/i);
        expect(UP).not.toMatch(/\bINSERT\s+INTO\b/i);
    });

    it('contains no DELETE, TRUNCATE, GRANT, or REVOKE', () => {
        expect(UP).not.toMatch(/\bDELETE\s+FROM\b/i);
        expect(UP).not.toMatch(/\bTRUNCATE\b/i);
        expect(UP).not.toMatch(/\bGRANT\b/i);
        expect(UP).not.toMatch(/\bREVOKE\b/i);
    });

    it('is idempotent via IF NOT EXISTS on every ADD COLUMN', () => {
        // Strip comment lines so the count reflects DDL only.
        const ddl = UP
            .split('\n')
            .filter((l) => !l.trim().startsWith('--'))
            .join('\n');
        const adds = ddl.match(/\bADD\s+COLUMN\b[^,;]*/gi) ?? [];
        expect(adds.length).toBe(ADDED_COLUMNS.length);
        for (const stmt of adds) {
            expect(stmt).toMatch(/IF\s+NOT\s+EXISTS/i);
        }
    });
});

describe('v2_057_request_outcomes_extension_down — down migration shape', () => {
    it('down migration file exists', () => {
        expect(existsSync(DOWN_PATH)).toBe(true);
    });

    it('is wrapped in BEGIN/COMMIT', () => {
        expect(DOWN).toMatch(/\bBEGIN\s*;/i);
        expect(DOWN).toMatch(/\bCOMMIT\s*;/i);
    });

    it('only ALTERs request_outcomes', () => {
        const alters = DOWN.match(/\bALTER\s+TABLE\s+([a-zA-Z_]\w*)/gi) ?? [];
        expect(alters.length).toBeGreaterThan(0);
        for (const stmt of alters) {
            expect(stmt.toLowerCase()).toMatch(/\balter\s+table\s+request_outcomes\b/);
        }
    });

    it('drops exactly the three added columns, idempotently', () => {
        for (const col of ADDED_COLUMNS) {
            const re = new RegExp(`DROP\\s+COLUMN\\s+IF\\s+EXISTS\\s+${col}\\b`, 'i');
            expect(DOWN, `missing DROP COLUMN for ${col}`).toMatch(re);
        }
        const drops = DOWN.match(/\bDROP\s+COLUMN\b[^,;]*/gi) ?? [];
        expect(drops.length).toBe(ADDED_COLUMNS.length);
    });

    it('contains no CREATE TABLE or DROP TABLE', () => {
        expect(DOWN).not.toMatch(/\bCREATE\s+TABLE\b/i);
        expect(DOWN).not.toMatch(/\bDROP\s+TABLE\b/i);
    });

    it('contains no UPDATE, INSERT, DELETE, TRUNCATE, GRANT, REVOKE', () => {
        expect(DOWN).not.toMatch(/\bUPDATE\s+\w+\s+SET\b/i);
        expect(DOWN).not.toMatch(/\bINSERT\s+INTO\b/i);
        expect(DOWN).not.toMatch(/\bDELETE\s+FROM\b/i);
        expect(DOWN).not.toMatch(/\bTRUNCATE\b/i);
        expect(DOWN).not.toMatch(/\bGRANT\b/i);
        expect(DOWN).not.toMatch(/\bREVOKE\b/i);
    });
});
