import type { ConfidenceInputBreakdown, ConfidenceInputs, GateResult } from './types';

export const CONFIDENCE_WEIGHTS = {
  sample: 0.15,
  outcome: 0.25,
  invvar: 0.15,
  attr: 0.15,
  shadow: 0.1,
  type: 0.2,
} as const;

export interface ConfidenceRawInputs {
  n_events: number;
  outcome_coverage: number;
  cpao_coefficient_of_variation: number;
  attribution_completeness: number;
  shadow_coverage: number;
  type_term: number;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function normalize(raw: ConfidenceRawInputs): Record<keyof ConfidenceRawInputs, number> {
  return {
    n_events: clamp01(raw.n_events / 500),
    outcome_coverage: clamp01(raw.outcome_coverage),
    cpao_coefficient_of_variation: clamp01(1 / (1 + Math.max(0, raw.cpao_coefficient_of_variation))),
    attribution_completeness: clamp01(raw.attribution_completeness),
    shadow_coverage: clamp01(raw.shadow_coverage),
    type_term: clamp01(raw.type_term),
  };
}

export function computeConfidence(raw: ConfidenceRawInputs, gates: GateResult[]): ConfidenceInputs {
  const n = normalize(raw);
  const breakdown: ConfidenceInputBreakdown[] = [
    { name: 'n_sample', raw: raw.n_events, normalized: n.n_events, weight: CONFIDENCE_WEIGHTS.sample, contribution: n.n_events * CONFIDENCE_WEIGHTS.sample },
    { name: 'cov_outcome', raw: raw.outcome_coverage, normalized: n.outcome_coverage, weight: CONFIDENCE_WEIGHTS.outcome, contribution: n.outcome_coverage * CONFIDENCE_WEIGHTS.outcome },
    { name: 'inv_var_cpao', raw: raw.cpao_coefficient_of_variation, normalized: n.cpao_coefficient_of_variation, weight: CONFIDENCE_WEIGHTS.invvar, contribution: n.cpao_coefficient_of_variation * CONFIDENCE_WEIGHTS.invvar },
    { name: 'comp_attr', raw: raw.attribution_completeness, normalized: n.attribution_completeness, weight: CONFIDENCE_WEIGHTS.attr, contribution: n.attribution_completeness * CONFIDENCE_WEIGHTS.attr },
    { name: 'cov_shadow', raw: raw.shadow_coverage, normalized: n.shadow_coverage, weight: CONFIDENCE_WEIGHTS.shadow, contribution: n.shadow_coverage * CONFIDENCE_WEIGHTS.shadow },
    { name: 'term_type', raw: raw.type_term, normalized: n.type_term, weight: CONFIDENCE_WEIGHTS.type, contribution: n.type_term * CONFIDENCE_WEIGHTS.type },
  ];
  const score = breakdown.reduce((acc, b) => acc + b.contribution, 0);
  return { inputs: breakdown, gates, score: clamp01(score) };
}

export function weightsSumToOne(): boolean {
  const sum = Object.values(CONFIDENCE_WEIGHTS).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1) < 1e-9;
}

export function meanAndCV(values: number[]): { mean: number; cv: number } {
  if (values.length === 0) return { mean: 0, cv: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return { mean: 0, cv: 0 };
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);
  return { mean, cv: stddev / Math.abs(mean) };
}
