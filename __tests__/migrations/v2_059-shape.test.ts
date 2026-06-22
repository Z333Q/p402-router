// Layer 1 shape test for v2_059_tenants_onboarded_at.sql.
// Real-DB execution is gated behind operator-approved migrate:apply
// commands per DEPLOYMENT.md §1. No DB connection runs in this test.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const UP_PATH = join(ROOT, 'scripts/migrations/v2_059_tenants_onboarded_at.sql');
const DOWN_PATH = join(ROOT, 'scripts/migrations/v2_059_tenants_onboarded_at_down.sql');

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
    'email', 'password', 'token', 'api_key',
] as const;

const ADDED_COLUMNS = ['onboarded_at'] as const;

describe('v2_059_tenants_onboarded_at — up migration shape', () => {
    it('migration file exists', () => {
        expect(existsSync(UP_PATH)).toBe(true);
    });

    it('is wrapped in BEGIN/COMMIT', () => {
        expect(UP).toMatch(/\bBEGIN\s*;/i);
        expect(UP).toMatch(/\bCOMMIT\s*;/i);
    });

    it('only ALTERs tenants', () => {
        const alters = UP.match(/\bALTER\s+TABLE\s+([a-zA-Z_]\w*)/gi) ?? [];
        expect(alters.length).toBeGreaterThan(0);
        for (const stmt of alters) {
            expect(stmt.toLowerCase()).toMatch(/\balter\s+table\s+tenants\b/);
        }
    });

    it('adds the onboarded_at column as TIMESTAMPTZ', () => {
        const re = /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+onboarded_at\s+TIMESTAMPTZ\b/i;
        expect(UP).toMatch(re);
    });

    it('declares no NOT NULL on the added column', () => {
        const block = UP.match(/ALTER\s+TABLE\s+tenants[\s\S]*?;/i);
        expect(block).not.toBeNull();
        const text = block?.[0] ?? '';
        const re = /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+onboarded_at\s+\S+[^,]*\bNOT\s+NULL\b/i;
        expect(text).not.toMatch(re);
    });

    it('declares no DEFAULT on the added column', () => {
        const block = UP.match(/ALTER\s+TABLE\s+tenants[\s\S]*?;/i);
        const text = block?.[0] ?? '';
        const re = /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+onboarded_at\s+\S+[^,]*\bDEFAULT\b/i;
        expect(text).not.toMatch(re);
    });

    it('introduces no forbidden content-bearing or PII columns', () => {
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

    it('does not touch billing or access_requests tables', () => {
        const ddl = UP
            .split('\n')
            .filter((l) => !l.trim().startsWith('--'))
            .join('\n');
        expect(ddl).not.toMatch(/\bbilling_subscriptions\b/i);
        expect(ddl).not.toMatch(/\bprocessed_webhook_events\b/i);
        expect(ddl).not.toMatch(/\baccess_requests\b/i);
    });

    it('is idempotent via IF NOT EXISTS', () => {
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

describe('v2_059_tenants_onboarded_at_down — down migration shape', () => {
    it('down migration file exists', () => {
        expect(existsSync(DOWN_PATH)).toBe(true);
    });

    it('is wrapped in BEGIN/COMMIT', () => {
        expect(DOWN).toMatch(/\bBEGIN\s*;/i);
        expect(DOWN).toMatch(/\bCOMMIT\s*;/i);
    });

    it('only ALTERs tenants', () => {
        const alters = DOWN.match(/\bALTER\s+TABLE\s+([a-zA-Z_]\w*)/gi) ?? [];
        expect(alters.length).toBeGreaterThan(0);
        for (const stmt of alters) {
            expect(stmt.toLowerCase()).toMatch(/\balter\s+table\s+tenants\b/);
        }
    });

    it('drops the onboarded_at column idempotently', () => {
        const re = /DROP\s+COLUMN\s+IF\s+EXISTS\s+onboarded_at\b/i;
        expect(DOWN).toMatch(re);
        const drops = DOWN.match(/\bDROP\s+COLUMN\b[^,;]*/gi) ?? [];
        expect(drops.length).toBe(1);
    });

    it('contains no CREATE TABLE or DROP TABLE', () => {
        expect(DOWN).not.toMatch(/\bCREATE\s+TABLE\b/i);
        expect(DOWN).not.toMatch(/\bDROP\s+TABLE\b/i);
    });

    it('contains no DML', () => {
        expect(DOWN).not.toMatch(/\bUPDATE\s+\w+\s+SET\b/i);
        expect(DOWN).not.toMatch(/\bINSERT\s+INTO\b/i);
        expect(DOWN).not.toMatch(/\bDELETE\s+FROM\b/i);
        expect(DOWN).not.toMatch(/\bTRUNCATE\b/i);
        expect(DOWN).not.toMatch(/\bGRANT\b/i);
        expect(DOWN).not.toMatch(/\bREVOKE\b/i);
    });
});
