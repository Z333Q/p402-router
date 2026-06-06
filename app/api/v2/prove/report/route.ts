/**
 * GET /api/v2/prove/report
 *
 * Slice 3I — Executive Prove Report and Audit Packet.
 *
 * Tenant-scoped, read-only, metadata-only. Returns a board-ready
 * accountability packet over ai_economic_events for the requested
 * window + filter scope. Supports JSON (default) and CSV of the
 * appendix table via ?format=csv-appendix.
 *
 * No prompt or response content is queried, returned, or rendered.
 */

import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { ApiError, toApiErrorResponse } from '@/lib/errors';

import {
    APPENDIX_DEFAULT_LIMIT,
    APPENDIX_MAX_LIMIT,
    appendixToCsv,
    buildExecutiveSummaryText,
    fetchAppendix,
    fetchAttributionGaps,
    fetchBudgetControlEvidence,
    fetchDeniedSummary,
    fetchExecutiveSummary,
    fetchPrivacyDistribution,
    fetchProviderModel,
    fetchRanked,
    fetchTopCleanup,
    type ReportFilters,
} from '@/lib/prove/report';

export const dynamic = 'force-dynamic';

function readFilters(req: NextRequest): { filters: ReportFilters; limit: number; format: 'json' | 'csv-appendix' } {
    const sp = new URL(req.url).searchParams;
    const f: ReportFilters = {};
    const s = (k: keyof ReportFilters) => {
        const v = sp.get(k);
        if (v && v.length > 0) (f as Record<string, unknown>)[k] = v;
    };
    for (const k of ['since','until','department_id','workflow_id','customer_id','provider','model','governance_decision','deny_code','privacy_mode'] as const) s(k);

    const ev = sp.get('evidence_status');
    if (ev === 'present' || ev === 'missing') f.evidence_status = ev;
    const attr = sp.get('attribution_status');
    if (attr === 'attributed' || attr === 'partial' || attr === 'unattributed') f.attribution_status = attr;

    const lim = Number(sp.get('limit') ?? APPENDIX_DEFAULT_LIMIT);
    const limit = Math.min(APPENDIX_MAX_LIMIT, Math.max(1, Number.isFinite(lim) ? Math.trunc(lim) : APPENDIX_DEFAULT_LIMIT));

    const fmt = sp.get('format');
    const format: 'json' | 'csv-appendix' = fmt === 'csv-appendix' ? 'csv-appendix' : 'json';

    return { filters: f, limit, format };
}

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;

        const { filters, limit, format } = readFilters(req);

        const [
            executive_summary,
            by_department, by_workflow, by_provider_model,
            denied,
            budget_control,
            privacy,
            gaps,
            top_cleanup,
            appendix,
        ] = await Promise.all([
            fetchExecutiveSummary(db, tenantId, filters),
            fetchRanked(db, tenantId, filters, 'department_id', 10),
            fetchRanked(db, tenantId, filters, 'workflow_id', 10),
            fetchProviderModel(db, tenantId, filters, 10),
            fetchDeniedSummary(db, tenantId, filters, 10),
            fetchBudgetControlEvidence(db, tenantId, filters),
            fetchPrivacyDistribution(db, tenantId, filters),
            fetchAttributionGaps(db, tenantId, filters),
            fetchTopCleanup(db, tenantId, filters, 20),
            fetchAppendix(db, tenantId, filters, limit),
        ]);

        const now = new Date();
        const window = {
            since: filters.since ?? new Date(now.getTime() - 30 * 86_400_000).toISOString(),
            until: filters.until ?? now.toISOString(),
        };

        const executive_summary_text = buildExecutiveSummaryText(
            executive_summary,
            by_department,
            by_provider_model,
            denied,
            privacy,
            gaps,
            window,
        );

        // ── CSV appendix path ─────────────────────────────────────────────
        if (format === 'csv-appendix') {
            const csv = appendixToCsv(appendix);
            const filename = `p402-report-appendix-${new Date().toISOString().slice(0, 10)}.csv`;
            return new NextResponse(csv, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                    'Cache-Control': 'no-store',
                    'X-P402-Request-ID': requestId,
                    'X-P402-Report-Window-Since': window.since,
                    'X-P402-Report-Window-Until': window.until,
                },
            });
        }

        return NextResponse.json({
            ok: true,
            generated_at: now.toISOString(),
            window,
            filters_applied: filters,
            executive_summary,
            executive_summary_text,
            by_department,
            by_workflow,
            by_provider_model,
            denied,
            budget_control_evidence: budget_control,
            privacy: { distribution: privacy },
            evidence: {
                coverage_pct: executive_summary.evidence_coverage_pct,
                missing_evidence_count: executive_summary.missing_evidence_count,
            },
            attribution_gaps: gaps,
            top_cleanup,
            appendix: {
                count: appendix.length,
                limit,
                rows: appendix,
            },
        }, {
            status: 200,
            headers: { 'X-P402-Request-ID': requestId, 'Cache-Control': 'no-store' },
        });
    } catch (err) {
        if (err instanceof ApiError) return toApiErrorResponse(err, requestId);
        return toApiErrorResponse(err, requestId);
    }
}
