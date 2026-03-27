/**
 * Memory Extractor — Phase 5
 * ===========================
 * Uses Gemini Flash to identify facts worth remembering from a task/response pair.
 * Extracts 0–3 memories per request. Non-blocking — never delays execution.
 *
 * Memory types extracted:
 *   fact        — something true about the world or the user's domain
 *   preference  — how the user likes things done
 *   entity      — a named thing (project, person, tool, address)
 *   instruction — a rule the agent should always follow
 *   summary     — a condensed record of what happened in this request
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { storeManyMemories } from './store';
import type { ExtractedMemory, MemoryType } from './types';

const EXTRACTOR_MODEL = 'gemini-3-flash-preview';
const VALID_TYPES: MemoryType[] = ['fact', 'preference', 'entity', 'instruction', 'summary'];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Extract memorable facts from a completed request and store them.
 * Fire-and-forget — call without await.
 */
export async function extractAndStoreMemories(
    task: string,
    responseText: string,
    tenantId: string,
    requestId: string,
    sessionId?: string
): Promise<void> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey || !responseText.trim()) return;

    try {
        const memories = await extractMemories(task, responseText, apiKey);
        if (memories.length === 0) return;

        await storeManyMemories(tenantId, memories, {
            sourceRequestId: requestId,
            sessionId,
        });
    } catch {
        // Never surface extraction errors to callers
    }
}

// ── Gemini extractor ──────────────────────────────────────────────────────────

async function extractMemories(
    task: string,
    responseText: string,
    apiKey: string
): Promise<ExtractedMemory[]> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: EXTRACTOR_MODEL,
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
    });

    const prompt = buildExtractionPrompt(task, responseText);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch?.[0]) return [];

    let parsed: Array<{ type?: string; content?: string; importance?: number }>;
    try {
        parsed = JSON.parse(jsonMatch[0]);
    } catch {
        return [];
    }

    if (!Array.isArray(parsed)) return [];

    return parsed
        .slice(0, 3) // hard cap at 3 per request
        .filter((m) => typeof m.content === 'string' && m.content.trim().length > 0)
        .map((m) => ({
            memoryType: normalizeType(m.type),
            content: String(m.content).trim().slice(0, 500),
            importance: clamp(Number(m.importance ?? 0.5)),
        }));
}

function buildExtractionPrompt(task: string, responseText: string): string {
    return `You are a memory extraction system for an AI agent. Analyze this interaction and extract 0–3 facts worth remembering for future requests.

TASK:
${task.slice(0, 500)}

RESPONSE:
${responseText.slice(0, 1500)}

Extract only information that would be genuinely useful in future requests. Skip anything generic or obvious.

Memory types:
- "fact": a domain fact about the user's project, environment, or context
- "preference": how the user likes things done (coding style, format, etc.)
- "entity": a specific named thing (project name, address, tool, key value)
- "instruction": a rule the agent should always follow for this user
- "summary": a brief record of what was accomplished (only for complex tasks)

Return a JSON array (empty array if nothing is worth remembering):
[
  { "type": "entity", "content": "P402 Treasury: 0xFa772434...", "importance": 0.9 },
  { "type": "preference", "content": "User prefers ethers v6 API, not v5", "importance": 0.8 }
]`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeType(t: unknown): MemoryType {
    const s = String(t ?? '').toLowerCase() as MemoryType;
    return VALID_TYPES.includes(s) ? s : 'fact';
}

function clamp(v: number): number {
    return Math.max(0, Math.min(1, isFinite(v) ? v : 0.5));
}
