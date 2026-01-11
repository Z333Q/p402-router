import { NextResponse } from "next/server";
import { Client } from "pg";
import Redis from "ioredis";

const redis = new Redis(process.env.UPSTASH_REDIS_URL || "");

/**
 * Bazaar Discovery Sync Cron
 * -------------------------
 * Pulls /discovery/resources from all facilitators configured as discovery sources.
 * Aligned with x402 discovery metadata contract.
 */

function assertCronAuth(req: Request) {
    const auth = req.headers.get("authorization") || "";
    const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
    if (!process.env.CRON_SECRET || auth !== expected) {
        return false;
    }
    return true;
}

export async function GET(req: Request) {
    if (!assertCronAuth(req)) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        // Find facilitators that are discovery sources
        const q = `
            SELECT facilitator_id, endpoint, auth_config 
            FROM facilitators 
            WHERE status = 'active' AND type = 'discovery_source'
        `;
        const { rows: sources } = await client.query(q);

        const summary: any[] = [];

        for (const source of sources) {
            const cfg = source.auth_config || {};
            const path = cfg.discoveryPath || "/discovery/resources";
            const url = `${source.endpoint.replace(/\/$/, '')}${path}`;

            try {
                const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const data = await res.json();
                const resources = Array.isArray(data) ? data : data.resources || [];

                let imported = 0;
                for (const r of resources) {
                    // Validation per x402 resource contract
                    if (!r.resource_id || !r.provider_base_url || !r.route_path) continue;

                    const upsertQ = `
                        INSERT INTO bazaar_resources (
                            resource_id, source_facilitator_id, canonical_route_id, 
                            provider_base_url, route_path, methods, title, description,
                            tags, pricing, accepts, input_schema, output_schema, 
                            updated_at, last_crawled_at, rank_score
                        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW(),$14)
                        ON CONFLICT (source_facilitator_id, canonical_route_id) DO UPDATE SET
                            resource_id = EXCLUDED.resource_id,
                            provider_base_url = EXCLUDED.provider_base_url,
                            route_path = EXCLUDED.route_path,
                            methods = EXCLUDED.methods,
                            title = EXCLUDED.title,
                            description = EXCLUDED.description,
                            tags = EXCLUDED.tags,
                            pricing = EXCLUDED.pricing,
                            accepts = EXCLUDED.accepts,
                            updated_at = NOW(),
                            last_crawled_at = NOW(),
                            rank_score = EXCLUDED.rank_score
                    `;

                    // Basic ranking: boost if it has price info
                    const rank = r.pricing ? 1.0 : 0.5;

                    await client.query(upsertQ, [
                        r.resource_id,
                        source.facilitator_id,
                        r.resource_id, // Using resource_id as canonical route id for now
                        r.provider_base_url,
                        r.route_path,
                        r.methods || ['GET'],
                        r.title || r.resource_id,
                        r.description || "",
                        r.tags || [],
                        JSON.stringify(r.pricing || {}),
                        JSON.stringify(r.accepts || []),
                        JSON.stringify(r.input_schema || {}),
                        JSON.stringify(r.output_schema || {}),
                        rank
                    ]);
                    imported++;
                }
                summary.push({ source: source.facilitator_id, imported });
            } catch (e: any) {
                console.error(`Sync failed for ${source.facilitator_id}:`, e.message);
                summary.push({ source: source.facilitator_id, error: e.message });
            }
        }

        return NextResponse.json({ ok: true, summary });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    } finally {
        await client.end();
    }
}
