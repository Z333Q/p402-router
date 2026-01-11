import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        // Fetch all routes that are intended for the Bazaar
        const result = await pool.query(`
      SELECT route_id, method, path_pattern, bazaar_metadata, accepts_config
      FROM routes
      WHERE bazaar_metadata IS NOT NULL 
        AND (bazaar_metadata->>'title') IS NOT NULL
      ORDER BY created_at DESC
    `);

        const resources = result.rows.map(row => {
            const meta = row.bazaar_metadata || {};
            return {
                routeId: row.route_id,
                title: meta.title || "Untitled Service",
                description: meta.description || "",
                methods: [row.method],
                routePath: row.path_pattern,
                tags: meta.tags || [],
                pricing: meta.pricing || {
                    amount: "0.01",
                    asset: "USDC",
                    network: "eip155:8453"
                },
                accepts: row.accepts_config || []
            };
        });

        return NextResponse.json({
            facilitatorId: "p402-local", // Self-reference for now
            resources
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
