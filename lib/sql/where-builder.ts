/**
 * Shared WHERE-clause builder for tenant-scoped, time-windowed,
 * attribution-filtered queries against ai_economic_events (and adjacent
 * tables that share the same dimension columns).
 *
 * Why this lives in lib/sql/ and not lib/monitor/:
 *   Monitor (Slice 3A) and Control (Slice 3B) both need the same builder.
 *   Letting Control import from lib/monitor/ would make Monitor an accidental
 *   dependency provider. This module is the canonical home; both callers
 *   import from here.
 *
 * Invariants tested by callers:
 *   1. `tenant_id` is always `$1` (or `alias.tenant_id = $1`).
 *   2. `since`/`until` are optional. When present, they bind at the next free
 *      `$N` derived from `params.length` — never hardcoded.
 *   3. Whitelisted attribution filters append after, also via `params.length`.
 *   4. Column names come from the whitelist map only — never user-supplied.
 */

/** Whitelisted dimension columns on `ai_economic_events` and joinable rows. */
export type AttributionFilterKey =
    | 'department_id'
    | 'employee_id'
    | 'workflow_id'
    | 'customer_id'
    | 'feature_id'
    | 'provider'
    | 'model_used';

/** Filter envelope. `since`/`until` are optional ISO timestamps. */
export interface BaseFilters {
    since?: string;
    until?: string;
    department_id?: string;
    employee_id?: string;
    workflow_id?: string;
    customer_id?: string;
    feature_id?: string;
    provider?: string;
    model_used?: string;
}

/** Result of the builder: WHERE-clause fragments + full params array. */
export interface WhereBuild {
    /** Fragments to join with ' AND '. Always non-empty: at minimum [tenant_id = $1]. */
    where: string[];
    /** Full positional params array, tenantId first. */
    params: unknown[];
}

const FILTER_COLUMN_MAP: Record<AttributionFilterKey, string> = {
    department_id: 'department_id',
    employee_id: 'employee_id',
    workflow_id: 'workflow_id',
    customer_id: 'customer_id',
    feature_id: 'feature_id',
    provider: 'provider',
    model_used: 'model_used',
};

/**
 * Owning builder. Binds tenant first, appends since/until only if present,
 * then appends whitelisted attribution filters. Every `$N` is computed from
 * `params.length` — no fixed-position assumptions.
 */
export function buildBaseWhere(
    tenantId: string,
    filters: BaseFilters,
    alias = '',
): WhereBuild {
    const prefix = alias ? `${alias}.` : '';
    const params: unknown[] = [tenantId];
    const where: string[] = [`${prefix}tenant_id = $1`];

    if (filters.since) {
        params.push(filters.since);
        where.push(`${prefix}event_time >= $${params.length}`);
    }
    if (filters.until) {
        params.push(filters.until);
        where.push(`${prefix}event_time <= $${params.length}`);
    }

    for (const [key, column] of Object.entries(FILTER_COLUMN_MAP)) {
        const value = filters[key as AttributionFilterKey];
        if (typeof value === 'string' && value.length > 0) {
            params.push(value);
            where.push(`${prefix}${column} = $${params.length}`);
        }
    }
    return { where, params };
}

/** Render `WHERE a AND b AND c` from a {@link WhereBuild}. */
export function renderWhere(b: WhereBuild): string {
    return `WHERE ${b.where.join(' AND ')}`;
}
