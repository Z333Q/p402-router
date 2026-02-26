import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import {
    buildEvidenceBundle,
    redactBundle,
    type SettlementInput,
} from '@/lib/schemas/evidence-bundle';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/analytics/evidence-bundle
 *
 * Query params:
 *   txHash=<string>           — single bundle by transaction hash
 *   sessionId=<string>        — single bundle by session/request id
 *   from=<ISO>&to=<ISO>       — date range (max 500 records)
 *   (none)                    — last 30 days (max 500 records)
 *   download=true             — adds Content-Disposition: attachment
 *
 * Returns:
 *   { bundle: EvidenceBundle }            — for single-record queries
 *   { bundles: EvidenceBundle[], count }  — for range/bulk queries
 *
 * tenantId is redacted from all returned bundles.
 */
export async function GET(request: NextRequest) {
    const access = await requireTenantAccess(request);
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const tenantId = access.tenantId;

    try {
        const { searchParams } = new URL(request.url);
        const txHash    = searchParams.get('txHash');
        const sessionId = searchParams.get('sessionId');
        const from      = searchParams.get('from');
        const to        = searchParams.get('to');
        const download  = searchParams.get('download') === 'true';

        const SETTLEMENT_SELECT = `
            pth.tx_hash          AS id,
            pth.request_id       AS session_id,
            pth.settlement_type  AS scheme,
            pth.tx_hash,
            COALESCE(pth.amount_usd, 0) AS amount_usd,
            'unknown'            AS payer,
            pth.processed_at     AS verified_at,
            pth.processed_at     AS created_at
        `;

        let rows: Record<string, unknown>[] = [];
        let isSingle = false;

        if (txHash) {
            isSingle = true;
            const r = await db.query(
                `SELECT ${SETTLEMENT_SELECT}
                 FROM processed_tx_hashes pth
                 WHERE pth.tx_hash = $1 AND pth.tenant_id = $2
                 LIMIT 1`,
                [txHash, tenantId]
            );
            rows = r.rows;

        } else if (sessionId) {
            isSingle = true;
            const r = await db.query(
                `SELECT ${SETTLEMENT_SELECT}
                 FROM processed_tx_hashes pth
                 WHERE pth.request_id = $1 AND pth.tenant_id = $2
                 LIMIT 1`,
                [sessionId, tenantId]
            );
            rows = r.rows;

        } else if (from && to) {
            const r = await db.query(
                `SELECT ${SETTLEMENT_SELECT}
                 FROM processed_tx_hashes pth
                 WHERE pth.tenant_id = $1
                   AND pth.processed_at >= $2
                   AND pth.processed_at <= $3
                 ORDER BY pth.processed_at DESC
                 LIMIT 500`,
                [tenantId, from, to]
            );
            rows = r.rows;

        } else {
            // Default: last 30 days
            const r = await db.query(
                `SELECT ${SETTLEMENT_SELECT}
                 FROM processed_tx_hashes pth
                 WHERE pth.tenant_id = $1
                   AND pth.processed_at > NOW() - INTERVAL '30 days'
                 ORDER BY pth.processed_at DESC
                 LIMIT 500`,
                [tenantId]
            );
            rows = r.rows;
        }

        const bundles = rows.map(row => {
            const settlement: SettlementInput = {
                id: String(row['id'] ?? ''),
                session_id: String(row['session_id'] ?? ''),
                scheme: (['exact', 'onchain', 'receipt'].includes(String(row['scheme']))
                    ? row['scheme']
                    : 'exact') as 'exact' | 'onchain' | 'receipt',
                tx_hash: row['tx_hash'] ? String(row['tx_hash']) : undefined,
                amount_usd: parseFloat(String(row['amount_usd'] ?? '0')),
                payer: String(row['payer'] ?? 'unknown'),
                verified_at: String(row['verified_at'] ?? ''),
                created_at: String(row['created_at'] ?? ''),
            };
            return redactBundle(buildEvidenceBundle(settlement, { tenantId }));
        });

        const payload = isSingle
            ? { bundle: bundles[0] ?? null }
            : { bundles, count: bundles.length };

        if (download) {
            const date = new Date().toISOString().slice(0, 10);
            const filename = `p402-evidence-${date}.json`;
            return new NextResponse(JSON.stringify(payload, null, 2), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                },
            });
        }

        return NextResponse.json(payload);

    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Internal Server Error';
        console.error('[API] evidence-bundle failed:', e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
