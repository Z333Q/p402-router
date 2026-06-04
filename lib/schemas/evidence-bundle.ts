/**
 * Evidence Bundle — P402
 *
 * A structured, exportable artifact for every settlement.
 * Used for compliance review, dispute resolution, and procurement evidence.
 * Returned by: lib/actions/evidence.ts, /api/v1/analytics/evidence-bundle
 *
 * Schema version 1.1 (2026-06-04) adds the privacy block per V5 §27 +
 * acceptance criterion 26.13: "Evidence bundles include privacy_mode,
 * prompt_stored, response_stored, redaction_applied, and
 * retention_expires_at where available." Existing 1.0 consumers continue
 * to work — the new fields are additive and optional.
 */

export interface EvidenceBundlePrivacy {
    /** Resolved privacy mode at the time the event was recorded. */
    mode:
        | 'metadata_only' | 'fingerprint_only' | 'redacted_trace'
        | 'private_gateway' | 'full_trace'
        | null;
    /** True if raw prompt content was persisted in ai_economic_events. */
    promptStored: boolean | null;
    /** True if raw response content was persisted. */
    responseStored: boolean | null;
    /** True if redaction was applied before storage (redacted_trace mode). */
    redactionApplied: boolean | null;
    /** ISO 8601 expiration of the retention window for this event row. */
    retentionExpiresAt: string | null;
    /**
     * Honest signal about what happened to the response payload. See
     * docs/follow-ups/2026-06-04-streaming-response-capture-honesty.md.
     * Possible values: 'captured', 'not_stored_per_privacy',
     * 'not_available_streaming', 'truncated', 'failed'.
     */
    responseCaptureStatus: string | null;
    /**
     * Fingerprint excerpts (first 16 hex chars). Full fingerprints stay
     * in ai_economic_events; bundles only show enough for an auditor to
     * cross-reference without enabling pre-image attacks.
     */
    promptFingerprintExcerpt: string | null;
    responseFingerprintExcerpt: string | null;
}

export interface EvidenceBundle {
    /** Schema version for forward compatibility. */
    bundleVersion: '1.0' | '1.1';
    /** ISO 8601 export timestamp. */
    exportedAt: string;

    // ── Identity ──────────────────────────────────────────────────────────────
    /** Correlates to session_id / request_id on traffic events. */
    requestId: string | null;
    tenantId: string | null;
    sessionId: string | null;

    // ── Payment parties ───────────────────────────────────────────────────────
    /** EVM address of the payer wallet. null if unknown at query time. */
    payer: string | null;
    /** EVM address that received the USDC (treasury). */
    payTo: string;
    /** ERC-20 contract address of the settlement asset. */
    asset: string;

    // ── Settlement details ────────────────────────────────────────────────────
    amountUsd: number;
    /** uint256 amount in atomic units (USDC = 6 decimals). null if not stored. */
    amountRaw: string | null;
    chainId: number;
    /** CAIP-2 network identifier. */
    network: string;
    /** On-chain transaction hash. null for receipt-reuse or pending. */
    txHash: string | null;
    scheme: 'exact' | 'onchain' | 'receipt';

    // ── Related IDs ───────────────────────────────────────────────────────────
    receiptId: string | null;
    mandateId: string | null;
    policyId: string | null;

    // ── Deny / error ──────────────────────────────────────────────────────────
    /** Structured deny code if the request was blocked. */
    denyCode: string | null;
    errorMessage: string | null;

    // ── Timestamps ────────────────────────────────────────────────────────────
    timestamps: {
        created: string | null;
        verified: string | null;
        settled: string | null;
    };

    // ── Trace & audit summaries ────────────────────────────────────────────────
    traceEventCount: number | null;
    auditFindings: Array<{
        severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
        code: string;
        summary: string;
    }> | null;

    // ── Verification helpers ───────────────────────────────────────────────────
    basescanTxUrl: string | null;

    /**
     * Privacy posture for the underlying AI economic event. Surfaces the
     * decisions that governed what content (if any) was stored. Null when
     * the bundle was built from a settlement that has no linked
     * ai_economic_events row (e.g. payment-only flow).
     */
    privacy: EvidenceBundlePrivacy | null;
}

