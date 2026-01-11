// app/api/internal/poll/bazaar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

function authOrThrow(req: NextRequest) {
    const want = process.env.POLL_SECRET || "";
    const got = req.headers.get("authorization") || "";
    const ok = want.length > 5 && got === `Bearer ${want}`;

    if (!ok && process.env.NODE_ENV === 'development') return;
    if (!ok) throw new Error("UNAUTHORIZED");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

async function fetchFacilitators(client: any) {
    // We fetch facilitators that are active and might have a bazaar.json
    const r = await client.query(
        `SELECT facilitator_id, endpoint FROM facilitators WHERE status = 'active'`
    );
    return r.rows;
}

export async function POST(req: NextRequest) {
    try {
        authOrThrow(req);

        const client = await pool.connect();
        try {
            const facilitators = await fetchFacilitators(client);
            let totalSynced = 0;

            for (const f of facilitators) {
                try {
                    // Attempt to fetch bazaar listing
                    // Following suggestion: /.well-known/p402/bazaar.json
                    // We'll also try the endpoint itself if it's a discovery-first endpoint
                    const discoveryUrl = `${f.endpoint.replace(/\/$/, '')}/.well-known/p402/bazaar.json`;

                    const res = await fetch(discoveryUrl, {
                        cache: "no-store",
                        headers: { 'Accept': 'application/json' }
                    });

                    if (!res.ok) continue;

                    const data = await res.json();
                    if (!data.resources || !Array.isArray(data.resources)) continue;

                    for (const resource of data.resources) {
                        const resourceId = `${f.facilitator_id}:${resource.routeId}`;

                        await client.query(
                            `
              INSERT INTO bazaar_resources (
                resource_id, source_facilitator_id, canonical_route_id, 
                provider_base_url, route_path, methods, title, description, 
                tags, pricing, accepts, updated_at, last_crawled_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), now())
              ON CONFLICT (resource_id) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                tags = EXCLUDED.tags,
                pricing = EXCLUDED.pricing,
                accepts = EXCLUDED.accepts,
                updated_at = now(),
                last_crawled_at = now()
              `,
                            [
                                resourceId,
                                f.facilitator_id,
                                resource.routeId,
                                data.provider?.website || f.endpoint,
                                resource.path,
                                [resource.method], // Wrap in array
                                resource.title,
                                resource.description,
                                resource.tags || [],
                                JSON.stringify(resource.pricing),
                                JSON.stringify(resource.payment ? [resource.payment] : []),
                            ]
                        );
                        totalSynced++;
                    }
                } catch (err) {
                    console.error(`Failed to sync from facilitator ${f.facilitator_id}:`, err);
                }
            }

            return NextResponse.json({ ok: true, synced: totalSynced });
        } finally {
            client.release();
        }
    } catch (e: any) {
        const code = e?.message === "UNAUTHORIZED" ? 401 : 500;
        return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: code });
    }
}
