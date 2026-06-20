export type CandidateType =
  | 'missing_outcome_coverage'
  | 'high_cost_workflow_review'
  | 'model_allowlist_cleanup';

export type CandidateStatus = 'internal_candidate';

export interface CandidateSlice {
  tenant_id: string;
  workflow_id?: string;
  model_id?: string;
}

export interface EvidenceSnapshot {
  event_id_range: { min: string | null; max: string | null; count: number };
  outcome_id_range: { min: string | null; max: string | null; count: number };
  shadow_decision_id_range: { min: string | null; max: string | null; count: number };
  window: { start: string; end: string; days: number };
}

export interface GateResult {
  name: string;
  value: number | string | boolean | null;
  threshold: number | string | boolean | null;
  passed: boolean;
}

export interface ConfidenceInputBreakdown {
  name: string;
  raw: number;
  normalized: number;
  weight: number;
  contribution: number;
}

export interface ConfidenceInputs {
  inputs: ConfidenceInputBreakdown[];
  gates: GateResult[];
  score: number;
}

export interface Candidate {
  candidate_id: string;
  tenant_id: string;
  type: CandidateType;
  slice: CandidateSlice;
  evidence_snapshot: EvidenceSnapshot;
  gate_results: GateResult[];
  confidence_score: number;
  confidence_inputs: ConfidenceInputs;
  status: CandidateStatus;
  created_at: string;
}

export interface EconomicEvent {
  id: string;
  tenant_id: string;
  workflow_id: string;
  model_id: string;
  provider_id: string;
  cost_usd: number;
  created_at: string;
}

export interface OutcomeRecord {
  id: string;
  tenant_id: string;
  workflow_id: string;
  event_id: string;
  status: 'accepted' | 'rejected' | 'unknown';
  created_at: string;
}

export interface ShadowDecisionRecord {
  id: string;
  tenant_id: string;
  workflow_id: string;
  event_id: string;
  would_have_denied: boolean;
  provider_called: boolean;
  created_at: string;
}

export interface AllowlistEntry {
  tenant_id: string;
  model_id: string;
  added_at: string;
  removed_at?: string;
}

export interface WindowBounds {
  start: string;
  end: string;
  days: number;
}

export interface GeneratorInput {
  window: WindowBounds;
  events: EconomicEvent[];
  outcomes: OutcomeRecord[];
  shadow_decisions: ShadowDecisionRecord[];
  allowlist: AllowlistEntry[];
}
