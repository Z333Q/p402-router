'use server';

import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
    buildEvidenceBundle,
    redactBundle,
    type EvidenceBundle,
    type SettlementInput,
} from '@/lib/schemas/evidence-bundle';

export interface EvidenceBundleResult {
    success: boolean;
    bundle?: Omit<EvidenceBundle, 'tenantId'>;
    error?: string;
}

/**
 * Server Action: fetch a single evidence bundle by txHash or sessionId.
 * Returns a redacted bundle (tenantId stripped) safe for client display.
 */
export async function getEvidenceBundleAction(
    value: string,
    by: 'txHash' | 'sessionId' = 'txHash'
): Promise<EvidenceBundleResult> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return { success: false, error: 'Unauthorized' };
        const tenantId = (session.user as any).tenantId as string;
        if (!tenantId) return { success: false, error: 'No tenant context found.' };

        const column = by === 'txHash' ? 'pth.tx_hash' : 'pth.request_id';

        const result = await db.query(
            `SELECT
                pth.tx_hash       AS id,
                pth.request_id    AS session_id,
                pth.settlement_type AS scheme,
                pth.tx_hash,
                COALESCE(pth.amount_usd, 0) AS amount_usd,
                'unknown'         AS payer,
                pth.processed_at  AS verified_at,
                pth.processed_at  AS created_at
             FROM processed_tx_hashes pth
             WHERE ${column} = $1 AND pth.tenant_id = $2
             LIMIT 1`,
            [value, tenantId]
        );

        const row = result.rows[0];
        if (!row) return { success: false, error: 'Settlement not found.' };

        const settlement: SettlementInput = {
            id: String(row.id ?? ''),
            session_id: String(row.session_id ?? ''),
            scheme: (['exact', 'onchain', 'receipt'].includes(row.scheme)
                ? row.scheme
                : 'exact') as 'exact' | 'onchain' | 'receipt',
            tx_hash: row.tx_hash ? String(row.tx_hash) : undefined,
            amount_usd: parseFloat(String(row.amount_usd ?? '0')),
            payer: String(row.payer ?? 'unknown'),
            verified_at: String(row.verified_at ?? ''),
            created_at: String(row.created_at ?? ''),
        };

        const bundle = buildEvidenceBundle(settlement, { tenantId });
        return { success: true, bundle: redactBundle(bundle) };

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('[ACTION] getEvidenceBundleAction failed:', error);
        return { success: false, error: msg };
    }
}
