/**
 * GET /api/v2/prove/search
 *
 * Slice 3G — Prove search endpoint. Structured filters + free-text q +
 * sort + pagination over ai_economic_events. Returns metadata-only hits
 * shaped for the audit table. NO prompt or response content is selected.
 */

import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';

import { runSearch, SEARCH_DEFAULT_LIMIT } from '@/lib/prove/search';
import { SEARCH_SORT_COLUMNS, type SearchFilters, type SearchResponse, type SearchSortColumn } from '@/lib/prove/types';

export const dynamic = 'force-dynamic';

function readFilters(req: NextRequest): SearchFilters {
    const sp = new URL(req.url).searchParams;
    const f: SearchFilters = {};

    function s(k: keyof SearchFilters): void {
        const v = sp.get(k as string);
        if (v && v.length > 0) (f as Record<string, unknown>)[k] = v;
    }
    function n(k: keyof SearchFilters): void {
        const v = sp.get(k as string);
        if (v && v.length > 0) {
            const num = Number(v);
            if (Number.isFinite(num)) (f as Record<string, unknown>)[k] = num;
        }
    }

    for (const k of [
        'date_from','date_to','department_id','employee_id','api_key_id',
        'workflow_id','customer_id','feature_id','provider','model',
        'governance_decision','deny_code','privacy_mode','q',
    ] as const) s(k);

    const ev = sp.get('evidence_status');
    if (ev === 'present' || ev === 'missing' || ev === 'any') f.evidence_status = ev;

    const ok = sp.get('success');
    if (ok === 'true' || ok === 'false' || ok === 'any') f.success = ok;

    const attr = sp.get('attribution_status');
    if (attr === 'attributed' || attr === 'partial' || attr === 'unattributed' || attr === 'any') {
        f.attribution_status = attr;
    }

    for (const k of ['cost_min','cost_max','tokens_min','tokens_max'] as const) n(k);

    const sortBy = sp.get('sort_by');
    if (sortBy && (SEARCH_SORT_COLUMNS as readonly string[]).includes(sortBy)) {
        f.sort_by = sortBy as SearchSortColumn;
    }
    const sortDir = sp.get('sort_dir');
    if (sortDir === 'asc' || sortDir === 'desc') f.sort_dir = sortDir;

    n('limit');
    n('offset');
    return f;
}

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;

        const filters = readFilters(req);
        const { hits, applied, explanation } = await runSearch(db, tenantId, filters);

        const body: SearchResponse = {
            ok: true,
            generated_at: new Date().toISOString(),
            filters_applied: applied,
            explanation,
            count: hits.length,
            limit: applied.limit ?? SEARCH_DEFAULT_LIMIT,
            offset: applied.offset ?? 0,
            hits,
        };
        return NextResponse.json(body, {
            status: 200,
            headers: { 'X-P402-Request-ID': requestId, 'Cache-Control': 'no-store' },
        });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
