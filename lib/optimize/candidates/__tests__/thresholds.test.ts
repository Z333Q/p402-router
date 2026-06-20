import { describe, it, expect } from 'vitest';
import { DEFAULT_THRESHOLDS, loadThresholds } from '../thresholds';

describe('optimize thresholds (Phase 1)', () => {
  it('defines the eight Phase 1 threshold values', () => {
    expect(DEFAULT_THRESHOLDS).toEqual({
      OUTCOME_COVERAGE_MIN: 0.6,
      ACCEPTED_OUTCOME_MIN: 50,
      BASELINE_WINDOW_DAYS: 14,
      ATTRIBUTION_GAP_MAX: 0.1,
      CONFIDENCE_MIN: 0.7,
      SLICE_TRAFFIC_MIN: 0.02,
      POSTPERIOD_WINDOW_DAYS: 14,
      OUTCOME_DEGRADATION_MAX: 0.05,
    });
  });

  it('loadThresholds returns defaults when no env overrides set', () => {
    const t = loadThresholds();
    expect(t.OUTCOME_COVERAGE_MIN).toBe(0.6);
    expect(t.CONFIDENCE_MIN).toBe(0.7);
  });

  it('loadThresholds honors env overrides', () => {
    const prev = process.env.OPTIMIZE_CONFIDENCE_MIN;
    process.env.OPTIMIZE_CONFIDENCE_MIN = '0.85';
    try {
      expect(loadThresholds().CONFIDENCE_MIN).toBe(0.85);
    } finally {
      if (prev === undefined) delete process.env.OPTIMIZE_CONFIDENCE_MIN;
      else process.env.OPTIMIZE_CONFIDENCE_MIN = prev;
    }
  });

  it('ignores non-numeric env overrides', () => {
    const prev = process.env.OPTIMIZE_SLICE_TRAFFIC_MIN;
    process.env.OPTIMIZE_SLICE_TRAFFIC_MIN = 'not-a-number';
    try {
      expect(loadThresholds().SLICE_TRAFFIC_MIN).toBe(0.02);
    } finally {
      if (prev === undefined) delete process.env.OPTIMIZE_SLICE_TRAFFIC_MIN;
      else process.env.OPTIMIZE_SLICE_TRAFFIC_MIN = prev;
    }
  });
});
