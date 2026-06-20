import { describe, it, expect } from 'vitest';
import { PHASE_1_TYPES, runCandidatePipeline } from '../pipeline';
import { DEFAULT_THRESHOLDS } from '../thresholds';
import { DEFAULT_WINDOW, allow, ev, outcome, shadow } from './fixtures';

const NOW = () => '2026-06-15T00:00:00.000Z';

describe('candidate pipeline', () => {
  it('Phase 1 types are exactly the three approved types', () => {
    expect(PHASE_1_TYPES).toEqual([
      'missing_outcome_coverage',
      'high_cost_workflow_review',
      'model_allowlist_cleanup',
    ]);
  });

  it('returns empty array on empty input', () => {
    const out = runCandidatePipeline(
      { window: DEFAULT_WINDOW, events: [], outcomes: [], shadow_decisions: [], allowlist: [] },
      { thresholds: DEFAULT_THRESHOLDS, nowFn: NOW },
    );
    expect(out).toEqual([]);
  });

  it('aggregates output across the three generators', () => {
    const lowCoverage = Array.from({ length: 500 }, (_, i) => ev(i, { workflow: 'wfLow' }));
    const lowOutcomes = lowCoverage.slice(0, 100).map((e, i) => outcome(i, e.id, 'accepted', 't1', 'wfLow'));
    const lowShadows = lowCoverage.map((e, i) => shadow(i, e.id, 't1', 'wfLow'));

    const allowlist = [
      allow('t1', 'gpt-mini', '2025-01-01T00:00:00.000Z'),
      allow('t1', 'unused-model', '2025-01-01T00:00:00.000Z'),
    ];
    const tenantAccepted = Array.from({ length: 60 }, (_, i) => outcome(2000 + i, `synth_${i}`, 'accepted'));

    const out = runCandidatePipeline(
      {
        window: DEFAULT_WINDOW,
        events: lowCoverage,
        outcomes: [...lowOutcomes, ...tenantAccepted],
        shadow_decisions: lowShadows,
        allowlist,
      },
      { thresholds: DEFAULT_THRESHOLDS, nowFn: NOW },
    );

    const types = new Set(out.map((c) => c.type));
    expect(types.has('missing_outcome_coverage')).toBe(true);
    expect(types.has('model_allowlist_cleanup')).toBe(true);
  });

  it('every emitted candidate carries the required Phase 1 fields', () => {
    const events = Array.from({ length: 500 }, (_, i) => ev(i));
    const outcomes = events.slice(0, 100).map((e, i) => outcome(i, e.id, 'accepted'));
    const out = runCandidatePipeline(
      { window: DEFAULT_WINDOW, events, outcomes, shadow_decisions: [], allowlist: [] },
      { thresholds: DEFAULT_THRESHOLDS, nowFn: NOW },
    );
    for (const c of out) {
      expect(c.candidate_id).toMatch(/^cand_/);
      expect(typeof c.tenant_id).toBe('string');
      expect(c.slice.tenant_id).toBe(c.tenant_id);
      expect(c.evidence_snapshot.window.days).toBe(DEFAULT_WINDOW.days);
      expect(c.gate_results.length).toBeGreaterThan(0);
      expect(c.confidence_inputs.inputs.length).toBe(6);
      expect(c.status).toBe('internal_candidate');
      expect(c.created_at).toBe('2026-06-15T00:00:00.000Z');
    }
  });

  it('confidence_inputs reconstruct the score by sum of contributions', () => {
    const events = Array.from({ length: 500 }, (_, i) => ev(i));
    const outcomes = events.slice(0, 100).map((e, i) => outcome(i, e.id, 'accepted'));
    const out = runCandidatePipeline(
      { window: DEFAULT_WINDOW, events, outcomes, shadow_decisions: [], allowlist: [] },
      { thresholds: DEFAULT_THRESHOLDS, nowFn: NOW },
    );
    for (const c of out) {
      const sum = c.confidence_inputs.inputs.reduce((a, b) => a + b.contribution, 0);
      expect(sum).toBeCloseTo(c.confidence_score, 9);
    }
  });
});
