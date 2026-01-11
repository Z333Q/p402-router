import pool from '@/lib/db'
import { randomUUID } from 'crypto'
import { BazaarResource, IngestionResult } from './types'

export class BazaarIngest {
    static async syncFromFacilitator(facilitatorId: string): Promise<IngestionResult> {
        const result: IngestionResult = { added: 0, updated: 0, errors: 0, details: [] }

        try {
            // 1. Get facilitator endpoint
            const res = await pool.query("SELECT endpoint, networks FROM facilitators WHERE facilitator_id = $1", [facilitatorId])
            if (res.rows.length === 0) throw new Error("Facilitator not found")

            const { endpoint } = res.rows[0]

            // 2. Fetch discovery resources
            // Real implementation would fetch from `${endpoint}/discovery/resources`
            // For now, mock the fetch
            const fetchedResources: Partial<BazaarResource>[] = [
                {
                    canonicalRouteId: 'rt_mock_gpt4',
                    title: 'GPT-4 Inference (Mock)',
                    routePath: '/v1/chat/completions',
                    methods: ['POST'],
                    providerBaseUrl: endpoint,
                    pricing: { model: 'usage_based', unit: 'USD', amount: '0.03' }
                }
            ]

            // 3. Upsert into DB
            for (const r of fetchedResources) {
                try {
                    await pool.query(
                        `INSERT INTO bazaar_resources (
                            resource_id, source_facilitator_id, canonical_route_id, provider_base_url, 
                            route_path, methods, title, pricing, last_crawled_at, updated_at
                         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
                         ON CONFLICT (source_facilitator_id, canonical_route_id) 
                         DO UPDATE SET 
                            provider_base_url = EXCLUDED.provider_base_url,
                            title = EXCLUDED.title,
                            pricing = EXCLUDED.pricing,
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
                            JSON.stringify(r.pricing)
                        ]
                    )
                    result.updated++ // Simplified for stats
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
