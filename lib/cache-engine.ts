
import pool from './db';
import crypto from 'crypto';

export type CacheHit = {
    found: boolean;
    response?: any;
    score?: number;
};

export class SemanticCache {
    /**
     * Fast exact match check using sha256 hash of the prompt
     */
    static generateHash(prompt: string): string {
        return crypto.createHash('sha256').update(prompt).digest('hex');
    }

    /**
     * Lookup a prompt in the cache.
     * Starts with exact match, falls back to semantic search if enabled.
     */
    static async lookup(prompt: string, tenantId: string): Promise<CacheHit> {
        const hash = this.generateHash(prompt);

        try {
            // 1. Exact Match Check (O(1))
            const exactRes = await pool.query(
                'SELECT response FROM semantic_cache WHERE tenant_id = $1 AND request_hash = $2 LIMIT 1',
                [tenantId, hash]
            );

            if (exactRes.rows.length > 0) {
                // Update usage stats asynchronously
                pool.query(
                    'UPDATE semantic_cache SET usage_count = usage_count + 1, last_accessed_at = NOW() WHERE request_hash = $1',
                    [hash]
                ).catch(e => console.error('[Cache] Failed to update stats:', e));

                return { found: true, response: exactRes.rows[0].response, score: 1.0 };
            }

            // 2. Semantic Match Check (Future / Requires pgvector + Embeddings)
            // For MVP, we stick to exact match unless embeddings are provided.
            // If we had the vector, we'd do:
            // SELECT response, 1 - (request_embedding <=> $1) as score FROM semantic_cache ...

            return { found: false };
        } catch (e) {
            console.error('[Cache] Lookup failed:', e);
            return { found: false };
        }
    }

    /**
     * Store a response in the cache
     */
    static async store(prompt: string, response: any, tenantId: string, model?: string) {
        const hash = this.generateHash(prompt);

        try {
            // We use ON CONFLICT to avoid duplicate hashes for same tenant
            await pool.query(`
                INSERT INTO semantic_cache (
                    tenant_id, request_hash, prompt, response, model, created_at
                ) VALUES ($1, $2, $3, $4, $5, NOW())
                ON CONFLICT (request_hash, tenant_id) 
                DO UPDATE SET usage_count = semantic_cache.usage_count + 1, last_accessed_at = NOW()
            `, [tenantId, hash, prompt, JSON.stringify(response), model]);
        } catch (e) {
            console.error('[Cache] Store failed:', e);
        }
    }
}
