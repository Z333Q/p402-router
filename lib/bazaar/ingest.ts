import pool from '@/lib/db'
import { randomUUID } from 'crypto'
import { BazaarResource, IngestionResult } from './types'
import { SafetyScanner, quarantineResource } from './safety-scanner'

export class BazaarIngest {
    static async syncFromFacilitator(facilitatorId: string): Promise<IngestionResult> {
        const result: IngestionResult = { added: 0, updated: 0, errors: 0, details: [] }

        try {
            // 1. Get facilitator endpoint
            const res = await pool.query("SELECT endpoint, networks FROM facilitators WHERE facilitator_id = $1", [facilitatorId])
            if (res.rows.length === 0) throw new Error("Facilitator not found")

            const { endpoint } = res.rows[0]

            // 2. Fetch discovery resources from the facilitator's discovery endpoint
            let fetchedResources: Partial<BazaarResource>[] = [];
            try {
                const discoveryRes = await fetch(`${endpoint}/discovery/resources`, {
                    headers: { 'Accept': 'application/json' },
                    signal: AbortSignal.timeout(5000),
                });
                if (!discoveryRes.ok) {
                    console.warn(`[BazaarIngest] Discovery endpoint returned ${discoveryRes.status} for facilitator ${facilitatorId}`);
                    return result;
                }
                const parsed = await discoveryRes.json();
                if (!Array.isArray(parsed)) {
                    console.warn(`[BazaarIngest] Unexpected response format from ${endpoint}/discovery/resources`);
                    return result;
                }
                fetchedResources = parsed as Partial<BazaarResource>[];
            } catch (fetchErr) {
                console.warn(`[BazaarIngest] Failed to fetch resources from ${endpoint}:`, fetchErr);
                return result;
            }

            // 3. Safety scan + upsert
            for (const r of fetchedResources) {
                try {
                    // Safety scan before ingestion
                    let scanResult;
                    try {
                        scanResult = await SafetyScanner.scan(r, facilitatorId);
                    } catch (scanErr) {
                        // Scanner error — approve by default, never block sync
                        console.error(`[BazaarIngest] Safety scan error for ${r.canonicalRouteId}:`, scanErr);
                        scanResult = { safe: true, riskScore: 0, flags: ['scanner_error'] as string[], recommendation: 'approve' as const };
                    }

                    if (scanResult.recommendation === 'reject') {
                        result.errors++;
                        result.details.push(`Rejected ${r.canonicalRouteId}: ${scanResult.flags.join(', ')}`);
                        continue;
                    }

                    if (scanResult.recommendation === 'quarantine') {
                        await quarantineResource(r, facilitatorId, scanResult);
                        result.details.push(`Quarantined ${r.canonicalRouteId}: ${scanResult.flags.join(', ')}`);
                        continue;
                    }

                    // Approved — upsert with safety metadata
                    await pool.query(
                        `INSERT INTO bazaar_resources (
                            resource_id, source_facilitator_id, canonical_route_id, provider_base_url,
                            route_path, methods, title, pricing,
                            safety_score, safety_scanned_at, safety_flags,
                            last_crawled_at, updated_at
                         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, NOW(), NOW())
                         ON CONFLICT (source_facilitator_id, canonical_route_id)
                         DO UPDATE SET
                            provider_base_url = EXCLUDED.provider_base_url,
                            title = EXCLUDED.title,
                            pricing = EXCLUDED.pricing,
                            safety_score = EXCLUDED.safety_score,
                            safety_scanned_at = EXCLUDED.safety_scanned_at,
                            safety_flags = EXCLUDED.safety_flags,
                            last_crawled_at = NOW(),
                            updated_at = NOW()`,
                        [
                            randomUUID(),
                            facilitatorId,
                            r.canonicalRouteId,
                            r.providerBaseUrl,
                            r.routePath,
                            r.methods,
                            r.title,
                            JSON.stringify(r.pricing),
                            scanResult.riskScore,
                            scanResult.flags,
                        ]
                    )
                    result.updated++
                } catch (upsertErr: any) {
                    result.errors++
                    result.details.push(`Upsert failed for ${r.canonicalRouteId}: ${upsertErr.message}`)
                }
            }

        } catch (e: any) {
            result.errors++
            result.details.push(`Sync failed: ${e.message}`)
        }

        return result
    }
}
