/**
 * Evidence Bundle — P402
 *
 * A structured, exportable artifact for every settlement.
 * Used for compliance review, dispute resolution, and procurement evidence.
 * Returned by: lib/actions/evidence.ts, /api/v1/analytics/evidence-bundle
 */

export interface EvidenceBundle {
    /** Schema version for forward compatibility. */
    bundleVersion: '1.0';
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
        bundleVersion: '1.0',
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
    };
}

/** Produce a redacted bundle safe for client-side display (no tenantId). */
export function redactBundle(bundle: EvidenceBundle): Omit<EvidenceBundle, 'tenantId'> {
    const { tenantId: _omit, ...rest } = bundle;
    return rest;
}
