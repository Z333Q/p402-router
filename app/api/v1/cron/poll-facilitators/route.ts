
import { NextResponse } from "next/server"
import pool from "@/lib/db"

export const runtime = "nodejs"

// Minimal typed JSON parser that returns null on failure
function asJson(v: any) {
    try { return JSON.parse(v) } catch { return null }
}

// Robust fetch with timeout
async function fetchJson(url: string, headers: Record<string, string>, timeoutMs: number) {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const res = await fetch(url, { headers, signal: controller.signal })
        const text = await res.text()
        const data = asJson(text)
        return { ok: res.ok, status: res.status, data, text }
    } catch (e: any) {
        return { ok: false, status: 0, data: null, text: e.message }
    } finally {
        clearTimeout(t)
    }
}

export async function POST(req: Request) {
    // 1. Auth check
    const secret = req.headers.get("x-cron-secret") || ""
    const auth = req.headers.get("authorization") || ""
    const expected = `Bearer ${process.env.CRON_SECRET}`

    // In strict prod this should check process.env.CRON_SECRET
    // We allow if CRON_SECRET is not set (dev) OR if either method matches
    if (process.env.CRON_SECRET) {
        if (secret !== process.env.CRON_SECRET && auth !== expected) {
            return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 })
        }
    }

    // 2. Batch Selection
    const max = Number(process.env.POLL_BATCH_SIZE || "6")
    // Select active facilitators, ordered by oldest check
    const rows = await pool.query(`
        SELECT facilitator_id, tenant_id, endpoint, auth_config
        FROM facilitators
        WHERE status = 'active'
        ORDER BY COALESCE((auth_config->'capabilities'->'health'->>'lastCheckedAt')::timestamptz, '1970-01-01') ASC
        LIMIT $1
    `, [max])

    const results: any[] = []

    // 3. Process Batch
    for (const r of rows.rows) {
        const facilitatorId = r.facilitator_id
        const endpoint = r.endpoint
        const authConfig = r.auth_config || {}
        const caps = authConfig.capabilities || {}
        const endpoints = caps.endpoints || {}

        // Determine critical paths
        const baseUrl = endpoints.baseUrl || endpoint
        // Fallback defaults
        const supportedPath = endpoints.supportedPath || "/supported"
        const statsPath = endpoints.statsPath || "/stats"

        // Prepare Headers
        const authMode = (caps.auth && caps.auth.mode) || "none"
        const tokenEnv = (caps.auth && caps.auth.tokenEnv) || ""
        const headerName = (caps.auth && caps.auth.headerName) || "Authorization"

        const headers: Record<string, string> = { "Accept": "application/json" }
        if (authMode === "bearer" && tokenEnv && process.env[tokenEnv]) {
            headers[headerName] = `Bearer ${process.env[tokenEnv]}`
        }

        // --- Polling Logic ---
        let status = "healthy"
        let p95VerifyMs = 0
        let p95SettleMs = 0
        let successRate = 0
        let lastError: any = null
        let discoveredNetworks: any[] | null = null

        try {
            // A. Capability/Network Discovery (Optional)
            if (supportedPath) {
                const supportedUrl = `${baseUrl}${supportedPath}`.replace(/([^:]\/)\/+/g, "$1") // simplistic normalization
                const supportedRes = await fetchJson(supportedUrl, headers, 2500)
                if (supportedRes.ok && supportedRes.data) {
                    discoveredNetworks = supportedRes.data.networks || supportedRes.data.supported || null
                }
            }

            // B. Health/Stats Check (Primary)
            if (statsPath) {
                const statsUrl = `${baseUrl}${statsPath}`.replace(/([^:]\/)\/+/g, "$1")
                const statsRes = await fetchJson(statsUrl, headers, 2500)

                if (statsRes.ok && statsRes.data) {
                    p95VerifyMs = Number(statsRes.data.p95VerifyMs || statsRes.data.p95_verify_ms || 0)
                    p95SettleMs = Number(statsRes.data.p95SettleMs || statsRes.data.p95_settle_ms || 0)
                    successRate = Number(statsRes.data.successRate || statsRes.data.success_rate || 0)
                } else {
                    // If stats missing, fallback to simple /health if available? 
                    // For now, if stats fails, we assume degradation if we expected it to work.
                    // But many seeds might rely on purely static config until they implement stats.
                    // We will mark "healthy" if no explicit error, but 0 latency.
                }
            }

            // C. Scoring
            if (successRate > 0 && successRate < 0.98) status = "degraded"
            if (successRate > 0 && successRate < 0.90) status = "down"

        } catch (e: any) {
            status = "down"
            lastError = { code: "POLL_FAILED", message: String(e?.message || e), at: new Date().toISOString() }
        }

        // 4. Update Database
        const nextAuthConfig = {
            ...authConfig,
            capabilities: {
                ...caps,
                // Update specific fields
                networks: discoveredNetworks && Array.isArray(discoveredNetworks) ? discoveredNetworks : (caps.networks || []),
                health: {
                    status,
                    successRate,
                    p95VerifyMs,
                    p95SettleMs,
                    lastCheckedAt: new Date().toISOString(),
                    lastError
                }
            }
        }

        await pool.query(`UPDATE facilitators SET auth_config = $2::jsonb WHERE facilitator_id = $1`, [facilitatorId, JSON.stringify(nextAuthConfig)])

        // Also write to history table
        await pool.query(`
            INSERT INTO facilitator_health (tenant_id, facilitator_id, status, p95_verify_ms, p95_settle_ms, success_rate, last_checked_at, last_error, raw)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)
            ON CONFLICT (facilitator_id) DO UPDATE SET
                status = EXCLUDED.status,
                p95_verify_ms = EXCLUDED.p95_verify_ms,
                p95_settle_ms = EXCLUDED.p95_settle_ms,
                success_rate = EXCLUDED.success_rate,
                last_checked_at = EXCLUDED.last_checked_at,
                last_error = EXCLUDED.last_error
        `, [
            r.tenant_id || '00000000-0000-0000-0000-000000000001', // Fallback if query didn't return tenant_id (it should now)
            facilitatorId,
            status,
            p95VerifyMs,
            p95SettleMs,
            successRate,
            lastError ? JSON.stringify(lastError) : null,
            null
        ])

        results.push({ facilitatorId, status, p95VerifyMs })
    }

    return NextResponse.json({ ok: true, polled: results.length, results })
}
