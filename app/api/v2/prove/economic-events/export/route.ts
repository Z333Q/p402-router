/**
 * GET /api/v2/prove/economic-events/export
 *
 * Slice 3G — Prove-lite Finance Export.
 *
 * Tenant-scoped, read-only export of ai_economic_events for finance, audit,
 * procurement, and executive review. CSV (default) or JSON. Content fields
 * (prompt, response, messages) are NEVER selected from the database — the
 * SELECT projection is an explicit allow-list of payment-grade and
 * privacy-posture fields. The route is incapable of returning content
 * regardless of the caller's privacy posture.
 *
 * Filters are pushed into SQL (one bound parameter per filter). Maximum
 * rows per call is capped at 50,000; pagination is offset-based via
 * ?limit + ?offset. Above the cap the caller must narrow the window.
 *
 * Slice 3G is NOT a runtime flip and does NOT touch budget-guard,
 * Optimize, or policy state. It only reports what the canonical ledger
 * already stores.
 */

import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { ApiError, toApiErrorResponse } from '@/lib/errors';
import { PRIVACY_MODES } from '@/lib/economic-events/types';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Hard cap. Larger exports must narrow filters or paginate. */
const MAX_LIMIT = 50_000;
const DEFAULT_LIMIT = 10_000;

/**
 * Identifier filters that the route accepts as exact-match WHERE clauses.
 * Each is bound as a single parameter; no SQL fragments are interpolated
 * from the request. Keep alphabetical for review clarity.
 */
const ID_FILTER_KEYS = [
    'api_key_id',
    'customer_id',
    'department_id',
    'employee_id',
    'feature_id',
    'workflow_id',
] as const;

/** Free-text filters bounded by length so a hostile caller cannot smuggle
 *  a megabyte of UTF-8 into a single parameter. The underlying columns are
 *  short identifiers. */
const TEXT_FILTER_KEYS = [
    'provider',
    'model',           // matches ai_economic_events.model_used
    'governance_decision',
    'deny_code',
] as const;

/**
 * Canonical export field order. Used for CSV column headers AND to drive
 * the JSON object key order. The user-facing contract is a CFO-readable
 * row, so we keep payment-grade fields (event_time, request_id, provider,
 * cost) up front and privacy/governance fields next to them.
 */
export const EXPORT_FIELDS = [
    'event_time',
    'request_id',
    'tenant_id',
    'source',
    'route',
    'provider',
    'model_used',
    'status_code',
    'success',
    'cost_usd',
    'input_tokens',
    'output_tokens',
    'total_tokens',
    'department_id',
    'employee_id',
    'api_key_id',
    'workflow_id',
    'customer_id',
    'feature_id',
    'budget_id',
    'policy_id',
    'mandate_id',
    'governance_decision',
    'deny_code',
    'privacy_mode',
    'prompt_stored',
    'response_stored',
    'redaction_applied',
    'retention_expires_at',
    'evidence_bundle_id',
    'decision_source',    // metadata->>'decision_source'
    'deny_rule',          // metadata->>'deny_rule'
] as const;

export type ExportField = typeof EXPORT_FIELDS[number];

// ─────────────────────────────────────────────────────────────────────────────
// SQL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Explicit projection. NO prompt / response / *_fingerprint columns are
 * referenced. `route` is derived from `source` so finance reviewers can
 * see "what surface produced this row" without us adding a new column.
 *
 * Returning canonical names: each output column matches a key in
 * EXPORT_FIELDS so the CSV/JSON serializers can iterate the same list.
 */
