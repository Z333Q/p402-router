import { computeConfidence } from '../confidence';
import type {
  AllowlistEntry,
  Candidate,
  GateResult,
  GeneratorInput,
} from '../types';
import type { OptimizeThresholds } from '../thresholds';
import { buildEvidenceSnapshot, candidateId, idRange, nowIso } from './shared';

const NEW_ADD_GUARD_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function key(tenant: string, model: string): string {
  return `${tenant}::${model}`;
}

export function generateModelAllowlistCleanup(
  input: GeneratorInput,
  thresholds: OptimizeThresholds,
  nowFn: () => string = nowIso,
): Candidate[] {
  const now = new Date(nowFn()).getTime();
  const windowStart = new Date(input.window.start).getTime();

  const eventCountByTenantModel = new Map<string, number>();
  for (const ev of input.events) {
    const k = key(ev.tenant_id, ev.model_id);
    eventCountByTenantModel.set(k, (eventCountByTenantModel.get(k) ?? 0) + 1);
  }

  const tenantAcceptedOutcomes = new Map<string, number>();
  for (const o of input.outcomes) {
    if (o.status !== 'accepted') continue;
    tenantAcceptedOutcomes.set(o.tenant_id, (tenantAcceptedOutcomes.get(o.tenant_id) ?? 0) + 1);
  }

  const allowlistByTenant = new Map<string, AllowlistEntry[]>();
  for (const entry of input.allowlist) {
    const list = allowlistByTenant.get(entry.tenant_id) ?? [];
    list.push(entry);
    allowlistByTenant.set(entry.tenant_id, list);
  }

  const results: Candidate[] = [];

  for (const [tenant, entries] of allowlistByTenant) {
    const tenantAccepted = tenantAcceptedOutcomes.get(tenant) ?? 0;
    const tenantWideAcceptedOk = tenantAccepted >= thresholds.ACCEPTED_OUTCOME_MIN;

    for (const entry of entries) {
      const eventCount = eventCountByTenantModel.get(key(tenant, entry.model_id)) ?? 0;
      const addedAt = new Date(entry.added_at).getTime();
      const stableThroughoutWindow = addedAt <= windowStart && !entry.removed_at;
      const addedRecently = (now - addedAt) < NEW_ADD_GUARD_DAYS * MS_PER_DAY;

      const gates: GateResult[] = [
        { name: 'baseline_window_days', value: input.window.days, threshold: thresholds.BASELINE_WINDOW_DAYS, passed: input.window.days >= thresholds.BASELINE_WINDOW_DAYS },
        { name: 'zero_traffic_on_slice', value: eventCount, threshold: 0, passed: eventCount === 0 },
        { name: 'allowlist_stable_window', value: stableThroughoutWindow, threshold: true, passed: stableThroughoutWindow },
        { name: 'tenant_wide_accepted_min', value: tenantAccepted, threshold: thresholds.ACCEPTED_OUTCOME_MIN, passed: tenantWideAcceptedOk },
        { name: 'not_added_recently', value: !addedRecently, threshold: true, passed: !addedRecently },
      ];
      if (!gates.every((g) => g.passed)) continue;

      const confidence = computeConfidence(
        {
          n_events: 500,
          outcome_coverage: 1,
          cpao_coefficient_of_variation: 0,
          attribution_completeness: 1,
          shadow_coverage: 1,
          type_term: 1,
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

      results.push({
        candidate_id: candidateId('model_allowlist_cleanup', tenant, entry.model_id),
        tenant_id: tenant,
        type: 'model_allowlist_cleanup',
        slice: { tenant_id: tenant, model_id: entry.model_id },
        evidence_snapshot: buildEvidenceSnapshot({
          events: idRange([]),
          outcomes: idRange([]),
          shadow: idRange([]),
          window: input.window,
        }),
        gate_results: allGates,
        confidence_score: confidence.score,
        confidence_inputs: { ...confidence, gates: allGates },
        status: 'internal_candidate',
        created_at: nowFn(),
      });
    }
  }

  return results;
}
