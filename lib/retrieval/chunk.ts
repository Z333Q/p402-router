/**
 * Document Chunking Pipeline — Phase 1
 * =====================================
 * Splits documents into ~512-token chunks suitable for embedding.
 * Supports: plain text, Markdown, HTML, JSON.
 * PDF support requires pre-extraction (handled in ingest.ts).
 *
 * Strategy: paragraph-aware splitting with overlap.
 * - Primary split: double newlines (paragraph boundaries)
 * - Secondary split: single newlines, then sentences
 * - Overlap: 50 tokens between adjacent chunks for context continuity
 */

export interface Chunk {
    index: number;
    content: string;
    tokenCount: number;
    charStart: number;
    charEnd: number;
    metadata: Record<string, unknown>;
}

export interface ChunkOptions {
    /** Target tokens per chunk. Default: 512 */
    targetTokens?: number;
    /** Overlap tokens between adjacent chunks. Default: 50 */
    overlapTokens?: number;
    /** Source MIME type — affects pre-processing. Default: text/plain */
    mimeType?: string;
}

const DEFAULT_TARGET_TOKENS = 512;
const DEFAULT_OVERLAP_TOKENS = 50;

/**
 * Rough token count estimate (4 chars ≈ 1 token, consistent with semantic cache).
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Chunk a document into overlapping segments.
 * Returns an array of Chunk objects ready for embedding.
 */
export function chunkDocument(
    content: string,
    options: ChunkOptions = {}
): Chunk[] {
    const targetTokens = options.targetTokens ?? DEFAULT_TARGET_TOKENS;
    const overlapTokens = options.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;
    const mimeType = options.mimeType ?? 'text/plain';

    // Pre-process based on MIME type
    const processedContent = preprocessContent(content, mimeType);

    // Split into candidate segments (paragraph-level)
    const segments = splitIntoParagraphs(processedContent);

    // Merge segments into chunks of ~targetTokens
    return mergeSegmentsIntoChunks(segments, processedContent, targetTokens, overlapTokens);
}

// ── Pre-processing ────────────────────────────────────────────────────────────

function preprocessContent(content: string, mimeType: string): string {
    switch (mimeType) {
        case 'text/html':
        case 'application/xhtml+xml':
            return stripHtml(content);
        case 'application/json':
            return formatJson(content);
        case 'text/markdown':
        case 'text/x-markdown':
            return stripMarkdownMetadata(content);
        default:
            return content;
    }
}

function stripHtml(html: string): string {
    // Remove script/style blocks
    let text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
    // Replace block elements with newlines
    text = text.replace(/<\/(p|div|h[1-6]|li|tr|blockquote|article|section)>/gi, '\n\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    // Strip remaining tags
    text = text.replace(/<[^>]+>/g, ' ');
    // Decode common HTML entities
    text = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
    return normalizeWhitespace(text);
}

function formatJson(json: string): string {
    try {
        return JSON.stringify(JSON.parse(json), null, 2);
    } catch {
        return json;
    }
}

function stripMarkdownMetadata(md: string): string {
    // Strip YAML frontmatter
    return md.replace(/^---[\s\S]*?---\n/, '');
}

function normalizeWhitespace(text: string): string {
    return text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// ── Splitting ─────────────────────────────────────────────────────────────────

function splitIntoParagraphs(content: string): string[] {
    // Split on double newlines first (paragraph boundaries)
    const paragraphs = content.split(/\n\n+/);
    const result: string[] = [];

    for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        const tokens = estimateTokens(trimmed);
        if (tokens <= 800) {
            // Paragraph fits comfortably — keep as unit
            result.push(trimmed);
        } else {
            // Paragraph too large — split on single newlines, then sentences
            const lines = trimmed.split('\n').filter(Boolean);
            for (const line of lines) {
                const lineTokens = estimateTokens(line);
                if (lineTokens <= 800) {
                    result.push(line);
                } else {
                    // Split on sentence boundaries
                    const sentences = line.match(/[^.!?]+[.!?]+/g) ?? [line];
                    result.push(...sentences.map((s) => s.trim()).filter(Boolean));
                }
            }
        }
    }

    return result;
}

// ── Merging ───────────────────────────────────────────────────────────────────

function mergeSegmentsIntoChunks(
    segments: string[],
    originalContent: string,
    targetTokens: number,
    overlapTokens: number
): Chunk[] {
    const chunks: Chunk[] = [];
    let currentSegments: string[] = [];
    let currentTokens = 0;
    let chunkIndex = 0;

    const flush = () => {
        if (currentSegments.length === 0) return;
        const chunkText = currentSegments.join('\n\n');
        const charStart = originalContent.indexOf(currentSegments[0] ?? '');
        const lastSeg = currentSegments[currentSegments.length - 1] ?? '';
        const charEnd = charStart + chunkText.length;

        chunks.push({
            index: chunkIndex++,
            content: chunkText,
            tokenCount: estimateTokens(chunkText),
            charStart: Math.max(0, charStart),
            charEnd: Math.max(0, charEnd),
            metadata: {},
        });
    };

    for (const segment of segments) {
        const segTokens = estimateTokens(segment);

        if (currentTokens + segTokens > targetTokens && currentSegments.length > 0) {
            flush();

            // Carry overlap from end of previous chunk
            const overlapSegs: string[] = [];
            let overlapCount = 0;
            for (let i = currentSegments.length - 1; i >= 0; i--) {
                const seg = currentSegments[i];
                if (!seg) continue;
                const toks = estimateTokens(seg);
                if (overlapCount + toks > overlapTokens) break;
                overlapSegs.unshift(seg);
                overlapCount += toks;
            }

            currentSegments = [...overlapSegs, segment];
            currentTokens = overlapCount + segTokens;
        } else {
            currentSegments.push(segment);
            currentTokens += segTokens;
        }
    }

    flush();
    return chunks;
}
