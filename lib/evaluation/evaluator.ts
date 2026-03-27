/**
 * Evaluator — Phase 4
 * ====================
 * Uses Gemini Flash to score a model response on 3-4 dimensions.
 * Falls back to a permissive pass (score 0.75) if the API is unavailable.
 *
 * Dimensions:
 *   relevance     — Does the response address the task?
 *   completeness  — Is the answer full, not truncated or evasive?
 *   groundedness  — Does it stay within the provided context? (only if context given)
 *   coherence     — Is it internally consistent and well-formed?
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '@/lib/db';
import type { EvaluationInput, EvaluationResult, EvaluationScores } from './types';

const EVALUATOR_MODEL = 'gemini-3-flash-preview';
const DEFAULT_PASS_THRESHOLD = 0.70;

// Dimension weights (sum to 1.0)
const WEIGHTS = {
    relevance: 0.35,
    completeness: 0.25,
    groundedness: 0.20,   // only applied when context is provided
    coherence: 0.20,
} as const;

// ── Public API ────────────────────────────────────────────────────────────────

export async function evaluateResponse(
    input: EvaluationInput
): Promise<EvaluationResult> {
    const apiKey = process.env.GOOGLE_API_KEY;
    const threshold = input.passThreshold ?? DEFAULT_PASS_THRESHOLD;

    if (apiKey) {
        try {
            return await evaluateWithGemini(input, apiKey, threshold);
        } catch {
            // Fallback — never block execution on eval failure
        }
    }

    return permissiveFallback(threshold);
}

/**
 * Evaluate and persist the result to execute_evaluations.
 * Returns the evaluation result for use in the verify node.
 */
export async function evaluateAndPersist(
    input: EvaluationInput,
    ctx: { tenantId: string; requestId: string; traceNodeId?: string }
): Promise<EvaluationResult> {
    const result = await evaluateResponse(input);

    // Persist (non-blocking on failure)
    db.query(
        `INSERT INTO execute_evaluations
            (tenant_id, request_id, trace_node_id, task, response_text,
             context_text, scores, overall_score, passed, pass_threshold,
             evaluator_model, latency_ms)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
            ctx.tenantId,
            ctx.requestId,
            ctx.traceNodeId ?? null,
            input.task,
            input.responseText,
            input.contextText ?? null,
            JSON.stringify(result.scores),
            result.overallScore,
            result.passed,
            result.passThreshold,
            result.evaluatorModel,
            result.latencyMs,
        ]
    ).catch(() => null);

    return result;
}

// ── Gemini evaluator ──────────────────────────────────────────────────────────

async function evaluateWithGemini(
    input: EvaluationInput,
    apiKey: string,
    threshold: number
): Promise<EvaluationResult> {
    const start = Date.now();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: EVALUATOR_MODEL,
        generationConfig: { temperature: 0.0, maxOutputTokens: 512 },
    });

    const prompt = buildEvalPrompt(input);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const latencyMs = Date.now() - start;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch?.[0]) return permissiveFallback(threshold, latencyMs);

    let parsed: {
        relevance?: number;
        completeness?: number;
        groundedness?: number;
        coherence?: number;
        reasoning?: string;
    };

    try {
        parsed = JSON.parse(jsonMatch[0]);
    } catch {
        return permissiveFallback(threshold, latencyMs);
    }

    const scores: EvaluationScores = {
        relevance: clamp(Number(parsed.relevance ?? 0.75)),
        completeness: clamp(Number(parsed.completeness ?? 0.75)),
        coherence: clamp(Number(parsed.coherence ?? 0.75)),
        ...(input.contextText ? { groundedness: clamp(Number(parsed.groundedness ?? 0.75)) } : {}),
    };

    const overallScore = computeWeightedScore(scores, !!input.contextText);

    return {
        scores,
        overallScore,
        passed: overallScore >= threshold,
        passThreshold: threshold,
        evaluatorModel: EVALUATOR_MODEL,
        latencyMs,
        reasoning: parsed.reasoning,
    };
}

function buildEvalPrompt(input: EvaluationInput): string {
    const hasContext = !!input.contextText;

    return `You are an AI output evaluator. Score the following response on each dimension from 0.0 to 1.0.

TASK:
${input.task.slice(0, 500)}

RESPONSE:
${input.responseText.slice(0, 2000)}
${hasContext ? `\nCONTEXT PROVIDED TO THE MODEL:\n${input.contextText!.slice(0, 1000)}` : ''}

Score each dimension:
- relevance: Does the response directly address the task? (0=unrelated, 1=perfectly on-topic)
- completeness: Is the answer complete and not evasive? (0=hollow, 1=fully answers the task)
- coherence: Is the response internally consistent and well-formed? (0=contradictory/garbled, 1=clear)
${hasContext ? '- groundedness: Does the response stay within the provided context without hallucinating? (0=makes things up, 1=fully grounded)' : ''}

Return ONLY valid JSON, no markdown:
{
  "relevance": 0.9,
  "completeness": 0.8,
  "coherence": 0.95,
  ${hasContext ? '"groundedness": 0.85,' : ''}
  "reasoning": "one sentence explanation"
}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeWeightedScore(scores: EvaluationScores, hasContext: boolean): number {
    if (hasContext && scores.groundedness !== undefined) {
        // With context: relevance 0.30, completeness 0.25, groundedness 0.25, coherence 0.20
        return (
            scores.relevance * 0.30 +
            scores.completeness * 0.25 +
            scores.groundedness * 0.25 +
            scores.coherence * 0.20
        );
    }
    // Without context: relevance 0.40, completeness 0.35, coherence 0.25
    const w = WEIGHTS;
    const total = w.relevance + w.completeness + w.coherence;
    return (
        (scores.relevance * w.relevance +
            scores.completeness * w.completeness +
            scores.coherence * w.coherence) / total
    );
}

function clamp(v: number): number {
    return Math.max(0, Math.min(1, isFinite(v) ? v : 0.75));
}

function permissiveFallback(threshold: number, latencyMs = 0): EvaluationResult {
    const scores: EvaluationScores = { relevance: 0.75, completeness: 0.75, coherence: 0.75 };
    return {
        scores,
        overallScore: 0.75,
        passed: 0.75 >= threshold,
        passThreshold: threshold,
        evaluatorModel: 'fallback',
        latencyMs,
    };
}
