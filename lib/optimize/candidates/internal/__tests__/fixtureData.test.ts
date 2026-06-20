import { describe, it, expect } from 'vitest';
import { buildDemoFixture } from '../fixtureData';
import { runCandidatePipeline } from '../../pipeline';

describe('internal demo fixture', () => {
  it('produces a meaningful, non-empty candidate set', () => {
    const input = buildDemoFixture();
    const out = runCandidatePipeline(input);
    expect(out.length).toBeGreaterThan(0);
    const types = new Set(out.map((c) => c.type));
    expect(types.has('high_cost_workflow_review')).toBe(true);
  });

  it('every demo candidate is internal_candidate status', () => {
    const out = runCandidatePipeline(buildDemoFixture());
    for (const c of out) expect(c.status).toBe('internal_candidate');
  });

  it('fixture contains no prompt or response content fields', () => {
    const input = buildDemoFixture();
    const json = JSON.stringify(input);
    expect(json).not.toMatch(/prompt_content/);
    expect(json).not.toMatch(/response_content/);
    expect(json).not.toMatch(/message_content/);
    expect(json).not.toMatch(/completion_text/);
  });
});
