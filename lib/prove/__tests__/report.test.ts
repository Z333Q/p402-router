/**
 * Slice 3I — Prove report data layer (buildReportWhere, CSV serializer,
 * executive summary text). Pure functions; no DB needed.
 */

import { describe, expect, it } from 'vitest';
import {
    APPENDIX_FIELDS,
    appendixToCsv,
    buildExecutiveSummaryText,
    buildReportWhere,
    type AppendixRow,
} from '@/lib/prove/report';

const TENANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('buildReportWhere — read-only payment-grade invariants', () => {
    it('always starts with tenant_id = $1 and pushes since/until next', () => {
        const { where, params } = buildReportWhere(TENANT, {});
        expect(where[0]).toBe('tenant_id = $1');
        expect(params[0]).toBe(TENANT);
        // since + until were defaulted -> bound at $2/$3.
        expect(where.some((c) => /event_time >= \$2/.test(c))).toBe(true);
        expect(where.some((c) => /event_time < \$3/.test(c))).toBe(true);
        expect(params[1]).toBeInstanceOf(Date);
        expect(params[2]).toBeInstanceOf(Date);
    });

    it('pushes id filters as bound parameters with whitelisted columns', () => {
        const { where, params, applied } = buildReportWhere(TENANT, {
            department_id: 'dept_x', workflow_id: 'wf_x',
            customer_id: 'cust_x', provider: 'openai', deny_code: 'API_KEY_BUDGET_EXCEEDED',
        });
        for (const col of ['department_id','workflow_id','customer_id','provider','deny_code']) {
            expect(where.some((c) => new RegExp(`\\b${col}\\s*=\\s*\\$\\d+`).test(c))).toBe(true);
        }
        expect(applied.department_id).toBe('dept_x');
        expect(params).toEqual(expect.arrayContaining(['dept_x','wf_x','cust_x','openai','API_KEY_BUDGET_EXCEEDED']));
    });

    it('maps model -> model_used and binds it', () => {
        const { where, params } = buildReportWhere(TENANT, { model: 'gpt-4o-mini' });
        expect(where.some((c) => /\bmodel_used\s*=\s*\$\d+/.test(c))).toBe(true);
        expect(params).toContain('gpt-4o-mini');
    });

    it('drops unknown governance / privacy values (no SQL injection)', () => {
        const { where, applied } = buildReportWhere(TENANT, {
            governance_decision: '; DROP TABLE x;',
            privacy_mode: 'bogus',
        });
        for (const c of where) {
            expect(c).not.toMatch(/governance_decision\s*=/);
            expect(c).not.toMatch(/privacy_mode\s*=/);
        }
        expect(applied.governance_decision).toBeUndefined();
        expect(applied.privacy_mode).toBeUndefined();
    });

    it('handles attribution_status=unattributed with six NULL checks', () => {
        const { where } = buildReportWhere(TENANT, { attribution_status: 'unattributed' });
        for (const c of ['department_id','employee_id','workflow_id','customer_id','feature_id','api_key_id']) {
            expect(where.join(' AND ')).toMatch(new RegExp(`${c}\\s+IS\\s+NULL`));
        }
    });

    it('handles evidence_status present / missing', () => {
        expect(buildReportWhere(TENANT, { evidence_status: 'present' }).where.join(' AND '))
            .toMatch(/evidence_bundle_id\s+IS\s+NOT\s+NULL/i);
        expect(buildReportWhere(TENANT, { evidence_status: 'missing' }).where.join(' AND '))
            .toMatch(/evidence_bundle_id\s+IS\s+NULL/i);
    });
});

