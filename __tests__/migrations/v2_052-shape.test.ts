// Layer 1 shape test for v2_052_privacy_and_economic_events.sql.
// Real-DB execution is covered by scripts/test-migrations-fullchain.sh.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SQL = readFileSync(
    join(process.cwd(), 'scripts/migrations/v2_052_privacy_and_economic_events.sql'),
    'utf-8',
);
const DOWN = readFileSync(
    join(process.cwd(), 'scripts/migrations/v2_052_down.sql'),
    'utf-8',
);

const PRIVACY_MODES = [
    'metadata_only', 'fingerprint_only', 'redacted_trace',
    'private_gateway', 'full_trace',
];
const GOVERNANCE = [
    'approved', 'denied', 'warned', 'requires_review',
    'settlement_required', 'settled', 'receipt_reused', 'cached', 'optimized',
];
const OUTPUT_STATUS = [
    'accepted', 'rejected', 'revised', 'escalated',
    'failed', 'pending_review', 'unknown',
];
const HUMAN_REVIEW = [
    'not_required', 'required', 'pending', 'approved', 'rejected', 'escalated', 'expired',
];
const SCOPES = [
    'tenant', 'department', 'employee', 'workflow', 'project',
    'agent', 'customer', 'feature', 'api_key',
];

describe('v2_052_privacy_and_economic_events shape', () => {
    it('is wrapped in BEGIN/COMMIT', () => {
        const stripped = SQL.replace(/^--.*$/gm, '').trim();
        expect(stripped).toMatch(/^BEGIN;/);
        expect(stripped).toMatch(/COMMIT;\s*$/);
    });

    it('creates three new tables', () => {
        for (const t of ['tenant_privacy_settings', 'privacy_scope_overrides', 'ai_economic_events']) {
            expect(SQL).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${t}`));
        }
    });

    it('tenant_privacy_settings defaults are privacy-first', () => {
        const block = SQL.match(/CREATE TABLE IF NOT EXISTS tenant_privacy_settings[\s\S]+?\);/)?.[0] ?? '';
        expect(block).toMatch(/default_privacy_mode TEXT NOT NULL DEFAULT 'metadata_only'/);
        expect(block).toMatch(/store_prompts\s+BOOLEAN NOT NULL DEFAULT false/);
        expect(block).toMatch(/store_responses\s+BOOLEAN NOT NULL DEFAULT false/);
        expect(block).toMatch(/retention_days\s+INTEGER NOT NULL DEFAULT 30/);
        expect(block).toMatch(/require_redaction\s+BOOLEAN NOT NULL DEFAULT true/);
    });

    it('tenant_privacy_settings has CHECK on the 5 privacy modes', () => {
        const block = SQL.match(/CREATE TABLE IF NOT EXISTS tenant_privacy_settings[\s\S]+?\);/)?.[0] ?? '';
        for (const m of PRIVACY_MODES) expect(block).toContain(`'${m}'`);
    });

    it('tenant_privacy_settings has UNIQUE tenant_id and FK to tenants', () => {
        const block = SQL.match(/CREATE TABLE IF NOT EXISTS tenant_privacy_settings[\s\S]+?\);/)?.[0] ?? '';
        expect(block).toMatch(/tenant_id UUID NOT NULL UNIQUE REFERENCES tenants\(id\) ON DELETE CASCADE/);
    });

    it('privacy_scope_overrides enumerates the 9 valid scope values', () => {
        const block = SQL.match(/CREATE TABLE IF NOT EXISTS privacy_scope_overrides[\s\S]+?\);/)?.[0] ?? '';
        for (const s of SCOPES) expect(block).toContain(`'${s}'`);
        expect(block).toMatch(/UNIQUE \(tenant_id, scope, scope_id\)/);
    });

    it('ai_economic_events has request_id UNIQUE per tenant', () => {
        const block = SQL.match(/CREATE TABLE IF NOT EXISTS ai_economic_events[\s\S]+?\);/)?.[0] ?? '';
        expect(block).toMatch(/UNIQUE \(tenant_id, request_id\)/);
        expect(block).toMatch(/request_id TEXT NOT NULL/);
        expect(block).toMatch(/tenant_id UUID NOT NULL REFERENCES tenants\(id\) ON DELETE CASCADE/);
    });

    it('ai_economic_events has the full V5 §8.1 field set', () => {
        const required = [
            'api_key_id', 'source', 'event_time',
            'owner_type', 'owner_id', 'department_id', 'employee_id', 'customer_id',
            'project_id', 'feature_id', 'workflow_id', 'task_type', 'action_type',
            'provider', 'model_requested', 'model_used',
            'input_tokens', 'output_tokens', 'total_tokens',
            'cost_usd', 'direct_cost_usd', 'route_savings_usd', 'cache_savings_usd',
            'retry_cost_usd', 'context_waste_usd', 'latency_ms', 'cache_hit',
            'status_code', 'success', 'revenue_usd', 'gross_margin_pct',
            'budget_id', 'policy_id', 'mandate_id', 'governance_decision', 'deny_code',
            'receipt_id', 'evidence_bundle_id',
            'output_status', 'quality_score', 'human_review_status',
        ];
        const block = SQL.match(/CREATE TABLE IF NOT EXISTS ai_economic_events[\s\S]+?\);/)?.[0] ?? '';
        for (const col of required) {
            expect(block, `missing column ${col}`).toMatch(new RegExp(`\\b${col}\\b`));
        }
    });

    it('ai_economic_events has the V5 §27.6 privacy columns from day one', () => {
        const block = SQL.match(/CREATE TABLE IF NOT EXISTS ai_economic_events[\s\S]+?\);/)?.[0] ?? '';
        expect(block).toMatch(/privacy_mode TEXT NOT NULL DEFAULT 'metadata_only'/);
        expect(block).toMatch(/prompt_stored BOOLEAN NOT NULL DEFAULT false/);
        expect(block).toMatch(/response_stored BOOLEAN NOT NULL DEFAULT false/);
        expect(block).toMatch(/prompt_fingerprint TEXT/);
        expect(block).toMatch(/response_fingerprint TEXT/);
        expect(block).toMatch(/redaction_applied BOOLEAN NOT NULL DEFAULT false/);
        expect(block).toMatch(/retention_expires_at TIMESTAMPTZ/);
    });

    it('ai_economic_events CHECK enums match V5', () => {
        const block = SQL.match(/CREATE TABLE IF NOT EXISTS ai_economic_events[\s\S]+?\);/)?.[0] ?? '';
        for (const v of GOVERNANCE)    expect(block).toContain(`'${v}'`);
        for (const v of OUTPUT_STATUS) expect(block).toContain(`'${v}'`);
        for (const v of HUMAN_REVIEW)  expect(block).toContain(`'${v}'`);
        for (const v of PRIVACY_MODES) expect(block).toContain(`'${v}'`);
    });

    it('quality_score CHECK bounds to [0,1]', () => {
        const block = SQL.match(/CREATE TABLE IF NOT EXISTS ai_economic_events[\s\S]+?\);/)?.[0] ?? '';
        expect(block).toMatch(/quality_score >= 0 AND quality_score <= 1/);
    });

    it('partial indexes only fire on relevant non-null/non-default rows', () => {
        expect(SQL).toMatch(/idx_aiee_api_key[\s\S]+?WHERE api_key_id IS NOT NULL/);
        expect(SQL).toMatch(/idx_aiee_department[\s\S]+?WHERE department_id IS NOT NULL/);
        expect(SQL).toMatch(/idx_aiee_action[\s\S]+?WHERE action_type IS NOT NULL/);
        expect(SQL).toMatch(/idx_aiee_evidence[\s\S]+?WHERE evidence_bundle_id IS NOT NULL/);
        expect(SQL).toMatch(/idx_aiee_retention_expiry[\s\S]+?WHERE retention_expires_at IS NOT NULL/);
        expect(SQL).toMatch(/idx_aiee_denials[\s\S]+?WHERE governance_decision IN/);
    });

    it('contains no destructive ops on legacy data', () => {
        // No DROP of traffic_events, router_decisions, api_keys, etc.
        expect(SQL).not.toMatch(/DROP TABLE(?! IF EXISTS (tenant_privacy_settings_old|privacy_scope_overrides_old|ai_economic_events_old))/);
        expect(SQL).not.toMatch(/TRUNCATE/);
    });

    it('is idempotent', () => {
        const tables = SQL.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?\w+/g) ?? [];
        for (const t of tables) expect(t).toMatch(/IF NOT EXISTS/);
        const idx = SQL.match(/CREATE INDEX\s+(?:IF NOT EXISTS\s+)?\w+/g) ?? [];
        for (const i of idx) expect(i).toMatch(/IF NOT EXISTS/);
    });

    it('paired down covers the new surface', () => {
        for (const t of ['tenant_privacy_settings', 'privacy_scope_overrides', 'ai_economic_events']) {
            expect(DOWN).toMatch(new RegExp(`DROP TABLE IF EXISTS ${t}`));
        }
        // At least one ai_economic_events index dropped explicitly
        expect(DOWN).toMatch(/DROP INDEX IF EXISTS idx_aiee_tenant_time/);
    });
});
