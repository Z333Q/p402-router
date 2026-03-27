/**
 * Document Ingestion Pipeline — Phase 1
 * ======================================
 * Orchestrates: content fetch → chunk → embed → store.
 * Deduplicates by content hash (SHA-256).
 * Supports: plain text, Markdown, HTML, JSON.
 * PDF: caller must pre-extract text and pass as plain text.
 *
 * Ingestion is async. Status is tracked in knowledge_documents.
 */

import db from '@/lib/db';
import { chunkDocument, estimateTokens } from './chunk';
import { generateEmbeddingBatch, toVectorLiteral, EMBEDDING_MODEL } from './embed';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IngestOptions {
    title?: string;
    mimeType?: string;
    externalId?: string;
    metadata?: Record<string, unknown>;
    /** Target tokens per chunk. Default: 512 */
    chunkTokens?: number;
}

export interface IngestResult {
    documentId: string;
    chunkCount: number;
    tokenCount: number;
    duplicate: boolean;
}

// ── Content Hash ──────────────────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Fetch Content ─────────────────────────────────────────────────────────────

export async function fetchContent(uri: string): Promise<{ content: string; mimeType: string }> {
    const response = await fetch(uri, {
        headers: { 'User-Agent': 'P402-Retrieval/1.0' },
        signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${uri}: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? 'text/plain';
    const mimeType = contentType.split(';')[0]?.trim() ?? 'text/plain';
    const content = await response.text();

    return { content, mimeType };
}

// ── Main Ingestion ────────────────────────────────────────────────────────────

/**
 * Ingest a document from a URI into the knowledge base for a tenant + source.
 * Deduplicates by content hash.
 */
export async function ingestFromUri(
    uri: string,
    tenantId: string,
    sourceId: string,
    options: IngestOptions = {}
): Promise<IngestResult> {
    const { content, mimeType } = await fetchContent(uri);
    return ingestContent(content, tenantId, sourceId, {
        ...options,
        mimeType: options.mimeType ?? mimeType,
    });
}

/**
 * Ingest raw text content into the knowledge base.
 * Primary ingestion path — accepts any pre-fetched/pre-extracted text.
 */
export async function ingestContent(
    content: string,
    tenantId: string,
    sourceId: string,
    options: IngestOptions = {}
): Promise<IngestResult> {
    const mimeType = options.mimeType ?? 'text/plain';
    const contentHash = await sha256(content);

    // Deduplication check
    const existing = await db.query(
        `SELECT id, chunk_count FROM knowledge_documents
         WHERE tenant_id = $1 AND content_hash = $2
         LIMIT 1`,
        [tenantId, contentHash]
    );
    const existingRow = (existing.rows as Array<{ id: string; chunk_count: number | null }>)[0];
    if (existingRow) {
        return {
            documentId: existingRow.id,
            chunkCount: existingRow.chunk_count ?? 0,
            tokenCount: 0,
            duplicate: true,
        };
    }

    // Create document row (status: pending)
    const docResult = await db.query(
        `INSERT INTO knowledge_documents
            (tenant_id, source_id, title, mime_type, content_hash,
             external_id, metadata, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'chunking')
         RETURNING id`,
        [
            tenantId,
            sourceId,
            options.title ?? null,
            mimeType,
            contentHash,
            options.externalId ?? null,
            JSON.stringify(options.metadata ?? {}),
        ]
    );
    const documentId = (docResult.rows as Array<{ id: string }>)[0]?.id;
    if (!documentId) {
        throw new Error('Failed to create knowledge document row');
    }

    try {
        // Chunk the document
        const chunks = chunkDocument(content, {
            targetTokens: options.chunkTokens ?? 512,
            mimeType,
        });

        const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);

        // Persist chunks
        for (const chunk of chunks) {
            await db.query(
                `INSERT INTO knowledge_chunks
                    (tenant_id, document_id, chunk_index, content,
                     token_count, char_start, char_end, metadata)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [
                    tenantId,
                    documentId,
                    chunk.index,
                    chunk.content,
                    chunk.tokenCount,
                    chunk.charStart,
                    chunk.charEnd,
                    JSON.stringify(chunk.metadata),
                ]
            );
        }

        // Update document status to 'embedding'
        await db.query(
            `UPDATE knowledge_documents
             SET status = 'embedding', token_count = $1, chunk_count = $2
             WHERE id = $3`,
            [totalTokens, chunks.length, documentId]
        );

        // Generate embeddings (batch)
        const chunkTexts = chunks.map((c) => c.content);
        const embeddings = await generateEmbeddingBatch(chunkTexts);

        // Fetch chunk IDs in order
        const chunkRows = await db.query(
            `SELECT id FROM knowledge_chunks
             WHERE document_id = $1
             ORDER BY chunk_index ASC`,
            [documentId]
        );
        const chunkIds = (chunkRows.rows as Array<{ id: string }>).map((r) => r.id);

        // Persist embeddings
        for (let i = 0; i < chunkIds.length; i++) {
            const chunkId = chunkIds[i];
            const emb = embeddings[i];
            if (!chunkId || !emb) continue;

            await db.query(
                `INSERT INTO knowledge_embeddings (chunk_id, tenant_id, embedding, model_name)
                 VALUES ($1, $2, $3::vector, $4)
                 ON CONFLICT (chunk_id) DO UPDATE SET
                     embedding = EXCLUDED.embedding,
                     model_name = EXCLUDED.model_name`,
                [chunkId, tenantId, toVectorLiteral(emb.embedding), EMBEDDING_MODEL]
            );
        }

        // Mark document as ready
        await db.query(
            `UPDATE knowledge_documents SET status = 'ready', updated_at = NOW() WHERE id = $1`,
            [documentId]
        );

        return { documentId, chunkCount: chunks.length, tokenCount: totalTokens, duplicate: false };

    } catch (err) {
        // Mark document as failed
        const message = err instanceof Error ? err.message : String(err);
        await db.query(
            `UPDATE knowledge_documents
             SET status = 'failed', error_message = $1, updated_at = NOW()
             WHERE id = $2`,
            [message, documentId]
        );
        throw err;
    }
}
