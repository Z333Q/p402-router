/**
 * Slice 3G — Prove search query builder.
 *
 * Pin the payment-grade invariants of buildSearchSql:
 *   - tenant_id is always $1
 *   - every filter value lands as a positional bind
 *   - identifiers come from a whitelist (column names never come from input)
 *   - enum filters reject unknown values
 *   - SELECT projection NEVER references prompt / response / content columns
 *   - free-text q binds once and uses ILIKE over a whitelist
 *   - limit is clamped to SEARCH_MAX_LIMIT
 *   - sort_by + sort_dir are whitelisted (no ORDER BY injection)
 *   - explanation string surfaces the active filters in plain English
 */

import { describe, expect, it } from 'vitest';
import { buildSearchSql, SEARCH_MAX_LIMIT, SEARCH_DEFAULT_LIMIT } from '@/lib/prove/search';

const TENANT = '66666666-6666-6666-6666-666666666666';

describe('buildSearchSql — read-only + safety invariants', () => {
    it('tenant_id is bound as $1 and appears first in the WHERE', () => {
        const { sql, params } = buildSearchSql(TENANT, {});
        expect(sql).toMatch(/WHERE\s+tenant_id\s*=\s*\$1/i);
        expect(params[0]).toBe(TENANT);
    });

    it('SELECT projection does NOT reference content-bearing columns', () => {
        const { sql } = buildSearchSql(TENANT, { q: 'hello world' });
        const s = sql.toLowerCase();
        for (const re of [
            /\bprompt_fingerprint\b/,
            /\bresponse_fingerprint\b/,
            /\bprompt_text\b/,
            /\bresponse_text\b/,
            /\bresponse_body\b/,
            /\brequest_body\b/,
            /\bmessages\b/,
            /\bcompletion\b/,
            /\bcontent\b/,
            /\btranscript\b/,
        ]) {
            expect(s, `must not match ${re}`).not.toMatch(re);
        }
        // It DOES expose attribution_status as a derived column.
        expect(sql).toMatch(/AS\s+attribution_status/i);
    });

    it('does not emit any DML', () => {
        const { sql } = buildSearchSql(TENANT, {});
        for (const verb of [/\bINSERT\b/i, /\bUPDATE\b/i, /\bDELETE\b/i, /\bON\s+CONFLICT\b/i]) {
            expect(sql).not.toMatch(verb);
        }
    });
});

describe('buildSearchSql — structured filters', () => {
    it('each identifier filter pushes a single bound parameter', () => {
        const { sql, params, applied } = buildSearchSql(TENANT, {
            department_id: 'dept_1',
            employee_id:   'emp_1',
            api_key_id:    'ak_1',
            workflow_id:   'wf_1',
            customer_id:   'cust_1',
            feature_id:    'feat_1',
            provider:      'openai',
            model:         'gpt-4o-mini',
            deny_code:     'API_KEY_BUDGET_EXCEEDED',
        });
        for (const col of [
            'department_id','employee_id','api_key_id','workflow_id',
            'customer_id','feature_id','provider','deny_code',
        ]) {
            expect(sql).toMatch(new RegExp(`\\b${col}\\s*=\\s*\\$\\d+`));
        }
        // model => model_used column
        expect(sql).toMatch(/\bmodel_used\s*=\s*\$\d+/);
        expect(applied.model).toBe('gpt-4o-mini');
        expect(params).toEqual(expect.arrayContaining([
            'dept_1','emp_1','ak_1','wf_1','cust_1','feat_1','openai','gpt-4o-mini','API_KEY_BUDGET_EXCEEDED',
        ]));
    });

    it('rejects unknown governance_decision values (drops the filter)', () => {
        const { sql, applied } = buildSearchSql(TENANT, { governance_decision: '; DROP TABLE x;' });
        expect(sql).not.toMatch(/governance_decision\s*=/);
        expect(applied.governance_decision).toBeUndefined();
    });

    it('rejects unknown privacy_mode values', () => {
        const { sql, applied } = buildSearchSql(TENANT, { privacy_mode: 'totally_made_up' });
        expect(sql).not.toMatch(/privacy_mode\s*=/);
        expect(applied.privacy_mode).toBeUndefined();
    });

    it('accepts evidence_status=present / missing as IS NULL checks', () => {
        const present = buildSearchSql(TENANT, { evidence_status: 'present' });
        expect(present.sql).toMatch(/evidence_bundle_id\s+IS\s+NOT\s+NULL/i);

        const missing = buildSearchSql(TENANT, { evidence_status: 'missing' });
        expect(missing.sql).toMatch(/evidence_bundle_id\s+IS\s+NULL/i);
    });

    it('success=true / false map to IS TRUE / IS FALSE-OR-NULL', () => {
        const t = buildSearchSql(TENANT, { success: 'true' });
        expect(t.sql).toMatch(/success\s+IS\s+TRUE/i);
        const f = buildSearchSql(TENANT, { success: 'false' });
        expect(f.sql).toMatch(/success\s+IS\s+FALSE\s+OR\s+success\s+IS\s+NULL/i);
    });

    it('attribution_status=unattributed checks ALL six FK columns are NULL', () => {
        const { sql } = buildSearchSql(TENANT, { attribution_status: 'unattributed' });
        for (const c of ['department_id','employee_id','workflow_id','customer_id','feature_id','api_key_id']) {
            expect(sql).toMatch(new RegExp(`${c}\\s+IS\\s+NULL`));
        }
    });

    it('cost and token ranges bind as inclusive comparisons', () => {
        const { sql, params } = buildSearchSql(TENANT, {
            cost_min: 0.01, cost_max: 5,
            tokens_min: 100, tokens_max: 10_000,
        });
        expect(sql).toMatch(/cost_usd\s*>=\s*\$\d+/);
        expect(sql).toMatch(/cost_usd\s*<=\s*\$\d+/);
        expect(sql).toMatch(/total_tokens\s*>=\s*\$\d+/);
        expect(sql).toMatch(/total_tokens\s*<=\s*\$\d+/);
        expect(params).toEqual(expect.arrayContaining([0.01, 5, 100, 10_000]));
    });
});

