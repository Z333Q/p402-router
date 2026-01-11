// app/api/internal/poll/facilitators/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

function authOrThrow(req: NextRequest) {
    const want = process.env.POLL_SECRET || "";
    const got = req.headers.get("authorization") || "";
    // In development, if POLL_SECRET is not set, we might allow it, but let's be strict.
    const ok = want.length > 5 && got === `Bearer ${want}`;

    // For local testing if no secret is set
    if (!ok && process.env.NODE_ENV === 'development') {
        return;
    }

    if (!ok) throw new Error("UNAUTHORIZED");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

async function fetchBatch(client: any, batchSize: number, offset: number) {
    const r = await client.query(
        `
    SELECT facilitator_id, tenant_id, endpoint, auth_config
    FROM facilitators
    WHERE status = 'active'
    ORDER BY facilitator_id
    LIMIT $1 OFFSET $2
    `,
        [batchSize, offset],
    );
    return r.rows as Array<{
        facilitator_id: string;
        tenant_id: string | null;
        endpoint: string;
        auth_config: any;
    }>;
}

async function probeOne(f: { endpoint: string }, timeoutMs: number) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    const started = Date.now();
    try {
        // Attempt to fetch health
        const res = await fetch(`${f.endpoint}/health`, {
            signal: ctrl.signal,
            cache: "no-store",
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        const ms = Date.now() - started;
        clearTimeout(t);

        if (!res.ok) return { status: "degraded", last_verify_ms: ms, success: false, details: { http: res.status } };
        return { status: "healthy", last_verify_ms: ms, success: true, details: {} };
    } catch (e: any) {
        clearTimeout(t);
        return { status: "down", last_verify_ms: null, success: false, details: { error: "timeout_or_network" } };
    }
}

export async function POST(req: NextRequest) {
    try {
        authOrThrow(req);

        const body = await req.json().catch(() => ({}));
        const batchSize = Math.max(1, Math.min(50, Number(body.batchSize || 10)));
        const timeoutMs = Math.max(250, Math.min(8000, Number(body.timeoutMs || 4000)));

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            const curRow = await client.query(
                `SELECT cursor FROM job_cursors WHERE job_name = 'poll_facilitators' FOR UPDATE`,
            );

            const offset = (curRow.rowCount && curRow.rows[0].cursor) ? Number(curRow.rows[0].cursor.offset || 0) : 0;

            const batch = await fetchBatch(client, batchSize, offset);

            const results = [];
            for (const f of batch) {
                const probe = await probeOne({ endpoint: f.endpoint }, timeoutMs);

                await client.query(
                    `
          INSERT INTO facilitator_health (
            facilitator_id, tenant_id, status, p95_verify_ms, p95_settle_ms, success_rate, raw, last_checked_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb, now())
          ON CONFLICT ON CONSTRAINT facilitator_health_pkey DO UPDATE
          SET status = EXCLUDED.status,
              p95_verify_ms = EXCLUDED.p95_verify_ms,
              raw = EXCLUDED.raw,
              last_checked_at = now()
          `,
                    [
                        f.facilitator_id,
                        f.tenant_id,
                        probe.status,
                        probe.last_verify_ms,
                        null,
                        probe.success ? 1 : 0,
                        JSON.stringify(probe.details),
                    ],
                );

                results.push({ facilitatorId: f.facilitator_id, status: probe.status, ms: probe.last_verify_ms });
            }

            const nextOffset = batch.length < batchSize ? 0 : offset + batchSize;

            await client.query(
                `
        INSERT INTO job_cursors (job_name, cursor, updated_at)
        VALUES ('poll_facilitators', $1::jsonb, now())
        ON CONFLICT (job_name) DO UPDATE
        SET cursor = EXCLUDED.cursor,
            updated_at = now()
        `,
                [JSON.stringify({ offset: nextOffset })],
            );

            await client.query("COMMIT");

            return NextResponse.json({
                ok: true,
                processed: results.length,
                nextOffset,
                results,
            });
        } catch (e) {
            await client.query("ROLLBACK");
            throw e;
        } finally {
            client.release();
        }
    } catch (e: any) {
        const code = e?.message === "UNAUTHORIZED" ? 401 : 500;
        return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: code });
    }
}
