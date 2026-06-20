import { generateHighCostWorkflowReview } from './generators/highCostWorkflowReview';
import { generateMissingOutcomeCoverage } from './generators/missingOutcomeCoverage';
import { generateModelAllowlistCleanup } from './generators/modelAllowlistCleanup';
import { nowIso } from './generators/shared';
import { loadThresholds, type OptimizeThresholds } from './thresholds';
import type { Candidate, CandidateType, GeneratorInput } from './types';

export interface PipelineOptions {
  thresholds?: OptimizeThresholds;
  types?: CandidateType[];
  nowFn?: () => string;
}

export const PHASE_1_TYPES: CandidateType[] = [
  'missing_outcome_coverage',
  'high_cost_workflow_review',
  'model_allowlist_cleanup',
];

export function runCandidatePipeline(input: GeneratorInput, opts: PipelineOptions = {}): Candidate[] {
  const thresholds = opts.thresholds ?? loadThresholds();
  const types = opts.types ?? PHASE_1_TYPES;
  const nowFn = opts.nowFn ?? nowIso;

  const out: Candidate[] = [];
  if (types.includes('missing_outcome_coverage')) {
    out.push(...generateMissingOutcomeCoverage(input, thresholds, nowFn));
  }
  if (types.includes('high_cost_workflow_review')) {
    out.push(...generateHighCostWorkflowReview(input, thresholds, nowFn));
  }
  if (types.includes('model_allowlist_cleanup')) {
    out.push(...generateModelAllowlistCleanup(input, thresholds, nowFn));
  }
  return out;
}
