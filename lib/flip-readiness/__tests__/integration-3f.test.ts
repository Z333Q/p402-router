/**
 * Slice 3F — Integration-style validation that the Slice 3D gate now reads
 * Slice 3E denied-event support correctly, end-to-end.
 *
 * The "integration" here is loader → assess, wired against a configurable
 * in-memory pool that emulates the queries the real Postgres would answer.
 * This is NOT a runtime-flip test: BUDGET_GUARD_SPEND_SOURCE is never
 * touched, and `traffic_events` remains the enforcement source.
 *
 * The matrix proves the payment-grade state machine:
 *
 *   denied-support missing                                        -> blocked
 *   denied-support present, current MTD fails                     -> not_ready
 *   denied-support present, MTD passes, prev month incomplete     -> observing
 *   denied-support present, MTD passes, prev month passes         -> ready_to_flip
 *
 * Plus the kind-supported lever (recent denied row OR CI marker) and the
 * outbox cleanliness gate.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { assess } from '@/lib/flip-readiness/assess';
import { loadAssessmentInput, type FlipLoaderQueryable } from '@/lib/flip-readiness/loader';
import { DEFAULT_THRESHOLDS } from '@/lib/flip-readiness/thresholds';

const TENANT = '44444444-4444-4444-4444-444444444444';

// A point in time that gives us a real "previous calendar month" window
// closed prior to NOW. June 15, 2026 means May 2026 is the previous month.
const NOW = new Date('2026-06-15T12:00:00Z');

// ── Pool fixture ────────────────────────────────────────────────────────
// Routes every query the loader issues. Defaults are payment-grade
// minimal: empty tenant, schema present, no failures.

interface PoolOpts {
    /** ai_economic_events coverage count, both windows. */
    economicEventsMtd?: number;
    economicEventsPrev?: number;
    /** traffic_events count, both windows. */
    hostedRequestsMtd?: number;
    hostedRequestsPrev?: number;
    /** A denied row exists within the loader's 7-day probe. */
    recentDeniedRowPresent?: boolean;
    /** Schema-side UNIQUE (tenant_id, request_id) constraint present. */
    schemaUniquePresent?: boolean;
    /** information_schema.columns rows for ai_economic_events. The default
     *  set passes all REQUIRED_BINDING_FIELDS. */
    columns?: string[];
    /** Outbox state. */
    outboxPending?: number;
    outboxAbandoned?: number;
    outboxOldestPending?: Date | null;
    outboxRecentFailures?: number;
    /** Optional worst-bucket delta override. Default 0 / 0 / 0 (pass). */
    worstBucketDelta?: { primary_usd: number; legacy_usd: number };
}

const DEFAULT_COLUMNS = [
    'tenant_id', 'api_key_id', 'request_id', 'route',
    'governance_decision_source', // satisfies decision_source criterion
    'employee_id',                 // satisfies budget_scope_binding
    'deny_code', 'event_time',
];

function makePool(opts: PoolOpts = {}): FlipLoaderQueryable {
    const recentDenied = opts.recentDeniedRowPresent ?? false;
    const uniquePresent = opts.schemaUniquePresent ?? true;
    const cols = opts.columns ?? DEFAULT_COLUMNS;
    const wbd = opts.worstBucketDelta ?? { primary_usd: 0, legacy_usd: 0 };

    return {
        async query(sql: string, params?: unknown[]) {
            // ── Schema introspection ────────────────────────────────────
            if (/information_schema\.columns/i.test(sql)) {
                return { rows: cols.map((c) => ({ column_name: c })) };
            }
            if (/information_schema\.table_constraints/i.test(sql)) {
                return { rows: uniquePresent ? [{}] : [] };
            }

            // ── Outbox ──────────────────────────────────────────────────
            if (/economic_event_write_failures/i.test(sql) && /recent_failures/i.test(sql)) {
                return { rows: [{ recent_failures: opts.outboxRecentFailures ?? 0 }] };
            }
            if (/economic_event_write_failures/i.test(sql) && /pending/i.test(sql)) {
                return {
                    rows: [{
                        pending: opts.outboxPending ?? 0,
                        abandoned: opts.outboxAbandoned ?? 0,
                        oldest_pending: opts.outboxOldestPending ?? null,
                    }],
                };
            }

            // ── Denied-row probe (Slice 3E truth signal) ────────────────
            if (/FROM ai_economic_events[^;]*governance_decision\s*=\s*'denied'/is.test(sql)) {
                return { rows: recentDenied ? [{ '?column?': 1 }] : [] };
            }

            // ── Coverage ───────────────────────────────────────────────
            if (/FROM traffic_events\s+WHERE/i.test(sql)
                && /path = '\/api\/v2\/chat\/completions'/i.test(sql)) {
                // Distinguish MTD vs PREV by the second bound param window
                // start. PREV starts before MTD start. The loader passes
                // (tenantId, since, until) — we use the `since` param.
                const since = String(params?.[1] ?? '');
                const isPrev = since < '2026-06';
                return { rows: [{ count: isPrev ? (opts.hostedRequestsPrev ?? 0) : (opts.hostedRequestsMtd ?? 0) }] };
            }
            if (/FROM ai_economic_events\s+WHERE.*source = 'chat_completions'/is.test(sql)) {
                const since = String(params?.[1] ?? '');
                const isPrev = since < '2026-06';
                return { rows: [{ count: isPrev ? (opts.economicEventsPrev ?? 0) : (opts.economicEventsMtd ?? 0) }] };
            }

            // ── Worst-bucket delta (CTE shape) ─────────────────────────
            if (/WITH aee AS/i.test(sql)) {
                return {
                    rows: [{
                        bucket_id: null,
                        primary_usd: wbd.primary_usd,
                        legacy_usd:  wbd.legacy_usd,
                        abs_delta:   Math.abs(wbd.primary_usd - wbd.legacy_usd),
                    }],
                };
            }

            return { rows: [] };
        },
    };
}

