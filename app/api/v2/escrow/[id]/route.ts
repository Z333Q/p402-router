/**
 * GET    /api/v2/escrow/[id]              — Get escrow details
 * POST   /api/v2/escrow/[id]              — Transition state
 *
 * State transitions via POST body { action: 'fund'|'accept'|'start'|'deliver'|'release'|'dispute'|'resolve' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
    getEscrow,
    getEscrowEvents,
    markFunded,
    markAccepted,
    markInProgress,
    markDelivered,
    markSettled,
    markDisputed,
    markResolved,
} from '@/lib/services/escrow-service';

export const dynamic = 'force-dynamic';

// =============================================================================
// GET
// =============================================================================

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const access = await requireTenantAccess(req);
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { id } = await params;

    try {
        const [escrow, events] = await Promise.all([
            getEscrow(id),
            getEscrowEvents(id),
        ]);

        if (!escrow) {
            return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Escrow not found' } }, { status: 404 });
        }

        return NextResponse.json({ object: 'escrow', ...escrow, events });
    } catch (error: unknown) {
        return toApiErrorResponse(error, crypto.randomUUID());
    }
}

// =============================================================================
// POST — State Transitions
// =============================================================================

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const access = await requireTenantAccess(req);
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { id } = await params;

    try {
        const body = await req.json();
        const { action, actor, proof_hash, tx_hash, to_provider } = body;

        if (!action) {
            return NextResponse.json({
                error: { code: 'MISSING_ACTION', message: 'action is required' }
            }, { status: 400 });
        }

        let escrow;

        switch (action) {
            case 'fund':
                if (!tx_hash) return NextResponse.json({ error: { code: 'MISSING_TX_HASH', message: 'tx_hash required for fund' } }, { status: 400 });
                escrow = await markFunded(id, tx_hash);
                break;

            case 'accept':
                if (!actor) return NextResponse.json({ error: { code: 'MISSING_ACTOR', message: 'actor required' } }, { status: 400 });
                escrow = await markAccepted(id, actor);
                break;

            case 'start':
                if (!actor) return NextResponse.json({ error: { code: 'MISSING_ACTOR', message: 'actor required' } }, { status: 400 });
                escrow = await markInProgress(id, actor);
                break;

            case 'deliver':
                if (!actor || !proof_hash) return NextResponse.json({ error: { code: 'MISSING_FIELDS', message: 'actor and proof_hash required' } }, { status: 400 });
                escrow = await markDelivered(id, actor, proof_hash);
                break;

            case 'release':
                if (!actor) return NextResponse.json({ error: { code: 'MISSING_ACTOR', message: 'actor required' } }, { status: 400 });
                escrow = await markSettled(id, actor, tx_hash);
                break;

            case 'dispute':
                if (!actor) return NextResponse.json({ error: { code: 'MISSING_ACTOR', message: 'actor required' } }, { status: 400 });
                escrow = await markDisputed(id, actor);
                break;

            case 'resolve': {
                // Admin only — check session email
                const session = await getServerSession(authOptions);
                const sessionEmail = (session?.user as { email?: string })?.email ?? '';
                const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim());
                if (!adminEmails.includes(sessionEmail)) {
                    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin only' } }, { status: 403 });
                }
                if (typeof to_provider !== 'boolean') {
                    return NextResponse.json({ error: { code: 'MISSING_FIELDS', message: 'to_provider (boolean) required' } }, { status: 400 });
                }
                escrow = await markResolved(id, to_provider);
                break;
            }

            default:
                return NextResponse.json({ error: { code: 'UNKNOWN_ACTION', message: `Unknown action: ${action}` } }, { status: 400 });
        }

        return NextResponse.json({ object: 'escrow', ...escrow });
    } catch (error: unknown) {
        const err = error as Error;
        // State transition errors are 400/403 not 500
        if (err.message?.includes('not in') || err.message?.includes('Only') || err.message?.includes('window')) {
            return NextResponse.json({ error: { code: 'INVALID_TRANSITION', message: err.message } }, { status: 400 });
        }
        return toApiErrorResponse(error, crypto.randomUUID());
    }
}
