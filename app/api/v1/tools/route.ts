/**
 * GET  /api/v1/tools — List available tools (built-ins + tenant custom)
 * POST /api/v1/tools — Register a tenant-custom tool
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAccess } from '@/lib/auth';
import { listAvailableTools, createCustomTool } from '@/lib/tools/registry';
import { toApiErrorResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const CreateToolSchema = z.object({
    name: z.string().min(1).max(64).regex(/^[a-z][a-z0-9_]*$/, {
        message: 'Tool name must be lowercase, start with a letter, and use only a-z, 0-9, _',
    }),
    description: z.string().min(1).max(500),
    input_schema: z.record(z.string(), z.unknown()).default({}),
    config: z.record(z.string(), z.unknown()).default({}),
    enabled: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });

        const tools = await listAvailableTools(access.tenantId);

        return NextResponse.json({
            tools: tools.map((t) => ({
                id: t.id,
                name: t.name,
                description: t.description,
                input_schema: t.inputSchema,
                is_builtin: t.isBuiltin,
                enabled: t.enabled,
                tenant_id: t.tenantId,
            })),
            total: tools.length,
        });
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
        const parse = CreateToolSchema.safeParse(body);
        if (!parse.success) {
            return NextResponse.json(
                { error: { code: 'INVALID_INPUT', message: 'Invalid request body', details: parse.error.flatten() } },
                { status: 400 }
            );
        }
        const input = parse.data;

        const tool = await createCustomTool(access.tenantId, {
            name: input.name,
            description: input.description,
            inputSchema: input.input_schema,
            config: input.config,
            enabled: input.enabled,
        });

        return NextResponse.json({
            tool: {
                id: tool.id,
                name: tool.name,
                description: tool.description,
                input_schema: tool.inputSchema,
                is_builtin: tool.isBuiltin,
                enabled: tool.enabled,
            },
        }, { status: 201 });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
