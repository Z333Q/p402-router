import { NextResponse } from "next/server";
import { Client } from "pg";
import Redis from "ioredis";

// Reuse existing Redis connection logic if possible, or initialize here
const redis = new Redis(process.env.UPSTASH_REDIS_URL || "");

/**
 * Facilitator Health Polling Cron
 * ------------------------------
 * Probes all active/inactive facilitators for health signals.
 * Runs on a schedule via Vercel Crons.
 */

function assertCronAuth(req: Request) {
    const auth = req.headers.get("authorization") || "";
    const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
    if (!process.env.CRON_SECRET || auth !== expected) {
        return false;
    }
    return true;
}

type HealthRow = {
    tenant_id: string;
    facilitator_id: string;
    status: "healthy" | "degraded" | "down";
    p95_verify_ms: number | null;
    p95_settle_ms: number | null;
    success_rate: number | null;
    last_error: string | null;
    raw: any;
};

async function upsertHealth(client: Client, row: HealthRow) {
    const q = `
        INSERT INTO facilitator_health (
            tenant_id, facilitator_id, status, p95_verify_ms, p95_settle_ms, 
            success_rate, last_checked_at, last_error, raw
        ) VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,$8)
        ON CONFLICT (facilitator_id) DO UPDATE 
        SET status = EXCLUDED.status,
            p95_verify_ms = EXCLUDED.p95_verify_ms,
            p95_settle_ms = EXCLUDED.p95_settle_ms,
            success_rate = EXCLUDED.success_rate,
            last_checked_at = NOW(),
            last_error = EXCLUDED.last_error,
            raw = EXCLUDED.raw
    `;
    await client.query(q, [
        row.tenant_id,
        row.facilitator_id,
        row.status,
        row.p95_verify_ms,
        row.p95_settle_ms,
        row.success_rate,
        row.last_error,
        JSON.stringify(row.raw || {})
    ]);
}

async function probeHttp(endpoint: string, timeoutMs: number) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    const started = Date.now();
    try {
        const res = await fetch(endpoint, {
            method: "GET",
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        const ms = Date.now() - started;
        clearTimeout(t);
        return { ok: res.ok, status: res.status, ms };
    } catch (e: any) {
        clearTimeout(t);
        return { ok: false, status: 0, ms: null, error: String(e?.message || e) };
    }
}

export async function GET(req: Request) {
    if (!assertCronAuth(req)) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        const batchSize = 2;
        const cursorKey = "cron:fac_health:cursor";
        const cursorRaw = await redis.get(cursorKey);
        const offset = Number(cursorRaw || "0");

        // Fetch facilitators in batches
        const q = `
            SELECT tenant_id, facilitator_id, endpoint, auth_config, status 
            FROM facilitators 
            WHERE status IN ('active','inactive') 
            ORDER BY facilitator_id ASC 
            LIMIT $1 OFFSET $2
        `;
        const { rows } = await client.query(q, [batchSize, offset]);

        if (rows.length === 0 && offset > 0) {
            // Reset cursor if we've reached the end
            await redis.set(cursorKey, "0");
            return NextResponse.json({ ok: true, batch: [], message: "Cursor reset" });
        }

        const results: any[] = [];
        for (const f of rows) {
            const cfg = f.auth_config || {};
            const mode = cfg.mode || "http";
            const timeoutMs = cfg.timeoutMs || 2500;

            let health: any = { mode };

            if (mode === "direct_onchain") {
                // Check if RPC is configured in env
                const rpcOk = Boolean(process.env[cfg.rpcEnvVar || ""]);
                health = {
                    ok: rpcOk,
                    ms: 0,
                    error: rpcOk ? null : `Missing ${cfg.rpcEnvVar} env var`
                };
            } else if (f.endpoint.startsWith("http")) {
                const url = cfg.healthPath
                    ? `${f.endpoint.replace(/\/$/, '')}${cfg.healthPath}`
                    : f.endpoint;
                health = await probeHttp(url, timeoutMs);
            } else {
                health = { ok: false, error: "Invalid endpoint type" };
            }

            const status: "healthy" | "degraded" | "down" = health.ok ? "healthy" : "down";

            await upsertHealth(client, {
                tenant_id: f.tenant_id,
                facilitator_id: f.facilitator_id,
                status,
                p95_verify_ms: null, // P95 would come from aggregated logs later
                p95_settle_ms: null,
                success_rate: health.ok ? 1.0 : 0.0,
                last_error: health.ok ? null : String(health.error || `HTTP ${health.status}`),
                raw: health
            });

            results.push({ facilitator_id: f.facilitator_id, status });
        }

        // Update cursor
        const nextOffset = offset + rows.length;
        await redis.set(cursorKey, String(nextOffset));

        return NextResponse.json({ ok: true, batch: results, nextOffset });
    } catch (e: any) {
        console.error("Health cron failed:", e);
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    } finally {
        await client.end();
    }
}