describe('appendixToCsv', () => {
    function row(over: Partial<AppendixRow> = {}): AppendixRow {
        return {
            event_time: '2026-06-05T10:00:00Z',
            request_id: 'req-1',
            source: 'chat_completions',
            provider: 'openai',
            model_used: 'gpt-4o-mini',
            status_code: 200,
            success: true,
            cost_usd: '0.0123',
            total_tokens: 150,
            department_id: 'dept_1',
            employee_id: 'emp_1',
            api_key_id: 'ak_1',
            workflow_id: 'wf_1',
            customer_id: 'cust_1',
            feature_id: 'feat_1',
            governance_decision: 'approved',
            deny_code: null,
            privacy_mode: 'metadata_only',
            evidence_bundle_id: 'bndl_1',
            ...over,
        };
    }

    it('empty input still returns the canonical header row + newline', () => {
        const csv = appendixToCsv([]);
        expect(csv).toBe(APPENDIX_FIELDS.join(',') + '\n');
    });

    it('serializes a row in the canonical column order', () => {
        const csv = appendixToCsv([row()]);
        const [header, data] = csv.split('\n');
        expect(header).toBe(APPENDIX_FIELDS.join(','));
        const cells = data!.split(',');
        expect(cells[APPENDIX_FIELDS.indexOf('request_id')]).toBe('req-1');
        expect(cells[APPENDIX_FIELDS.indexOf('cost_usd')]).toBe('0.0123');
        expect(cells[APPENDIX_FIELDS.indexOf('success')]).toBe('true');
    });

    it('escapes commas, quotes, and newlines per RFC 4180', () => {
        const csv = appendixToCsv([row({
            request_id: 'req,with,commas',
            deny_code: 'has "quotes"',
            model_used: 'line1\nline2',
        })]);
        expect(csv).toContain('"req,with,commas"');
        expect(csv).toContain('"has ""quotes"""');
        expect(csv).toContain('"line1\nline2"');
    });

    it('header includes NO content-bearing columns', () => {
        const header = APPENDIX_FIELDS.join(',');
        for (const f of ['prompt','messages','completion','response_body','request_body','content','transcript']) {
            expect(header).not.toMatch(new RegExp(`\\b${f}\\b`));
        }
    });
});

describe('buildExecutiveSummaryText', () => {
    const win = { since: '2026-05-01T00:00:00Z', until: '2026-05-31T23:59:59Z' };

    it('mentions the window, totals, denied path, top dept, top vendor, privacy, evidence, attribution', () => {
        const text = buildExecutiveSummaryText(
            {
                total_spend_usd: 12_840.50,
                total_events: 18_402,
                denied_events: 213,
                avg_cost_per_request_usd: 0.007,
                total_tokens: 9_000_000,
                evidence_coverage_pct: 97.4,
                unattributed_event_count: 142,
                unattributed_spend_usd: 42.10,
                missing_evidence_count: 480,
                denied_provider_cost_usd: 0,
            },
            [{ key: 'engineering', request_count: 8000, total_cost_usd: 4210.20, denied_count: 3 }],
            [{ provider: 'openai', model_used: 'gpt-4o-mini', key: 'openai / gpt-4o-mini', request_count: 12000, total_cost_usd: 8800.50, denied_count: 0 }],
            { total_denied: 213, total_blocked_cost_usd: 0,
              by_code: [{ deny_code: 'API_KEY_BUDGET_EXCEEDED', count: 142, deny_rule: null }],
              top_deny_rules: [] },
            [{ privacy_mode: 'metadata_only', count: 17_420, prompt_stored: 0, response_stored: 0, redaction_applied: 0 }],
            { unattributed_count: 142, partial_count: 100, attributed_count: 18_160, most_commonly_missing: [] },
            win,
        );
        expect(text).toContain('2026-05-01');
        expect(text).toContain('2026-05-31');
        expect(text).toContain('18,402');
        expect(text).toContain('$12,840.50');
        expect(text.toLowerCase()).toContain('denied');
        expect(text).toContain('engineering');
        expect(text).toContain('openai / gpt-4o-mini');
        expect(text.toLowerCase()).toContain('evidence coverage');
        expect(text.toLowerCase()).toContain('unattributed');
        expect(text.toLowerCase()).toContain('metadata only');
    });

    it('handles the no-denial path with neutral copy', () => {
        const text = buildExecutiveSummaryText(
            { total_spend_usd: 100, total_events: 50, denied_events: 0,
              avg_cost_per_request_usd: 2, total_tokens: 1000, evidence_coverage_pct: 100,
              unattributed_event_count: 0, unattributed_spend_usd: 0, missing_evidence_count: 0, denied_provider_cost_usd: 0 },
            [], [], { total_denied: 0, total_blocked_cost_usd: 0, by_code: [], top_deny_rules: [] }, [], { unattributed_count: 0, partial_count: 0, attributed_count: 50, most_commonly_missing: [] }, win,
        );
        expect(text.toLowerCase()).toContain('no requests were denied');
    });
});