/** Settlement shape accepted by the builder. Matches lib/db/queries.ts Settlement. */
export interface SettlementInput {
    id: string;
    session_id: string;
    scheme: 'exact' | 'onchain' | 'receipt';
    tx_hash?: string;
    payment_hash?: string;
    amount_usd: number;
    payer: string;
    verified_at: string;
    created_at: string;
}

export interface EvidenceBundleOptions {
    tenantId?: string;
    receiptId?: string;
    mandateId?: string;
    policyId?: string;
    denyCode?: string;
    errorMessage?: string;
    auditFindings?: EvidenceBundle['auditFindings'];
    traceEventCount?: number;
    /** Optional privacy block — wire from ai_economic_events row by passing
     *  a row to attachPrivacy() or constructing the block directly. */
    privacy?: EvidenceBundlePrivacy;
}

/**
 * Build the privacy block from an ai_economic_events row. The row need not
 * have every column — anything missing becomes null in the bundle.
 *
 * Fingerprints are truncated to a 16-hex excerpt so the auditor can match
 * against a side-channel without enabling pre-image attacks against the
 * full HMAC.
 */
export function buildBundlePrivacy(row: {
    privacy_mode?: string | null;
    prompt_stored?: boolean | null;
    response_stored?: boolean | null;
    redaction_applied?: boolean | null;
    retention_expires_at?: string | Date | null;
    prompt_fingerprint?: string | null;
    response_fingerprint?: string | null;
    metadata?: Record<string, unknown> | null;
}): EvidenceBundlePrivacy {
    const captureStatus = (row.metadata as any)?.response_capture_status ?? null;
    const exp = row.retention_expires_at;
    return {
        mode: (row.privacy_mode as EvidenceBundlePrivacy['mode']) ?? null,
        promptStored:    row.prompt_stored    ?? null,
        responseStored:  row.response_stored  ?? null,
        redactionApplied: row.redaction_applied ?? null,
        retentionExpiresAt: exp instanceof Date ? exp.toISOString() : (exp ?? null),
        responseCaptureStatus: typeof captureStatus === 'string' ? captureStatus : null,
        promptFingerprintExcerpt:   row.prompt_fingerprint   ? row.prompt_fingerprint.slice(0, 16)   : null,
        responseFingerprintExcerpt: row.response_fingerprint ? row.response_fingerprint.slice(0, 16) : null,
    };
}

/**
 * Construct an EvidenceBundle from a settlement row.
 * Fields not available in the settlement row are null — not omitted.
 * Null fields signal "not available at export time" to the consumer.
 */
export function buildEvidenceBundle(
    settlement: SettlementInput,
    options: EvidenceBundleOptions = {}
): EvidenceBundle {
    const txHash = settlement.tx_hash ?? null;

    return {
        // Bumped to 1.1 to signal the additive `privacy` block. 1.0
        // consumers can ignore the new field — every prior field is
        // unchanged.
        bundleVersion: '1.1',
        exportedAt: new Date().toISOString(),

        requestId: settlement.session_id ?? null,
        tenantId: options.tenantId ?? null,
        sessionId: settlement.session_id ?? null,

        payer: settlement.payer !== 'unknown' ? settlement.payer : null,
        payTo: '0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6',
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',

        amountUsd: settlement.amount_usd,
        amountRaw: null,
        chainId: 8453,
        network: 'eip155:8453',
        txHash,
        scheme: settlement.scheme,

        receiptId: options.receiptId ?? null,
        mandateId: options.mandateId ?? null,
        policyId: options.policyId ?? null,

        denyCode: options.denyCode ?? null,
        errorMessage: options.errorMessage ?? null,

        timestamps: {
            created: settlement.created_at ?? null,
            verified: settlement.verified_at ?? null,
            settled: settlement.verified_at ?? null,
        },

        traceEventCount: options.traceEventCount ?? null,
        auditFindings: options.auditFindings ?? null,

        basescanTxUrl: txHash ? `https://basescan.org/tx/${txHash}` : null,

        privacy: options.privacy ?? null,
    };
}

/** Produce a redacted bundle safe for client-side display (no tenantId). */
export function redactBundle(bundle: EvidenceBundle): Omit<EvidenceBundle, 'tenantId'> {
    const { tenantId: _omit, ...rest } = bundle;
    return rest;
}
