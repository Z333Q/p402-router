import { describe, it, expect } from 'vitest';
import { DEFAULT_THRESHOLDS } from '../thresholds';
import { generateMissingOutcomeCoverage } from '../generators/missingOutcomeCoverage';
import { DEFAULT_WINDOW, ev, outcome, shadow } from './fixtures';

const NOW = () => '2026-06-15T00:00:00.000Z';

describe('missing_outcome_coverage generator', () => {
  it('produces a candidate when coverage is clearly below 0.40 and slice share is material', () => {
    const events = Array.from({ length: 500 }, (_, i) => ev(i, { cost: 0.01 }));
    const outcomes = events.slice(0, 100).map((e, i) => outcome(i, e.id, 'accepted'));
    const shadows = events.map((e, i) => shadow(i, e.id));

    const cands = generateMissingOutcomeCoverage(
      { window: DEFAULT_WINDOW, events, outcomes, shadow_decisions: shadows, allowlist: [] },
      DEFAULT_THRESHOLDS,
      NOW,
    );

    expect(cands.length).toBe(1);
    const c = cands[0];
    expect(c).toBeDefined();
    expect(c?.type).toBe('missing_outcome_coverage');
    expect(c?.status).toBe('internal_candidate');
    expect(c?.slice).toEqual({ tenant_id: 't1', workflow_id: 'wf1' });
    expect(c?.confidence_score).toBeGreaterThanOrEqual(DEFAULT_THRESHOLDS.CONFIDENCE_MIN);
  });

  it('drops the candidate when outcome coverage is above the 0.40 ceiling', () => {
    const events = Array.from({ length: 100 }, (_, i) => ev(i));
    const outcomes = events.slice(0, 60).map((e, i) => outcome(i, e.id, 'accepted'));
    const cands = generateMissingOutcomeCoverage(
      { window: DEFAULT_WINDOW, events, outcomes, shadow_decisions: [], allowlist: [] },
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(cands.length).toBe(0);
  });

  it('drops the candidate when slice traffic share is below the floor', () => {
    const main = Array.from({ length: 1000 }, (_, i) => ev(i, { workflow: 'wfA', cost: 1 }));
    const tiny = Array.from({ length: 5 }, (_, i) => ev(1000 + i, { workflow: 'wfTiny', cost: 0.001 }));
    const events = [...main, ...tiny];
    const cands = generateMissingOutcomeCoverage(
      { window: DEFAULT_WINDOW, events, outcomes: [], shadow_decisions: [], allowlist: [] },
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(cands.find((c) => c.slice.workflow_id === 'wfTiny')).toBeUndefined();
  });

  it('drops the candidate when the baseline window is too short', () => {
    const events = Array.from({ length: 100 }, (_, i) => ev(i));
    const cands = generateMissingOutcomeCoverage(
      { window: { ...DEFAULT_WINDOW, days: 5 }, events, outcomes: [], shadow_decisions: [], allowlist: [] },
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(cands.length).toBe(0);
  });

  it('emits gate_results that record every checked gate', () => {
    const events = Array.from({ length: 500 }, (_, i) => ev(i));
    const outcomes = events.slice(0, 100).map((e, i) => outcome(i, e.id, 'accepted'));
    const shadows = events.map((e, i) => shadow(i, e.id));
    const cands = generateMissingOutcomeCoverage(
      { window: DEFAULT_WINDOW, events, outcomes, shadow_decisions: shadows, allowlist: [] },
      DEFAULT_THRESHOLDS,
      NOW,
    );
    const c = cands[0];
    expect(c?.gate_results.map((g) => g.name)).toEqual(
      expect.arrayContaining(['coverage_below_ceiling', 'slice_traffic_share', 'attribution_gap', 'baseline_window_days', 'confidence_min']),
    );
  });
});
