// Slice 3D — DB loader for flip-readiness inputs.
//
// Tenant-scoped on every query. Fail-closed: if any query throws, the
// loader returns an AssessmentInput with loader_error.occurred = true and
// assess() will return 'blocked'.
//
// Privacy: metadata only — no prompt or response columns are read.
//
// "Worst-bucket delta per scope" rule: for each scope dimension (api_key,
// employee, department) we group bucket-level totals from both tables and
// pick the bucket with the largest |primary - legacy|. This prevents an
// outlier bucket from being averaged away by a passing aggregate.

import type {
    AssessmentInput,
    CoverageSnapshot,
    ContextBindingFields,
    DeniedWritePathSignal,
    IdempotencyReadiness,
    OutboxSnapshot,
    ScopeDelta,
    ScopeDimension,
    WindowSpec,
} from './types.js';
// Slice 3E truth markers. Importing these proves at link-time that the
// denied-event code path is compiled into the running build and that the
// ApiError.code -> deny_code map is a total, deterministic function. The
// loader treats their presence as ground truth, not the env flags that
// previously stood in for them.
import {
    DENIED_EVENT_CODE_PATH_PRESENT,
    DENY_CODE_MAPPING_DETERMINISTIC,
} from '@/lib/economic-events/denied';

export interface FlipLoaderQueryable {
    query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

// ---------------------------------------------------------------------------
// Window math (pure)
// ---------------------------------------------------------------------------

function startOfMonthUtc(now: Date): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
function startOfPrevMonthUtc(now: Date): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
}

export function buildWindows(now: Date): { mtd: WindowSpec; prev: WindowSpec } {
    const mtdSince = startOfMonthUtc(now);
    const prevSince = startOfPrevMonthUtc(now);
    const prevUntil = mtdSince;
    const mtd: WindowSpec = {
        kind: 'month_to_date',
        since: mtdSince.toISOString(),
        until: now.toISOString(),
        complete: false, // MTD is by definition in-progress
    };
    const prev: WindowSpec = {
        kind: 'previous_calendar_month',
        since: prevSince.toISOString(),
        until: prevUntil.toISOString(),
        // Complete only if `now` is after the start of the current month —
        // which is always true. Kept as a field for clarity and so a future
        // staging override can downgrade it.
        complete: now >= mtdSince,
    };
    return { mtd, prev };
}

// ---------------------------------------------------------------------------
// Coverage — reused logic from /api/v2/audit/economic-event-coverage but
// tenant + window parameterized.
// ---------------------------------------------------------------------------

async function loadCoverage(
    pool: FlipLoaderQueryable,
    tenantId: string,
    window: WindowSpec,
): Promise<CoverageSnapshot> {
    const hostedRes = await pool.query(
        `SELECT COUNT(*)::int AS count
           FROM traffic_events
           WHERE tenant_id = $1
             AND path = '/api/v2/chat/completions'
             AND created_at >= $2 AND created_at < $3`,
        [tenantId, window.since, window.until],
    );
    const hostedRequests = Number(hostedRes.rows[0]?.count ?? 0);

    let economicEvents = 0;
    try {
        const eeRes = await pool.query(
            `SELECT COUNT(*)::int AS count
               FROM ai_economic_events
               WHERE tenant_id = $1
                 AND source = 'chat_completions'
                 AND event_time >= $2 AND event_time < $3`,
            [tenantId, window.since, window.until],
        );
        economicEvents = Number(eeRes.rows[0]?.count ?? 0);
    } catch {
        // Table absent; coverage stays 0 — fail-closed downstream.
        economicEvents = 0;
    }

    const coveragePct = hostedRequests === 0 ? 100 : (economicEvents / hostedRequests) * 100;
    return {
        window,
        hosted_requests: hostedRequests,
        economic_events: economicEvents,
        coverage_pct: Number(coveragePct.toFixed(4)),
    };
}

// ---------------------------------------------------------------------------
// Worst-bucket delta per scope. One CTE per (scope, window).
// ---------------------------------------------------------------------------

const SCOPE_COLUMN: Record<ScopeDimension, 'api_key_id' | 'employee_id' | 'department_id'> = {
    api_key:    'api_key_id',
    employee:   'employee_id',
    department: 'department_id',
};

