import { describe, it, expect } from 'vitest';
import {
    buildEvidenceBundle,
    buildBundlePrivacy,
    redactBundle,
    type SettlementInput,
} from '../evidence-bundle';

const STMT: SettlementInput = {
    id: 'set_1',
    session_id: 'sess_abc',
    scheme: 'exact',
    tx_hash: '0xdeadbeef',
    amount_usd: 0.01,
    payer: '0xPayerAddress',
    verified_at: '2026-06-04T10:00:00Z',
    created_at: '2026-06-04T09:59:00Z',
};

describe('buildEvidenceBundle', () => {
    it('bumps bundleVersion to 1.1 and exposes a privacy slot', () => {
        const b = buildEvidenceBundle(STMT);
        expect(b.bundleVersion).toBe('1.1');
        expect(b.privacy).toBeNull();
    });

    it('carries an explicit privacy block when options.privacy is provided', () => {
        const b = buildEvidenceBundle(STMT, {
            privacy: {
                mode: 'redacted_trace',
                promptStored: false,
                responseStored: false,
                redactionApplied: true,
                retentionExpiresAt: '2026-07-04T00:00:00.000Z',
                responseCaptureStatus: 'not_stored_per_privacy',
                promptFingerprintExcerpt: 'abc123def4567890',
                responseFingerprintExcerpt: null,
            },
        });
        expect(b.privacy?.mode).toBe('redacted_trace');
        expect(b.privacy?.redactionApplied).toBe(true);
        expect(b.privacy?.responseCaptureStatus).toBe('not_stored_per_privacy');
    });

    it('preserves legacy 1.0 fields unchanged', () => {
        const b = buildEvidenceBundle(STMT, { tenantId: 't_1', receiptId: 'rcpt_1' });
        expect(b.requestId).toBe('sess_abc');
        expect(b.txHash).toBe('0xdeadbeef');
        expect(b.receiptId).toBe('rcpt_1');
        expect(b.tenantId).toBe('t_1');
        expect(b.basescanTxUrl).toBe('https://basescan.org/tx/0xdeadbeef');
    });
});

describe('buildBundlePrivacy — from ai_economic_events row', () => {
    it('maps every documented privacy field', () => {
        const p = buildBundlePrivacy({
            privacy_mode: 'fingerprint_only',
            prompt_stored: false,
            response_stored: false,
            redaction_applied: false,
            retention_expires_at: '2026-07-04T00:00:00Z',
            prompt_fingerprint: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            response_fingerprint: null,
            metadata: { response_capture_status: 'not_stored_per_privacy' },
        });
        expect(p.mode).toBe('fingerprint_only');
        expect(p.promptStored).toBe(false);
        expect(p.responseStored).toBe(false);
        expect(p.redactionApplied).toBe(false);
        expect(p.retentionExpiresAt).toBe('2026-07-04T00:00:00Z');
        expect(p.responseCaptureStatus).toBe('not_stored_per_privacy');
        // Fingerprint is excerpted to 16 hex chars — full HMAC is NOT exported.
        expect(p.promptFingerprintExcerpt).toBe('0123456789abcdef');
        expect(p.promptFingerprintExcerpt!.length).toBe(16);
        expect(p.responseFingerprintExcerpt).toBeNull();
    });

    it('handles Date for retention_expires_at', () => {
        const d = new Date('2026-08-01T00:00:00Z');
        const p = buildBundlePrivacy({ retention_expires_at: d });
        expect(p.retentionExpiresAt).toBe(d.toISOString());
    });

    it('reads response_capture_status from metadata when present', () => {
        const p = buildBundlePrivacy({
            privacy_mode: 'metadata_only',
            metadata: { response_capture_status: 'not_available_streaming' },
        });
        expect(p.responseCaptureStatus).toBe('not_available_streaming');
    });

    it('returns null for unknown / missing fields rather than omitting them', () => {
        const p = buildBundlePrivacy({});
        expect(p.mode).toBeNull();
        expect(p.promptStored).toBeNull();
        expect(p.responseStored).toBeNull();
        expect(p.responseCaptureStatus).toBeNull();
        expect(p.promptFingerprintExcerpt).toBeNull();
    });
});

describe('redactBundle', () => {
    it('strips tenantId but preserves privacy block', () => {
        const b = buildEvidenceBundle(STMT, {
            tenantId: 't_secret',
            privacy: {
                mode: 'metadata_only',
                promptStored: false, responseStored: false,
                redactionApplied: false, retentionExpiresAt: null,
                responseCaptureStatus: 'not_stored_per_privacy',
                promptFingerprintExcerpt: null, responseFingerprintExcerpt: null,
            },
        });
        const r = redactBundle(b);
        expect((r as any).tenantId).toBeUndefined();
        expect(r.privacy?.mode).toBe('metadata_only');
    });
});
