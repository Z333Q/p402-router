import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const tenantId = (session?.user as any)?.tenantId;

    if (!tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { resourceId } = await req.json();

        // Fetch resource details from bazaar
        const resourceResult = await pool.query(
            `SELECT * FROM bazaar_resources WHERE resource_id = $1`,
            [resourceId]
        );

        if (resourceResult.rowCount === 0) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }

        const resource = resourceResult.rows[0];

        // Create a new route in the tenant's context
        const newRouteId = `route_${resource.canonical_route_id}`;

        await pool.query("BEGIN");

        try {
            await pool.query(
                `INSERT INTO routes (route_id, tenant_id, method, path_pattern, bazaar_metadata, accepts_config)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (route_id) DO UPDATE SET
                 bazaar_metadata = EXCLUDED.bazaar_metadata,
                 accepts_config = EXCLUDED.accepts_config`,
                [
                    newRouteId,
                    tenantId,
                    resource.methods[0],
                    resource.route_path,
                    JSON.stringify({
                        title: resource.title,
                        description: resource.description,
                        source: "bazaar",
                        originalResourceId: resourceId
                    }),
                    JSON.stringify(resource.accepts || [])
                ]
            );

            // Scaffold a default policy override for this route
            // We'll update the 'pol_default' or the first policy found
            const policyResult = await pool.query(
                `SELECT * FROM policies WHERE tenant_id = $1 LIMIT 1`,
                [tenantId]
            );

            if (policyResult.rowCount && policyResult.rowCount > 0) {
                const policy = policyResult.rows[0];
                const rules = policy.rules || {};
                const overrides = rules.overrides || {};

                // Add a default budget for this imported route if it doesn't exist
                if (!overrides[newRouteId]) {
                    overrides[newRouteId] = {
                        budgets: {
                            perBuyerDailyUsd: "5.00"
                        }
                    };

                    await pool.query(
                        `UPDATE policies SET rules = $1 WHERE id = $2`,
                        [JSON.stringify({ ...rules, overrides }), policy.id]
                    );
                }
            }

            await pool.query("COMMIT");
            return NextResponse.json({ ok: true, routeId: newRouteId });
        } catch (innerError) {
            await pool.query("ROLLBACK");
            throw innerError;
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