function buildSelectSql(whereClause: string, paramCount: number): string {
    const limitIdx  = paramCount + 1;
    const offsetIdx = paramCount + 2;
    return `
        SELECT
            event_time,
            request_id,
            tenant_id,
            source,
            CASE source
                WHEN 'chat_completions' THEN '/api/v2/chat/completions'
                WHEN 'meter_only'       THEN '/api/v2/meter/events'
                ELSE NULL
            END AS route,
            provider,
            model_used,
            status_code,
            success,
            cost_usd,
            input_tokens,
            output_tokens,
            total_tokens,
            department_id,
            employee_id,
            api_key_id,
            workflow_id,
            customer_id,
            feature_id,
            budget_id,
            policy_id,
            mandate_id,
            governance_decision,
            deny_code,
            privacy_mode,
            prompt_stored,
            response_stored,
            redaction_applied,
            retention_expires_at,
            evidence_bundle_id,
            (metadata ->> 'decision_source') AS decision_source,
            (metadata ->> 'deny_rule')       AS deny_rule
        FROM ai_economic_events
        WHERE ${whereClause}
        ORDER BY event_time DESC, request_id DESC
        LIMIT $${limitIdx}
        OFFSET $${offsetIdx}
    `;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV serializer (RFC 4180 — minimal, no dependencies)
// ─────────────────────────────────────────────────────────────────────────────

/** Quote a single CSV value per RFC 4180. */
function csvCell(v: unknown): string {
    if (v === null || v === undefined) return '';
    let s: string;
    if (v instanceof Date) {
        s = v.toISOString();
    } else if (typeof v === 'boolean') {
        s = v ? 'true' : 'false';
    } else {
        s = String(v);
    }
    // Quote if the cell contains commas, quotes, newlines, or carriage returns.
    if (/[",\r\n]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function rowsToCsv(rows: Array<Record<string, unknown>>): string {
    const header = EXPORT_FIELDS.join(',');
    if (rows.length === 0) {
        // CRITICAL: an empty export still returns the canonical header row
        // so downstream finance tooling never has to special-case it.
        return header + '\n';
    }
    const lines: string[] = [header];
    for (const row of rows) {
        const cells: string[] = EXPORT_FIELDS.map((f) => csvCell(row[f]));
        lines.push(cells.join(','));
    }
    return lines.join('\n') + '\n';
}

function rowToJson(row: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const f of EXPORT_FIELDS) {
        const v = row[f];
        out[f] = v instanceof Date ? v.toISOString() : v ?? null;
    }
    return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;

        const { searchParams } = new URL(req.url);

        const format = (searchParams.get('format') ?? 'csv').toLowerCase();
        if (format !== 'csv' && format !== 'json') {
            throw new ApiError({
                code: 'INVALID_INPUT',
                status: 400,
                message: `Unsupported format '${format}'. Use 'csv' or 'json'.`,
                requestId,
            });
        }

        // Pagination — capped at MAX_LIMIT to protect the DB and the caller.
        const rawLimit  = Number(searchParams.get('limit')  ?? DEFAULT_LIMIT);
        const rawOffset = Number(searchParams.get('offset') ?? 0);
        const limit  = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(rawLimit)  ? rawLimit  : DEFAULT_LIMIT));
        const offset = Math.max(0, Number.isFinite(rawOffset) ? Math.trunc(rawOffset) : 0);

        // ── WHERE construction ─────────────────────────────────────────
        // tenant_id is ALWAYS $1. Every other parameter is bound and
        // appended; no SQL fragments are built from request input.
        const where: string[] = ['tenant_id = $1'];
        const params: unknown[] = [tenantId];

        const since = searchParams.get('since');
        const until = searchParams.get('until');
        if (since) {
            const d = new Date(since);
            if (Number.isNaN(d.getTime())) {
                throw new ApiError({
                    code: 'INVALID_INPUT', status: 400,
                    message: `Invalid 'since' timestamp`, requestId,
                });
            }
            params.push(d);
            where.push(`event_time >= $${params.length}`);
        }
        if (until) {
            const d = new Date(until);
            if (Number.isNaN(d.getTime())) {
                throw new ApiError({
                    code: 'INVALID_INPUT', status: 400,
                    message: `Invalid 'until' timestamp`, requestId,
                });
            }
            params.push(d);
            where.push(`event_time <= $${params.length}`);
        }

        for (const key of ID_FILTER_KEYS) {
            const v = searchParams.get(key);
            if (v && v.length > 0 && v.length <= 256) {
                params.push(v);
                where.push(`${key} = $${params.length}`);
            }
        }

        for (const key of TEXT_FILTER_KEYS) {
            const v = searchParams.get(key);
            if (v && v.length > 0 && v.length <= 256) {
                // Map the URL `model=` filter to ai_economic_events.model_used.
                const column = key === 'model' ? 'model_used' : key;
                params.push(v);
                where.push(`${column} = $${params.length}`);
            }
        }

        const privacyMode = searchParams.get('privacy_mode');
        if (privacyMode && PRIVACY_MODES.has(privacyMode as never)) {
            params.push(privacyMode);
            where.push(`privacy_mode = $${params.length}`);
        }

        // ── Query ──────────────────────────────────────────────────────
        const sql = buildSelectSql(where.join(' AND '), params.length);
        params.push(limit, offset);

        const res = await db.query(sql, params);
        const rows = res.rows as Array<Record<string, unknown>>;

        const filename = `p402-economic-events-${new Date().toISOString().slice(0, 10)}.${format}`;

        if (format === 'json') {
            return NextResponse.json(
                {
                    ok: true,
                    count: rows.length,
                    limit,
                    offset,
                    events: rows.map(rowToJson),
                },
                {
                    headers: {
                        'X-P402-Request-ID': requestId,
                        'X-P402-Export-Count': String(rows.length),
                        'X-P402-Export-Limit': String(limit),
                    },
                },
            );
        }

        // CSV
        const csv = rowsToCsv(rows);
        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'X-P402-Request-ID': requestId,
                'X-P402-Export-Count': String(rows.length),
                'X-P402-Export-Limit': String(limit),
                // Cache-busting: every export is a fresh snapshot.
                'Cache-Control': 'no-store',
            },
        });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
