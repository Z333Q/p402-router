import { describe, it, expect } from 'vitest';
import { DEFAULT_THRESHOLDS } from '../thresholds';
import { generateHighCostWorkflowReview } from '../generators/highCostWorkflowReview';
import { DEFAULT_WINDOW, ev, outcome } from './fixtures';
import type { EconomicEvent, OutcomeRecord } from '../types';

const NOW = () => '2026-06-15T00:00:00.000Z';

function buildWorkflow(workflow: string, eventCount: number, costEach: number, acceptedCount: number, eventIdOffset: number): { events: EconomicEvent[]; outcomes: OutcomeRecord[] } {
  const events = Array.from({ length: eventCount }, (_, i) => ev(eventIdOffset + i, { workflow, cost: costEach }));
  const outcomes = events.slice(0, acceptedCount).map((e, i) => outcome(eventIdOffset + i, e.id, 'accepted', 't1', workflow));
  return { events, outcomes };
}

describe('high_cost_workflow_review generator', () => {
  it('produces a candidate when slice cpao is at least 2x tenant median and gates pass', () => {
    const a = buildWorkflow('wfA', 600, 0.01, 500, 0);
    const b = buildWorkflow('wfB', 600, 0.01, 500, 1000);
    const c = buildWorkflow('wfC', 600, 0.01, 500, 2000);
    const expensive = buildWorkflow('wfX', 600, 0.05, 500, 3000);

    const events = [...a.events, ...b.events, ...c.events, ...expensive.events];
    const outcomes = [...a.outcomes, ...b.outcomes, ...c.outcomes, ...expensive.outcomes];

    const cands = generateHighCostWorkflowReview(
      { window: DEFAULT_WINDOW, events, outcomes, shadow_decisions: [], allowlist: [] },
      DEFAULT_THRESHOLDS,
      NOW,
    );
    const match = cands.find((cand) => cand.slice.workflow_id === 'wfX');
    expect(match).toBeDefined();
    expect(match?.type).toBe('high_cost_workflow_review');
    expect(match?.confidence_score).toBeGreaterThanOrEqual(DEFAULT_THRESHOLDS.CONFIDENCE_MIN);
  });

  it('drops when cpao ratio is below 2.0', () => {
    const a = buildWorkflow('wfA', 600, 0.01, 500, 0);
    const b = buildWorkflow('wfB', 600, 0.012, 500, 1000);
    const c = buildWorkflow('wfC', 600, 0.011, 500, 2000);
    const d = buildWorkflow('wfD', 600, 0.013, 500, 3000);

    const events = [...a.events, ...b.events, ...c.events, ...d.events];
    const outcomes = [...a.outcomes, ...b.outcomes, ...c.outcomes, ...d.outcomes];

    const cands = generateHighCostWorkflowReview(
      { window: DEFAULT_WINDOW, events, outcomes, shadow_decisions: [], allowlist: [] },
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(cands.length).toBe(0);
  });

  it('drops when fewer than 4 peer workflows exist', () => {
    const a = buildWorkflow('wfA', 600, 0.01, 500, 0);
    const expensive = buildWorkflow('wfX', 600, 0.05, 500, 1000);
    const events = [...a.events, ...expensive.events];
    const outcomes = [...a.outcomes, ...expensive.outcomes];

    const cands = generateHighCostWorkflowReview(
      { window: DEFAULT_WINDOW, events, outcomes, shadow_decisions: [], allowlist: [] },
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(cands.length).toBe(0);
  });

  it('drops when accepted-outcome count is below the slice floor', () => {
    const a = buildWorkflow('wfA', 600, 0.01, 500, 0);
    const b = buildWorkflow('wfB', 600, 0.01, 500, 1000);
    const c = buildWorkflow('wfC', 600, 0.01, 500, 2000);
    const expensive = buildWorkflow('wfX', 100, 0.05, 20, 3000);

    const events = [...a.events, ...b.events, ...c.events, ...expensive.events];
    const outcomes = [...a.outcomes, ...b.outcomes, ...c.outcomes, ...expensive.outcomes];

    const cands = generateHighCostWorkflowReview(
      { window: DEFAULT_WINDOW, events, outcomes, shadow_decisions: [], allowlist: [] },
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(cands.find((cand) => cand.slice.workflow_id === 'wfX')).toBeUndefined();
  });
});
