/**
 * Slice 3S — Control Configuration Foundation.
 *
 * Typed helpers for tenant_control_settings (v2_055). Pure where possible;
 * the DB read is colocated here so the route + the future simulator
 * wire-up share one source of truth.
 *
 * This module is deliberately decoupled from the runtime budget-guard and
 * from the Control simulator. Slice 3S does not wire saved values into
 * either. A later sub-slice will read these values from the simulator and
 * eventually from the runtime.
 */

import db from '@/lib/db';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TenantControlSettings = {
    monthly_budget_usd:         number | null;
    max_cost_per_request_usd:   number | null;
    human_review_threshold_usd: number | null;
    allowed_models:             string[];
    allowed_task_types:         string[];
};

export type TenantControlSettingsRead =
    | (TenantControlSettings & { source: 'tenant_default'; metadata: Record<string, unknown> })
    | (TenantControlSettings & { source: 'system_default' });

export const SYSTEM_DEFAULT_CONTROL_SETTINGS: TenantControlSettings = {
    monthly_budget_usd:         null,
    max_cost_per_request_usd:   null,
    human_review_threshold_usd: null,
    allowed_models:             [],
    allowed_task_types:         [],
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH body validation
// ─────────────────────────────────────────────────────────────────────────────

const SCALAR_KEYS = [
    'monthly_budget_usd',
    'max_cost_per_request_usd',
    'human_review_threshold_usd',
] as const;

const ARRAY_KEYS = [
    'allowed_models',
    'allowed_task_types',
] as const;

const PATCHABLE_KEYS = new Set<string>([...SCALAR_KEYS, ...ARRAY_KEYS]);

const MAX_ARRAY_ENTRIES = 200;

export type ScalarKey = (typeof SCALAR_KEYS)[number];
export type ArrayKey  = (typeof ARRAY_KEYS)[number];

export type PatchInput = Partial<
    & Record<ScalarKey, number | null>
    & Record<ArrayKey,  string[]>
>;

export type ValidatedPatch = {
    scalars: Partial<Record<ScalarKey, number | null>>;
    arrays:  Partial<Record<ArrayKey,  string[]>>;
};

export type ValidationError = {
    code: 'INVALID_INPUT';
    message: string;
};

export function validatePatchInput(body: unknown): ValidatedPatch | ValidationError {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return { code: 'INVALID_INPUT', message: 'Body must be a JSON object.' };
    }
    const obj = body as Record<string, unknown>;

    // Body tenant_id is rejected outright. Silently dropping would make the
    // failure invisible and is exactly the kind of write-confusion bug we
    // want to fail closed on.
    if ('tenant_id' in obj) {
        return { code: 'INVALID_INPUT', message: 'tenant_id is not patchable on this surface; the route resolves tenant from session context.' };
    }

    // Unknown keys fail closed; no silent drop.
    for (const k of Object.keys(obj)) {
        if (!PATCHABLE_KEYS.has(k)) {
            return { code: 'INVALID_INPUT', message: `Unknown field: ${k}` };
        }
    }

    const scalars: Partial<Record<ScalarKey, number | null>> = {};
    for (const key of SCALAR_KEYS) {
        if (!(key in obj)) continue;
        const v = obj[key];
        if (v === null) {
            // Explicit null clears the configured value.
            scalars[key] = null;
            continue;
        }
        // String numbers must be rejected. typeof 'string' covers '42'.
        if (typeof v !== 'number') {
            return { code: 'INVALID_INPUT', message: `${key} must be a number or null; received ${typeof v}` };
        }
        if (!Number.isFinite(v)) {
            return { code: 'INVALID_INPUT', message: `${key} must be a finite number` };
        }
        if (v < 0) {
            return { code: 'INVALID_INPUT', message: `${key} must be >= 0` };
        }
        scalars[key] = v;
    }

    const arrays: Partial<Record<ArrayKey, string[]>> = {};
    for (const key of ARRAY_KEYS) {
        if (!(key in obj)) continue;
        const v = obj[key];
        if (!Array.isArray(v)) {
            return { code: 'INVALID_INPUT', message: `${key} must be an array of strings` };
        }
        if (v.length > MAX_ARRAY_ENTRIES) {
            return { code: 'INVALID_INPUT', message: `${key} accepts at most ${MAX_ARRAY_ENTRIES} entries` };
        }
        const cleaned: string[] = [];
        const seen = new Set<string>();
        for (const entry of v) {
            if (typeof entry !== 'string') {
                return { code: 'INVALID_INPUT', message: `${key} entries must be strings` };
            }
            const trimmed = entry.trim();
            if (trimmed.length === 0) {
                return { code: 'INVALID_INPUT', message: `${key} entries must be non-empty strings` };
            }
            if (seen.has(trimmed)) {
                return { code: 'INVALID_INPUT', message: `${key} entries must be unique` };
            }
            seen.add(trimmed);
            cleaned.push(trimmed);
        }
        arrays[key] = cleaned;
    }

    return { scalars, arrays };
}

