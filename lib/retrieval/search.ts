/**
 * Vector Similarity Search — Phase 1
 * =====================================
 * Retrieves relevant knowledge chunks for a query using pgvector cosine
 * similarity. Scoped to tenant to ensure isolation.
 *
 * ADR-002: pgvector-first — no external vector store.
 */

import db from '@/lib/db';
import { generateEmbedding, toVectorLiteral } from './embed';

export interface SearchResult {
    chunkId: string;
    documentId: string;
    sourceId: string;
    content: string;
    tokenCount: number;
    score: number;
    rank: number;
    metadata: Record<string, unknown>;
    documentTitle?: string;
    sourceType?: string;
}

export interface SearchOptions {
    /** Number of results to return. Default: 5 */
    topK?: number;
    /** Minimum similarity score (0-1). Default: 0.60 */
    minScore?: number;
    /** Filter by specific source IDs */
    sourceIds?: string[];
    /** Filter by trust level */
    trustLevel?: 'standard' | 'verified' | 'internal';
    /** Filter by confidentiality */
    confidentiality?: 'private' | 'tenant' | 'public';
}

/**
 * Search for relevant chunks given a query string.
 * Returns ranked results with similarity scores.
 */
export async function searchKnowledge(
    query: string,
    tenantId: string,
    options: SearchOptions = {}
): Promise<SearchResult[]> {
    const topK = options.topK ?? 5;
    const minScore = options.minScore ?? 0.60;

    // Generate query embedding
    const { embedding } = await generateEmbedding(query);
    const vectorLiteral = toVectorLiteral(embedding);

    // Build dynamic WHERE clauses
    const conditions: string[] = [
        'ke.tenant_id = $1',
        'kd.status = \'ready\'',
        'ks.status = \'active\'',
    ];
    const params: unknown[] = [tenantId];
    let paramIdx = 2;

    if (options.sourceIds && options.sourceIds.length > 0) {
        conditions.push(`ks.id = ANY($${paramIdx++})`);
        params.push(options.sourceIds);
    }
    if (options.trustLevel) {
        conditions.push(`ks.trust_level = $${paramIdx++}`);
        params.push(options.trustLevel);
    }
    if (options.confidentiality) {
        conditions.push(`ks.confidentiality = $${paramIdx++}`);
        params.push(options.confidentiality);
    }

    // Similarity threshold param
    params.push(minScore);
    const minScoreParam = paramIdx++;

    // topK param
    params.push(topK);
    const topKParam = paramIdx++;

    const whereClause = conditions.join(' AND ');

    // pgvector cosine similarity: 1 - (embedding <=> query_vector) = similarity
    const sql = `
        SELECT
            kc.id        AS chunk_id,
            kc.document_id,
            kd.source_id,
            kc.content,
            kc.token_count,
            kc.metadata  AS chunk_metadata,
            kd.title     AS document_title,
            ks.source_type,
            1 - (ke.embedding <=> $${paramIdx++}::vector) AS score
        FROM knowledge_embeddings ke
        JOIN knowledge_chunks kc ON kc.id = ke.chunk_id
        JOIN knowledge_documents kd ON kd.id = kc.document_id
        JOIN knowledge_sources ks ON ks.id = kd.source_id
        WHERE ${whereClause}
          AND 1 - (ke.embedding <=> $${paramIdx - 1}::vector) >= $${minScoreParam}
        ORDER BY ke.embedding <=> $${paramIdx - 1}::vector
        LIMIT $${topKParam}
    `;

    // Append the vector literal as the last positional param
    params.push(vectorLiteral);

    const result = await db.query(sql, params as string[]);

    type Row = {
        chunk_id: string;
        document_id: string;
        source_id: string;
        content: string;
        token_count: number;
        score: string;
        chunk_metadata: unknown;
        document_title: string | null;
        source_type: string;
    };

    return (result.rows as Row[]).map((row, idx) => ({
        chunkId: row.chunk_id,
        documentId: row.document_id,
        sourceId: row.source_id,
        content: row.content,
        tokenCount: row.token_count,
        score: parseFloat(row.score),
        rank: idx + 1,
        metadata: (typeof row.chunk_metadata === 'object' && row.chunk_metadata !== null)
            ? row.chunk_metadata as Record<string, unknown>
            : {},
        documentTitle: row.document_title ?? undefined,
        sourceType: row.source_type,
    }));
}

/**
 * Log a retrieval query and its results for observability + eval.
 */
export async function logRetrievalQuery(
    tenantId: string,
    queryText: string,
    embedding: number[],
    results: SearchResult[],
    options: {
        requestId?: string;
        sessionId?: string;
        topK: number;
        tokenBudget?: number;
        latencyMs: number;
    }
): Promise<string> {
    const queryId = crypto.randomUUID();
    const vectorLiteral = toVectorLiteral(embedding);

    await db.query(
        `INSERT INTO retrieval_queries
            (id, tenant_id, request_id, session_id, query_text, query_embedding,
             filters, top_k, token_budget, result_count, latency_ms)
         VALUES ($1,$2,$3,$4,$5,$6::vector,$7,$8,$9,$10,$11)`,
        [
            queryId,
            tenantId,
            options.requestId ?? null,
            options.sessionId ?? null,
            queryText,
            vectorLiteral,
            JSON.stringify({}),
            options.topK,
            options.tokenBudget ?? null,
            results.length,
            options.latencyMs,
        ]
    );

    if (results.length > 0) {
        const rowValues = results.map((r, i) =>
            `('${crypto.randomUUID()}','${queryId}','${r.chunkId}',${i + 1},${r.score},${i < 5})`
        ).join(',');
        await db.query(
            `INSERT INTO retrieval_results
                (id, retrieval_query_id, chunk_id, rank, score, selected_for_context)
             VALUES ${rowValues}`
        );
    }

    return queryId;
}
