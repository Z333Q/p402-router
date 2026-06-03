import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import {
    resolveTenantPrivacy,
    fingerprintContent,
    retentionExpiry,
} from '../privacy';

const TENANT = '00000000-0000-0000-0000-000000000123';

beforeEach(() => (db.query as any).mockReset());

describe('resolveTenantPrivacy', () => {
    it('returns system default when neither override nor tenant row exists', async () => {
        // Both queries return empty
        (db.query as any).mockResolvedValueOnce({ rows: [] }); // tenant_default
        const r = await resolveTenantPrivacy(TENANT);
        expect(r.privacyMode).toBe('metadata_only');
        expect(r.storePrompts).toBe(false);
        expect(r.storeResponses).toBe(false);
        expect(r.retentionDays).toBe(30);
        expect(r.source).toBe('system_default');
    });

    it('returns tenant default when row exists', async () => {
        (db.query as any).mockResolvedValueOnce({
            rows: [{
                default_privacy_mode: 'redacted_trace',
                store_prompts: false,
                store_responses: false,
                require_redaction: true,
                retention_days: 60,
            }],
        });
        const r = await resolveTenantPrivacy(TENANT);
        expect(r.privacyMode).toBe('redacted_trace');
        expect(r.retentionDays).toBe(60);
        expect(r.source).toBe('tenant_default');
    });

    it('admin-configured scope override WIDENS tenant default (workflow=full_trace on metadata_only tenant)', async () => {
        // User clarification 2026-06-03: scope overrides persisted by an
        // admin can widen privacy mode. CRUD endpoint enforces "authorized
        // admin" gate — this resolver trusts a present override row.
        (db.query as any)
            .mockResolvedValueOnce({
                rows: [{
                    privacy_mode: 'full_trace',
                    store_prompts: true,
                    store_responses: true,
                    retention_days: 14,
                    scope: 'workflow',
                    scope_id: 'engineering_debug',
                }],
            });
        const r = await resolveTenantPrivacy(TENANT, {
            scope: [{ type: 'workflow', id: 'engineering_debug' }],
        });
        expect(r.source).toBe('scope_override');
        expect(r.privacyMode).toBe('full_trace');
        expect(r.storePrompts).toBe(true);
        expect(r.storeResponses).toBe(true);
        expect(r.retentionDays).toBe(14);
    });

    it('per-request override CANNOT widen even when scope override is wider', async () => {
        // Even though a runtime caller passes override='full_trace', the
        // resolved (scope_override) base is metadata_only — the caller is
        // refused (applyOverride only ratchets tighter for per-request input).
        (db.query as any).mockResolvedValueOnce({
            rows: [{
                privacy_mode: 'metadata_only',
                store_prompts: false,
                store_responses: false,
                retention_days: 30,
                scope: 'department',
                scope_id: 'claims',
            }],
        });
        const r = await resolveTenantPrivacy(TENANT, {
            scope: [{ type: 'department', id: 'claims' }],
            override: 'full_trace',
        });
        expect(r.privacyMode).toBe('metadata_only');
    });

    it('scope override takes precedence over tenant default', async () => {
        // scope override matches on first candidate
        (db.query as any)
            .mockResolvedValueOnce({
                rows: [{
                    privacy_mode: 'metadata_only',
                    store_prompts: false,
                    store_responses: false,
                    retention_days: 7,
                    scope: 'department',
                    scope_id: 'claims',
                }],
            });
        const r = await resolveTenantPrivacy(TENANT, {
            scope: [{ type: 'department', id: 'claims' }],
        });
        expect(r.source).toBe('scope_override');
        expect(r.sourceScope).toBe('department');
        expect(r.sourceScopeId).toBe('claims');
        expect(r.privacyMode).toBe('metadata_only');
        expect(r.retentionDays).toBe(7);
    });

    it('falls through to tenant default when scope override has no match', async () => {
        (db.query as any)
            // scope override query — no row
            .mockResolvedValueOnce({ rows: [] })
            // tenant default query
            .mockResolvedValueOnce({
                rows: [{
                    default_privacy_mode: 'metadata_only',
                    store_prompts: false,
                    store_responses: false,
                    require_redaction: true,
                    retention_days: 30,
                }],
            });
        const r = await resolveTenantPrivacy(TENANT, {
            scope: [{ type: 'department', id: 'nonexistent' }],
        });
        expect(r.source).toBe('tenant_default');
    });

    it('override mode RATCHETS TIGHTER but never looser', async () => {
        // Tenant default is full_trace, but caller says metadata_only — that wins.
        (db.query as any).mockResolvedValueOnce({
            rows: [{
                default_privacy_mode: 'full_trace',
                store_prompts: true,
                store_responses: true,
                require_redaction: false,
                retention_days: 90,
            }],
        });
        const r = await resolveTenantPrivacy(TENANT, { override: 'metadata_only' });
        expect(r.privacyMode).toBe('metadata_only');
        // Tighter mode forces storage off.
        expect(r.storePrompts).toBe(false);
        expect(r.storeResponses).toBe(false);
    });

    it('override mode is ignored when looser than tenant default', async () => {
        // Tenant says redacted_trace; caller asks for full_trace — refused.
        (db.query as any).mockResolvedValueOnce({
            rows: [{
                default_privacy_mode: 'redacted_trace',
                store_prompts: false,
                store_responses: false,
                require_redaction: true,
                retention_days: 30,
            }],
        });
        const r = await resolveTenantPrivacy(TENANT, { override: 'full_trace' });
        expect(r.privacyMode).toBe('redacted_trace');
    });

    it('fails soft when the privacy tables do not exist (e.g. v2_052 not applied)', async () => {
        (db.query as any).mockRejectedValueOnce(new Error('relation "privacy_scope_overrides" does not exist'));
        (db.query as any).mockRejectedValueOnce(new Error('relation "tenant_privacy_settings" does not exist'));
        const r = await resolveTenantPrivacy(TENANT, {
            scope: [{ type: 'department', id: 'd1' }],
        });
        expect(r.source).toBe('system_default');
        expect(r.privacyMode).toBe('metadata_only');
    });
});

describe('fingerprintContent', () => {
    it('is deterministic for the same tenant + content', () => {
        const a = fingerprintContent(TENANT, 'hello world');
        const b = fingerprintContent(TENANT, 'hello world');
        expect(a).toBe(b);
        expect(a).toMatch(/^[a-f0-9]{64}$/);
    });

    it('differs across tenants (HMAC keyed by tenant secret, not plain sha256)', () => {
        const a = fingerprintContent(TENANT, 'hello world');
        const b = fingerprintContent('other-tenant', 'hello world');
        expect(a).not.toBe(b);
    });

    it('differs across content', () => {
        const a = fingerprintContent(TENANT, 'one');
        const b = fingerprintContent(TENANT, 'two');
        expect(a).not.toBe(b);
    });
});

describe('retentionExpiry', () => {
    it('shifts by the right number of UTC days', () => {
        const now = new Date('2026-06-01T12:00:00Z');
        const d = retentionExpiry(30, now);
        expect(d.toISOString()).toBe('2026-07-01T12:00:00.000Z');
    });
});