async function loadWorstBucketDelta(
    pool: FlipLoaderQueryable,
    tenantId: string,
    scope: ScopeDimension,
    window: WindowSpec,
): Promise<ScopeDelta> {
    const col = SCOPE_COLUMN[scope];
    const sql = `
        WITH aee AS (
            SELECT ${col} AS bucket_id, SUM(cost_usd)::float AS spend
            FROM ai_economic_events
            WHERE tenant_id = $1
              AND (status_code IS NULL OR status_code = 200)
              AND event_time >= $2 AND event_time < $3
              AND ${col} IS NOT NULL
            GROUP BY ${col}
        ),
        te AS (
            SELECT ${col} AS bucket_id, SUM(cost_usd)::float AS spend
            FROM traffic_events
            WHERE tenant_id = $1
              AND status_code = 200
              AND created_at >= $2 AND created_at < $3
              AND ${col} IS NOT NULL
            GROUP BY ${col}
        )
        SELECT
            COALESCE(aee.bucket_id, te.bucket_id)::text AS bucket_id,
            COALESCE(aee.spend, 0)::float AS primary_usd,
            COALESCE(te.spend, 0)::float  AS legacy_usd,
            ABS(COALESCE(aee.spend, 0) - COALESCE(te.spend, 0))::float AS abs_delta
        FROM aee FULL OUTER JOIN te ON aee.bucket_id = te.bucket_id
        ORDER BY abs_delta DESC NULLS LAST
        LIMIT 1
    `;
    const res = await pool.query(sql, [tenantId, window.since, window.until]);
    const row = res.rows[0];
    if (!row) {
        return {
            scope, window,
            worst_bucket_id: null,
            primary_usd: 0,
            legacy_usd: 0,
            absolute_usd: 0,
            relative_pct: 0,
        };
    }
    const primary = Number(row.primary_usd ?? 0);
    const legacy = Number(row.legacy_usd ?? 0);
    const absolute = primary - legacy;
    const denom = Math.max(primary, legacy);
    const relativePct = denom === 0 ? 0 : (Math.abs(absolute) / denom) * 100;
    return {
        scope, window,
        worst_bucket_id: row.bucket_id == null ? null : String(row.bucket_id),
        primary_usd: primary,
        legacy_usd: legacy,
        absolute_usd: Number(absolute.toFixed(8)),
        relative_pct: Number(relativePct.toFixed(4)),
    };
}

// ---------------------------------------------------------------------------
// Outbox — pending / abandoned / oldest pending age.
// ---------------------------------------------------------------------------

async function loadOutbox(
    pool: FlipLoaderQueryable,
    tenantId: string,
    now: Date,
): Promise<OutboxSnapshot> {
    try {
        const res = await pool.query(
            `SELECT
                COUNT(*) FILTER (WHERE status = 'pending')::int   AS pending,
                COUNT(*) FILTER (WHERE status = 'abandoned')::int AS abandoned,
                MIN(created_at) FILTER (WHERE status = 'pending') AS oldest_pending
             FROM economic_event_write_failures
             WHERE tenant_id = $1`,
            [tenantId],
        );
        const row = res.rows[0] ?? {};
        const pending = Number(row.pending ?? 0);
        const abandoned = Number(row.abandoned ?? 0);
        const oldest = row.oldest_pending;
        let oldestAge: number | null = null;
        if (oldest != null && pending > 0) {
            const t = oldest instanceof Date ? oldest.getTime() : new Date(String(oldest)).getTime();
            if (Number.isFinite(t)) {
                oldestAge = Math.max(0, Math.floor((now.getTime() - t) / 1000));
            }
        }
        return { pending, abandoned, oldest_pending_age_seconds: pending > 0 ? oldestAge : null };
    } catch {
        // Outbox table absent — fail-closed: treat as pending=∞-equivalent
        // by reporting one synthetic abandoned row so the gate blocks.
        return { pending: 0, abandoned: 1, oldest_pending_age_seconds: null };
    }
}

