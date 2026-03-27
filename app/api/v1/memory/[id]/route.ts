/**
 * DELETE /api/v1/memory/:id — Delete a specific memory
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth';
import { deleteMemory } from '@/lib/memory/store';
import { toApiErrorResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });

        const { id } = await params;
        if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
            return NextResponse.json(
                { error: { code: 'INVALID_INPUT', message: 'Invalid memory ID' } },
                { status: 400 }
            );
        }

        const deleted = await deleteMemory(id, access.tenantId);
        if (!deleted) {
            return NextResponse.json(
                { error: { code: 'RECEIPT_NOT_FOUND', message: 'Memory not found' } },
                { status: 404 }
            );
        }

        return new NextResponse(null, { status: 204 });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
