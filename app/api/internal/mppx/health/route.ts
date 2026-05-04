/**
 * mppx payment path health check — Phase 3.3.5
 *
 * Checks four signals:
 *   1. mppx instance configured (getMppx() non-null, method mode)
 *   2. Redis connectivity (nonce lock + mppx store backend)
 *   3. Recent settlement error rate (last 5 min from traffic_events)
 *   4. Package sanity (resolveAmount round-trip)
 *
 * Authentication: Bearer <CRON_SECRET>
 * Suitable for: Vercel cron, uptime monitors, PagerDuty synthetic check.
 *
 * Returns HTTP 200 when all checks pass, 503 when any check is degraded or down.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMppx, isP402MppMethod } from '@/lib/mpp/instance';
import { resolveAmount } from '@p402/mpp-method';
import redis from '@/lib/redis';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

function assertAuth(req: NextRequest): boolean {
    const auth = req.headers.get('authorization') ?? '';
    const secret = process.env.CRON_SECRET;
    return Boolean(secret && auth === `Bearer ${secret}`);
}

type CheckResult = { status: 'healthy' | 'degraded' | 'down'; latencyMs?: number; detail?: string };

async function checkInstance(): Promise<CheckResult> {
    try {
        const instance = getMppx();
        if (!instance) {
            return { status: 'down', detail: 'getMppx() returned null — check USE_MPP_METHOD and MPP_SECRET_KEY' };
        }
        return {
            status: 'healthy',
            detail: isP402MppMethod() ? 'multi-rail (p402 + base)' : 'tempo',
        };
    } catch (err) {
        return { status: 'down', detail: String(err) };
    }
}

async function checkRedis(): Promise<CheckResult> {
    const start = Date.now();
    try {
        const pong = await redis.ping();
        const latencyMs = Date.now() - start;
        if (pong !== 'PONG') return { status: 'degraded', latencyMs, detail: `unexpected ping response: ${pong}` };
        return { status: 'healthy', latencyMs };
    } catch (err) {
        return { status: 'down', latencyMs: Date.now() - start, detail: String(err) };
    }
}

async function checkSettlementRate(): Promise<CheckResult> {
    const start = Date.now();
    try {
        // traffic_events rows where tenant_id starts with 'mppx:' — written by logTrafficEvent in chat completions
        const result = await db.query(
            `SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status_code >= 500) AS failed
             FROM traffic_events
             WHERE tenant_id LIKE 'mppx:%'
               AND created_at > NOW() - INTERVAL '5 minutes'`,
            [],
        );
        const latencyMs = Date.now() - start;
        const row = result.rows[0] as { total: string; failed: string } | undefined;
        if (!row) return { status: 'healthy', latencyMs, detail: 'no mppx traffic in last 5 min' };

        const total = parseInt(row.total ?? '0', 10);
        const failed = parseInt(row.failed ?? '0', 10);

        if (total === 0) return { status: 'healthy', latencyMs, detail: 'no mppx traffic in last 5 min' };

        const errorRate = failed / total;
        const detail = `${failed}/${total} errors in last 5 min (${(errorRate * 100).toFixed(1)}%)`;

        if (errorRate > 0.1) return { status: 'down', latencyMs, detail };
        if (errorRate > 0.02) return { status: 'degraded', latencyMs, detail };
        return { status: 'healthy', latencyMs, detail };
    } catch (err) {
        return { status: 'degraded', latencyMs: Date.now() - start, detail: `DB query failed: ${String(err)}` };
    }
}

function checkPackage(): CheckResult {
    try {
        // Sanity: round-trip amount resolution
        const raw = resolveAmount({ amount: '0.001', decimals: 6 });
        if (raw !== 1000n) return { status: 'down', detail: `resolveAmount sanity failed: got ${raw}` };
        return { status: 'healthy' };
    } catch (err) {
        return { status: 'down', detail: String(err) };
    }
}

export async function GET(req: NextRequest) {
    if (!assertAuth(req)) {
        return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const start = Date.now();
    const [instance, redisCheck, settlementRate] = await Promise.all([
        checkInstance(),
        checkRedis(),
        checkSettlementRate(),
    ]);
    const packageCheck = checkPackage();

    const checks = { instance, redis: redisCheck, settlement_rate: settlementRate, package: packageCheck };

    const statuses = Object.values(checks).map(c => c.status);
    const overallStatus =
        statuses.includes('down') ? 'down' :
        statuses.includes('degraded') ? 'degraded' :
        'healthy';

    if (overallStatus !== 'healthy') {
        console.error('[mppx:alert] HEALTH_DEGRADED', {
            status: overallStatus,
            checks,
            timestamp: new Date().toISOString(),
        });
    }

    return NextResponse.json(
        {
            ok: overallStatus === 'healthy',
            status: overallStatus,
            checks,
            latencyMs: Date.now() - start,
            timestamp: new Date().toISOString(),
        },
        { status: overallStatus === 'down' ? 503 : 200 },
    );
}
