// Layer 1 shape test for v2_060_funnel_events.sql.
// Real-DB execution is gated behind operator-approved migrate:apply
// commands per DEPLOYMENT.md §1. No DB connection runs in this test.
//
// v2_060 is a CREATE TABLE migration; the shape constraints differ from
// the additive-column pattern used by v2_057, v2_058, v2_059. We assert
// the new table has only the expected columns and that the down
// migration drops it cleanly with no DML.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const UP_PATH = join(ROOT, 'scripts/migrations/v2_060_funnel_events.sql');
const DOWN_PATH = join(ROOT, 'scripts/migrations/v2_060_funnel_events_down.sql');

const UP = readFileSync(UP_PATH, 'utf-8');
const DOWN = readFileSync(DOWN_PATH, 'utf-8');

const EXPECTED_COLUMNS = [
    'id',
    'occurred_at',
    'tenant_id',
    'anonymous_id',
    'session_id',
    'event_name',
    'properties',
    'user_agent_hash',
    'ip_class',
] as const;

const FORBIDDEN_TABLE_COLUMNS = [
    'prompt', 'prompts',
    'response', 'responses',
    'completion', 'completion_text',
    'messages', 'message_content',
    'content', 'text',
    'file', 'files', 'document', 'documents',
    'chat', 'chat_history', 'transcript',
    'raw_trace', 'stored_content',
    'request_body', 'response_body',
    'email', 'password', 'token', 'api_key',
    'user_agent', 'ip', 'ip_address', 'remote_addr',
] as const;

describe('v2_060_funnel_events — up migration shape', () => {
    it('migration file exists', () => {
        expect(existsSync(UP_PATH)).toBe(true);
    });

    it('is wrapped in BEGIN/COMMIT', () => {
        expect(UP).toMatch(/\bBEGIN\s*;/i);
        expect(UP).toMatch(/\bCOMMIT\s*;/i);
    });

    it('creates exactly one table: funnel_events', () => {
        const creates = UP.match(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_]\w*)/gi) ?? [];
        expect(creates.length).toBe(1);
        expect(creates[0]?.toLowerCase()).toMatch(/funnel_events/);
    });

    it('uses CREATE TABLE IF NOT EXISTS (idempotent)', () => {
        expect(UP).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+funnel_events/i);
    });

    it('declares every expected column', () => {
        const ddl = UP
            .split('\n')
            .filter((l) => !l.trim().startsWith('--'))
            .join('\n');
        for (const col of EXPECTED_COLUMNS) {
            const re = new RegExp(`\\b${col}\\b\\s+(UUID|TIMESTAMPTZ|TEXT|JSONB)\\b`, 'i');
            expect(ddl, `missing column ${col}`).toMatch(re);
        }
    });

    it('declares no content, PII, or raw-identifier columns', () => {
        const ddl = UP
            .split('\n')
            .filter((l) => !l.trim().startsWith('--'))
            .join('\n');
        for (const col of FORBIDDEN_TABLE_COLUMNS) {
            // We look for the column name as a definition token: at the start
            // of a column line, followed by a SQL type keyword. Comments are
            // already stripped above.
            const re = new RegExp(`^\\s*${col}\\s+(UUID|TIMESTAMPTZ|TEXT|JSONB|INET|BYTEA)\\b`, 'im');
            expect(ddl, `forbidden column ${col} found`).not.toMatch(re);
        }
    });

    it('tenant_id references tenants(id) and is NULL-able', () => {
        const ddl = UP
            .split('\n')
            .filter((l) => !l.trim().startsWith('--'))
            .join('\n');
        expect(ddl).toMatch(/tenant_id\s+UUID\s+NULL\s+REFERENCES\s+tenants\s*\(\s*id\s*\)/i);
    });

    it('event_name is NOT NULL (the only required field beyond defaulted ones)', () => {
        const ddl = UP
            .split('\n')
            .filter((l) => !l.trim().startsWith('--'))
            .join('\n');
        expect(ddl).toMatch(/event_name\s+TEXT\s+NOT\s+NULL/i);
    });

    it('properties is JSONB with a {} default', () => {
        const ddl = UP
            .split('\n')
            .filter((l) => !l.trim().startsWith('--'))
            .join('\n');
        expect(ddl).toMatch(/properties\s+JSONB\s+NOT\s+NULL\s+DEFAULT\s+'\{\}'::jsonb/i);
    });

    it('adds two indexes, both idempotent', () => {
        const creates = UP.match(/\bCREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\b/gi) ?? [];
        expect(creates.length).toBe(2);
    });

    it('adds no CHECK constraints', () => {
        expect(UP).not.toMatch(/\bCHECK\s*\(/i);
    });

    it('contains no data backfill (no UPDATE, INSERT, DELETE, TRUNCATE)', () => {
        expect(UP).not.toMatch(/\bUPDATE\s+\w+\s+SET\b/i);
        expect(UP).not.toMatch(/\bINSERT\s+INTO\b/i);
        expect(UP).not.toMatch(/\bDELETE\s+FROM\b/i);
        expect(UP).not.toMatch(/\bTRUNCATE\b/i);
    });

    it('contains no GRANT or REVOKE', () => {
        expect(UP).not.toMatch(/\bGRANT\b/i);
        expect(UP).not.toMatch(/\bREVOKE\b/i);
    });

    it('does not touch billing, access_requests, or tenants writes', () => {
        const ddl = UP
            .split('\n')
            .filter((l) => !l.trim().startsWith('--'))
            .join('\n');
        expect(ddl).not.toMatch(/\bbilling_subscriptions\b/i);
        expect(ddl).not.toMatch(/\bprocessed_webhook_events\b/i);
        expect(ddl).not.toMatch(/\baccess_requests\b[^)]*\bADD\b/i);
        expect(ddl).not.toMatch(/\bALTER\s+TABLE\s+tenants\b/i);
    });
});

