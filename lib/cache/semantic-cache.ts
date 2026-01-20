/**
 * P402 Semantic Cache
 * ====================
 * Embedding-based semantic caching for AI responses.
 * Uses vector similarity to find cached responses for similar queries.
 * 
 * V2 Spec: Section 4.2 (Semantic Cache)
 */

import pool from '@/lib/db';
import { CompletionRequest, CompletionResponse } from '@/lib/ai-providers/types';

// =============================================================================
// TYPES
// =============================================================================

export interface CacheConfig {
    /** Similarity threshold (0-1). Higher = stricter matching. Default: 0.92 */
    similarityThreshold?: number;
    /** TTL in seconds. Default: 3600 (1 hour) */
    ttlSeconds?: number;
    /** Maximum cached response age in seconds. Default: 86400 (24 hours) */
    maxAgeSeconds?: number;
    /** Namespace for cache isolation */
    namespace?: string;
}

export interface CacheEntry {
    id: string;
    requestHash: string;
    embedding: number[];
    response: CompletionResponse;
    hitCount: number;
    createdAt: Date;
    expiresAt: Date;
}

export interface CacheResult {
    hit: boolean;
    entry?: CacheEntry;
    similarity?: number;
    latencyMs: number;
}

// =============================================================================
// EMBEDDING PROVIDER
// =============================================================================

/**
 * Simple embedding provider using OpenAI's text-embedding-3-small
 * Can be swapped for any embedding model
 */
