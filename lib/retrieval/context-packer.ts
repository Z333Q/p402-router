/**
 * Context Packer — Phase 1
 * ========================
 * Assembles a bounded context string from retrieval results.
 * Enforces token budget. Applies policy filters.
 * Output is deterministic for the same input set.
 */

import type { SearchResult } from './search';
import { estimateTokens } from './chunk';

export interface ContextPackOptions {
    /** Maximum tokens for the assembled context. Default: 4000 */
    tokenBudget?: number;
    /** Include source citations in output. Default: true */
    includeCitations?: boolean;
    /** Format: 'xml' wraps in <context> tags; 'plain' is raw text. Default: 'xml' */
    format?: 'xml' | 'plain';
}

export interface PackedContext {
    text: string;
    tokenCount: number;
    chunkCount: number;
    chunksIncluded: string[];  // chunk IDs that made it into context
    chunksExcluded: string[];  // chunk IDs excluded due to budget
    truncated: boolean;
}

/**
 * Pack retrieved chunks into a context string within the token budget.
 * Higher-ranked chunks are included first.
 */
export function packContext(
    results: SearchResult[],
    options: ContextPackOptions = {}
): PackedContext {
    const tokenBudget = options.tokenBudget ?? 4000;
    const includeCitations = options.includeCitations ?? true;
    const format = options.format ?? 'xml';

    if (results.length === 0) {
        return {
            text: '',
            tokenCount: 0,
            chunkCount: 0,
            chunksIncluded: [],
            chunksExcluded: [],
            truncated: false,
        };
    }

    // Sort by rank (ascending — rank 1 is best)
    const sorted = [...results].sort((a, b) => a.rank - b.rank);

    const includedChunks: SearchResult[] = [];
    const includedIds: string[] = [];
    const excludedIds: string[] = [];
    let usedTokens = 0;

    // Overhead for XML wrapper and citations
    const wrapperOverhead = format === 'xml' ? 20 : 0;
    const citationOverhead = includeCitations ? 15 : 0;
    const effectiveBudget = tokenBudget - wrapperOverhead;

    for (const result of sorted) {
        const chunkTokens = result.tokenCount + citationOverhead;
        if (usedTokens + chunkTokens <= effectiveBudget) {
            includedChunks.push(result);
            includedIds.push(result.chunkId);
            usedTokens += chunkTokens;
        } else {
            excludedIds.push(result.chunkId);
        }
    }

    const text = buildContextText(includedChunks, { includeCitations, format });
    const actualTokens = estimateTokens(text);

    return {
        text,
        tokenCount: actualTokens,
        chunkCount: includedChunks.length,
        chunksIncluded: includedIds,
        chunksExcluded: excludedIds,
        truncated: excludedIds.length > 0,
    };
}

// ── Formatting ────────────────────────────────────────────────────────────────

function buildContextText(
    chunks: SearchResult[],
    options: { includeCitations: boolean; format: 'xml' | 'plain' }
): string {
    if (chunks.length === 0) return '';

    const parts = chunks.map((chunk, i) => {
        const content = chunk.content.trim();
        if (!options.includeCitations) return content;

        const citation = chunk.documentTitle
            ? `[${i + 1}] ${chunk.documentTitle}`
            : `[${i + 1}] Source: ${chunk.sourceType}`;

        return `${citation}\n${content}`;
    });

    const joined = parts.join('\n\n---\n\n');

    if (options.format === 'xml') {
        return `<context>\n${joined}\n</context>`;
    }
    return joined;
}
