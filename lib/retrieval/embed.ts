/**
 * Embedding Generation — Phase 1
 * ================================
 * Shared embedding function for both retrieval and semantic cache.
 * Model: openai/text-embedding-3-small via OpenRouter (512 dimensions).
 * Matches the existing semantic cache embedding model exactly.
 *
 * ADR-002: pgvector-first. We reuse existing infrastructure.
 */

const EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 512;
const OPENROUTER_EMBEDDINGS_URL = 'https://openrouter.ai/api/v1/embeddings';

export interface EmbeddingResult {
    embedding: number[];
    model: string;
    tokens: number;
}

/**
 * Generate an embedding vector for the given text.
 * Uses OpenRouter (same path as semantic cache).
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY required for embeddings');
    }

    // Truncate to ~8000 chars to stay within embedding token limit
    const truncated = text.length > 8000 ? text.slice(0, 8000) : text;

    const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://p402.io',
            'X-Title': 'P402 Router',
        },
        body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: truncated,
            dimensions: EMBEDDING_DIMENSIONS,
        }),
    });

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Embedding generation failed: ${response.status} ${body}`);
    }

    const data = await response.json() as {
        data: Array<{ embedding: number[] }>;
        usage?: { prompt_tokens?: number };
    };

    const embedding = data.data[0]?.embedding;
    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Unexpected embedding dimensions: ${embedding?.length}`);
    }

    return {
        embedding,
        model: EMBEDDING_MODEL,
        tokens: data.usage?.prompt_tokens ?? 0,
    };
}

/**
 * Generate embeddings for a batch of texts.
 * Processes in batches of 20 to avoid rate limits.
 */
export async function generateEmbeddingBatch(
    texts: string[]
): Promise<EmbeddingResult[]> {
    const BATCH_SIZE = 20;
    const results: EmbeddingResult[] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(generateEmbedding));
        results.push(...batchResults);
    }

    return results;
}

/** Format an embedding array as a PostgreSQL vector literal. */
export function toVectorLiteral(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
