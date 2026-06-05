// Slice 3D — flip-readiness thresholds.
//
// Defaults are intentionally strict (payment-protocol grade). Env overrides
// exist for staging, but production should leave them at defaults.

import type { Thresholds } from './types.js';

export const DEFAULT_THRESHOLDS: Thresholds = {
    coverage_min_pct: 99,
    delta_absolute_max_usd: 0.01,
    delta_relative_max_pct: 0.5,
    outbox_pending_max: 0,
    outbox_abandoned_max: 0,
    // Slice 3D ships with the billing-cycle requirement ON. ready_to_flip
    // is reachable only after the previous full UTC calendar month passes
    // every other criterion. Set to false in staging if needed.
    require_completed_billing_cycle: true,
    require_denied_write_path: true,
};

function numEnv(name: string, fallback: number): number {
    const raw = process.env[name];
    if (raw == null || raw === '') return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
}

function boolEnv(name: string, fallback: boolean): boolean {
    const raw = process.env[name];
    if (raw == null || raw === '') return fallback;
    return raw === 'true' || raw === '1';
}

/**
 * Resolve effective thresholds, applying env overrides over defaults.
 * Each call re-reads env so tests can flip values without restart.
 */
export function resolveThresholds(): Thresholds {
    return {
        coverage_min_pct:                numEnv('FLIP_COVERAGE_MIN_PCT',           DEFAULT_THRESHOLDS.coverage_min_pct),
        delta_absolute_max_usd:          numEnv('FLIP_DELTA_ABS_MAX_USD',          DEFAULT_THRESHOLDS.delta_absolute_max_usd),
        delta_relative_max_pct:          numEnv('FLIP_DELTA_REL_MAX_PCT',          DEFAULT_THRESHOLDS.delta_relative_max_pct),
        outbox_pending_max:              numEnv('FLIP_OUTBOX_PENDING_MAX',         DEFAULT_THRESHOLDS.outbox_pending_max),
        outbox_abandoned_max:            numEnv('FLIP_OUTBOX_ABANDONED_MAX',       DEFAULT_THRESHOLDS.outbox_abandoned_max),
        require_completed_billing_cycle: boolEnv('FLIP_REQUIRE_BILLING_CYCLE',     DEFAULT_THRESHOLDS.require_completed_billing_cycle),
        require_denied_write_path:       boolEnv('FLIP_REQUIRE_DENIED_WRITE_PATH', DEFAULT_THRESHOLDS.require_denied_write_path),
    };
}