describe('v2_060_funnel_events_down — down migration shape', () => {
    it('down migration file exists', () => {
        expect(existsSync(DOWN_PATH)).toBe(true);
    });

    it('is wrapped in BEGIN/COMMIT', () => {
        expect(DOWN).toMatch(/\bBEGIN\s*;/i);
        expect(DOWN).toMatch(/\bCOMMIT\s*;/i);
    });

    it('drops funnel_events idempotently', () => {
        expect(DOWN).toMatch(/DROP\s+TABLE\s+IF\s+EXISTS\s+funnel_events\b/i);
    });

    it('drops both indexes idempotently', () => {
        expect(DOWN).toMatch(/DROP\s+INDEX\s+IF\s+EXISTS\s+idx_funnel_events_tenant_event\b/i);
        expect(DOWN).toMatch(/DROP\s+INDEX\s+IF\s+EXISTS\s+idx_funnel_events_event_time\b/i);
    });

    it('drops no other table', () => {
        const drops = DOWN.match(/\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z_]\w*)/gi) ?? [];
        expect(drops.length).toBe(1);
        expect(drops[0]?.toLowerCase()).toMatch(/funnel_events/);
    });

    it('contains no DML', () => {
        expect(DOWN).not.toMatch(/\bUPDATE\s+\w+\s+SET\b/i);
        expect(DOWN).not.toMatch(/\bINSERT\s+INTO\b/i);
        expect(DOWN).not.toMatch(/\bDELETE\s+FROM\b/i);
        expect(DOWN).not.toMatch(/\bTRUNCATE\b/i);
        expect(DOWN).not.toMatch(/\bGRANT\b/i);
        expect(DOWN).not.toMatch(/\bREVOKE\b/i);
    });

    it('does not touch tenants, billing, or access_requests', () => {
        expect(DOWN).not.toMatch(/\btenants\b/i);
        expect(DOWN).not.toMatch(/\bbilling_subscriptions\b/i);
        expect(DOWN).not.toMatch(/\baccess_requests\b/i);
    });
});