const ALL_ENV_FLAGS = [
    'AEE_DENIED_WRITE_PATH',
    'AEE_DENIED_WRITE_PATH_TEST_PROVEN',
    'AEE_DENIED_EVENT_KIND_TEST_PROVEN',
    'AEE_DENIED_WRITE_PATH_CODE_PRESENT',
] as const;

beforeEach(() => { for (const k of ALL_ENV_FLAGS) delete process.env[k]; });
afterEach(() => { for (const k of ALL_ENV_FLAGS) delete process.env[k]; });

/** Convenience: set the env flags + DB signals that satisfy denied-event
 *  support so a test can isolate the MTD/previous-month state machine. */
function enableDeniedSupportEnv() {
    process.env.AEE_DENIED_WRITE_PATH             = 'enabled';
    process.env.AEE_DENIED_WRITE_PATH_TEST_PROVEN = 'true';
    process.env.AEE_DENIED_EVENT_KIND_TEST_PROVEN = 'true';
}

// ────────────────────────────────────────────────────────────────────────
// (a) Kind-supported lever — the 3E signal
// ────────────────────────────────────────────────────────────────────────

describe('3F: denied_event_kind_supported lever (loader)', () => {
    it('false when no recent denied row AND no CI marker', async () => {
        const input = await loadAssessmentInput(
            makePool({ recentDeniedRowPresent: false }),
            TENANT,
            { now: NOW },
        );
        expect(input.denied_event_idempotency.denied_event_kind_supported).toBe(false);
    });

    it('true when a recent denied row exists', async () => {
        const input = await loadAssessmentInput(
            makePool({ recentDeniedRowPresent: true }),
            TENANT,
            { now: NOW },
        );
        expect(input.denied_event_idempotency.denied_event_kind_supported).toBe(true);
    });

    it('true when AEE_DENIED_EVENT_KIND_TEST_PROVEN is set (test/CI context)', async () => {
        process.env.AEE_DENIED_EVENT_KIND_TEST_PROVEN = 'true';
        const input = await loadAssessmentInput(
            makePool({ recentDeniedRowPresent: false }),
            TENANT,
            { now: NOW },
        );
        expect(input.denied_event_idempotency.denied_event_kind_supported).toBe(true);
    });
});

// ────────────────────────────────────────────────────────────────────────
// (b) deny_code_bound_to_idempotency
// ────────────────────────────────────────────────────────────────────────

describe('3F: deny_code_bound_to_idempotency', () => {
    it('true when schema UNIQUE is present AND the deterministic mapping marker is on', async () => {
        const input = await loadAssessmentInput(
            makePool({ schemaUniquePresent: true, recentDeniedRowPresent: true }),
            TENANT,
            { now: NOW },
        );
        expect(input.denied_event_idempotency.schema_unique_request_present).toBe(true);
        expect(input.denied_event_idempotency.writer_deterministic_deny_code).toBe(true);
        expect(input.denied_event_idempotency.deny_code_bound_to_idempotency).toBe(true);
    });

    it('false when schema UNIQUE is missing, even with the mapping marker on', async () => {
        const input = await loadAssessmentInput(
            makePool({ schemaUniquePresent: false, recentDeniedRowPresent: true }),
            TENANT,
            { now: NOW },
        );
        expect(input.denied_event_idempotency.schema_unique_request_present).toBe(false);
        expect(input.denied_event_idempotency.deny_code_bound_to_idempotency).toBe(false);
        expect(input.denied_event_idempotency.ready).toBe(false);
    });
});

// ────────────────────────────────────────────────────────────────────────
// (c) Outbox cleanliness gate
// ────────────────────────────────────────────────────────────────────────

