import { computeConfidence } from '../confidence';
import type {
  Candidate,
  EconomicEvent,
  GateResult,
  GeneratorInput,
  OutcomeRecord,
  ShadowDecisionRecord,
} from '../types';
import type { OptimizeThresholds } from '../thresholds';
import { buildEvidenceSnapshot, candidateId, idRange, nowIso, sliceShareOfTenant } from './shared';

const COVERAGE_CEILING = 0.4;

function sliceKey(tenant: string, workflow: string): string {
  return `${tenant}::${workflow}`;
}

export function generateMissingOutcomeCoverage(
  input: GeneratorInput,
  thresholds: OptimizeThresholds,
  nowFn: () => string = nowIso,
): Candidate[] {
  const byWorkflow = new Map<string, { tenant: string; workflow: string; events: EconomicEvent[] }>();
  for (const ev of input.events) {
    const k = sliceKey(ev.tenant_id, ev.workflow_id);
    let bucket = byWorkflow.get(k);
    if (!bucket) {
      bucket = { tenant: ev.tenant_id, workflow: ev.workflow_id, events: [] };
      byWorkflow.set(k, bucket);
    }
    bucket.events.push(ev);
  }

  const tenantTotalsByTenant = new Map<string, number>();
  for (const ev of input.events) {
    tenantTotalsByTenant.set(ev.tenant_id, (tenantTotalsByTenant.get(ev.tenant_id) ?? 0) + ev.cost_usd);
  }

  const outcomesByEvent = new Map<string, OutcomeRecord>();
  for (const o of input.outcomes) outcomesByEvent.set(o.event_id, o);

  const shadowByEvent = new Map<string, ShadowDecisionRecord>();
  for (const s of input.shadow_decisions) shadowByEvent.set(s.event_id, s);

  const results: Candidate[] = [];

  for (const bucket of byWorkflow.values()) {
    const events = bucket.events;
    const eventCount = events.length;
    const sliceSpend = events.reduce((a, b) => a + b.cost_usd, 0);
    const tenantSpend = tenantTotalsByTenant.get(bucket.tenant) ?? 0;
    const sliceShare = sliceShareOfTenant(sliceSpend, tenantSpend);

    const resolvedOutcomes = events.filter((e) => outcomesByEvent.has(e.id));
    const outcomeCoverage = eventCount > 0 ? resolvedOutcomes.length / eventCount : 0;

    const attributionCompleteness = eventCount > 0
      ? events.filter((e) => e.workflow_id && e.tenant_id).length / eventCount
      : 0;
    const attributionGap = 1 - attributionCompleteness;

    const shadowCovered = events.filter((e) => shadowByEvent.has(e.id)).length;
    const shadowCoverage = eventCount > 0 ? shadowCovered / eventCount : 0;

    const gates: GateResult[] = [
      { name: 'coverage_below_ceiling', value: outcomeCoverage, threshold: COVERAGE_CEILING, passed: outcomeCoverage < COVERAGE_CEILING },
      { name: 'slice_traffic_share', value: sliceShare, threshold: thresholds.SLICE_TRAFFIC_MIN, passed: sliceShare >= thresholds.SLICE_TRAFFIC_MIN },
      { name: 'attribution_gap', value: attributionGap, threshold: thresholds.ATTRIBUTION_GAP_MAX, passed: attributionGap <= thresholds.ATTRIBUTION_GAP_MAX },
      { name: 'baseline_window_days', value: input.window.days, threshold: thresholds.BASELINE_WINDOW_DAYS, passed: input.window.days >= thresholds.BASELINE_WINDOW_DAYS },
    ];
    if (!gates.every((g) => g.passed)) continue;

    const typeTerm = 1 - outcomeCoverage;
    const confidence = computeConfidence(
      {
        n_events: eventCount,
        outcome_coverage: outcomeCoverage,
        cpao_coefficient_of_variation: 0,
        attribution_completeness: attributionCompleteness,
        shadow_coverage: shadowCoverage,
        type_term: typeTerm,
      },
      gates,
    );

    const confidenceGate: GateResult = {
      name: 'confidence_min',
      value: confidence.score,
      threshold: thresholds.CONFIDENCE_MIN,
      passed: confidence.score >= thresholds.CONFIDENCE_MIN,
    };
    const allGates = [...gates, confidenceGate];
    if (!confidenceGate.passed) continue;

    const sliceEventIds = events.map((e) => e.id);
    const sliceOutcomeIds = resolvedOutcomes
      .map((e) => outcomesByEvent.get(e.id)?.id)
      .filter((x): x is string => Boolean(x));
    const sliceShadowIds = events
      .map((e) => shadowByEvent.get(e.id)?.id)
      .filter((x): x is string => Boolean(x));

    results.push({
      candidate_id: candidateId('missing_outcome_coverage', bucket.tenant, bucket.workflow),
      tenant_id: bucket.tenant,
      type: 'missing_outcome_coverage',
      slice: { tenant_id: bucket.tenant, workflow_id: bucket.workflow },
      evidence_snapshot: buildEvidenceSnapshot({
        events: idRange(sliceEventIds),
        outcomes: idRange(sliceOutcomeIds),
        shadow: idRange(sliceShadowIds),
        window: input.window,
      }),
      gate_results: allGates,
      confidence_score: confidence.score,
      confidence_inputs: { ...confidence, gates: allGates },
      status: 'internal_candidate',
      created_at: nowFn(),
    });
  }

  return results;
}
