/**
 * Slice 3M — Accountability dimensions loader.
 *
 * Pulls metrics from existing read-only modules (Slice 3K outcome
 * coverage, Slice 3D flip-readiness loader+assess) AND issues a small
 * number of lightweight Slice 3M-local SQL queries for the
 * meter / attribution / evidence / control / privacy dimensions.
 *
 * Every query is tenant-scoped on $1 and parameterized. No content-
 * bearing columns are referenced.
 */

import {
    assessTopLevelReadiness,
    fetchMissingOutcomeLeaderboard,
    fetchTotals as fetchOutcomeTotals,
    resolveCoverageThresholds,
} from '@/lib/prove/coverage';
import { assess as assessFlip } from '@/lib/flip-readiness/assess';
import { loadAssessmentInput } from '@/lib/flip-readiness/loader';
import { resolveThresholds as resolveFlipThresholds } from '@/lib/flip-readiness/thresholds';

import {
    deriveAttributionStatus,
    deriveControlStatus,
    deriveEvidenceStatus,
    deriveMeterStatus,
    deriveOutcomeStatus,
    derivePrivacyStatus,
    deriveRuntimeFlipStatus,
    scoreFor,
} from './score';
import {
    DEFAULT_WEIGHTS,
    type AttributionHealth,
    type ControlHealth,
    type EvidenceHealth,
    type HealthDimensions,
    type MeterHealth,
    type OptimizeReadinessHealth,
    type OutcomeHealth,
    type PrivacyHealth,
    type RuntimeFlipHealth,
} from './types';

