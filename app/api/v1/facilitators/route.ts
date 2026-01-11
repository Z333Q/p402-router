import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import pool from '@/lib/db'

// SSRF Protection: Check if IP is private/internal
function isPrivateIP(ip: string): boolean {
    // IPv4 private ranges
    const privateRanges = [
        /^10\./,                           // 10.0.0.0/8
        /^172\.(1[6-9]|2[0-9]|3[01])\./,   // 172.16.0.0/12
        /^192\.168\./,                     // 192.168.0.0/16
        /^127\./,                          // 127.0.0.0/8 (loopback)
        /^169\.254\./,                     // 169.254.0.0/16 (link-local)
        /^0\./,                            // 0.0.0.0/8
    ];
    return privateRanges.some(range => range.test(ip));
}

function isValidPublicUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return false

        // Block localhost explicitly
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1') return false

        // Check if hostname looks like an IP and if it is private
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) {
            if (isPrivateIP(url.hostname)) return false;
        }

        return true
    } catch (e) {
        return false
    }
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const tenantId = (session?.user as any)?.tenantId

    try {
        let query = `
            SELECT f.*, fh.status as health_status, fh.p95_settle_ms, fh.success_rate, fh.last_checked_at 
            FROM facilitators f
            LEFT JOIN facilitator_health fh ON f.facilitator_id = fh.facilitator_id
            WHERE (f.tenant_id IS NULL`
        const params: any[] = []

        if (tenantId) {
            query += " OR f.tenant_id = $1"
            params.push(tenantId)
        }

        query += ") ORDER BY f.status ASC, f.name ASC"

        const result = await pool.query(query, params)

        const facilitators = result.rows.map(row => ({
            id: row.id,
            facilitatorId: row.facilitator_id,
            name: row.name,
            type: row.type || (row.tenant_id ? 'Private' : 'Global'),
            endpoint: row.endpoint,
            networks: row.networks || [],
            status: row.status,
            health: {
                status: row.health_status || 'unknown',
                p95: row.p95_settle_ms || 0,
                successRate: row.success_rate || 0,
                lastChecked: row.last_checked_at || null
            }
        }))

        return NextResponse.json({ facilitators })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const tenantId = (session?.user as any)?.tenantId

    if (!tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const body = await req.json()

        // 1. Input Validation
        if (!body.name || typeof body.name !== 'string' || body.name.length > 50) {
            return NextResponse.json({ error: "Invalid name" }, { status: 400 })
        }

        // 2. SSRF Protection (Server-Side Request Forgery)
        if (!body.endpoint || !isValidPublicUrl(body.endpoint)) {
            return NextResponse.json({ error: "Invalid endpoint URL. Must be a public HTTP/HTTPS URL." }, { status: 400 })
        }

        // 3. Rate Limit / Quota Check (Simple Protection)
        // Prevent a user from spamming thousands of facilitators
        const countCheck = await pool.query("SELECT count(*) FROM facilitators WHERE tenant_id = $1", [tenantId])
        if (parseInt(countCheck.rows[0].count) > 20) {
            return NextResponse.json({ error: "Facilitator limit reached (20)" }, { status: 429 })
        }

        const facilitatorId = `fac_${crypto.randomUUID().slice(0, 8)}`

        await pool.query(
            `INSERT INTO facilitators 
        (facilitator_id, tenant_id, name, endpoint, networks, status, type, auth_config)
        VALUES ($1, $2, $3, $4, $5, 'active', 'Private', $6)`,
            [
                facilitatorId,
                tenantId,
                body.name,
                body.endpoint,
                body.networks || [],
                JSON.stringify(body.authConfig || {})
            ]
        )

        return NextResponse.json({ success: true, facilitatorId })
    } catch (error: any) {
        console.error("Add facilitator error occurred")
        return NextResponse.json({ error: "Failed to add facilitator" }, { status: 500 })
    }
}
