// Layer 1 shape test for v2_053_economic_event_outbox.sql.
// Real-DB execution is covered by scripts/test-migrations-fullchain.sh.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SQL = readFileSync(
    join(process.cwd(), 'scripts/migrations/v2_053_economic_event_outbox.sql'),
    'utf-8',
);
const DOWN = readFileSync(
    join(process.cwd(), 'scripts/migrations/v2_053_down.sql'),
    'utf-8',
);

// V5 + Slice 2E hard rule: the outbox MUST NOT carry any of these column
// names. The shape test enforces this so a future migration can't quietly
// add `prompt` etc.
const FORBIDDEN_COLUMN_NAMES = [
    'prompt', 'prompts',
    'response', 'responses', 'completion', 'completions',
    'messages', 'content', 'text',
    'file', 'files', 'document', 'documents',
    'chat', 'chat_history', 'transcript',
    'pii', 'phi', 'secret', 'secrets', 'source_code',
];

describe('v2_053_economic_event_outbox shape', () => {
    it('is wrapped in BEGIN/COMMIT', () => {
        const stripped = SQL.replace(/^--.*$/gm, '').trim();
        expect(stripped).toMatch(/^BEGIN;/);
        expect(stripped).toMatch(/COMMIT;\s*$/);
    });

    it('creates the table economic_event_write_failures', () => {
        expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS economic_event_write_failures/);
    });

    it('exposes every column required by Slice 2E acceptance', () => {
        const block = SQL.match(/CREATE TABLE IF NOT EXISTS economic_event_write_failures[\s\S]+?\);/)?.[0] ?? '';
        const required = [
            'tenant_id',
            'request_id',
            'source',
            'route',
            'error_code',
            'error_message_safe',
            'retry_count',
            'status',
            'next_retry_at',
            'created_at',
            'updated_at',
            'payload',
        ];
        for (const col of required) {
            expect(block, `missing column ${col}`).toMatch(new RegExp(`\\b${col}\\b`));
        }
    });

    it('rejects content-bearing column names — outbox is metadata-only', () => {
        const block = SQL.match(/CREATE TABLE IF NOT EXISTS economic_event_write_failures[\s\S]+?\);/)?.[0] ?? '';
        // Allow `source_code` only as a comment substring; reject any column
        // declaration of these names. We scan the column block lines for a
        // top-level identifier match.
        const lines = block.split('\n');
        for (const line of lines) {
            // skip comment lines
            if (/^\s*--/.test(line)) continue;
            for (const bad of FORBIDDEN_COLUMN_NAMES) {
                // word-boundary at the start of a column declaration
                if (new RegExp(`^\\s+${bad}\\s+(TEXT|BOOLEAN|UUID|INTEGER|NUMERIC|JSONB|TIMESTAMPTZ)`, 'i').test(line)) {
                    throw new Error(`Forbidden column "${bad}" in outbox: ${line.trim()}`);
                }
            }
        }
    });

    it('tenant_id is UUID NOT NULL with FK to tenants ON DELETE CASCADE', () => {
        const block = SQL.match(/CREATE TABLE IF NOT EXISTS economic_event_write_failures[\s\S]+?\);/)?.[0] ?? '';
        expect(block).toMatch(/tenant_id\s+UUID NOT NULL REFERENCES tenants\(id\) ON DELETE CASCADE/);
    });

    it('status CHECK enumerates pending | resolved | abandoned', () => {
        const block = SQL.match(/CREATE TABLE IF NOT EXISTS economic_event_write_failures[\s\S]+?\);/)?.[0] ?? '';
        expect(block).toMatch(/CHECK \(status IN \('pending', 'resolved', 'abandoned'\)\)/);
    });

    it('payload default is empty object {} so any oversight stays empty, not content-bearing', () => {
        const block = SQL.match(/CREATE TABLE IF NOT EXISTS economic_event_write_failures[\s\S]+?\);/)?.[0] ?? '';
        expect(block).toMatch(/payload JSONB NOT NULL DEFAULT '\{\}'::jsonb/);
    });

    it('UNIQUE(tenant_id, request_id) caps outbox at one row per failed request', () => {
        const block = SQL.match(/CREATE TABLE IF NOT EXISTS economic_event_write_failures[\s\S]+?\);/)?.[0] ?? '';
        expect(block).toMatch(/UNIQUE \(tenant_id, request_id\)/);
    });

    it('retry worker index targets pending rows only', () => {
        expect(SQL).toMatch(/idx_eewf_pending_retry[\s\S]+?\(status, next_retry_at\)[\s\S]+?WHERE status = 'pending'/);
    });

    it('audit indexes exist for tenant + tenant/error_code lookups', () => {
        expect(SQL).toMatch(/idx_eewf_tenant_recent[\s\S]+?\(tenant_id, created_at DESC\)/);
        expect(SQL).toMatch(/idx_eewf_tenant_code[\s\S]+?\(tenant_id, error_code, created_at DESC\)/);
    });

    it('is idempotent', () => {
        const tables = SQL.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?\w+/g) ?? [];
        for (const t of tables) expect(t).toMatch(/IF NOT EXISTS/);
        const idx = SQL.match(/CREATE INDEX\s+(?:IF NOT EXISTS\s+)?\w+/g) ?? [];
        for (const i of idx) expect(i).toMatch(/IF NOT EXISTS/);
    });

    it('paired rollback covers the same surface', () => {
        expect(DOWN).toMatch(/DROP TABLE IF EXISTS economic_event_write_failures/);
        for (const idx of ['idx_eewf_pending_retry', 'idx_eewf_tenant_recent', 'idx_eewf_tenant_code']) {
            expect(DOWN).toMatch(new RegExp(`DROP INDEX IF EXISTS ${idx}`));
        }
    });
});
