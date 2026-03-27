/**
 * Evaluation System Types — Phase 4
 */

export interface EvaluationScores {
    /** Is the response relevant to the task? */
    relevance: number;
    /** Does it fully address what was asked? */
    completeness: number;
    /** Does it stay grounded in provided context (if any)? */
    groundedness?: number;
    /** Is it factually coherent and internally consistent? */
    coherence: number;
}

export interface EvaluationResult {
    scores: EvaluationScores;
    /** Weighted average across all scored dimensions */
    overallScore: number;
    /** true if overallScore >= passThreshold */
    passed: boolean;
    passThreshold: number;
    evaluatorModel: string;
    latencyMs: number;
    /** Short reasoning from the evaluator */
    reasoning?: string;
}

export interface EvaluationInput {
    task: string;
    responseText: string;
    /** Retrieved context that was available to the model, if any */
    contextText?: string;
    /** Minimum score to pass (default 0.70) */
    passThreshold?: number;
}
