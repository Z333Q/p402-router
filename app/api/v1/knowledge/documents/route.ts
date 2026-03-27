/**
 * POST /api/v1/knowledge/documents — Ingest a document into a knowledge source
 * GET  /api/v1/knowledge/documents — List documents for a source
 *
 * Ingestion is synchronous for small documents (< 50KB).
 * Large documents queue async ingestion (Phase 2 enhancement).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAccess } from '@/lib/auth';
import { ingestContent, ingestFromUri } from '@/lib/retrieval/ingest';
import db from '@/lib/db';
import { toApiErrorResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const IngestDocumentSchema = z.object({
    source_id: z.string().uuid(),
    title: z.string().max(500).optional(),
    /** Ingest from URL */
    uri: z.string().url().optional(),
    /** Ingest inline content */
    content: z.string().max(500_000).optional(),
    mime_type: z.string().default('text/plain'),
    external_id: z.string().max(255).optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
    /** Tokens per chunk. Default: 512 */
    chunk_tokens: z.number().int().min(64).max(2048).default(512),
}).refine(
    (d) => d.uri !== undefined || d.content !== undefined,
    { message: 'Either uri or content must be provided' }
);

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });

        const body = await req.json().catch(() => null);
        const parse = IngestDocumentSchema.safeParse(body);
        if (!parse.success) {
            return NextResponse.json({
                error: { code: 'INVALID_INPUT', message: 'Invalid request body', details: parse.error.flatten() }
            }, { status: 400 });
        }
        const input = parse.data;

        // Verify source belongs to tenant
        const sourceCheck = await db.query(
            `SELECT id FROM knowledge_sources WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
            [input.source_id, access.tenantId]
        );
        if ((sourceCheck.rows as unknown[]).length === 0) {
            return NextResponse.json(
                { error: { code: 'INVALID_INPUT', message: 'Source not found or inactive' } },
                { status: 404 }
            );
        }

        const options = {
            title: input.title,
            mimeType: input.mime_type,
            externalId: input.external_id,
            metadata: input.metadata,
            chunkTokens: input.chunk_tokens,
        };

        let result;
        if (input.uri) {
            result = await ingestFromUri(input.uri, access.tenantId, input.source_id, options);
        } else {
            result = await ingestContent(input.content!, access.tenantId, input.source_id, options);
        }

        return NextResponse.json({
            document_id: result.documentId,
            chunk_count: result.chunkCount,
            token_count: result.tokenCount,
            duplicate: result.duplicate,
        }, { status: result.duplicate ? 200 : 201 });

    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });

        const { searchParams } = new URL(req.url);
        const sourceId = searchParams.get('source_id');
        const status = searchParams.get('status');

        const conditions = ['kd.tenant_id = $1'];
        const params: unknown[] = [access.tenantId];
        let idx = 2;

        if (sourceId) { conditions.push(`kd.source_id = $${idx++}`); params.push(sourceId); }
        if (status) { conditions.push(`kd.status = $${idx++}`); params.push(status); }

        const result = await db.query(
            `SELECT kd.id, kd.title, kd.mime_type, kd.content_hash,
                    kd.token_count, kd.chunk_count, kd.status, kd.created_at,
                    ks.name AS source_name
             FROM knowledge_documents kd
             JOIN knowledge_sources ks ON ks.id = kd.source_id
             WHERE ${conditions.join(' AND ')}
             ORDER BY kd.created_at DESC
             LIMIT 100`,
            params as string[]
        );

        return NextResponse.json({ documents: result.rows });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