async function generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY required for semantic cache embeddings');
    }

    // OpenRouter provides an OpenAI-compatible embeddings endpoint
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://p402.io', // Required by OpenRouter
            'X-Title': 'P402 Router'
        },
        body: JSON.stringify({
            model: 'openai/text-embedding-3-small', // Route via OpenRouter
            input: text,
            dimensions: 512
        })
    });

    if (!response.ok) {
        throw new Error(`Embedding generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        const valA = a[i]!;
        const valB = b[i]!;
        dotProduct += valA * valB;
        normA += valA * valA;
        normB += valB * valB;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

// =============================================================================
// CACHE KEY GENERATION
// =============================================================================

/**
 * Generate a deterministic hash for cache lookup
 */
function generateRequestHash(request: CompletionRequest): string {
    // Create a normalized representation of the request
    const normalized = {
        messages: request.messages.map(m => ({
            role: m.role,
            content: typeof m.content === 'string'
                ? m.content
                : JSON.stringify(m.content)
        })),
        model: request.model || 'default',
        temperature: request.temperature ?? 0.7
    };

    // Simple hash function
    const str = JSON.stringify(normalized);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `cache_${Math.abs(hash).toString(16)}`;
}

/**
 * Extract the semantic content from a request for embedding
 */
function extractSemanticContent(request: CompletionRequest): string {
    // Combine system prompt and last user message for semantic matching
    const parts: string[] = [];

    for (const msg of request.messages) {
        if (msg.role === 'system' || msg.role === 'user') {
            const content = typeof msg.content === 'string'
                ? msg.content
                : msg.content.map((p: any) => p.text || '').join(' ');
            parts.push(content);
        }
    }

    // Limit to last ~1000 chars for embedding
    const combined = parts.join('\n');
    return combined.length > 1000 ? combined.slice(-1000) : combined;
}

// =============================================================================
// SEMANTIC CACHE CLASS
// =============================================================================

export class SemanticCache {
    private config: Required<CacheConfig>;

    constructor(config: CacheConfig = {}) {
        this.config = {
            similarityThreshold: config.similarityThreshold ?? 0.92,
            ttlSeconds: config.ttlSeconds ?? 3600,
            maxAgeSeconds: config.maxAgeSeconds ?? 86400,
            namespace: config.namespace ?? 'default'
        };
    }

    /**
     * Check if a similar request exists in cache
     */
    async get(request: CompletionRequest): Promise<CacheResult> {
        const start = Date.now();

        try {
            // Generate hash for exact match first (fast path)
            const hash = generateRequestHash(request);

            // Try exact match
            const exactMatch = await this.getExactMatch(hash);
            if (exactMatch) {
                await this.incrementHitCount(exactMatch.id);
                return {
                    hit: true,
                    entry: exactMatch,
                    similarity: 1.0,
                    latencyMs: Date.now() - start
                };
            }

            // Generate embedding for semantic search
            const semanticContent = extractSemanticContent(request);
            const embedding = await generateEmbedding(semanticContent);

            // Search for similar entries
            const similarEntry = await this.findSimilar(embedding);

            if (similarEntry) {
                await this.incrementHitCount(similarEntry.entry.id);
                return {
                    hit: true,
                    entry: similarEntry.entry,
                    similarity: similarEntry.similarity,
                    latencyMs: Date.now() - start
                };
            }

            return {
                hit: false,
                latencyMs: Date.now() - start
            };

        } catch (error) {
            console.error('[SemanticCache] Get error:', error);
            return {
                hit: false,
                latencyMs: Date.now() - start
            };
        }
    }

    /**
     * Store a response in the cache
     */
    async set(request: CompletionRequest, response: CompletionResponse): Promise<void> {
        try {
            const hash = generateRequestHash(request);
            const semanticContent = extractSemanticContent(request);
            const embedding = await generateEmbedding(semanticContent);

            const expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + this.config.ttlSeconds);

            // Store in database
            await pool.query(`
                INSERT INTO semantic_cache (
                    id,
                    namespace,
                    request_hash,
                    embedding,
                    response,
                    hit_count,
                    created_at,
                    expires_at
                ) VALUES ($1, $2, $3, $4, $5, 0, NOW(), $6)
                ON CONFLICT (namespace, request_hash) 
                DO UPDATE SET
                    embedding = EXCLUDED.embedding,
                    response = EXCLUDED.response,
                    expires_at = EXCLUDED.expires_at
            `, [
                `cache_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                this.config.namespace,
                hash,
                JSON.stringify(embedding),
                JSON.stringify(response),
                expiresAt
            ]);

        } catch (error) {
            console.error('[SemanticCache] Set error:', error);
            // Don't throw - caching failure shouldn't break the request
        }
    }

    /**
     * Invalidate cache entries
     */
    async invalidate(pattern?: string): Promise<number> {
        try {
            let result;
            if (pattern) {
                result = await pool.query(`
                    DELETE FROM semantic_cache 
                    WHERE namespace = $1 
                    AND request_hash LIKE $2
                `, [this.config.namespace, `%${pattern}%`]);
            } else {
                result = await pool.query(`
                    DELETE FROM semantic_cache 
                    WHERE namespace = $1
                `, [this.config.namespace]);
            }
            return result.rowCount || 0;
        } catch (error) {
            console.error('[SemanticCache] Invalidate error:', error);
            return 0;
        }
    }

    /**
     * Clean up expired entries
     */
    async cleanup(): Promise<number> {
        try {
            const result = await pool.query(`
                DELETE FROM semantic_cache 
                WHERE expires_at < NOW()
                OR created_at < NOW() - INTERVAL '${this.config.maxAgeSeconds} seconds'
            `);
            return result.rowCount || 0;
        } catch (error) {
            console.error('[SemanticCache] Cleanup error:', error);
            return 0;
        }
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<{
        totalEntries: number;
        totalHits: number;
        avgHitsPerEntry: number;
        oldestEntry: Date | null;
        namespaces: string[];
    }> {
        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(*) as total_entries,
                    COALESCE(SUM(hit_count), 0) as total_hits,
                    COALESCE(AVG(hit_count), 0) as avg_hits,
                    MIN(created_at) as oldest_entry
                FROM semantic_cache
                WHERE namespace = $1
            `, [this.config.namespace]);

            const namespaceResult = await pool.query(`
                SELECT DISTINCT namespace FROM semantic_cache
            `);

            const row = result.rows[0];
            return {
                totalEntries: parseInt(row.total_entries) || 0,
                totalHits: parseInt(row.total_hits) || 0,
                avgHitsPerEntry: parseFloat(row.avg_hits) || 0,
                oldestEntry: row.oldest_entry,
                namespaces: namespaceResult.rows.map(r => r.namespace)
            };
        } catch (error) {
            console.error('[SemanticCache] Stats error:', error);
            return {
                totalEntries: 0,
                totalHits: 0,
                avgHitsPerEntry: 0,
                oldestEntry: null,
                namespaces: []
            };
        }
    }

    // =========================================================================
    // PRIVATE METHODS
    // =========================================================================

    private async getExactMatch(hash: string): Promise<CacheEntry | null> {
        const result = await pool.query(`
            SELECT id, request_hash, embedding, response, hit_count, created_at, expires_at
            FROM semantic_cache
            WHERE namespace = $1 
            AND request_hash = $2
            AND expires_at > NOW()
        `, [this.config.namespace, hash]);

        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            id: row.id,
            requestHash: row.request_hash,
            embedding: JSON.parse(row.embedding),
            response: JSON.parse(row.response),
            hitCount: row.hit_count,
            createdAt: row.created_at,
            expiresAt: row.expires_at
        };
    }

    private async findSimilar(queryEmbedding: number[]): Promise<{ entry: CacheEntry; similarity: number } | null> {
        // Fetch recent cache entries for comparison
        // In production, use pgvector for efficient similarity search
        const result = await pool.query(`
            SELECT id, request_hash, embedding, response, hit_count, created_at, expires_at
            FROM semantic_cache
            WHERE namespace = $1
            AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 100
        `, [this.config.namespace]);

        let bestMatch: { entry: CacheEntry; similarity: number } | null = null;

        for (const row of result.rows) {
            const embedding = JSON.parse(row.embedding);
            const similarity = cosineSimilarity(queryEmbedding, embedding);

            if (similarity >= this.config.similarityThreshold) {
                if (!bestMatch || similarity > bestMatch.similarity) {
                    bestMatch = {
                        entry: {
                            id: row.id,
                            requestHash: row.request_hash,
                            embedding,
                            response: JSON.parse(row.response),
                            hitCount: row.hit_count,
                            createdAt: row.created_at,
                            expiresAt: row.expires_at
                        },
                        similarity
                    };
                }
            }
        }

        return bestMatch;
    }

    private async incrementHitCount(id: string): Promise<void> {
        await pool.query(`
            UPDATE semantic_cache 
            SET hit_count = hit_count + 1 
            WHERE id = $1
        `, [id]);
    }
}

// =============================================================================
// SINGLETON & HELPERS
// =============================================================================

let defaultCache: SemanticCache | null = null;

export function getSemanticCache(config?: CacheConfig): SemanticCache {
    if (!defaultCache || config) {
        defaultCache = new SemanticCache(config);
    }
    return defaultCache;
}

/**
 * Cache middleware for completion requests
 */
export async function withCache<T>(
    request: CompletionRequest,
    execute: () => Promise<T>,
    config?: CacheConfig
): Promise<T & { cached?: boolean; cacheLatencyMs?: number }> {
    const cache = getSemanticCache(config);

    // Check cache
    const cacheResult = await cache.get(request);

    if (cacheResult.hit && cacheResult.entry) {
        return {
            ...cacheResult.entry.response as T,
            cached: true,
            cacheLatencyMs: cacheResult.latencyMs
        };
    }

    // Execute and cache result
    const result = await execute();

    // Store in cache (async, don't await)
    cache.set(request, result as any).catch(console.error);

    return {
        ...result,
        cached: false,
        cacheLatencyMs: cacheResult.latencyMs
    };
}