describe('buildSearchSql — free-text q', () => {
    it('binds q exactly once and uses ILIKE over a whitelist of columns', () => {
        const { sql, params } = buildSearchSql(TENANT, { q: 'abc' });
        // exactly one occurrence of the wildcard string in params
        const qBinds = params.filter((p) => p === '%abc%');
        expect(qBinds.length).toBe(1);
        expect(sql).toMatch(/request_id::text\s+ILIKE\s+\$\d+/i);
        expect(sql).toMatch(/provider::text\s+ILIKE\s+\$\d+/i);
        expect(sql).toMatch(/model_used::text\s+ILIKE\s+\$\d+/i);
        expect(sql).toMatch(/metadata\s+->>\s+'decision_source'\s+ILIKE\s+\$\d+/i);
    });

    it('drops q when over 128 chars (DoS guard)', () => {
        const long = 'x'.repeat(200);
        const { sql, applied } = buildSearchSql(TENANT, { q: long });
        expect(sql).not.toMatch(/ILIKE/i);
        expect(applied.q).toBeUndefined();
    });
});

describe('buildSearchSql — sort and pagination whitelist', () => {
    it('falls back to event_time DESC when sort_by is unknown', () => {
        const { sql } = buildSearchSql(TENANT, { sort_by: '../../etc/passwd' as never });
        expect(sql).toMatch(/ORDER BY\s+event_time\s+DESC/i);
    });

    it('passes a whitelisted sort_by through, with capitalized direction', () => {
        const { sql, applied } = buildSearchSql(TENANT, { sort_by: 'cost_usd', sort_dir: 'asc' });
        expect(sql).toMatch(/ORDER BY\s+cost_usd\s+ASC/);
        expect(applied.sort_by).toBe('cost_usd');
        expect(applied.sort_dir).toBe('asc');
    });

    it('clamps limit to SEARCH_MAX_LIMIT and binds offset', () => {
        const { params, applied } = buildSearchSql(TENANT, { limit: 10_000_000, offset: 250 });
        expect(applied.limit).toBe(SEARCH_MAX_LIMIT);
        expect(applied.offset).toBe(250);
        // Last two params: limit, offset.
        expect(params[params.length - 2]).toBe(SEARCH_MAX_LIMIT);
        expect(params[params.length - 1]).toBe(250);
    });

    it('default limit is SEARCH_DEFAULT_LIMIT', () => {
        const { applied } = buildSearchSql(TENANT, {});
        expect(applied.limit).toBe(SEARCH_DEFAULT_LIMIT);
    });
});

describe('buildSearchSql — explanation', () => {
    it('describes an empty search', () => {
        const { explanation } = buildSearchSql(TENANT, {});
        expect(explanation).toMatch(/all events/i);
    });
    it('describes denied + missing-evidence in plain English', () => {
        const { explanation } = buildSearchSql(TENANT, {
            governance_decision: 'denied', evidence_status: 'missing',
        });
        expect(explanation.toLowerCase()).toContain('governance_decision=denied');
        expect(explanation.toLowerCase()).toContain('missing evidence');
    });
});
