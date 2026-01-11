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

        const stats = { total: facilitatorsToSync.length, results: [] as any[] }

        for (const fid of facilitatorsToSync) {
            const res = await BazaarIngest.syncFromFacilitator(fid)
            stats.results.push({ facilitatorId: fid, res })
        }

        return NextResponse.json(stats)
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
