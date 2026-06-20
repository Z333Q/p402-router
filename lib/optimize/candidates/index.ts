export { runCandidatePipeline, PHASE_1_TYPES } from './pipeline';
export { computeConfidence, CONFIDENCE_WEIGHTS, weightsSumToOne, meanAndCV } from './confidence';
export { DEFAULT_THRESHOLDS, loadThresholds } from './thresholds';
export type { OptimizeThresholds } from './thresholds';
export type {
  Candidate,
  CandidateType,
  CandidateStatus,
  CandidateSlice,
  EvidenceSnapshot,
  GateResult,
  ConfidenceInputs,
  ConfidenceInputBreakdown,
  EconomicEvent,
  OutcomeRecord,
  ShadowDecisionRecord,
  AllowlistEntry,
  WindowBounds,
  GeneratorInput,
} from './types';
