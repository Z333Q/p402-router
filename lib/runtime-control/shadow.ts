/**
 * Slice 3X-Shadow — runtime shadow evaluator for tenant_control_settings.
 *
 * The shadow path runs ONLY after the existing billing-guard layers have
 * allowed a request. It never denies, never reserves budget, never
 * mutates runtime counters, never throws into the caller. On any
 * failure it emits a structured `tcs_shadow_failed` log and returns.
 *
 * Approved axes for 3X-Shadow:
 *   - max_cost_per_request_usd
 *   - monthly_budget_usd
 *   - allowed_models
 *
 * Explicitly excluded:
 *   - allowed_task_types        (free-text; not curated)
 *   - human_review_threshold_usd (workflow state, not a billing deny)
 *
 * Filtering is applied at the boundary: we hand a filtered tenant-default
 * context to the simulator's evaluate() helper, so even if the evaluator
 * supports more axes, only the three approved ones can fire.
 */

import { evaluate } from '@/lib/control/simulator';
import type {
    ControlDecisionCode,
    SimulatorCheckHit,
    SimulatorEvaluationContext,
    SimulatorInput,
    SimulatorTenantDefaultContext,
} from '@/lib/control/types';
import type { TenantControlSettings } from '@/lib/control/configuration';

import { isShadowEnabled } from './kill-switch';
import {
    getCachedTenantMtd,
    getCachedTenantSettings,
    type DbLike,
    type RedisLike,
} from './cache';
import { persistShadowDecision, type PersistAxis, type PersistCode } from './persistence';

// ─────────────────────────────────────────────────────────────────────────────
// Public contract
// ─────────────────────────────────────────────────────────────────────────────

export interface ShadowContext {
    tenantId: string;
    requestId?: string;
    estimatedCostUsd: number;
    modelRequested: string;
}

export type ShadowLogger = (record: Record<string, unknown>) => void;

export interface ShadowDependencies {
    redis: RedisLike | { get: (k: string) => Promise<string | null> };
    db: DbLike;
    /** Defaults to console.log with JSON.stringify. */
    logger?: ShadowLogger;
    /** Defaults to () => new Date(). */
    now?: () => Date;
}

export const APPROVED_SHADOW_AXES = ['monthly_budget_usd', 'max_cost_per_request_usd', 'allowed_models'] as const;
export type ApprovedShadowAxis = (typeof APPROVED_SHADOW_AXES)[number];