export interface AccountabilityQueryable {
    query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

const num = (v: unknown, f = 0): number => {
    if (v == null) return f;
    const n = Number(v);
    return Number.isFinite(n) ? n : f;
};
const int = (v: unknown, f = 0): number => Math.trunc(num(v, f));

const DEFAULT_WINDOW_DAYS = 30;

export interface LoadOptions {
    since?: Date;
    until?: Date;
}

export interface DimensionsBundle {
    dimensions: HealthDimensions;
    period: { since: string; until: string };
}

// ─────────────────────────────────────────────────────────────────────────
// Top-level loader
// ─────────────────────────────────────────────────────────────────────────

export async function loadAccountabilityDimensions(
    pool: AccountabilityQueryable,
    tenantId: string,
    opts: LoadOptions = {},
): Promise<DimensionsBundle> {
    const now = new Date();
    const until = opts.until ?? now;
    const since = opts.since ?? new Date(until.getTime() - DEFAULT_WINDOW_DAYS * 86_400_000);

    const filters = { since: since.toISOString(), until: until.toISOString() };
    const coverageThresholds = resolveCoverageThresholds();

    // Outcome coverage (Slice 3K) + missing-segments leaderboard.
    const [outcomeTotals, missingSegments] = await Promise.all([
        fetchOutcomeTotals(pool, tenantId, filters, coverageThresholds),
        fetchMissingOutcomeLeaderboard(pool, tenantId, filters, 5),
    ]);
    const outcomeReadiness = assessTopLevelReadiness(outcomeTotals, coverageThresholds);

    // Flip readiness (Slice 3D + 3F) — full assessment.
    const flipInput = await loadAssessmentInput(pool, tenantId, { now });
    const flipThresholds = resolveFlipThresholds();
    const flipAssessment = assessFlip(flipInput, flipThresholds);

    // Lightweight queries for meter / attribution / evidence / control / privacy.
    type Row = Record<string, unknown>;
    const meterRow:       Row = (await loadMeterRow(pool, tenantId, since, until))[0] ?? {};
    const attributionRow: Row = (await loadAttributionRow(pool, tenantId, since, until))[0] ?? {};
    const evidenceRow:    Row = (await loadEvidenceRow(pool, tenantId, since, until))[0] ?? {};
    const controlRow:     Row = (await loadControlRow(pool, tenantId, since, until))[0] ?? {};
    const privacyRow:     Row = (await loadPrivacyRow(pool, tenantId, since, until))[0] ?? {};
    const evidenceMissingByDept     = await loadEvidenceMissingByDimension(pool, tenantId, since, until, 'department_id', 5);
    const evidenceMissingByWorkflow = await loadEvidenceMissingByDimension(pool, tenantId, since, until, 'workflow_id', 5);
    const evidenceMissingByProvider = await loadEvidenceMissingByDimension(pool, tenantId, since, until, 'provider', 5);
    const denyCodeRows              = await loadDenyCodeDistribution(pool, tenantId, since, until, 10);
    const sourceDist                = await loadSourceDistribution(pool, tenantId, since, until, 10);
    const privacyDist               = await loadPrivacyDistribution(pool, tenantId, since, until);

    // ── Meter ──────────────────────────────────────────────────────────
    const meterFacts = {
        total_events: int(meterRow.total_events),
        events_in_period: int(meterRow.events_in_period),
        event_freshness_seconds: meterRow.most_recent_event_at != null
            ? Math.max(0, Math.floor((now.getTime() - new Date(meterRow.most_recent_event_at as string | Date).getTime()) / 1000))
            : null,
        outbox_pending:   int(meterRow.outbox_pending),
        outbox_abandoned: int(meterRow.outbox_abandoned),
    };
    const meterStatus = deriveMeterStatus(meterFacts);
    const meter: MeterHealth = {
        status: meterStatus.status,
        score: scoreFor(meterStatus.status, DEFAULT_WEIGHTS.meter),
        total_events: meterFacts.total_events,
        events_in_period: meterFacts.events_in_period,
        most_recent_event_at: meterRow.most_recent_event_at instanceof Date
            ? meterRow.most_recent_event_at.toISOString()
            : (meterRow.most_recent_event_at == null ? null : String(meterRow.most_recent_event_at)),
        event_freshness_seconds: meterFacts.event_freshness_seconds,
        source_distribution: sourceDist,
        outbox_pending: meterFacts.outbox_pending,
        outbox_abandoned: meterFacts.outbox_abandoned,
        explainer: meterStatus.explainer,
    };

    // ── Attribution ────────────────────────────────────────────────────
    const events_in_period = int(meterRow.events_in_period);
    const total_spend_usd = num(meterRow.total_spend_usd);
    const attributionFacts = {
        events_in_period,
        unattributed_event_count: int(attributionRow.unattributed_event_count),
        unattributed_spend_usd:   num(attributionRow.unattributed_spend_usd),
        total_spend_usd,
    };
    const attributionStatus = deriveAttributionStatus(attributionFacts);
    const attribution: AttributionHealth = {
        status: attributionStatus.status,
        score: scoreFor(attributionStatus.status, DEFAULT_WEIGHTS.attribution),
        department_coverage_pct: pct(int(attributionRow.with_department), events_in_period),
        employee_coverage_pct:   pct(int(attributionRow.with_employee),   events_in_period),
        workflow_coverage_pct:   pct(int(attributionRow.with_workflow),   events_in_period),
        customer_coverage_pct:   pct(int(attributionRow.with_customer),   events_in_period),
        feature_coverage_pct:    pct(int(attributionRow.with_feature),    events_in_period),
        api_key_coverage_pct:    pct(int(attributionRow.with_api_key),    events_in_period),
        unattributed_event_count: attributionFacts.unattributed_event_count,
        unattributed_spend_usd:   attributionFacts.unattributed_spend_usd,
        explainer: attributionStatus.explainer,
    };

    // ── Evidence ───────────────────────────────────────────────────────
    const evidenceFacts = {
        events_in_period,
        events_with_evidence:    int(evidenceRow.events_with_evidence),
        events_missing_evidence: int(evidenceRow.events_missing_evidence),
    };
    const evidenceStatus = deriveEvidenceStatus(evidenceFacts);
    const evidence: EvidenceHealth = {
        status: evidenceStatus.status,
        score: scoreFor(evidenceStatus.status, DEFAULT_WEIGHTS.evidence),
        events_with_evidence:    evidenceFacts.events_with_evidence,
        events_missing_evidence: evidenceFacts.events_missing_evidence,
        coverage_pct: Number(evidenceStatus.coverage_pct.toFixed(4)),
        missing_by_department: evidenceMissingByDept,
        missing_by_workflow:   evidenceMissingByWorkflow,
        missing_by_provider:   evidenceMissingByProvider,
        explainer: evidenceStatus.explainer,
    };

    // ── Control ────────────────────────────────────────────────────────
    const controlFacts = {
        denied_event_count: int(controlRow.denied_event_count),
        denied_with_deny_code:       int(controlRow.denied_with_deny_code),
        denied_with_decision_source: int(controlRow.denied_with_decision_source),
        denied_with_deny_rule:       int(controlRow.denied_with_deny_rule),
        denied_provider_cost_usd:    num(controlRow.denied_provider_cost_usd),
        events_in_period,
        governance_decision_set_count: int(controlRow.governance_decision_set_count),
    };
    const controlStatus = deriveControlStatus(controlFacts);
    const control: ControlHealth = {
        status: controlStatus.status,
        score: scoreFor(controlStatus.status, DEFAULT_WEIGHTS.control),
        denied_event_count: controlFacts.denied_event_count,
        denied_with_deny_code: controlFacts.denied_with_deny_code,
        denied_with_decision_source: controlFacts.denied_with_decision_source,
        denied_with_deny_rule: controlFacts.denied_with_deny_rule,
        denied_provider_cost_usd: controlFacts.denied_provider_cost_usd,
        deny_code_distribution: denyCodeRows,
        governance_decision_coverage_pct: Number(controlStatus.governance_decision_coverage_pct.toFixed(4)),
        explainer: controlStatus.explainer,
    };

    // ── Outcomes (Slice 3K passthrough) ────────────────────────────────
    const outcomeDimensionStatus = deriveOutcomeStatus(outcomeReadiness.status);
    const outcomes: OutcomeHealth = {
        status: outcomeDimensionStatus,
        score: scoreFor(outcomeDimensionStatus, DEFAULT_WEIGHTS.outcomes),
        readiness_status: outcomeReadiness.status,
        coverage_pct: outcomeTotals.coverage_pct,
        accepted_count: outcomeTotals.status.accepted,
        accepted_threshold: coverageThresholds.min_accepted_count,
        coverage_threshold: coverageThresholds.min_coverage_pct,
        window_days: outcomeTotals.window_days,
        baseline_threshold: coverageThresholds.min_baseline_days,
        cost_per_accepted_output_usd: outcomeTotals.cost_per_accepted_output_usd,
        insufficient_data: outcomeTotals.cost_per_accepted_insufficient_data,
        top_missing_segments: missingSegments.map((s) => ({
            label: s.label,
            missing_count: s.missing_count,
            sample_request_id: s.sample_request_id,
        })),
        explainer: outcomeReadiness.explainer,
    };

    // ── Privacy ────────────────────────────────────────────────────────
    const privacyFacts = {
        events_in_period,
        prompt_stored_count:    int(privacyRow.prompt_stored_count),
        response_stored_count:  int(privacyRow.response_stored_count),
        redaction_applied_count: int(privacyRow.redaction_applied_count),
        metadata_only_count:    int(privacyRow.metadata_only_count),
    };
    const privacyStatus = derivePrivacyStatus(privacyFacts);
    const privacy: PrivacyHealth = {
        status: privacyStatus.status,
        score: scoreFor(privacyStatus.status, DEFAULT_WEIGHTS.privacy),
        privacy_mode_distribution: privacyDist,
        prompt_stored_count: privacyFacts.prompt_stored_count,
        response_stored_count: privacyFacts.response_stored_count,
        redaction_applied_count: privacyFacts.redaction_applied_count,
        metadata_only_count: privacyFacts.metadata_only_count,
        explainer: privacyStatus.explainer,
    };

    // ── Runtime flip (Slice 3D/3F passthrough) ─────────────────────────
    const flipDimStatus = deriveRuntimeFlipStatus(flipAssessment.status);
    const runtime_flip: RuntimeFlipHealth = {
        status: flipDimStatus,
        score: scoreFor(flipDimStatus, DEFAULT_WEIGHTS.runtime_flip),
        flip_status: flipAssessment.status,
        flip_reason: flipAssessment.reason,
        mtd_passes: flipAssessment.criteria.some((c) =>
            c.criterion === 'coverage_pct_mtd' && c.status === 'pass'),
        prev_calendar_month_complete:
            flipAssessment.windows.previous_calendar_month.complete &&
            flipAssessment.criteria.some((c) =>
                c.criterion === 'coverage_pct_previous_calendar_month' && c.status === 'pass'),
        explainer:
            'Runtime flip status is read straight from the Slice 3D / 3F assessment. ' +
            'Runtime budget enforcement remains on the legacy spend source until the gate flips. ' +
            (flipAssessment.status === 'ready_to_flip'
                ? 'All criteria pass; operator action is still required to perform the flip.'
                : `Currently ${flipAssessment.status} (${flipAssessment.reason}).`),
    };

    // ── Optimize readiness (informational, not in weighted score) ──────
    const optimizeStatus = deriveOutcomeStatus(outcomeReadiness.status);
    const optimize_readiness: OptimizeReadinessHealth = {
        status: optimizeStatus,
        // weight 0 -> weighted contribution is 0, but subscore is shown.
        score: scoreFor(optimizeStatus, 0),
        recommendations_enabled: false,
        savings_claims_enabled:  false,
        readiness_status: outcomeReadiness.status,
        explainer:
            'Optimize readiness reports whether outcome data is sufficient for ANALYSIS. ' +
            'Recommendations and savings claims remain blocked in this slice regardless of this status.',
    };

    return {
        period: { since: since.toISOString(), until: until.toISOString() },
        dimensions: {
            meter, attribution, evidence, control, outcomes,
            privacy, runtime_flip, optimize_readiness,
        },
    };
}

function pct(numer: number, denom: number): number {
    if (denom <= 0) return 0;
    return Number(((numer / denom) * 100).toFixed(4));
}

// ─────────────────────────────────────────────────────────────────────────
// Lightweight Slice 3M-local SQL
// ─────────────────────────────────────────────────────────────────────────

async function loadMeterRow(pool: AccountabilityQueryable, tenantId: string, since: Date, until: Date) {
    // Combine total + in-period counts + freshness + spend + outbox in two
    // queries. Pure read; tenant-scoped on $1.
    const { rows: aRows } = await pool.query(
        `SELECT
             COUNT(*)::int                                                AS total_events,
             COUNT(*) FILTER (WHERE event_time >= $2 AND event_time < $3)::int AS events_in_period,
             MAX(event_time)                                              AS most_recent_event_at,
             COALESCE(SUM(cost_usd) FILTER (WHERE event_time >= $2 AND event_time < $3), 0)::float
                                                                          AS total_spend_usd
           FROM ai_economic_events
          WHERE tenant_id = $1`,
        [tenantId, since, until],
    );
    let outbox_pending = 0, outbox_abandoned = 0;
    try {
        const { rows: oRows } = await pool.query(
            `SELECT
                 COUNT(*) FILTER (WHERE status = 'pending')::int   AS outbox_pending,
                 COUNT(*) FILTER (WHERE status = 'abandoned')::int AS outbox_abandoned
               FROM economic_event_write_failures
              WHERE tenant_id = $1`,
            [tenantId],
        );
        outbox_pending   = int(oRows[0]?.outbox_pending);
        outbox_abandoned = int(oRows[0]?.outbox_abandoned);
    } catch {
        // Outbox table absent — treat as 0/0 and let the operator notice
        // elsewhere (the flip-readiness gate already fails closed).
    }
    return [{
        ...aRows[0],
        outbox_pending,
        outbox_abandoned,
    }];
}

async function loadAttributionRow(pool: AccountabilityQueryable, tenantId: string, since: Date, until: Date) {
    const { rows } = await pool.query(
        `SELECT
             COUNT(*) FILTER (WHERE department_id IS NOT NULL)::int AS with_department,
             COUNT(*) FILTER (WHERE employee_id   IS NOT NULL)::int AS with_employee,
             COUNT(*) FILTER (WHERE workflow_id   IS NOT NULL)::int AS with_workflow,
             COUNT(*) FILTER (WHERE customer_id   IS NOT NULL)::int AS with_customer,
             COUNT(*) FILTER (WHERE feature_id    IS NOT NULL)::int AS with_feature,
             COUNT(*) FILTER (WHERE api_key_id    IS NOT NULL)::int AS with_api_key,
             COUNT(*) FILTER (
                 WHERE department_id IS NULL AND employee_id IS NULL
                   AND workflow_id   IS NULL AND customer_id IS NULL
                   AND feature_id    IS NULL AND api_key_id  IS NULL
             )::int AS unattributed_event_count,
             COALESCE(SUM(cost_usd) FILTER (
                 WHERE department_id IS NULL AND employee_id IS NULL
                   AND workflow_id   IS NULL AND customer_id IS NULL
                   AND feature_id    IS NULL AND api_key_id  IS NULL
             ), 0)::float AS unattributed_spend_usd
           FROM ai_economic_events
          WHERE tenant_id = $1 AND event_time >= $2 AND event_time < $3`,
        [tenantId, since, until],
    );
    return [rows[0] ?? {}];
}

async function loadEvidenceRow(pool: AccountabilityQueryable, tenantId: string, since: Date, until: Date) {
    const { rows } = await pool.query(
        `SELECT
             COUNT(*) FILTER (WHERE evidence_bundle_id IS NOT NULL)::int AS events_with_evidence,
             COUNT(*) FILTER (WHERE evidence_bundle_id IS NULL)::int     AS events_missing_evidence
           FROM ai_economic_events
          WHERE tenant_id = $1 AND event_time >= $2 AND event_time < $3`,
        [tenantId, since, until],
    );
    return [rows[0] ?? {}];
}

async function loadEvidenceMissingByDimension(
    pool: AccountabilityQueryable,
    tenantId: string,
    since: Date, until: Date,
    column: 'department_id' | 'workflow_id' | 'provider',
    limit: number,
): Promise<Array<{ key: string; missing: number; total: number }>> {
    const { rows } = await pool.query(
        `SELECT COALESCE(${column}::text, 'Unattributed') AS key,
                COUNT(*) FILTER (WHERE evidence_bundle_id IS NULL)::int AS missing,
                COUNT(*)::int                                           AS total
           FROM ai_economic_events
          WHERE tenant_id = $1 AND event_time >= $2 AND event_time < $3
          GROUP BY 1
          HAVING COUNT(*) FILTER (WHERE evidence_bundle_id IS NULL) > 0
          ORDER BY missing DESC
          LIMIT $4`,
        [tenantId, since, until, limit],
    );
    return rows.map((r) => ({
        key: String(r.key ?? 'Unattributed'),
        missing: int(r.missing),
        total: int(r.total),
    }));
}

async function loadControlRow(pool: AccountabilityQueryable, tenantId: string, since: Date, until: Date) {
    const { rows } = await pool.query(
        `SELECT
             COUNT(*) FILTER (WHERE governance_decision = 'denied')::int AS denied_event_count,
             COUNT(*) FILTER (
                 WHERE governance_decision = 'denied' AND deny_code IS NOT NULL
             )::int AS denied_with_deny_code,
             COUNT(*) FILTER (
                 WHERE governance_decision = 'denied' AND metadata ? 'decision_source'
             )::int AS denied_with_decision_source,
             COUNT(*) FILTER (
                 WHERE governance_decision = 'denied' AND metadata ? 'deny_rule'
             )::int AS denied_with_deny_rule,
             COALESCE(SUM(cost_usd) FILTER (
                 WHERE governance_decision = 'denied'
             ), 0)::float AS denied_provider_cost_usd,
             COUNT(*) FILTER (WHERE governance_decision IS NOT NULL)::int
                                                                AS governance_decision_set_count
           FROM ai_economic_events
          WHERE tenant_id = $1 AND event_time >= $2 AND event_time < $3`,
        [tenantId, since, until],
    );
    return [rows[0] ?? {}];
}

async function loadDenyCodeDistribution(
    pool: AccountabilityQueryable,
    tenantId: string,
    since: Date, until: Date,
    limit: number,
): Promise<Array<{ deny_code: string; count: number }>> {
    const { rows } = await pool.query(
        `SELECT deny_code, COUNT(*)::int AS count
           FROM ai_economic_events
          WHERE tenant_id = $1 AND event_time >= $2 AND event_time < $3
            AND governance_decision = 'denied' AND deny_code IS NOT NULL
          GROUP BY deny_code
          ORDER BY count DESC
          LIMIT $4`,
        [tenantId, since, until, limit],
    );
    return rows.map((r) => ({ deny_code: String(r.deny_code), count: int(r.count) }));
}

async function loadSourceDistribution(
    pool: AccountabilityQueryable,
    tenantId: string,
    since: Date, until: Date,
    limit: number,
): Promise<Array<{ source: string; count: number }>> {
    const { rows } = await pool.query(
        `SELECT source, COUNT(*)::int AS count
           FROM ai_economic_events
          WHERE tenant_id = $1 AND event_time >= $2 AND event_time < $3
          GROUP BY source
          ORDER BY count DESC
          LIMIT $4`,
        [tenantId, since, until, limit],
    );
    return rows.map((r) => ({ source: String(r.source ?? 'unknown'), count: int(r.count) }));
}

async function loadPrivacyRow(pool: AccountabilityQueryable, tenantId: string, since: Date, until: Date) {
    const { rows } = await pool.query(
        `SELECT
             COUNT(*) FILTER (WHERE prompt_stored      IS TRUE)::int  AS prompt_stored_count,
             COUNT(*) FILTER (WHERE response_stored    IS TRUE)::int  AS response_stored_count,
             COUNT(*) FILTER (WHERE redaction_applied  IS TRUE)::int  AS redaction_applied_count,
             COUNT(*) FILTER (WHERE privacy_mode = 'metadata_only')::int AS metadata_only_count
           FROM ai_economic_events
          WHERE tenant_id = $1 AND event_time >= $2 AND event_time < $3`,
        [tenantId, since, until],
    );
    return [rows[0] ?? {}];
}

async function loadPrivacyDistribution(
    pool: AccountabilityQueryable,
    tenantId: string,
    since: Date, until: Date,
): Promise<Array<{ privacy_mode: string; count: number }>> {
    const { rows } = await pool.query(
        `SELECT privacy_mode, COUNT(*)::int AS count
           FROM ai_economic_events
          WHERE tenant_id = $1 AND event_time >= $2 AND event_time < $3
          GROUP BY privacy_mode
          ORDER BY count DESC`,
        [tenantId, since, until],
    );
    return rows.map((r) => ({ privacy_mode: String(r.privacy_mode ?? 'unknown'), count: int(r.count) }));
}