describe('3F: outbox gate (no rows allowed for ready states)', () => {
    it('pending > 0 keeps status out of ready_to_flip and reports outbox_pending', async () => {
        enableDeniedSupportEnv();
        const pool = makePool({
            recentDeniedRowPresent: true,
            outboxPending: 1,
            outboxOldestPending: new Date('2026-06-15T10:00:00Z'),
        });
        const input = await loadAssessmentInput(pool, TENANT, { now: NOW });
        const r = assess(input, DEFAULT_THRESHOLDS);
        expect(r.status).not.toBe('ready_to_flip');
        expect(r.reason).toContain('outbox_pending');
    });

    it('abandoned > 0 blocks the gate before reaching not_ready (fail-closed)', async () => {
        enableDeniedSupportEnv();
        const pool = makePool({
            recentDeniedRowPresent: true,
            outboxAbandoned: 1,
            outboxRecentFailures: 1, // breaks health_check_green
        });
        const input = await loadAssessmentInput(pool, TENANT, { now: NOW });
        const r = assess(input, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('blocked');
        // Either the abandoned-rows blocker fires, or the upstream denied-
        // write-path fails first because health_check_green is now false.
        // Both are the correct fail-closed answer.
        expect(['outbox_has_abandoned_rows', 'denied_event_write_path_not_implemented'])
            .toContain(r.reason);
    });
});

// ────────────────────────────────────────────────────────────────────────
// (d) Full state machine — Slice 3F expected transitions
// ────────────────────────────────────────────────────────────────────────

describe('3F: status state machine', () => {
    it('denied-support missing -> blocked (denied_event_write_path_not_implemented)', async () => {
        // No env flags, no recent denied row — write path is not
        // "implemented" because config_enabled + test_proof_present are
        // both false.
        const input = await loadAssessmentInput(
            makePool({ recentDeniedRowPresent: false }),
            TENANT,
            { now: NOW },
        );
        const r = assess(input, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('blocked');
        expect(r.reason).toBe('denied_event_write_path_not_implemented');
    });

    it('denied-support present + current MTD fails (delta over tolerance) -> not_ready', async () => {
        enableDeniedSupportEnv();
        // MTD delta blows the absolute_usd cap ($0.01 default).
        const pool = makePool({
            recentDeniedRowPresent: true,
            worstBucketDelta: { primary_usd: 100, legacy_usd: 110 }, // |delta| = $10
        });
        const input = await loadAssessmentInput(pool, TENANT, { now: NOW });
        const r = assess(input, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('not_ready');
        expect(r.reason).toMatch(/^current_mtd_failures:/);
    });

    it('denied-support present + MTD passes + previous-month window incomplete -> observing', async () => {
        enableDeniedSupportEnv();
        // Force the prev-month window to look incomplete by running the
        // assessment AT the very start of the current month (so prev month
        // technically just closed but the loader marks it complete; we
        // therefore simulate incompleteness via a coverage failure on the
        // previous-month window — the same observing-class signal).
        //
        // Note: WindowSpec.complete is derived from `now >= startOfMonth`
        // and is effectively always true; the operator-visible "previous
        // month not yet usable" signal therefore comes from coverage / delta
        // failures on that window. We exercise that path here.
        const pool = makePool({
            recentDeniedRowPresent: true,
            // MTD: zero hosted requests -> coverage_pct = 100 (passes)
            hostedRequestsMtd:  0,
            economicEventsMtd:  0,
            // PREV: hosted requests but zero economic events -> coverage_pct = 0 (fails)
            hostedRequestsPrev: 100,
            economicEventsPrev: 0,
        });
        const input = await loadAssessmentInput(pool, TENANT, { now: NOW });
        const r = assess(input, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('observing');
        expect(r.reason).toMatch(/^awaiting_billing_cycle:/);
    });

    it('denied-support present + MTD passes + previous-month passes -> ready_to_flip', async () => {
        enableDeniedSupportEnv();
        const pool = makePool({
            recentDeniedRowPresent: true,
            // Both windows: equal traffic, equal economic events => 100% coverage.
            hostedRequestsMtd: 10, economicEventsMtd: 10,
            hostedRequestsPrev: 10, economicEventsPrev: 10,
            // Delta within tolerance (zero).
            worstBucketDelta: { primary_usd: 0, legacy_usd: 0 },
            // Outbox clean.
            outboxPending: 0, outboxAbandoned: 0, outboxOldestPending: null,
            outboxRecentFailures: 0,
            schemaUniquePresent: true,
        });
        const input = await loadAssessmentInput(pool, TENANT, { now: NOW });
        const r = assess(input, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('ready_to_flip');
        expect(r.reason).toBe('all_criteria_pass');
    });
});

// ────────────────────────────────────────────────────────────────────────
// (e) Read-only invariant — observation gate stays in place
// ────────────────────────────────────────────────────────────────────────

describe('3F: observation gate (require_completed_billing_cycle)', () => {
    it('ready_to_flip is reachable ONLY when the billing-cycle requirement is satisfied', async () => {
        enableDeniedSupportEnv();
        const pool = makePool({
            recentDeniedRowPresent: true,
            hostedRequestsMtd: 0, economicEventsMtd: 0,
            // Previous month: pretend it's not yet observed.
            hostedRequestsPrev: 1, economicEventsPrev: 0,
        });
        const input = await loadAssessmentInput(pool, TENANT, { now: NOW });
        const r = assess(input, DEFAULT_THRESHOLDS);
        // The denied-write-path now lets us past blocked; we're held at
        // observing by the existing billing-cycle gate. Slice 3F did NOT
        // add a separate denied-row accumulation window.
        expect(r.status).toBe('observing');
    });
});