const APPROVED_CODES: ReadonlySet<ControlDecisionCode> = new Set<ControlDecisionCode>([
    'TENANT_BUDGET_EXCEEDED',
    'MAX_COST_PER_REQUEST_EXCEEDED',
    'MODEL_NOT_ALLOWED',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Filtering: hide non-approved axes BEFORE the evaluator sees them.
//
// This is the boundary-level enforcement of the field-set decision.
// `allowed_task_types` and `human_review_threshold_usd` are emptied so
// the evaluator never produces a hit for those axes, regardless of
// what is saved in tenant_control_settings.
// ─────────────────────────────────────────────────────────────────────────────
function filterToApprovedAxes(s: TenantControlSettings): TenantControlSettings {
    return {
        monthly_budget_usd:         s.monthly_budget_usd,
        max_cost_per_request_usd:   s.max_cost_per_request_usd,
        allowed_models:             s.allowed_models,
        // Excluded for 3X-Shadow:
        human_review_threshold_usd: null,
        allowed_task_types:         [],
    };
}

function hasAnyApprovedConfig(s: TenantControlSettings): boolean {
    return (
        s.monthly_budget_usd       !== null ||
        s.max_cost_per_request_usd !== null ||
        s.allowed_models.length    > 0
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Default emitter — severity-aware.
//
// `tcs_shadow_decision` is informational: a would-have-denial that did
// NOT block the request. It routes to console.info so log sinks can
// separate it from real errors and noisy alerting paths.
//
// `tcs_shadow_failed` is an operational error: a stage of the shadow
// pipeline failed (kill-switch, config read, MTD aggregate, evaluator).
// It routes to console.error so the shadow sink and on-call alerts can
// surface it like any other runtime failure.
//
// Any other event name (defensive default) falls back to console.error
// to avoid silently downgrading an unknown signal to info.
//
// The JSON payload shape is unchanged.
// ─────────────────────────────────────────────────────────────────────────────
function defaultLogger(record: Record<string, unknown>): void {
    try {
        const line = JSON.stringify(record);
        if (record.event === 'tcs_shadow_decision') {
            console.info(line);
        } else {
            console.error(line);
        }
    } catch {
        // Logger failure must not crash the runtime path.
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-axis interpretation of a simulator hit → structured log values
// ─────────────────────────────────────────────────────────────────────────────
function axisFromHit(h: SimulatorCheckHit): ApprovedShadowAxis | null {
    if (h.code === 'TENANT_BUDGET_EXCEEDED')          return 'monthly_budget_usd';
    if (h.code === 'MAX_COST_PER_REQUEST_EXCEEDED' &&
        h.source === 'tenant_default')                return 'max_cost_per_request_usd';
    if (h.code === 'MODEL_NOT_ALLOWED' &&
        h.source === 'tenant_default')                return 'allowed_models';
    return null;
}

function configuredVsObserved(
    hit: SimulatorCheckHit,
    axis: ApprovedShadowAxis,
    s: TenantControlSettings,
    ctx: ShadowContext,
): { configured_value: unknown; observed_value: unknown } {
    const detail = (hit.detail ?? {}) as Record<string, unknown>;
    if (axis === 'monthly_budget_usd') {
        return {
            configured_value: s.monthly_budget_usd,
            observed_value:   detail.projected_spend_usd ?? null,
        };
    }
    if (axis === 'max_cost_per_request_usd') {
        return {
            configured_value: s.max_cost_per_request_usd,
            observed_value:   ctx.estimatedCostUsd,
        };
    }
    // allowed_models
    return {
        configured_value: s.allowed_models,
        observed_value:   ctx.modelRequested,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function computeAndEmitShadow(
    ctx: ShadowContext,
    deps: ShadowDependencies,
): Promise<void> {
    const logger = deps.logger ?? defaultLogger;
    const now    = (deps.now ?? (() => new Date()))();
    const emit   = (record: Record<string, unknown>) => {
        try { logger(record); } catch { /* swallow */ }
    };
    const fail = (failure_stage: string, reason: string) => emit({
        event:            'tcs_shadow_failed',
        tenant_id:        ctx.tenantId,
        request_id:       ctx.requestId,
        failure_stage,
        reason,
        enforcement_mode: 'shadow',
        timestamp:        now.toISOString(),
    });

    // 1. Kill-switch.
    let enabled = false;
    try {
        enabled = await isShadowEnabled(ctx.tenantId, deps.redis as RedisLike);
    } catch (e) {
        fail('kill_switch', e instanceof Error ? e.message : String(e));
        return;
    }
    if (!enabled) return;

    // 2. Tenant config (cached).
    let settings: TenantControlSettings | null = null;
    try {
        settings = await getCachedTenantSettings(ctx.tenantId, deps.redis as RedisLike);
    } catch (e) {
        fail('config_read', e instanceof Error ? e.message : String(e));
        return;
    }
    if (settings === null) return;
    const filtered = filterToApprovedAxes(settings);
    if (!hasAnyApprovedConfig(filtered)) return;

    // 3. Tenant MTD aggregate (cached) — only if a tenant budget is set.
    let mtdTenantSpendUsd = 0;
    if (filtered.monthly_budget_usd !== null) {
        try {
            mtdTenantSpendUsd = await getCachedTenantMtd(ctx.tenantId, now, deps.redis as RedisLike, deps.db);
        } catch (e) {
            fail('mtd_aggregate', e instanceof Error ? e.message : String(e));
            // Continue with non-budget axes — they don't depend on MTD.
            // The budget axis is disabled by setting MTD high enough to be unreachable.
            mtdTenantSpendUsd = Number.NaN;
        }
    }

    // 4. Build the simulator context and evaluate.
    const tenantDefault: SimulatorTenantDefaultContext = {
        monthlyBudgetUsd:        filtered.monthly_budget_usd,
        maxCostPerRequestUsd:    filtered.max_cost_per_request_usd,
        humanReviewThresholdUsd: null,
        allowedModels:           filtered.allowed_models,
        allowedTaskTypes:        [],
        mtdTenantSpendUsd:       Number.isFinite(mtdTenantSpendUsd) ? mtdTenantSpendUsd : 0,
    };
    // If MTD read failed, suppress the budget axis to avoid emitting
    // bogus would_have_denied based on a 0 fallback.
    if (!Number.isFinite(mtdTenantSpendUsd)) {
        tenantDefault.monthlyBudgetUsd = null;
    }

    const simulatorCtx: SimulatorEvaluationContext = {
        tenantId: ctx.tenantId,
        tenantDefault,
    };
    const simulatorInput: SimulatorInput = {
        model_requested:    ctx.modelRequested,
        estimated_cost_usd: ctx.estimatedCostUsd,
    };

    let decision;
    try {
        decision = evaluate(simulatorInput, simulatorCtx);
    } catch (e) {
        fail('evaluator', e instanceof Error ? e.message : String(e));
        return;
    }

    // 5. Emit one shadow event per approved hit.
    for (const hit of decision.all_triggered_checks) {
        if (!APPROVED_CODES.has(hit.code)) continue;
        if (hit.source !== 'tenant_default') continue;
        const axis = axisFromHit(hit);
        if (axis === null) continue;
        const cv = configuredVsObserved(hit, axis, settings, ctx);
        emit({
            event:             'tcs_shadow_decision',
            tenant_id:         ctx.tenantId,
            request_id:        ctx.requestId,
            axis,
            code:              hit.code,
            source:            'tenant_default',
            scope:             'tenant',
            field:             hit.field ?? axis,
            configured_value:  cv.configured_value,
            observed_value:    cv.observed_value,
            would_have_denied: true,
            enforcement_mode:  'shadow',
            provider_called:   true,
            timestamp:         now.toISOString(),
        });
        // Best-effort persistence. Default off via
        // p402:tcs:shadow_persist:enabled. Never awaited; never throws.
        // Failure is logged as `tcs_shadow_persist_failed` and does not
        // affect the request or the decision log emit above.
        void persistShadowDecision({
            tenant_id:        ctx.tenantId,
            request_id:       ctx.requestId,
            axis:             axis as PersistAxis,
            code:             hit.code as PersistCode,
            field:            hit.field ?? axis,
            configured_value: cv.configured_value,
            observed_value:   cv.observed_value,
            model_requested:  ctx.modelRequested,
            enforcement_mode: 'shadow',
        }).catch(() => { /* writer never throws; defense in depth */ });
    }
}