// ─────────────────────────────────────────────────────────────────────────────
// DB helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function getTenantControlSettings(tenantId: string): Promise<TenantControlSettingsRead> {
    const r = await db.query(
        `SELECT monthly_budget_usd, max_cost_per_request_usd, human_review_threshold_usd,
                allowed_models, allowed_task_types, metadata
           FROM tenant_control_settings WHERE tenant_id = $1 LIMIT 1`,
        [tenantId],
    );
    const row = r.rows[0];
    if (!row) {
        return { ...SYSTEM_DEFAULT_CONTROL_SETTINGS, source: 'system_default' };
    }
    return {
        monthly_budget_usd:         row.monthly_budget_usd         === null ? null : Number(row.monthly_budget_usd),
        max_cost_per_request_usd:   row.max_cost_per_request_usd   === null ? null : Number(row.max_cost_per_request_usd),
        human_review_threshold_usd: row.human_review_threshold_usd === null ? null : Number(row.human_review_threshold_usd),
        allowed_models:             Array.isArray(row.allowed_models)     ? row.allowed_models     : [],
        allowed_task_types:         Array.isArray(row.allowed_task_types) ? row.allowed_task_types : [],
        metadata:                   typeof row.metadata === 'object' && row.metadata !== null ? row.metadata : {},
        source:                     'tenant_default',
    };
}

export type UpsertParams = {
    tenantId: string;
    actorEmail: string;
    patch: ValidatedPatch;
};

/**
 * UPSERT the tenant control settings. Partial updates preserve untouched
 * columns by COALESCEing against the existing row. The audit metadata
 * (last_modified_by_email, last_modified_at) is merged into metadata
 * atomically on every write.
 */
export async function upsertTenantControlSettings({
    tenantId,
    actorEmail,
    patch,
}: UpsertParams): Promise<TenantControlSettingsRead> {
    const auditMeta = {
        last_modified_by_email: actorEmail,
        last_modified_at: new Date().toISOString(),
    };

    // We pass the patched values as nullable parameters; the COALESCE-on-EXCLUDED
    // pattern lets us preserve untouched columns on UPDATE.
    //
    // For scalars: `$N::numeric` with null parameter means "no change"
    // (we differentiate "no change" from "explicit null clear" via the
    // `set_*` boolean flags that follow). For arrays: same pattern with
    // boolean set flags.

    const params: Array<string | number | null | boolean | object | string[]> = [
        tenantId,                                                              // $1
        'monthly_budget_usd'         in patch.scalars ? patch.scalars.monthly_budget_usd         ?? null : null,  // $2
        'monthly_budget_usd'         in patch.scalars,                          // $3
        'max_cost_per_request_usd'   in patch.scalars ? patch.scalars.max_cost_per_request_usd   ?? null : null,  // $4
        'max_cost_per_request_usd'   in patch.scalars,                          // $5
        'human_review_threshold_usd' in patch.scalars ? patch.scalars.human_review_threshold_usd ?? null : null,  // $6
        'human_review_threshold_usd' in patch.scalars,                          // $7
        JSON.stringify(patch.arrays.allowed_models     ?? []),                  // $8
        'allowed_models'     in patch.arrays,                                   // $9
        JSON.stringify(patch.arrays.allowed_task_types ?? []),                  // $10
        'allowed_task_types' in patch.arrays,                                   // $11
        auditMeta,                                                              // $12
    ];

    const sql = `
        INSERT INTO tenant_control_settings (
            tenant_id,
            monthly_budget_usd,
            max_cost_per_request_usd,
            human_review_threshold_usd,
            allowed_models,
            allowed_task_types,
            metadata
        ) VALUES (
            $1,
            CASE WHEN $3::boolean THEN $2::numeric ELSE NULL END,
            CASE WHEN $5::boolean THEN $4::numeric ELSE NULL END,
            CASE WHEN $7::boolean THEN $6::numeric ELSE NULL END,
            CASE WHEN $9::boolean  THEN $8::jsonb  ELSE '[]'::jsonb END,
            CASE WHEN $11::boolean THEN $10::jsonb ELSE '[]'::jsonb END,
            $12::jsonb
        )
        ON CONFLICT (tenant_id) DO UPDATE SET
            monthly_budget_usd =
                CASE WHEN $3::boolean  THEN $2::numeric  ELSE tenant_control_settings.monthly_budget_usd         END,
            max_cost_per_request_usd =
                CASE WHEN $5::boolean  THEN $4::numeric  ELSE tenant_control_settings.max_cost_per_request_usd   END,
            human_review_threshold_usd =
                CASE WHEN $7::boolean  THEN $6::numeric  ELSE tenant_control_settings.human_review_threshold_usd END,
            allowed_models =
                CASE WHEN $9::boolean  THEN $8::jsonb    ELSE tenant_control_settings.allowed_models             END,
            allowed_task_types =
                CASE WHEN $11::boolean THEN $10::jsonb   ELSE tenant_control_settings.allowed_task_types         END,
            metadata =
                COALESCE(tenant_control_settings.metadata, '{}'::jsonb) || $12::jsonb,
            updated_at = NOW()
        RETURNING *
    `;

    await db.query(sql, params);
    // Always re-read so the returned shape matches GET exactly.
    return getTenantControlSettings(tenantId);
}
