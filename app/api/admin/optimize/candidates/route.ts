import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdminAccess, AdminAuthError } from '@/lib/admin/auth';
import { runCandidatePipeline } from '@/lib/optimize/candidates';
import { loadProductionInput } from '@/lib/optimize/candidates/data/readOnlyLoader';
import { buildDemoFixture } from '@/lib/optimize/candidates/internal/fixtureData';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
    try {
        await requireAdminAccess('system.*');
    } catch (e) {
        if (e instanceof AdminAuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        throw e;
    }

    const url = new URL(req.url);
    const mode = (url.searchParams.get('mode') ?? 'fixture').toLowerCase();
    const tenant = url.searchParams.get('tenant') ?? '';
    const windowDaysRaw = Number(url.searchParams.get('window_days') ?? '14');
    const windowDays = Number.isFinite(windowDaysRaw) && windowDaysRaw > 0 ? Math.min(90, Math.floor(windowDaysRaw)) : 14;

    if (mode === 'production') {
        if (!UUID.test(tenant)) {
            return NextResponse.json({ error: 'mode=production requires a UUID tenant query param' }, { status: 400 });
        }
        const end = new Date();
        const start = new Date(end.getTime() - windowDays * 24 * 60 * 60 * 1000);
        const input = await loadProductionInput(db, { tenantId: tenant, windowStart: start, windowEnd: end });
        const candidates = runCandidatePipeline(input);
        return NextResponse.json({
            mode: 'production',
            tenant,
            window: input.window,
            loaded: {
                events: input.events.length,
                outcomes: input.outcomes.length,
                shadow_decisions: input.shadow_decisions.length,
                allowlist: input.allowlist.length,
            },
            total: candidates.length,
            by_type: countByType(candidates),
            candidates,
        });
    }

    const input = buildDemoFixture();
    const candidates = runCandidatePipeline(input);
    return NextResponse.json({
        mode: 'fixture',
        tenant: input.events[0]?.tenant_id ?? null,
        window: input.window,
        loaded: {
            events: input.events.length,
            outcomes: input.outcomes.length,
            shadow_decisions: input.shadow_decisions.length,
            allowlist: input.allowlist.length,
        },
        total: candidates.length,
        by_type: countByType(candidates),
        candidates,
    });
}

function countByType(candidates: { type: string }[]): Record<string, number> {
    const out: Record<string, number> = {};
    for (const c of candidates) out[c.type] = (out[c.type] ?? 0) + 1;
    return out;
}
