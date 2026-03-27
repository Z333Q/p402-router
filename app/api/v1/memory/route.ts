/**
 * GET  /api/v1/memory — List or search memories
 * POST /api/v1/memory — Store a memory explicitly
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAccess } from '@/lib/auth';
import { storeMemory, listMemories, retrieveMemories } from '@/lib/memory/store';
import { toApiErrorResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const MemoryTypeEnum = z.enum(['fact', 'preference', 'entity', 'instruction', 'summary']);

const StoreMemorySchema = z.object({
    memory_type: MemoryTypeEnum,
    content: z.string().min(1).max(500),
    importance: z.number().min(0).max(1).default(0.7),
    session_id: z.string().uuid().optional(),
    ttl_hours: z.number().int().min(1).optional(),
});

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });

        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');
        const sessionId = searchParams.get('session_id') ?? undefined;
        const memoryType = searchParams.get('type') ?? undefined;
        const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10));

        let memories;
        if (query) {
            memories = await retrieveMemories(query, access.tenantId, {
                topK: limit,
                sessionId,
            });
            return NextResponse.json({
                memories: memories.map((m) => ({ ...formatMemory(m), score: m.score })),
                total: memories.length,
                query,
            });
        }

        memories = await listMemories(access.tenantId, {
            sessionId,
            memoryType: memoryType as z.infer<typeof MemoryTypeEnum> | undefined,
            limit,
        });

        return NextResponse.json({ memories: memories.map(formatMemory), total: memories.length });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });

        const body = await req.json().catch(() => null);
        const parse = StoreMemorySchema.safeParse(body);
        if (!parse.success) {
            return NextResponse.json(
                { error: { code: 'INVALID_INPUT', message: 'Invalid request body', details: parse.error.flatten() } },
                { status: 400 }
            );
        }
        const input = parse.data;

        const memory = await storeMemory(
            access.tenantId,
            { memoryType: input.memory_type, content: input.content, importance: input.importance },
            { sessionId: input.session_id, ttlHours: input.ttl_hours }
        );

        return NextResponse.json({ memory: formatMemory(memory) }, { status: 201 });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}

function formatMemory(m: { id: string; memoryType: string; content: string; importance: number; sessionId: string | null; expiresAt: string | null; createdAt: string }) {
    return {
        id: m.id,
        memory_type: m.memoryType,
        content: m.content,
        importance: m.importance,
        session_id: m.sessionId,
        expires_at: m.expiresAt,
        created_at: m.createdAt,
    };
}
