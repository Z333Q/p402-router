/**
 * Slice 3AA-Impl — read aggregator for runtime_control_shadow_decisions.
 *
 * Every query is tenant-scoped (`WHERE tenant_id = $1`). Read-only.
 * Returns empty data when the table is missing (migration_pending),
 * so the dashboard renders cleanly before the migration is applied.
 *
 * Privacy posture: metadata only. No prompt/response/messages content
 * is stored in this table, therefore none can be read out.
 */

import pool from '@/lib/db';

export const MAX_WINDOW_DAYS = 30;
export const DEFAULT_WINDOW_HOURS = 24;

export type ShadowAxis = 'monthly_budget_usd' | 'max_cost_per_request_usd' | 'allowed_models';
export type ShadowCode =
    | 'TENANT_BUDGET_EXCEEDED'
    | 'MAX_COST_PER_REQUEST_EXCEEDED'
    | 'MODEL_NOT_ALLOWED';

export interface AxisHourBucket {
    axis: ShadowAxis;
    hour: string;
    n: number;
}

export interface CodeCount {
    code: ShadowCode;
    n: number;
}

export interface GapRow {
    axis: ShadowAxis;
    code: ShadowCode;
    emitted_at: string;
    configured_value: unknown;
    observed_value: unknown;
    model_requested: string | null;
    request_id: string | null;
    ratio: number | null;
}

export interface RecentRow {
    emitted_at: string;
    axis: ShadowAxis;
    code: ShadowCode;
    configured_value: unknown;
    observed_value: unknown;
    model_requested: string | null;
    request_id: string | null;
}

export interface ShadowDecisionsSummary {
    migration_pending: boolean;
    window: { since: string; until: string };
    byAxis: AxisHourBucket[];
    byCode: CodeCount[];
    topGaps: GapRow[];
    recent: RecentRow[];
}

interface DbLike {
    query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
}

/**
 * Treat Postgres "undefined_table" (SQLSTATE 42P01) — and the same
 * condition surfaced through node-postgres error strings — as a
 * graceful "migration_pending" signal. Anything else is a real error.
 */
function isMissingRelationError(e: unknown): boolean {
    const code = (e as { code?: string } | null | undefined)?.code;
    if (code === '42P01') return true;
    const msg = e instanceof Error ? e.message : String(e ?? '');
    return /relation\s+"?runtime_control_shadow_decisions"?\s+does not exist/i.test(msg);
}

