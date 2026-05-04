import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getMppx, isP402MppMethod } from '@/lib/mpp/instance';

export const dynamic = 'force-dynamic';

export async function GET() {
    const start = Date.now();
    const checks: Record<string, any> = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        env: process.env.NODE_ENV
    };

    try {
        // Deep health check: Database
        const dbStart = Date.now();
        await pool.query('SELECT 1');
        checks.database = {
            status: 'healthy',
            latency_ms: Date.now() - dbStart
        };
    } catch (e: any) {
        checks.database = {
            status: 'unhealthy',
            error: e.message
        };
    }

    // mppx payment path — surface basic instance status without blocking on Redis/DB
    if (process.env.USE_MPP_METHOD === 'true') {
        const instance = getMppx();
        checks.mppx = instance
            ? { status: 'healthy', mode: isP402MppMethod() ? 'multi-rail' : 'tempo' }
            : { status: 'unhealthy', error: 'mppx instance failed to initialise — check MPP_SECRET_KEY' };
    }

    const totalLatency = Date.now() - start;
    checks.total_latency_ms = totalLatency;

    const isHealthy = Object.values(checks).every(c => typeof c !== 'object' || c.status !== 'unhealthy');

    return NextResponse.json(checks, {
        status: isHealthy ? 200 : 503
    });
}
