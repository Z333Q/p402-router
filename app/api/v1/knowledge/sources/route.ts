/**
 * POST /api/v1/knowledge/sources — Create a knowledge source
 * GET  /api/v1/knowledge/sources — List knowledge sources for tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAccess } from '@/lib/auth';
import db from '@/lib/db';
import { toApiErrorResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const CreateSourceSchema = z.object({
    name: z.string().min(1).max(255),
    source_type: z.enum(['manual', 'url', 'upload', 'api', 'sync']).default('manual'),
    uri: z.string().url().optional(),
    trust_level: z.enum(['standard', 'verified', 'internal']).default('standard'),
    confidentiality: z.enum(['private', 'tenant', 'public']).default('private'),
    jurisdiction: z.string().max(100).optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });

        const body = await req.json().catch(() => null);
        const parse = CreateSourceSchema.safeParse(body);
        if (!parse.success) {
            return NextResponse.json({
                error: { code: 'INVALID_INPUT', message: 'Invalid request body', details: parse.error.flatten() }
            }, { status: 400 });
        }
        const input = parse.data;

        const result = await db.query(
            `INSERT INTO knowledge_sources
                (tenant_id, name, source_type, uri, trust_level, confidentiality, jurisdiction, metadata)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             RETURNING id, name, source_type, trust_level, confidentiality, status, created_at`,
            [
                access.tenantId,
                input.name,
                input.source_type,
                input.uri ?? null,
                input.trust_level,
                input.confidentiality,
                input.jurisdiction ?? null,
                JSON.stringify(input.metadata),
            ]
        );
        const row = (result.rows as Array<Record<string, unknown>>)[0];

        return NextResponse.json({ source: row }, { status: 201 });
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
        const status = searchParams.get('status') ?? 'active';

        const result = await db.query(
            `SELECT id, name, source_type, uri, trust_level, confidentiality,
                    status, created_at, updated_at,
                    (SELECT COUNT(*) FROM knowledge_documents WHERE source_id = ks.id) AS document_count
             FROM knowledge_sources ks
             WHERE tenant_id = $1 AND status = $2
             ORDER BY created_at DESC
             LIMIT 100`,
            [access.tenantId, status]
        );

        return NextResponse.json({ sources: result.rows });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
