
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;

function asJson(v: any) {
    try { return JSON.parse(v) } catch { return null }
}

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

async function runPoll() {
    console.log('🔌 Connecting to DB...');
    const pool = new Pool({
        connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();

        // Fetch all active facilitators
        const res = await client.query("SELECT * FROM facilitators WHERE status = 'active'");
        console.log(`🔎 Found ${res.rows.length} active facilitators. Polling...`);

        for (const row of res.rows) {
            const fac = row;
            const caps = fac.auth_config?.capabilities || {};
            const endpoints = caps.endpoints || {};
            const baseUrl = endpoints.baseUrl || fac.endpoint;

            // Try stats path first
            const statsPath = endpoints.statsPath || "/stats";
            const targetUrl = `${baseUrl}${statsPath}`.replace(/([^:]\/)\/+/g, "$1");

            console.log(`👉 Polling ${fac.name} at ${targetUrl}...`);

            const start = Date.now();
            const result = await fetchJson(targetUrl, { "Accept": "application/json" }, 3000);
            const latency = Date.now() - start;

            let status = 'healthy';
            let p95 = 0;
            let successRate = 0;
            let details = "OK";

            if (result.ok && result.data) {
                // Parse stats if available
                p95 = Number(result.data.p95VerifyMs || result.data.p95_verify_ms || latency); // fallback to check latency
                successRate = Number(result.data.successRate || result.data.success_rate || 1.0);

                if (successRate < 0.9) status = 'down';
                else if (successRate < 0.98) status = 'degraded';
            } else {
                // If 404 or verify protected, check if we at least got a response code
                if (result.status === 404 || result.status === 401 || result.status === 403) {
                    // Endpoint exists/protected, so server is UP
                    status = 'healthy';
                    p95 = latency; // Use RTT as proxy
                    successRate = 1.0;
                    details = `Alive (${result.status})`;
                } else if (result.status >= 500 || result.status === 0) {
                    status = 'down';
                    details = `Failed (${result.status || result.text})`;
                    successRate = 0;
                } else {
                    status = 'healthy';
                    p95 = latency;
                    successRate = 1.0;
                }
            }

            console.log(`   ✅ ${status.toUpperCase()} | P95: ${p95}ms | Rate: ${successRate} | ${details}`);

            // Update DB
            await client.query(`
                INSERT INTO facilitator_health (tenant_id, facilitator_id, status, p95_verify_ms, p95_settle_ms, success_rate, last_checked_at)
                VALUES ($1, $2, $3, $4, $4, $5, NOW())
                ON CONFLICT (tenant_id, facilitator_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    p95_verify_ms = EXCLUDED.p95_verify_ms,
                    p95_settle_ms = EXCLUDED.p95_settle_ms,
                    success_rate = EXCLUDED.success_rate,
                    last_checked_at = NOW()
            `, [
                fac.tenant_id || '00000000-0000-0000-0000-000000000001',
                fac.facilitator_id,
                status,
                Math.round(p95),
                successRate
            ]);
        }

        console.log('🎉 Polling complete.');
        client.release();
    } catch (e) {
        console.error("Poll failed", e);
    } finally {
        await pool.end();
    }
}

runPoll();
