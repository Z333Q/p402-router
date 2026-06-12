import pool from './db';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { PrivacyMode } from './economic-events/types';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

export type CacheHit = {
    found: boolean;
    response?: any;
    score?: number;
    skipped?: 'privacy_mode' | 'tenant_disabled';
};

// Privacy contract (V5 §27.2, Slice E):
//   - metadata_only / fingerprint_only / private_gateway → semantic cache must
//     not embed (no prompt to Google) and must not persist raw prompt.
//   - redacted_trace / full_trace → cache is permitted by privacy mode, but
//     still requires explicit tenant opt-in via intelligence_cache_config.enabled.
//   - unknown / undefined mode → skip (fail-closed; strict allowlist).
function cacheAllowed(mode: PrivacyMode | undefined): boolean {
    return mode === 'redacted_trace' || mode === 'full_trace';
}

// Tenant opt-in gate. Missing row = disabled. Any DB error = disabled.
async function tenantCacheEnabled(tenantId: string): Promise<boolean> {
    try {
        const r = await pool.query(
            'SELECT enabled FROM intelligence_cache_config WHERE tenant_id = $1 LIMIT 1',
            [tenantId],
        );
        return r.rows[0]?.enabled === true;
    } catch {
        return false;
    }
}

export class SemanticCache {
    /**
     * Fast exact match check using sha256 hash of the prompt
     */
    static generateHash(prompt: string): string {
        return crypto.createHash('sha256').update(prompt).digest('hex');
    }

    static async generateEmbedding(text: string): Promise<number[]> {
        try {
            const result = await embeddingModel.embedContent(text);
            return result.embedding.values;
        } catch (e) {
            console.error('[Cache] Embedding failed:', e);
            return [];
        }
    }

    /**
     * Lookup a prompt in the cache.
     * Starts with exact match, falls back to semantic search if enabled.
     *
     * Privacy: requires explicit privacyMode of `redacted_trace` or `full_trace`.
     * In metadata_only / fingerprint_only / private_gateway (or undefined) the
     * cache is bypassed entirely — no embedding call to Google, no DB hit.
     */
    static async lookup(prompt: string, tenantId: string, privacyMode?: PrivacyMode): Promise<CacheHit> {
        if (!cacheAllowed(privacyMode)) {
            return { found: false, skipped: 'privacy_mode' };
        }
        if (!(await tenantCacheEnabled(tenantId))) {
            return { found: false, skipped: 'tenant_disabled' };
        }
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

            // 2. Semantic Match Check (Fuzzy Search)
            const embedding = await this.generateEmbedding(prompt);
            if (embedding.length > 0) {
                // Fetch similarity threshold from config or default 0.85
                const configRes = await pool.query('SELECT similarity_threshold FROM intelligence_cache_config WHERE tenant_id = $1', [tenantId]);
                const threshold = configRes.rows[0]?.similarity_threshold || 0.85;

                const semanticRes = await pool.query(`
                    SELECT response, 1 - (request_embedding <=> $1) as score 
                    FROM semantic_cache 
                    WHERE tenant_id = $2 
                      AND (1 - (request_embedding <=> $1)) > $3
                    ORDER BY score DESC 
                    LIMIT 1
                `, [JSON.stringify(embedding), tenantId, threshold]);

                if (semanticRes.rows.length > 0) {
                    const hit = semanticRes.rows[0];
                    return { found: true, response: hit.response, score: parseFloat(hit.score) };
                }
            }

            return { found: false };
        } catch (e) {
            console.error('[Cache] Lookup failed:', e);
            return { found: false };
        }
    }

    /**
     * Store a response in the cache.
     *
     * Privacy: requires explicit privacyMode of `redacted_trace` or `full_trace`.
     * Any other mode (or undefined) is a no-op — no embedding call, no DB write,
     * no raw prompt persisted.
     */
    static async store(prompt: string, response: any, tenantId: string, model?: string, privacyMode?: PrivacyMode) {
        if (!cacheAllowed(privacyMode)) {
            return;
        }
        if (!(await tenantCacheEnabled(tenantId))) {
            return;
        }
        const hash = this.generateHash(prompt);
        const embedding = await this.generateEmbedding(prompt);

        try {
            await pool.query(`
                INSERT INTO semantic_cache (
                    tenant_id, request_hash, prompt, response, model, request_embedding, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (request_hash, tenant_id) 
                DO UPDATE SET 
                    usage_count = semantic_cache.usage_count + 1, 
                    last_accessed_at = NOW(),
                    request_embedding = EXCLUDED.request_embedding
            `, [
                tenantId, hash, prompt,
                JSON.stringify(response), model,
                embedding.length > 0 ? JSON.stringify(embedding) : null
            ]);
        } catch (e) {
            console.error('[Cache] Store failed:', e);
        }
    }
}
