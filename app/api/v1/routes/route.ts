import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const tenantId = (session?.user as any)?.tenantId;

    if (!tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await pool.query(
            `SELECT * FROM routes WHERE tenant_id = $1 ORDER BY created_at DESC`,
            [tenantId]
        );
        return NextResponse.json({ routes: result.rows });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const tenantId = (session?.user as any)?.tenantId;

    if (!tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { routeId, method, pathPattern, bazaarMetadata, acceptsConfig } = body;

        // 1. Validation: Route ID format
        if (!routeId || !/^[a-z0-9-]+$/.test(routeId)) {
            return NextResponse.json({ error: "Invalid Route ID. Use alphanumeric and dashes only." }, { status: 400 });
        }

        // 2. Validation: Path Pattern
        if (!pathPattern || !pathPattern.startsWith('/')) {
            return NextResponse.json({ error: "Invalid path pattern. Must start with /" }, { status: 400 });
        }

        // 3. Real x402 Challenge Probe
        try {
            // Construct the full probe URL. 
            // Note: For production, we'd need to ensure pathPattern is relative or fully qualified appropriately.
            const probeUrl = pathPattern.startsWith('http') ? pathPattern : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${pathPattern}`;

            const probeRes = await fetch(probeUrl, {
                method: 'HEAD',
                cache: 'no-store'
            });

            const isX402 = probeRes.status === 402 &&
                (probeRes.headers.get('X-PAYMENT-CHALLENGE') || probeRes.headers.get('WWW-Authenticate')?.includes('x402'));

            if (!isX402) {
                return NextResponse.json({
                    error: `Endpoint at ${pathPattern} is not x402 compliant. Received status ${probeRes.status}. Mandatory headers missing.`
                }, { status: 400 });
            }
        } catch (e: any) {
            return NextResponse.json({ error: `Verification failed: Could not reach endpoint ${pathPattern}. ${e.message}` }, { status: 400 });
        }


        // 4. Default accepts if missing
        const finalAccepts = acceptsConfig || [
            {
                network: "eip155:8453",
                asset: "USDC",
                scheme: "exact"
            }
        ];

        // 5. Upsert into routes
        await pool.query(
            `INSERT INTO routes (route_id, tenant_id, method, path_pattern, bazaar_metadata, accepts_config)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (route_id) DO UPDATE SET
       method = EXCLUDED.method,
       path_pattern = EXCLUDED.path_pattern,
       bazaar_metadata = EXCLUDED.bazaar_metadata,
       accepts_config = EXCLUDED.accepts_config`,
            [
                routeId,
                tenantId,
                method,
                pathPattern,
                JSON.stringify(bazaarMetadata || {}),
                JSON.stringify(finalAccepts)
            ]
        );

        return NextResponse.json({ ok: true, routeId });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