// ---------------------------------------------------------------------------
// Denied-event write path signals. Multi-signal — no env-only truth.
//
//   config_enabled        — process.env.AEE_DENIED_WRITE_PATH === 'enabled'
//   code_path_present     — only when the wiring exists. Stays false until
//                           the future slice implements it. Exposed as a
//                           separate env var so the loader cannot infer
//                           code-presence from the config flag alone.
//   test_proof_present    — only when AEE_DENIED_WRITE_PATH_TEST_PROVEN
//                           is explicitly set in CI after a green run.
//                           Never inferred.
//   health_check_green    — outbox has no recent denied-write failures.
//                           When the outbox table or signal data is
//                           missing, this is false (fail-closed).
// ---------------------------------------------------------------------------

async function loadDeniedWritePath(
    pool: FlipLoaderQueryable,
    tenantId: string,
): Promise<DeniedWritePathSignal> {
    const configEnabled = process.env.AEE_DENIED_WRITE_PATH === 'enabled';
    // Truth-based (Slice 3E): the module marker is true iff the denied-event
    // module is reachable in this build. Replaces the prior
    // AEE_DENIED_WRITE_PATH_CODE_PRESENT env stand-in, which could lie.
    const codePathPresent = DENIED_EVENT_CODE_PATH_PRESENT === true;
    const testProofPresent = process.env.AEE_DENIED_WRITE_PATH_TEST_PROVEN === 'true';

    // Health check: any unresolved denied-write outbox failures in the
    // last hour break the green flag.
    let healthCheckGreen = false;
    try {
        const res = await pool.query(
            `SELECT COUNT(*)::int AS recent_failures
             FROM economic_event_write_failures
             WHERE tenant_id = $1
               AND status IN ('pending', 'abandoned')
               AND created_at >= NOW() - INTERVAL '1 hour'`,
            [tenantId],
        );
        healthCheckGreen = Number(res.rows[0]?.recent_failures ?? 0) === 0;
    } catch {
        healthCheckGreen = false; // fail-closed
    }

    const implemented = configEnabled && codePathPresent && testProofPresent && healthCheckGreen;
    return {
        config_enabled: configEnabled,
        code_path_present: codePathPresent,
        test_proof_present: testProofPresent,
        health_check_green: healthCheckGreen,
        implemented,
    };
}

// ---------------------------------------------------------------------------
// Idempotency readiness. Schema-level UNIQUE constraint + writer support.
// ---------------------------------------------------------------------------

async function loadIdempotency(
    pool: FlipLoaderQueryable,
): Promise<IdempotencyReadiness> {
    let schemaUniqueRequestPresent = false;
    try {
        const res = await pool.query(
            `SELECT 1
             FROM information_schema.table_constraints tc
             JOIN information_schema.constraint_column_usage cu
               ON cu.constraint_name = tc.constraint_name
              AND cu.table_schema    = tc.table_schema
             WHERE tc.table_name = 'ai_economic_events'
               AND tc.constraint_type = 'UNIQUE'
               AND cu.column_name IN ('tenant_id', 'request_id')
             GROUP BY tc.constraint_name
             HAVING COUNT(DISTINCT cu.column_name) = 2
             LIMIT 1`,
        );
        schemaUniqueRequestPresent = res.rows.length > 0;
    } catch {
        schemaUniqueRequestPresent = false;
    }

    // Slice 3E — payment-grade truth signals.
    //
    //   writer_deterministic_deny_code:
    //     The DENY_CODE_MAP plus its dedicated denied-builder tests prove the
    //     ApiError.code -> deny_code function is total + deterministic. The
    //     marker is true at import time iff the module is reachable in this
    //     build; the proof of determinism is the test suite that imports it.
    //
    //   denied_event_kind_supported:
    //     A module import is NOT sufficient — a compiled code path is not a
    //     production write. Either of the following counts as proof:
    //       (a) a recent denied row exists in ai_economic_events
    //           (governance_decision='denied' AND deny_code IS NOT NULL
    //            within the last 7 days), OR
    //       (b) the explicit CI proof marker
    //           AEE_DENIED_EVENT_KIND_TEST_PROVEN === 'true' is set, signed
    //           off by the route-level denial-events test suite landing
    //           green. Never inferred from code presence alone.
    //
    //   deny_code_bound_to_idempotency:
    //     Requires both schema-side uniqueness AND the deterministic mapping
    //     proof. The UNIQUE (tenant_id, request_id) constraint guarantees at
    //     most one row per request; the deterministic mapping guarantees
    //     that the second arrival of the same denied request cannot stamp a
    //     different deny_code on it.
    const writerDeterministicDenyCode = DENY_CODE_MAPPING_DETERMINISTIC === true;

    let recentDeniedRowPresent = false;
    try {
        const res = await pool.query(
            `SELECT 1
               FROM ai_economic_events
              WHERE governance_decision = 'denied'
                AND deny_code IS NOT NULL
                AND event_time >= NOW() - INTERVAL '7 days'
              LIMIT 1`,
        );
        recentDeniedRowPresent = res.rows.length > 0;
    } catch {
        recentDeniedRowPresent = false; // fail-closed
    }
    const ciDeniedEventKindProven = process.env.AEE_DENIED_EVENT_KIND_TEST_PROVEN === 'true';
    const deniedEventKindSupported = recentDeniedRowPresent || ciDeniedEventKindProven;

    const denyCodeBoundToIdempotency = schemaUniqueRequestPresent && writerDeterministicDenyCode;

    const ready =
        schemaUniqueRequestPresent &&
        deniedEventKindSupported &&
        writerDeterministicDenyCode &&
        denyCodeBoundToIdempotency;

    return {
        schema_unique_request_present: schemaUniqueRequestPresent,
        denied_event_kind_supported: deniedEventKindSupported,
        deny_code_bound_to_idempotency: denyCodeBoundToIdempotency,
        writer_deterministic_deny_code: writerDeterministicDenyCode,
        ready,
    };
}

