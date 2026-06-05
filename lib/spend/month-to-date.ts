// Slice 3C — shared month-to-date spend service.
//
// Single source of truth for "how much has this scope spent this calendar
// month UTC". Three modes:
//
//   'ai_economic_events' — V5 canonical economic ledger. Used by Control
//                          dashboard + simulator for visibility.
//   'traffic_events'     — legacy hot-path table. Used by runtime budget
//                          enforcement (budget-guard).
//   'reconciled'         — runs both, returns primary (economic events),
//                          legacy (traffic events), and delta. Default.
//
// In reconciled mode, `enforcement` is intentionally set to the LEGACY
// buckets. Runtime cap checks must not flip to ai_economic_events until
// write coverage is proven (Slice 3D gate). The delta is the proof surface.
//
// Tenant scope is mandatory and always applied as `tenant_id = $1`.

export type SpendSource = 'ai_economic_events' | 'traffic_events' | 'reconciled';

export interface SpendScope {
    tenantId: string;
    apiKeyId?: string | null;
    employeeId?: string | null;
    departmentId?: string | null;
}

export interface SpendBuckets {
    keySpendUsd: number;
    employeeSpendUsd: number;
    departmentSpendUsd: number;
}

export interface SingleSourceSpendResult extends SpendBuckets {
    source: 'ai_economic_events' | 'traffic_events';
}

export interface ReconciledSpendResult {
    source: 'reconciled';
    /** V5 canonical, used by Control dashboard + simulator for visibility. */
    primary: SpendBuckets & { source: 'ai_economic_events' };
    /** Legacy, used by runtime cap checks until Slice 3D flip gate. */
    legacy: SpendBuckets & { source: 'traffic_events' };
    /** primary − legacy. Positive = primary higher than legacy. */
    delta: SpendBuckets;
    /** Buckets that runtime cap checks MUST compare against. Equals legacy
     *  in Slice 3C — do not change without the flip-gate review. */
    enforcement: SpendBuckets;
}

export type SpendResult = SingleSourceSpendResult | ReconciledSpendResult;

export interface SpendQueryable {
    query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

function startOfMonthUtc(now: Date): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function num(x: unknown): number {
    return Number(x ?? 0);
}

/**
 * Resolve which source to use. Explicit `opts.source` wins; otherwise env
 * BUDGET_GUARD_SPEND_SOURCE; otherwise 'reconciled'.
 */
export function resolveSpendSource(explicit?: SpendSource): SpendSource {
    if (explicit) return explicit;
    const env = process.env.BUDGET_GUARD_SPEND_SOURCE;
    if (env === 'ai_economic_events' || env === 'traffic_events' || env === 'reconciled') {
        return env;
    }
    return 'reconciled';
}

async function queryAiEconomicEvents(
    pool: SpendQueryable,
    scope: SpendScope,
    monthStart: Date,
): Promise<SpendBuckets> {
    // Attribution reads the direct columns on the event row (api_key_id,
    // employee_id, department_id) — matches lib/economic-events/writer.ts.
    // Success filter: status_code IS NULL OR status_code = 200. The events
    // table allows NULL status_code for write paths that don't carry it.
    const res = await pool.query(
        `SELECT
            COALESCE(SUM(cost_usd) FILTER (WHERE api_key_id    = $2), 0)::float AS key_spend,
            COALESCE(SUM(cost_usd) FILTER (WHERE employee_id   = $3), 0)::float AS employee_spend,
            COALESCE(SUM(cost_usd) FILTER (WHERE department_id = $4), 0)::float AS department_spend
         FROM ai_economic_events
         WHERE tenant_id = $1
           AND (status_code IS NULL OR status_code = 200)
           AND event_time >= $5`,
        [scope.tenantId, scope.apiKeyId ?? null, scope.employeeId ?? null, scope.departmentId ?? null, monthStart],
    );
    const row = res.rows[0] ?? {};
    return {
        keySpendUsd:        num(row.key_spend),
        employeeSpendUsd:   num(row.employee_spend),
        departmentSpendUsd: num(row.department_spend),
    };
}

async function queryTrafficEvents(
    pool: SpendQueryable,
    scope: SpendScope,
    monthStart: Date,
): Promise<SpendBuckets> {
    const res = await pool.query(
        `SELECT
            COALESCE(SUM(cost_usd) FILTER (WHERE api_key_id    = $2), 0)::float AS key_spend,
            COALESCE(SUM(cost_usd) FILTER (WHERE employee_id   = $3), 0)::float AS employee_spend,
            COALESCE(SUM(cost_usd) FILTER (WHERE department_id = $4), 0)::float AS department_spend
         FROM traffic_events
         WHERE tenant_id = $1
           AND status_code = 200
           AND created_at >= $5`,
        [scope.tenantId, scope.apiKeyId ?? null, scope.employeeId ?? null, scope.departmentId ?? null, monthStart],
    );
    const row = res.rows[0] ?? {};
    return {
        keySpendUsd:        num(row.key_spend),
        employeeSpendUsd:   num(row.employee_spend),
        departmentSpendUsd: num(row.department_spend),
    };
}

export async function getMonthToDateSpend(
    pool: SpendQueryable,
    scope: SpendScope,
    opts?: { now?: Date; source?: SpendSource },
): Promise<SpendResult> {
    const now = opts?.now ?? new Date();
    const source = resolveSpendSource(opts?.source);
    const monthStart = startOfMonthUtc(now);

    if (source === 'ai_economic_events') {
        const b = await queryAiEconomicEvents(pool, scope, monthStart);
        return { ...b, source: 'ai_economic_events' };
    }
    if (source === 'traffic_events') {
        const b = await queryTrafficEvents(pool, scope, monthStart);
        return { ...b, source: 'traffic_events' };
    }

    // reconciled
    const [primary, legacy] = await Promise.all([
        queryAiEconomicEvents(pool, scope, monthStart),
        queryTrafficEvents(pool, scope, monthStart),
    ]);
    return {
        source: 'reconciled',
        primary: { ...primary, source: 'ai_economic_events' },
        legacy:  { ...legacy,  source: 'traffic_events'    },
        delta: {
            keySpendUsd:        primary.keySpendUsd        - legacy.keySpendUsd,
            employeeSpendUsd:   primary.employeeSpendUsd   - legacy.employeeSpendUsd,
            departmentSpendUsd: primary.departmentSpendUsd - legacy.departmentSpendUsd,
        },
        // Slice 3C invariant: enforcement = legacy. Do not change without
        // the Slice 3D flip-gate review.
        enforcement: legacy,
    };
}

/**
 * Extract enforcement-authoritative buckets from any SpendResult. Helper for
 * runtime cap checks that don't care which source produced the number.
 */
export function enforcementBuckets(r: SpendResult): SpendBuckets {
    const b = r.source === 'reconciled' ? r.enforcement : r;
    return { keySpendUsd: b.keySpendUsd, employeeSpendUsd: b.employeeSpendUsd, departmentSpendUsd: b.departmentSpendUsd };
}

/**
 * Extract visibility/primary buckets (dashboard, simulator). Helper for
 * read paths that prefer the V5 canonical source.
 */
export function primaryBuckets(r: SpendResult): SpendBuckets {
    const b = r.source === 'reconciled' ? r.primary : r;
    return { keySpendUsd: b.keySpendUsd, employeeSpendUsd: b.employeeSpendUsd, departmentSpendUsd: b.departmentSpendUsd };
}
