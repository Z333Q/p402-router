/**
 * Slice 3AA-Impl — best-effort writer for runtime_control_shadow_decisions.
 *
 * Called from lib/runtime-control/shadow.ts immediately after the
 * structured `tcs_shadow_decision` log emit. Never throws. Never blocks
 * the request. Default off via a dedicated Redis kill-switch.
 *
 * Hard rules:
 *   - This module does NOT introduce, read, or reference any runtime
 *     enforcement Redis key. Source-shape regression pins absence of
 *     that key namespace string.
 *   - This module's input type is the structured shadow record only.
 *     It must NOT accept request bodies, message arrays, model output,
 *     tool calls, or raw traces. Source-shape regression pins this.
 *   - The persistence kill-switch (p402:tcs:shadow_persist:enabled) is
 *     a SEPARATE namespace from the shadow kill-switch
 *     (p402:tcs:shadow:enabled, p402:tcs:shadow:tenant:{id}) and from
 *     any future enforcement key. It controls only whether the writer
 *     attempts an INSERT.
 *   - Default off. Absent or "0" means do nothing. Redis read failure
 *     means do nothing. Only "1" enables the write attempt.
 *   - DB failure logs a `tcs_shadow_persist_failed` event at error
 *     severity (distinct from `tcs_shadow_failed`).
 */

import redis from '@/lib/redis';
import pool from '@/lib/db';

export const SHADOW_PERSIST_FLAG_KEY = 'p402:tcs:shadow_persist:enabled';

export const APPROVED_PERSIST_AXES = [
    'monthly_budget_usd',
    'max_cost_per_request_usd',
    'allowed_models',
] as const;
export type PersistAxis = (typeof APPROVED_PERSIST_AXES)[number];

export const APPROVED_PERSIST_CODES = [
    'TENANT_BUDGET_EXCEEDED',
    'MAX_COST_PER_REQUEST_EXCEEDED',
    'MODEL_NOT_ALLOWED',
] as const;
export type PersistCode = (typeof APPROVED_PERSIST_CODES)[number];

/**
 * Structured shadow record accepted by the writer.
 *
 * This is a deliberately narrow shape — it carries only what the
 * shadow log already emits and what the table schema accepts. No
 * request-body fields, no message arrays, no content.
 */
export interface PersistableShadowRecord {
    tenant_id: string;
    request_id: string | null | undefined;
    axis: PersistAxis;
    code: PersistCode;
    field: string;
    configured_value: unknown;
    observed_value: unknown;
    model_requested: string | null | undefined;
    /** Pinned for forward compatibility; runtime always passes 'shadow'. */
    enforcement_mode?: 'shadow';
}

export interface PersistenceDependencies {
    redis?: { get: (k: string) => Promise<string | null> };
    db?: { query: (text: string, params?: unknown[]) => Promise<unknown> };
    logger?: (record: Record<string, unknown>) => void;
    now?: () => Date;
}

function defaultPersistLogger(record: Record<string, unknown>): void {
    try {
        console.error(JSON.stringify(record));
    } catch {
        // Logger failure must not crash the runtime path.
    }
}

async function isPersistEnabled(
    redisLike: PersistenceDependencies['redis'],
): Promise<boolean> {
    try {
        const v = await (redisLike ?? redis).get(SHADOW_PERSIST_FLAG_KEY);
        return v === '1';
    } catch {
        // Fail-closed: any Redis trouble → no INSERT.
        return false;
    }
}

const INSERT_SQL = `
    INSERT INTO runtime_control_shadow_decisions (
        tenant_id, request_id, emitted_at,
        axis, code, source, scope, enforcement_mode,
        field, configured_value, observed_value,
        would_have_denied, provider_called, model_requested
    ) VALUES (
        $1, $2, $3,
        $4, $5, 'tenant_default', 'tenant', 'shadow',
        $6, $7::jsonb, $8::jsonb,
        TRUE, TRUE, $9
    )
`;

/**
 * Best-effort persistence of one shadow decision.
 *
 * Never throws. Returns void. On any failure path the request is
 * unaffected. The chat route does not call this directly; only
 * lib/runtime-control/shadow.ts does, after emitting the decision log.
 */
export async function persistShadowDecision(
    record: PersistableShadowRecord,
    deps: PersistenceDependencies = {},
): Promise<void> {
    const log = deps.logger ?? defaultPersistLogger;
    const now = (deps.now ?? (() => new Date()))();
    const emit = (r: Record<string, unknown>) => {
        try { log(r); } catch { /* swallow */ }
    };

    let enabled = false;
    try {
        enabled = await isPersistEnabled(deps.redis);
    } catch {
        // isPersistEnabled itself catches; this is belt-and-suspenders.
        enabled = false;
    }
    if (!enabled) return;

    try {
        const dbLike = deps.db ?? pool;
        await dbLike.query(INSERT_SQL, [
            record.tenant_id,
            record.request_id ?? null,
            now.toISOString(),
            record.axis,
            record.code,
            record.field,
            JSON.stringify(record.configured_value ?? null),
            JSON.stringify(record.observed_value ?? null),
            record.model_requested ?? null,
        ]);
    } catch (e) {
        emit({
            event:            'tcs_shadow_persist_failed',
            tenant_id:        record.tenant_id,
            request_id:       record.request_id ?? null,
            axis:             record.axis,
            code:             record.code,
            failure_stage:    'db_insert',
            reason:           e instanceof Error ? e.message : String(e),
            enforcement_mode: 'shadow',
            timestamp:        now.toISOString(),
        });
    }
}