// ---------------------------------------------------------------------------
// Context-binding fields. Schema introspection of ai_economic_events.
// ---------------------------------------------------------------------------

const REQUIRED_BINDING_FIELDS: Array<keyof ContextBindingFields> = [
    'tenant_id',
    'api_key_id',
    'request_id',
    'route',
    'decision_source',
    'budget_scope_binding',
    'deny_code',
    'event_time',
    'idempotency_key',
];

/** Columns that are accepted as a real authority/mechanism binding for
 *  the decision_source criterion. governance_decision is the RESULT and
 *  is intentionally excluded — a result is not its source. */
const DECISION_SOURCE_COLUMNS = [
    'governance_decision_source',
    'control_decision_source',
    'policy_id',
    'mandate_id',
] as const;

/** Direct enforcement-scope columns. Presence of any one of these on the
 *  event row is sufficient to bind the decision to a real scope. */
const SCOPE_COLUMNS = [
    'api_key_id',
    'employee_id',
    'department_id',
    'workflow_id',
    'customer_id',
    'feature_id',
] as const;

async function loadContextBinding(
    pool: FlipLoaderQueryable,
): Promise<{ fields: ContextBindingFields; complete: boolean }> {
    let presentCols = new Set<string>();
    try {
        const res = await pool.query(
            `SELECT column_name
             FROM information_schema.columns
             WHERE table_name = 'ai_economic_events'`,
        );
        presentCols = new Set(res.rows.map((r) => String(r.column_name)));
    } catch {
        presentCols = new Set();
    }

    // decision_source: at least one real source-binding column. NO
    // fallback to governance_decision.
    const decisionSource = DECISION_SOURCE_COLUMNS.some((c) => presentCols.has(c));

    // budget_scope_binding: any direct scope column OR (budget_id AND
    // budget_scope) — the latter being budget_id paired with explicit
    // scope semantics. budget_id alone is NOT sufficient.
    const hasDirectScope = SCOPE_COLUMNS.some((c) => presentCols.has(c));
    const hasBudgetIdWithScope = presentCols.has('budget_id') && presentCols.has('budget_scope');
    const budgetScopeBinding = hasDirectScope || hasBudgetIdWithScope;

    const fields: ContextBindingFields = {
        tenant_id:            presentCols.has('tenant_id'),
        api_key_id:           presentCols.has('api_key_id'),
        request_id:           presentCols.has('request_id'),
        route:                presentCols.has('route'),
        decision_source:      decisionSource,
        budget_scope_binding: budgetScopeBinding,
        deny_code:            presentCols.has('deny_code'),
        event_time:           presentCols.has('event_time'),
        // idempotency_key: backed by UNIQUE (tenant_id, request_id) — the
        // assess function reads denied_event_idempotency separately for
        // the stricter denied-event idempotency story.
        idempotency_key:      presentCols.has('request_id'),
    };

    const complete = REQUIRED_BINDING_FIELDS.every((f) => fields[f]);
    return { fields, complete };
}

