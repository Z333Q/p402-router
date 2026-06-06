/**
 * Slice 3H — Plain-language explanation generator.
 *
 * Pins the CFO-readable narrative for approved + denied events and the
 * attribution / evidence note machinery. Content fields are NEVER read.
 */

import { describe, expect, it } from 'vitest';
import { explainEvent } from '@/lib/prove/explain';
import type { EventDetailRow } from '@/lib/prove/event-detail';

function row(over: Partial<EventDetailRow> = {}): EventDetailRow {
    return {
        event_time: '2026-06-05T10:00:00.000Z',
        request_id: 'req-abc',
        tenant_id:  'tenant-1',
        source:     'chat_completions',
        route:      '/api/v2/chat/completions',
        provider:   'openai',
        model_used: 'gpt-4o-mini',
        model_requested: 'gpt-4o-mini',
        status_code: 200,
        success:     true,
        cost_usd:    '0.036',
        direct_cost_usd: '0.030',
        input_tokens: 100, output_tokens: 50, total_tokens: 150,
        latency_ms: 412, cache_hit: false,
        department_id: 'dept_1', employee_id: 'emp_1', api_key_id: 'ak_1',
        workflow_id: 'wf_1', customer_id: 'cust_1', feature_id: 'feat_1',
        owner_type: 'tenant', owner_id: 'tenant-1',
        budget_id: null, policy_id: null, mandate_id: null,
        governance_decision: 'approved', deny_code: null,
        privacy_mode: 'metadata_only',
        prompt_stored: false, response_stored: false, redaction_applied: false,
        retention_expires_at: '2026-07-05T10:00:00.000Z',
        evidence_bundle_id: 'bndl_1',
        metadata_decision_source: null, metadata_deny_rule: null,
        created_at: '2026-06-05T10:00:00.000Z', updated_at: '2026-06-05T10:00:00.000Z',
        ...over,
    };
}

describe('explainEvent — approved', () => {
    it('produces a CFO headline mentioning provider, model, and cost', () => {
        const r = explainEvent(row());
        expect(r.headline).toContain('approved');
        expect(r.headline).toContain('openai');
        expect(r.headline).toContain('gpt-4o-mini');
        expect(r.headline).toContain('$0.036');
    });

    it('mentions token usage in details', () => {
        const r = explainEvent(row({ input_tokens: 200, output_tokens: 100, total_tokens: 300 }));
        expect(r.details.join(' ')).toMatch(/200 input.*100 output.*300 total/);
    });

    it('does not raise any "denied" copy', () => {
        const r = explainEvent(row());
        for (const s of [r.headline, ...r.details, ...r.notes]) {
            expect(s.toLowerCase()).not.toContain('denied');
        }
    });
});

describe('explainEvent — denied', () => {
    it('headline matches the spec example "MODEL_NOT_ALLOWED, rule api_key.allowed_models. Request blocked..."', () => {
        const r = explainEvent(row({
            governance_decision: 'denied',
            deny_code: 'MODEL_NOT_ALLOWED',
            metadata_deny_rule: 'api_key.allowed_models',
            metadata_decision_source: 'budget_guard',
            cost_usd: '0',
            success: false,
            provider: null, model_used: null,
        }));
        expect(r.headline).toContain('MODEL_NOT_ALLOWED');
        expect(r.headline).toContain('api_key.allowed_models');
        expect(r.headline.toLowerCase()).toContain('blocked before provider');
        expect(r.headline).toContain('$0');
        expect(r.details.join(' ')).toContain('Decision source: budget_guard');
    });

    it('always explains $0 cost when denied', () => {
        const r = explainEvent(row({
            governance_decision: 'denied',
            deny_code: 'API_KEY_BUDGET_EXCEEDED',
            cost_usd: '0',
            metadata_deny_rule: 'api_key.monthly_budget_usd',
        }));
        expect(r.details.join(' ').toLowerCase()).toMatch(/never reached the model|provider cost is \$0/);
    });
});

describe('explainEvent — attribution and evidence notes', () => {
    it('flags fully unattributed events', () => {
        const r = explainEvent(row({
            department_id: null, employee_id: null, api_key_id: null,
            workflow_id: null, customer_id: null, feature_id: null,
            evidence_bundle_id: 'bndl_1',
        }));
        expect(r.notes.join(' ')).toContain('fully unattributed');
    });

    it('lists missing fields when partially attributed', () => {
        const r = explainEvent(row({
            department_id: 'dept_1', employee_id: 'emp_1', api_key_id: 'ak_1',
            workflow_id: null, customer_id: null, feature_id: null,
        }));
        expect(r.notes.join(' ')).toMatch(/missing workflow, customer, feature/);
    });

    it('notes when evidence bundle is missing', () => {
        const r = explainEvent(row({ evidence_bundle_id: null }));
        expect(r.notes.join(' ')).toContain('no evidence bundle');
    });

    it('mentions prompt/response not stored when privacy posture is metadata_only', () => {
        const r = explainEvent(row({ prompt_stored: false, response_stored: false }));
        const all = r.details.join(' ');
        expect(all).toContain('Prompt content was not stored');
        expect(all).toContain('Response content was not stored');
    });
});

describe('explainEvent — content-safety', () => {
    it('never references prompt, response, message, completion, or body in any output', () => {
        const cases = [row(), row({ governance_decision: 'denied', deny_code: 'MODEL_NOT_ALLOWED', cost_usd: '0' })];
        for (const c of cases) {
            const r = explainEvent(c);
            const all = [r.headline, ...r.details, ...r.notes].join('\n').toLowerCase();
            for (const forbidden of [
                'prompt content was rendered',
                'response body',
                'request body',
                'messages array',
                'completion text',
                'transcript',
            ]) {
                expect(all).not.toContain(forbidden);
            }
        }
    });
});
