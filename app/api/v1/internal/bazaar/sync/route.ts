import { NextRequest, NextResponse } from 'next/server'
import { BazaarIngest } from '@/lib/bazaar/ingest'
import pool from '@/lib/db'

// Internal endpoint meant to be triggered by cron or admins
export async function POST(req: NextRequest) {
    // In production, verify internal secret or admin session
    // const authHeader = req.headers.get('authorization')
    // if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) return NextResponse.json({}, {status: 401})

    try {
        const { facilitatorId } = await req.json()

        let facilitatorsToSync: string[] = []
        if (facilitatorId) {
            facilitatorsToSync = [facilitatorId]
        } else {
            const res = await pool.query("SELECT facilitator_id FROM facilitators WHERE status = 'active'")
            facilitatorsToSync = res.rows.map(r => r.facilitator_id)
        }

        const stats = { total: facilitatorsToSync.length, results: [] as any[], skipped: [] as string[] }

        for (const fid of facilitatorsToSync) {
            // Publisher identity gate: skip unverified facilitators when SAFETY_REQUIRE_IDENTITY is enabled
            if (process.env.SAFETY_REQUIRE_IDENTITY === 'true') {
                const identityCheck = await pool.query(
                    'SELECT erc8004_verified FROM facilitators WHERE facilitator_id = $1',
                    [fid]
                );
                const isVerified = identityCheck.rows[0]?.erc8004_verified === true;

                if (!isVerified) {
                    console.warn(`[BazaarSync] Skipping unverified facilitator ${fid} (SAFETY_REQUIRE_IDENTITY=true)`);
                    stats.skipped.push(fid);
                    continue;
                }
            }

            const res = await BazaarIngest.syncFromFacilitator(fid)
            stats.results.push({ facilitatorId: fid, res })
        }

        return NextResponse.json(stats)
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
