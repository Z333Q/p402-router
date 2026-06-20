import { describe, it, expect } from 'vitest';
import { CONFIDENCE_WEIGHTS, computeConfidence, meanAndCV, weightsSumToOne } from '../confidence';

describe('optimize confidence (Phase 1)', () => {
  it('weights sum to 1.00', () => {
    expect(weightsSumToOne()).toBe(true);
    const total = Object.values(CONFIDENCE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 9);
  });

  it('produces deterministic score for the same inputs', () => {
    const inputs = {
      n_events: 500,
      outcome_coverage: 1,
      cpao_coefficient_of_variation: 0,
      attribution_completeness: 1,
      shadow_coverage: 1,
      type_term: 1,
    };
    const a = computeConfidence(inputs, []);
    const b = computeConfidence(inputs, []);
    expect(a.score).toBe(b.score);
    expect(a.score).toBeCloseTo(1, 9);
  });

  it('reconstructs the score by summing contributions', () => {
    const inputs = {
      n_events: 250,
      outcome_coverage: 0.8,
      cpao_coefficient_of_variation: 0.5,
      attribution_completeness: 0.95,
      shadow_coverage: 0.9,
      type_term: 0.5,
    };
    const out = computeConfidence(inputs, []);
    const reconstructed = out.inputs.reduce((acc, b) => acc + b.contribution, 0);
    expect(reconstructed).toBeCloseTo(out.score, 9);
  });

  it('clamps non-finite raw inputs to 0 contribution', () => {
    const out = computeConfidence(
      {
        n_events: Number.NaN,
        outcome_coverage: -1,
        cpao_coefficient_of_variation: Number.POSITIVE_INFINITY,
        attribution_completeness: 1.5,
        shadow_coverage: 0,
        type_term: 0,
      },
      [],
    );
    const breakdown = Object.fromEntries(out.inputs.map((i) => [i.name, i.normalized]));
    expect(breakdown.n_sample).toBe(0);
    expect(breakdown.cov_outcome).toBe(0);
    expect(breakdown.comp_attr).toBe(1);
    expect(breakdown.cov_shadow).toBe(0);
  });

  it('meanAndCV returns zero when values are empty or mean is zero', () => {
    expect(meanAndCV([])).toEqual({ mean: 0, cv: 0 });
    expect(meanAndCV([0, 0, 0])).toEqual({ mean: 0, cv: 0 });
  });

  it('meanAndCV computes coefficient of variation', () => {
    const { mean, cv } = meanAndCV([1, 1, 1, 1]);
    expect(mean).toBe(1);
    expect(cv).toBe(0);
    const noisy = meanAndCV([1, 2, 3, 4]);
    expect(noisy.cv).toBeGreaterThan(0);
  });
});
