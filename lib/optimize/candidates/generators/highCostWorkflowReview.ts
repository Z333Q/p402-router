import { computeConfidence, meanAndCV } from '../confidence';
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

const SLICE_ACCEPTED_OUTCOME_FLOOR = 30;
const OUTLIER_RATIO_FLOOR = 2.0;
const OUTLIER_RATIO_SATURATION = 4.0;
const MIN_PEER_WORKFLOWS = 3;

function key(tenant: string, workflow: string): string {
  return `${tenant}::${workflow}`;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  return sorted[mid] ?? 0;
}

export function generateHighCostWorkflowReview(
  input: GeneratorInput,
  thresholds: OptimizeThresholds,
  nowFn: () => string = nowIso,
): Candidate[] {
  const outcomesByEvent = new Map<string, OutcomeRecord>();
  for (const o of input.outcomes) outcomesByEvent.set(o.event_id, o);

  const shadowByEvent = new Map<string, ShadowDecisionRecord>();
  for (const s of input.shadow_decisions) shadowByEvent.set(s.event_id, s);

  const sliceBuckets = new Map<string, { tenant: string; workflow: string; events: EconomicEvent[] }>();
  for (const ev of input.events) {
    const k = key(ev.tenant_id, ev.workflow_id);
    let bucket = sliceBuckets.get(k);
    if (!bucket) {
      bucket = { tenant: ev.tenant_id, workflow: ev.workflow_id, events: [] };
      sliceBuckets.set(k, bucket);
    }
    bucket.events.push(ev);
  }

  const tenantTotals = new Map<string, number>();
  for (const ev of input.events) tenantTotals.set(ev.tenant_id, (tenantTotals.get(ev.tenant_id) ?? 0) + ev.cost_usd);

  const cpaoByTenant = new Map<string, { workflow: string; cpao: number }[]>();
  for (const bucket of sliceBuckets.values()) {
    const cost = bucket.events.reduce((a, b) => a + b.cost_usd, 0);
    const accepted = bucket.events.filter((e) => outcomesByEvent.get(e.id)?.status === 'accepted').length;
    if (accepted <= 0) continue;
    const cpao = cost / accepted;
    const list = cpaoByTenant.get(bucket.tenant) ?? [];
    list.push({ workflow: bucket.workflow, cpao });
    cpaoByTenant.set(bucket.tenant, list);
  }

  const results: Candidate[] = [];

  for (const bucket of sliceBuckets.values()) {
    const eventCount = bucket.events.length;
    const cost = bucket.events.reduce((a, b) => a + b.cost_usd, 0);
    const resolved = bucket.events.filter((e) => outcomesByEvent.has(e.id));
    const accepted = resolved.filter((e) => outcomesByEvent.get(e.id)?.status === 'accepted').length;
    const outcomeCoverage = eventCount > 0 ? resolved.length / eventCount : 0;
    const attributionCompleteness = eventCount > 0
      ? bucket.events.filter((e) => e.workflow_id && e.tenant_id).length / eventCount
      : 0;
    const attributionGap = 1 - attributionCompleteness;
    const sliceShare = sliceShareOfTenant(cost, tenantTotals.get(bucket.tenant) ?? 0);
    const shadowCovered = bucket.events.filter((e) => shadowByEvent.has(e.id)).length;
    const shadowCoverage = eventCount > 0 ? shadowCovered / eventCount : 0;

    const peerList = cpaoByTenant.get(bucket.tenant) ?? [];
    const peerCpaoValues = peerList.map((p) => p.cpao);
    const peerMedian = median(peerCpaoValues);
    const sliceCpao = accepted > 0 ? cost / accepted : Infinity;
    const ratio = peerMedian > 0 ? sliceCpao / peerMedian : 0;

    const gates: GateResult[] = [
      { name: 'baseline_window_days', value: input.window.days, threshold: thresholds.BASELINE_WINDOW_DAYS, passed: input.window.days >= thresholds.BASELINE_WINDOW_DAYS },
      { name: 'outcome_coverage_min', value: outcomeCoverage, threshold: thresholds.OUTCOME_COVERAGE_MIN, passed: outcomeCoverage >= thresholds.OUTCOME_COVERAGE_MIN },
      { name: 'accepted_outcome_min', value: accepted, threshold: thresholds.ACCEPTED_OUTCOME_MIN, passed: accepted >= thresholds.ACCEPTED_OUTCOME_MIN },
      { name: 'attribution_gap', value: attributionGap, threshold: thresholds.ATTRIBUTION_GAP_MAX, passed: attributionGap <= thresholds.ATTRIBUTION_GAP_MAX },
      { name: 'slice_traffic_share', value: sliceShare, threshold: thresholds.SLICE_TRAFFIC_MIN, passed: sliceShare >= thresholds.SLICE_TRAFFIC_MIN },
      { name: 'slice_accepted_outcome_floor', value: accepted, threshold: SLICE_ACCEPTED_OUTCOME_FLOOR, passed: accepted >= SLICE_ACCEPTED_OUTCOME_FLOOR },
      { name: 'min_peer_workflows', value: peerCpaoValues.length, threshold: MIN_PEER_WORKFLOWS + 1, passed: peerCpaoValues.length >= MIN_PEER_WORKFLOWS + 1 },
      { name: 'cpao_ratio_above_floor', value: ratio, threshold: OUTLIER_RATIO_FLOOR, passed: ratio >= OUTLIER_RATIO_FLOOR },
    ];
    if (!gates.every((g) => g.passed)) continue;

    const typeTerm = Math.min(1, Math.max(0, (ratio - OUTLIER_RATIO_FLOOR) / (OUTLIER_RATIO_SATURATION - OUTLIER_RATIO_FLOOR)));
    const costs = bucket.events.map((e) => e.cost_usd);
    const { cv } = meanAndCV(costs);

    const confidence = computeConfidence(
      {
        n_events: eventCount,
        outcome_coverage: outcomeCoverage,
        cpao_coefficient_of_variation: cv,
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

    const sliceEventIds = bucket.events.map((e) => e.id);
    const sliceOutcomeIds = resolved.map((e) => outcomesByEvent.get(e.id)?.id).filter((x): x is string => Boolean(x));
    const sliceShadowIds = bucket.events.map((e) => shadowByEvent.get(e.id)?.id).filter((x): x is string => Boolean(x));

    results.push({
      candidate_id: candidateId('high_cost_workflow_review', bucket.tenant, bucket.workflow),
      tenant_id: bucket.tenant,
      type: 'high_cost_workflow_review',
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
