import { describe, it, expect } from 'vitest';
import { OUTCOME_SQL, recordOutcome, type Queryable } from '../service';
import { OutcomeValidationError } from '../validation';

const TENANT = '4f689ea1-7340-476a-878e-9f0b930e5fd4';
const REQUEST = 'req_abc123';
const NOW = () => '2026-06-21T12:00:00.000Z';

interface Call {
    text: string;
    params: unknown[] | undefined;
}

function buildFakeDb(behavior: (call: Call) => { rows: Record<string, unknown>[] }): { db: Queryable; calls: Call[] } {
    const calls: Call[] = [];
    return {
        calls,
        db: {
            async query(text, params) {
                const call: Call = { text, params };
                calls.push(call);
                return behavior(call);
            },
        },
    };
}

function eventRow() {
    return { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' };
}

function outcomeRow(over: Partial<Record<string, unknown>> = {}) {
    return {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        tenant_id: TENANT,
        request_id: REQUEST,
        outcome_status: 'accepted',
        quality_score: null,
        source: 'sdk',
        metadata: {},
        created_at: new Date('2026-06-21T12:00:00Z'),
        updated_at: new Date('2026-06-21T12:00:00Z'),
        ...over,
    };
}

describe('recordOutcome service', () => {
    it('accepts a valid outcome with linked economic event', async () => {
        const { db, calls } = buildFakeDb((call) => {
            if (call.text === OUTCOME_SQL.SQL_LOOKUP_EVENT) return { rows: [eventRow()] };
            if (call.text === OUTCOME_SQL.SQL_UPSERT_OUTCOME) return { rows: [outcomeRow()] };
            return { rows: [] };
        });

        const result = await recordOutcome(
            { request_id: REQUEST, outcome_type: 'request_completion', outcome_status: 'accepted', source: 'sdk' },
            { tenant_id: TENANT, reported_by: 'tenant-session' },
            { db, nowFn: NOW },
        );

        expect(result.orphan).toBe(false);
        expect(result.economic_event_id).toBe(eventRow().id);
        expect(result.outcome.tenant_id).toBe(TENANT);
        expect(result.outcome.outcome_status).toBe('accepted');
        expect(result.outcome.reported_by).toBe('tenant-session');
        expect(calls[0]?.params?.[0]).toBe(TENANT);
        expect(calls[1]?.params?.[0]).toBe(TENANT);
        expect(calls[1]?.params?.[1]).toBe(REQUEST);
    });

    it('rejects missing tenant_id', async () => {
        const { db } = buildFakeDb(() => ({ rows: [] }));
        await expect(
            recordOutcome(
                { request_id: REQUEST, outcome_type: 'request_completion', outcome_status: 'accepted', source: 'sdk' },
                { tenant_id: 'not-a-uuid', reported_by: 'r' },
                { db },
            ),
        ).rejects.toThrow(/tenant_id/);
    });

    it('rejects when no matching ai_economic_events row is found and orphans disabled', async () => {
        const { db } = buildFakeDb((call) => (call.text === OUTCOME_SQL.SQL_LOOKUP_EVENT ? { rows: [] } : { rows: [outcomeRow()] }));
        await expect(
            recordOutcome(
                { request_id: REQUEST, outcome_type: 'request_completion', outcome_status: 'accepted', source: 'sdk' },
                { tenant_id: TENANT, reported_by: 'r' },
                { db, nowFn: NOW },
            ),
        ).rejects.toThrow(/EVENT_LINKAGE_REQUIRED|no ai_economic_events/);
    });

    it('marks orphan=true when allowOrphan is set and lookup returns no row', async () => {
        const { db } = buildFakeDb((call) => (call.text === OUTCOME_SQL.SQL_LOOKUP_EVENT ? { rows: [] } : { rows: [outcomeRow()] }));
        const result = await recordOutcome(
            { request_id: REQUEST, outcome_type: 'request_completion', outcome_status: 'accepted', source: 'sdk' },
            { tenant_id: TENANT, reported_by: 'r' },
            { db, allowOrphan: true, nowFn: NOW },
        );
        expect(result.orphan).toBe(true);
        expect(result.economic_event_id).toBeNull();
    });

    it('rejects forbidden metadata keys', async () => {
        const { db } = buildFakeDb(() => ({ rows: [] }));
        await expect(
            recordOutcome(
                {
                    request_id: REQUEST,
                    outcome_type: 'request_completion',
                    outcome_status: 'accepted',
                    source: 'sdk',
                    metadata: { prompt: 'leak' },
                },
                { tenant_id: TENANT, reported_by: 'r' },
                { db, nowFn: NOW },
            ),
        ).rejects.toThrow(OutcomeValidationError);
    });

    it('rejects synonyms like prompt_text and response_body', async () => {
        const { db } = buildFakeDb(() => ({ rows: [] }));
        for (const key of ['prompt_text', 'response_body', 'message_content', 'raw_trace']) {
            await expect(
                recordOutcome(
                    {
                        request_id: REQUEST,
                        outcome_type: 'request_completion',
                        outcome_status: 'accepted',
                        source: 'sdk',
                        metadata: { [key]: 'leak' },
                    },
                    { tenant_id: TENANT, reported_by: 'r' },
                    { db, nowFn: NOW },
                ),
            ).rejects.toThrow(/forbidden/);
        }
    });
});

describe('OUTCOME_SQL source-shape', () => {
    it('SQL_LOOKUP_EVENT is a SELECT and SQL_UPSERT_OUTCOME is an UPSERT (INSERT ... ON CONFLICT DO UPDATE)', () => {
        const lookup = OUTCOME_SQL.SQL_LOOKUP_EVENT.replace(/\s+/g, ' ').trim().toUpperCase();
        const upsert = OUTCOME_SQL.SQL_UPSERT_OUTCOME.replace(/\s+/g, ' ').trim().toUpperCase();
        expect(lookup.startsWith('SELECT')).toBe(true);
        expect(upsert.startsWith('INSERT INTO')).toBe(true);
        expect(upsert).toContain('ON CONFLICT');
        expect(upsert).toContain('DO UPDATE');
    });

    it('contains no non-upsert standalone UPDATE statement', () => {
        // A standalone UPDATE would start with `UPDATE <table> SET ...` outside
        // of an ON CONFLICT DO UPDATE clause. Search across both queries.
        const standaloneUpdate = /(?<!DO\s)\bUPDATE\s+[a-zA-Z_]\w*\s+SET\b/i;
        for (const [name, sql] of Object.entries(OUTCOME_SQL)) {
            expect(sql, `${name} must not contain a standalone UPDATE`).not.toMatch(standaloneUpdate);
        }
    });

    it('contains no standalone DELETE/TRUNCATE/CREATE/DROP/ALTER/GRANT/REVOKE', () => {
        for (const sql of Object.values(OUTCOME_SQL)) {
            expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
            expect(sql).not.toMatch(/\bTRUNCATE\b/i);
            expect(sql).not.toMatch(/\bCREATE\b/i);
            expect(sql).not.toMatch(/\bDROP\b/i);
            expect(sql).not.toMatch(/\bALTER\b/i);
            expect(sql).not.toMatch(/\bGRANT\b/i);
            expect(sql).not.toMatch(/\bREVOKE\b/i);
        }
    });

    it('every query is parameterized and tenant-scoped', () => {
        expect(OUTCOME_SQL.SQL_LOOKUP_EVENT).toMatch(/tenant_id\s*=\s*\$1/);
        expect(OUTCOME_SQL.SQL_UPSERT_OUTCOME).toContain('$1');
    });

    it('queries do not reference forbidden content fields', () => {
        for (const sql of Object.values(OUTCOME_SQL)) {
            expect(sql).not.toMatch(/\bprompt\b/i);
            expect(sql).not.toMatch(/\bresponse_body\b/i);
            expect(sql).not.toMatch(/\bcompletion_text\b/i);
            expect(sql).not.toMatch(/\bmessage_content\b/i);
        }
    });
});

describe('lib/outcomes source-shape (3AU safety)', () => {
    it('contains no savings, auto-apply, or apply-recommendation phrasing', async () => {
        const { readdirSync, readFileSync, statSync } = await import('node:fs');
        const { join } = await import('node:path');
        const root = join(__dirname, '..');
        const files: string[] = [];
        const walk = (dir: string) => {
            for (const entry of readdirSync(dir)) {
                if (entry === '__tests__') continue;
                const full = join(dir, entry);
                if (statSync(full).isDirectory()) walk(full);
                else files.push(full);
            }
        };
        walk(root);
        for (const f of files) {
            const src = readFileSync(f, 'utf8');
            expect(src, `forbidden phrase in ${f}`).not.toMatch(/verified[_-]?savings/i);
            expect(src, `forbidden phrase in ${f}`).not.toMatch(/policy[_-]?auto[_-]?apply/i);
            expect(src, `forbidden phrase in ${f}`).not.toMatch(/applyRecommendation/);
            expect(src, `forbidden phrase in ${f}`).not.toMatch(/rollbackRecommendation/);
            expect(src, `forbidden phrase in ${f}`).not.toMatch(/tenant_visible_recommendation/i);
        }
    });
});