function clampWindow(since: Date | undefined, until: Date | undefined): { since: Date; until: Date } {
    const now = new Date();
    const untilD = until ?? now;
    const defaultSince = new Date(untilD.getTime() - DEFAULT_WINDOW_HOURS * 60 * 60 * 1000);
    let sinceD = since ?? defaultSince;
    const maxBack = new Date(untilD.getTime() - MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    if (sinceD < maxBack) sinceD = maxBack;
    return { since: sinceD, until: untilD };
}

export async function getShadowDecisionsByAxis(
    tenantId: string,
    since: Date,
    until: Date,
    db: DbLike = pool,
): Promise<AxisHourBucket[]> {
    const { rows } = await db.query(
        `
            SELECT axis,
                   date_trunc('hour', emitted_at) AS hour,
                   COUNT(*)::int AS n
            FROM runtime_control_shadow_decisions
            WHERE tenant_id = $1 AND emitted_at >= $2 AND emitted_at < $3
            GROUP BY axis, hour
            ORDER BY hour ASC, axis ASC
        `,
        [tenantId, since.toISOString(), until.toISOString()],
    );
    return rows.map((r) => ({
        axis: r.axis as ShadowAxis,
        hour: (r.hour as Date).toISOString(),
        n: Number(r.n),
    }));
}

export async function getShadowDecisionsByCode(
    tenantId: string,
    since: Date,
    until: Date,
    db: DbLike = pool,
): Promise<CodeCount[]> {
    const { rows } = await db.query(
        `
            SELECT code, COUNT(*)::int AS n
            FROM runtime_control_shadow_decisions
            WHERE tenant_id = $1 AND emitted_at >= $2 AND emitted_at < $3
            GROUP BY code
            ORDER BY n DESC
        `,
        [tenantId, since.toISOString(), until.toISOString()],
    );
    return rows.map((r) => ({ code: r.code as ShadowCode, n: Number(r.n) }));
}

export async function getTopGapsByAxis(
    tenantId: string,
    since: Date,
    until: Date,
    limit: number,
    db: DbLike = pool,
): Promise<GapRow[]> {
    const lim = Math.min(Math.max(1, limit), 200);
    const { rows } = await db.query(
        `
            SELECT axis, code, emitted_at,
                   configured_value, observed_value,
                   model_requested, request_id,
                   CASE
                     WHEN axis = 'max_cost_per_request_usd'
                          AND jsonb_typeof(configured_value) = 'number'
                          AND jsonb_typeof(observed_value)   = 'number'
                          AND (configured_value)::text::numeric > 0
                       THEN (observed_value)::text::numeric / (configured_value)::text::numeric
                     ELSE NULL
                   END AS ratio
            FROM runtime_control_shadow_decisions
            WHERE tenant_id = $1 AND emitted_at >= $2 AND emitted_at < $3
            ORDER BY ratio DESC NULLS LAST, emitted_at DESC
            LIMIT $4
        `,
        [tenantId, since.toISOString(), until.toISOString(), lim],
    );
    return rows.map((r) => ({
        axis: r.axis as ShadowAxis,
        code: r.code as ShadowCode,
        emitted_at: (r.emitted_at as Date).toISOString(),
        configured_value: r.configured_value,
        observed_value: r.observed_value,
        model_requested: (r.model_requested as string | null) ?? null,
        request_id: (r.request_id as string | null) ?? null,
        ratio: r.ratio === null || r.ratio === undefined ? null : Number(r.ratio),
    }));
}

export async function getRecentShadowDecisions(
    tenantId: string,
    limit: number,
    db: DbLike = pool,
): Promise<RecentRow[]> {
    const lim = Math.min(Math.max(1, limit), 500);
    const { rows } = await db.query(
        `
            SELECT emitted_at, axis, code,
                   configured_value, observed_value,
                   model_requested, request_id
            FROM runtime_control_shadow_decisions
            WHERE tenant_id = $1
            ORDER BY emitted_at DESC
            LIMIT $2
        `,
        [tenantId, lim],
    );
    return rows.map((r) => ({
        emitted_at: (r.emitted_at as Date).toISOString(),
        axis: r.axis as ShadowAxis,
        code: r.code as ShadowCode,
        configured_value: r.configured_value,
        observed_value: r.observed_value,
        model_requested: (r.model_requested as string | null) ?? null,
        request_id: (r.request_id as string | null) ?? null,
    }));
}

/**
 * One round trip for the dashboard. Tolerates missing table —
 * returns migration_pending=true and empty arrays.
 */
export async function getShadowDecisionsSummary(
    tenantId: string,
    sinceParam: Date | undefined,
    untilParam: Date | undefined,
    db: DbLike = pool,
): Promise<ShadowDecisionsSummary> {
    const { since, until } = clampWindow(sinceParam, untilParam);
    try {
        const [byAxis, byCode, topGaps, recent] = await Promise.all([
            getShadowDecisionsByAxis(tenantId, since, until, db),
            getShadowDecisionsByCode(tenantId, since, until, db),
            getTopGapsByAxis(tenantId, since, until, 20, db),
            getRecentShadowDecisions(tenantId, 100, db),
        ]);
        return {
            migration_pending: false,
            window: { since: since.toISOString(), until: until.toISOString() },
            byAxis, byCode, topGaps, recent,
        };
    } catch (e) {
        if (isMissingRelationError(e)) {
            return {
                migration_pending: true,
                window: { since: since.toISOString(), until: until.toISOString() },
                byAxis: [], byCode: [], topGaps: [], recent: [],
            };
        }
        throw e;
    }
}
