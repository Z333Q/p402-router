import { describe, it, expect } from 'vitest';
import { DEFAULT_THRESHOLDS } from '../thresholds';
import { generateModelAllowlistCleanup } from '../generators/modelAllowlistCleanup';
import { DEFAULT_WINDOW, allow, ev, outcome } from './fixtures';

const NOW = () => '2026-06-15T00:00:00.000Z';

describe('model_allowlist_cleanup generator', () => {
  it('produces a candidate when a model has zero traffic, is stable, and tenant has enough accepted outcomes', () => {
    const events = Array.from({ length: 100 }, (_, i) => ev(i, { model: 'gpt-mini' }));
    const outcomes = events.slice(0, 60).map((e, i) => outcome(i, e.id, 'accepted'));
    const allowlist = [
      allow('t1', 'gpt-mini', '2025-01-01T00:00:00.000Z'),
      allow('t1', 'legacy-model', '2025-01-01T00:00:00.000Z'),
    ];
    const cands = generateModelAllowlistCleanup(
      { window: DEFAULT_WINDOW, events, outcomes, shadow_decisions: [], allowlist },
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(cands.length).toBe(1);
    expect(cands[0]?.type).toBe('model_allowlist_cleanup');
    expect(cands[0]?.slice).toEqual({ tenant_id: 't1', model_id: 'legacy-model' });
  });

  it('drops when the model had traffic during the window', () => {
    const events = Array.from({ length: 5 }, (_, i) => ev(i, { model: 'still-used' }));
    const outcomes = Array.from({ length: 60 }, (_, i) => outcome(i, `ev_${i}`, 'accepted'));
    const allowlist = [allow('t1', 'still-used', '2025-01-01T00:00:00.000Z')];
    const cands = generateModelAllowlistCleanup(
      { window: DEFAULT_WINDOW, events, outcomes, shadow_decisions: [], allowlist },
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(cands.length).toBe(0);
  });

  it('drops when the model was added within the last 7 days', () => {
    const allowlist = [allow('t1', 'fresh-model', '2026-06-14T00:00:00.000Z')];
    const outcomes = Array.from({ length: 60 }, (_, i) => outcome(i, `ev_${i}`, 'accepted'));
    const cands = generateModelAllowlistCleanup(
      { window: DEFAULT_WINDOW, events: [], outcomes, shadow_decisions: [], allowlist },
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(cands.length).toBe(0);
  });

  it('drops when the tenant lacks enough accepted outcomes', () => {
    const allowlist = [allow('t1', 'legacy-model', '2025-01-01T00:00:00.000Z')];
    const outcomes = Array.from({ length: 5 }, (_, i) => outcome(i, `ev_${i}`, 'accepted'));
    const cands = generateModelAllowlistCleanup(
      { window: DEFAULT_WINDOW, events: [], outcomes, shadow_decisions: [], allowlist },
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(cands.length).toBe(0);
  });

  it('drops when allowlist entry was removed during the window', () => {
    const allowlist = [allow('t1', 'churn', '2025-01-01T00:00:00.000Z', '2026-06-10T00:00:00.000Z')];
    const outcomes = Array.from({ length: 60 }, (_, i) => outcome(i, `ev_${i}`, 'accepted'));
    const cands = generateModelAllowlistCleanup(
      { window: DEFAULT_WINDOW, events: [], outcomes, shadow_decisions: [], allowlist },
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(cands.length).toBe(0);
  });
});