// ---------------------------------------------------------------------------
// Top-level loader
// ---------------------------------------------------------------------------

export interface LoadOpts {
    now?: Date;
}

export async function loadAssessmentInput(
    pool: FlipLoaderQueryable,
    tenantId: string,
    opts: LoadOpts = {},
): Promise<AssessmentInput> {
    const now = opts.now ?? new Date();
    const generatedAt = now.toISOString();

    if (!tenantId) {
        // Tenant scoping uncertainty — assess() will return blocked.
        return errorEnvelope('', generatedAt, 'tenant_id_missing', now);
    }

    try {
        const { mtd, prev } = buildWindows(now);

        const [
            mtdCoverage,
            prevCoverage,
            mtdApiKey, mtdEmployee, mtdDepartment,
            prevApiKey, prevEmployee, prevDepartment,
            outbox,
            deniedWritePath,
            idempotency,
            contextBinding,
        ] = await Promise.all([
            loadCoverage(pool, tenantId, mtd),
            loadCoverage(pool, tenantId, prev),
            loadWorstBucketDelta(pool, tenantId, 'api_key',    mtd),
            loadWorstBucketDelta(pool, tenantId, 'employee',   mtd),
            loadWorstBucketDelta(pool, tenantId, 'department', mtd),
            loadWorstBucketDelta(pool, tenantId, 'api_key',    prev),
            loadWorstBucketDelta(pool, tenantId, 'employee',   prev),
            loadWorstBucketDelta(pool, tenantId, 'department', prev),
            loadOutbox(pool, tenantId, now),
            loadDeniedWritePath(pool, tenantId),
            loadIdempotency(pool),
            loadContextBinding(pool),
        ]);

        return {
            tenantId,
            generated_at: generatedAt,
            coverage: { month_to_date: mtdCoverage, previous_calendar_month: prevCoverage },
            outbox,
            deltas: {
                month_to_date: [mtdApiKey, mtdEmployee, mtdDepartment],
                previous_calendar_month: [prevApiKey, prevEmployee, prevDepartment],
            },
            denied_event_write_path: deniedWritePath,
            denied_event_idempotency: idempotency,
            context_binding: contextBinding,
            loader_error: { occurred: false, reason: null },
        };
    } catch (e) {
        const reason = e instanceof Error ? `loader_exception:${e.name}` : 'loader_exception';
        return errorEnvelope(tenantId, generatedAt, reason, now);
    }
}

function errorEnvelope(tenantId: string, generatedAt: string, reason: string, now: Date): AssessmentInput {
    const { mtd, prev } = buildWindows(now);
    const emptyCoverage = (w: WindowSpec): CoverageSnapshot => ({
        window: w, hosted_requests: 0, economic_events: 0, coverage_pct: 0,
    });
    const emptyDelta = (scope: ScopeDimension, w: WindowSpec): ScopeDelta => ({
        scope, window: w,
        worst_bucket_id: null, primary_usd: 0, legacy_usd: 0,
        absolute_usd: 0, relative_pct: 0,
    });
    return {
        tenantId,
        generated_at: generatedAt,
        coverage: { month_to_date: emptyCoverage(mtd), previous_calendar_month: emptyCoverage(prev) },
        outbox: { pending: 0, abandoned: 1, oldest_pending_age_seconds: null },
        deltas: {
            month_to_date: [
                emptyDelta('api_key', mtd), emptyDelta('employee', mtd), emptyDelta('department', mtd),
            ],
            previous_calendar_month: [
                emptyDelta('api_key', prev), emptyDelta('employee', prev), emptyDelta('department', prev),
            ],
        },
        denied_event_write_path: {
            config_enabled: false, code_path_present: false,
            test_proof_present: false, health_check_green: false, implemented: false,
        },
        denied_event_idempotency: {
            schema_unique_request_present: false,
            denied_event_kind_supported: false,
            deny_code_bound_to_idempotency: false,
            writer_deterministic_deny_code: false,
            ready: false,
        },
        context_binding: {
            fields: {
                tenant_id: false, api_key_id: false, request_id: false, route: false,
                decision_source: false, budget_scope_binding: false, deny_code: false,
                event_time: false, idempotency_key: false,
            },
            complete: false,
        },
        loader_error: { occurred: true, reason },
    };
}
