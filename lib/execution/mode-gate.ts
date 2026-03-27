/**
 * Mode Gate — Heuristic Classifier
 * ================================
 * Determines whether a request should take the direct path (fast, single model
 * call) or the planned path (full intelligence pipeline: retrieval + planner).
 *
 * Zero LLM calls. Pure logic. Target latency: < 5ms.
 *
 * See: ADR-009, Section 1A of the Intelligence Layer plan.
 */

import type { ExecuteInput } from '@/lib/contracts/request';

// ── Constants ────────────────────────────────────────────────────────────────

const SHORT_TASK_THRESHOLD = 500;        // chars
const SHORT_INPUT_DATA_THRESHOLD = 2000; // chars
const SMALL_BUDGET_THRESHOLD = 1.00;     // USD
export const DEFAULT_MODE_THRESHOLD = 4; // out of 5 questions

// ── Single-intent patterns (Q4) ──────────────────────────────────────────────
// Keyword and regex patterns that signal a single-step, single-intent task.
// Case insensitive. Evaluated against the full task string.

const SINGLE_INTENT_PATTERNS: RegExp[] = [
    // Translation
    /\btranslate\b/i,
    /\bconvert\s+to\s+(english|spanish|french|german|chinese|japanese|korean|portuguese|italian|arabic|hindi|russian|turkish|dutch|polish|swedish|norwegian|danish|finnish|czech|greek|hebrew|thai|vietnamese|indonesian|malay)\b/i,
    // Summarization
    /\bsummariz[e|ation]\b/i,
    /\btldr\b/i,
    /\bshorten\b/i,
    // Classification / labeling
    /\bclassif[y|ication]\b/i,
    /\bcategoriz[e|ation]\b/i,
    /\blabel\b/i,
    /\btag\b/i,
    // Simple Q&A
    /^what\s+is\b/i,
    /^who\s+is\b/i,
    /^when\s+did\b/i,
    /^how\s+do\s+i\b/i,
    /^how\s+does\b/i,
    /^define\b/i,
    // Short content generation
    /\bwrite\s+a\s+(tweet|post|caption|subject\s+line|headline|tagline|title)\b/i,
    /\bdraft\s+a\s+(subject\s+line|headline|message|reply)\b/i,
    /\brewrite\s+this\s+(sentence|paragraph|text)\b/i,
    // Code explanation (short snippet)
    /\bexplain\s+(this|the)\s+code\b/i,
    /\bwhat\s+does\s+(this|the)\s+code\b/i,
    // Formatting
    /\breformat\b/i,
    /\bconvert\s+to\s+(json|csv|markdown|yaml|xml|toml|html)\b/i,
    // Extraction (single field)
    /\bextract\s+the\s+\w+\s+from\b/i,
];

// ── Gate Implementation ───────────────────────────────────────────────────────

export interface ModeGateResult {
    mode: 'direct' | 'planned';
    score: number;
    threshold: number;
    reasons: string[];
}

/**
 * Resolve the execution mode for a request.
 *
 * If the user explicitly set mode='direct' or mode='planned', that wins.
 * Otherwise, run the five-question heuristic.
 */
export function resolveMode(
    input: ExecuteInput,
    options?: { threshold?: number }
): ModeGateResult {
    // Explicit override — always wins
    if (input.mode === 'direct') {
        return { mode: 'direct', score: 5, threshold: DEFAULT_MODE_THRESHOLD, reasons: ['explicit_override'] };
    }
    if (input.mode === 'planned') {
        return { mode: 'planned', score: 0, threshold: DEFAULT_MODE_THRESHOLD, reasons: ['explicit_override'] };
    }

    const threshold = options?.threshold ?? DEFAULT_MODE_THRESHOLD;
    let score = 0;
    const reasons: string[] = [];

    // Q1: Is the task short? (< 500 chars)
    if (input.task.length < SHORT_TASK_THRESHOLD) {
        score++;
        reasons.push('q1_short_task');
    }

    // Q2: Is attached data absent or minimal?
    if (isInputDataSimple(input.input_data)) {
        score++;
        reasons.push('q2_simple_input');
    }

    // Q3: Are tools not explicitly requested?
    if (!input.constraints?.tools_allowed) {
        score++;
        reasons.push('q3_no_tools');
    }

    // Q4: Does the task match a single-intent pattern?
    if (matchesSingleIntentPattern(input.task)) {
        score++;
        reasons.push('q4_single_intent');
    }

    // Q5: Is the budget small? (<= $1.00, or not specified)
    if (isBudgetSmall(input.budget)) {
        score++;
        reasons.push('q5_small_budget');
    }

    const mode = score >= threshold ? 'direct' : 'planned';
    return { mode, score, threshold, reasons };
}

// ── Helper Functions ──────────────────────────────────────────────────────────

function isInputDataSimple(inputData: ExecuteInput['input_data']): boolean {
    if (!inputData) return true;

    // Presence of document_uri or file_refs signals complex input
    if (inputData.document_uri) return false;
    if (inputData.file_refs && inputData.file_refs.length > 0) return false;

    // Check text length
    if (inputData.text && inputData.text.length > SHORT_INPUT_DATA_THRESHOLD) return false;

    // Multiple messages signal a conversation (use planned)
    if (inputData.messages && inputData.messages.length > 3) return false;

    return true;
}

function matchesSingleIntentPattern(task: string): boolean {
    return SINGLE_INTENT_PATTERNS.some((pattern) => pattern.test(task));
}

function isBudgetSmall(budget: ExecuteInput['budget']): boolean {
    if (!budget) return true; // No budget specified — assume small
    const cap = parseFloat(budget.cap);
    if (isNaN(cap)) return true;
    return cap <= SMALL_BUDGET_THRESHOLD;
}
