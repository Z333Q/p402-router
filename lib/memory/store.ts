/**
 * Memory Store — Phase 5
 * =======================
 * CRUD + semantic search over the `memories` table.
 * Embeddings use the same openai/text-embedding-3-small (512-dim) as knowledge chunks.
 */

import db from '@/lib/db';
import { generateEmbedding, toVectorLiteral } from '@/lib/retrieval/embed';
import type { Memory, MemorySearchResult, MemoryType, ExtractedMemory } from './types';

export interface StoreMemoryOptions {
    sessionId?: string;
    sourceRequestId?: string;
    /** Hours until expiry. Omit for permanent. */
    ttlHours?: number;
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function storeMemory(
    tenantId: string,
    memory: ExtractedMemory,
    options: StoreMemoryOptions = {}
): Promise<Memory> {
    // Embed the content for semantic retrieval
    const { embedding } = await generateEmbedding(memory.content);
    const vector = toVectorLiteral(embedding);

    const expiresAt = options.ttlHours
        ? new Date(Date.now() + options.ttlHours * 3_600_000).toISOString()
        : null;

    const result = await db.query(
        `INSERT INTO memories
            (tenant_id, session_id, source_request_id, memory_type,
             content, embedding, importance, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6::vector,$7,$8)
         RETURNING id, tenant_id, session_id, source_request_id, memory_type,
                   content, importance, expires_at, created_at`,
        [
            tenantId,
            options.sessionId ?? null,
            options.sourceRequestId ?? null,
            memory.memoryType,
            memory.content,
            vector,
            memory.importance,
            expiresAt,
        ]
    );

    return rowToMemory((result.rows as MemoryRow[])[0]!);
}

export async function storeManyMemories(
    tenantId: string,
    memories: ExtractedMemory[],
    options: StoreMemoryOptions = {}
): Promise<Memory[]> {
    return Promise.all(memories.map((m) => storeMemory(tenantId, m, options)));
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Semantic search over memories.
 * Returns top-k most relevant memories for the given query.
 */
export async function retrieveMemories(
    query: string,
    tenantId: string,
    options: {
        topK?: number;
        minScore?: number;
        sessionId?: string;
        memoryTypes?: MemoryType[];
    } = {}
): Promise<MemorySearchResult[]> {
    const { topK = 5, minScore = 0.55 } = options;

    const { embedding } = await generateEmbedding(query);
    const vector = toVectorLiteral(embedding);

    const conditions = [
        `m.tenant_id = $1`,
        `(m.expires_at IS NULL OR m.expires_at > now())`,
        `1 - (m.embedding <=> $2::vector) >= $3`,
    ];
    const params: unknown[] = [tenantId, vector, minScore];
    let idx = 4;

    if (options.sessionId) {
        conditions.push(`(m.session_id IS NULL OR m.session_id = $${idx++})`);
        params.push(options.sessionId);
    } else {
        conditions.push(`m.session_id IS NULL`);
    }

    if (options.memoryTypes && options.memoryTypes.length > 0) {
        conditions.push(`m.memory_type = ANY($${idx++})`);
        params.push(options.memoryTypes);
    }

    const result = await db.query(
        `SELECT m.id, m.tenant_id, m.session_id, m.source_request_id,
                m.memory_type, m.content, m.importance, m.expires_at,
                m.created_at,
                1 - (m.embedding <=> $2::vector) AS score
         FROM memories m
         WHERE ${conditions.join(' AND ')}
         ORDER BY score DESC, m.importance DESC
         LIMIT $${idx}`,
        [...params, topK]
    );

    return (result.rows as Array<MemoryRow & { score: number }>).map((row) => ({
        ...rowToMemory(row),
        score: row.score,
    }));
}

export async function listMemories(
    tenantId: string,
    options: { sessionId?: string; memoryType?: MemoryType; limit?: number } = {}
): Promise<Memory[]> {
    const conditions = [`tenant_id = $1`, `(expires_at IS NULL OR expires_at > now())`];
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (options.sessionId) {
        conditions.push(`session_id = $${idx++}`);
        params.push(options.sessionId);
    }
    if (options.memoryType) {
        conditions.push(`memory_type = $${idx++}`);
        params.push(options.memoryType);
    }

    const result = await db.query(
        `SELECT id, tenant_id, session_id, source_request_id, memory_type,
                content, importance, expires_at, created_at
         FROM memories
         WHERE ${conditions.join(' AND ')}
         ORDER BY importance DESC, created_at DESC
         LIMIT $${idx}`,
        [...params, options.limit ?? 100]
    );

    return (result.rows as MemoryRow[]).map(rowToMemory);
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteMemory(id: string, tenantId: string): Promise<boolean> {
    const result = await db.query(
        `DELETE FROM memories WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function deleteExpiredMemories(): Promise<number> {
    const result = await db.query(
        `DELETE FROM memories WHERE expires_at IS NOT NULL AND expires_at <= now()`
    );
    return result.rowCount ?? 0;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

interface MemoryRow {
    id: string;
    tenant_id: string;
    session_id: string | null;
    source_request_id: string | null;
    memory_type: MemoryType;
    content: string;
    importance: number;
    expires_at: string | null;
    created_at: string;
}

function rowToMemory(row: MemoryRow): Memory {
    return {
        id: row.id,
        tenantId: row.tenant_id,
        sessionId: row.session_id,
        sourceRequestId: row.source_request_id,
        memoryType: row.memory_type,
        content: row.content,
        importance: row.importance,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
    };
}
