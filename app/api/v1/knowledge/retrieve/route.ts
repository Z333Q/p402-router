/**
 * POST /api/v1/knowledge/retrieve — Direct retrieval query
 * Returns ranked context chunks for the given query string.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAccess } from '@/lib/auth';
import { searchKnowledge, logRetrievalQuery } from '@/lib/retrieval/search';
import { generateEmbedding } from '@/lib/retrieval/embed';
import { packContext } from '@/lib/retrieval/context-packer';
import { toApiErrorResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const RetrieveSchema = z.object({
    query: z.string().min(1).max(2000),
    top_k: z.number().int().min(1).max(20).default(5),
    min_score: z.number().min(0).max(1).default(0.60),
    token_budget: z.number().int().min(100).max(8000).default(4000),
    source_ids: z.array(z.string().uuid()).optional(),
    trust_level: z.enum(['standard', 'verified', 'internal']).optional(),
    /** Include packed context string in response. Default: true */
    include_context: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();
    const startMs = Date.now();

    try {
        const access = await requireTenantAccess(req);
        if (access.error) return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });

        const body = await req.json().catch(() => null);
        const parse = RetrieveSchema.safeParse(body);
        if (!parse.success) {
            return NextResponse.json({
                error: { code: 'INVALID_INPUT', message: 'Invalid request body', details: parse.error.flatten() }
            }, { status: 400 });
        }
        const input = parse.data;

        // Search
        const results = await searchKnowledge(input.query, access.tenantId, {
            topK: input.top_k,
            minScore: input.min_score,
            sourceIds: input.source_ids,
            trustLevel: input.trust_level,
        });

        const latencyMs = Date.now() - startMs;

        // Pack context
        const packedContext = input.include_context
            ? packContext(results, { tokenBudget: input.token_budget })
            : null;

        // Log retrieval query (non-blocking)
        if (results.length > 0) {
            generateEmbedding(input.query)
                .then((emb) => logRetrievalQuery(
                    access.tenantId,
                    input.query,
                    emb.embedding,
                    results,
                    { topK: input.top_k, tokenBudget: input.token_budget, latencyMs }
                ))
                .catch(() => null);
        }

        return NextResponse.json({
            query: input.query,
            results: results.map((r) => ({
                chunk_id: r.chunkId,
                document_id: r.documentId,
                source_id: r.sourceId,
                content: r.content,
                token_count: r.tokenCount,
                score: r.score,
                rank: r.rank,
                document_title: r.documentTitle,
            })),
            context: packedContext,
            meta: {
                result_count: results.length,
                latency_ms: latencyMs,
                request_id: requestId,
            },
        });

    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
