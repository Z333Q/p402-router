/**
 * lib/partner/auth.ts
 * ====================
 * Server-side auth guards for partner API routes and pages.
 *
 * Pattern mirrors lib/auth.ts requireTenantAccess — consistent, predictable.
 *
 * Usage in API routes:
 *   const partnerAuth = await requirePartnerAccess(req);
 *   if ('error' in partnerAuth) return NextResponse.json({ error: partnerAuth.error }, { status: partnerAuth.status });
 *   const { partnerId, partnerRole, permissions } = partnerAuth;
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
    resolvePartnerPermissions,
    isInternalPartnerRole,
    type PartnerPermission,
    type PartnerRole,
} from './permissions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PartnerAuthOk {
    partnerId: string;
    tenantId: string;
    partnerRole: PartnerRole;
    permissions: PartnerPermission[];
    partnerGroupIds: string[];
}

export interface PartnerAuthError {
    error: string;
    status: 401 | 403 | 404;
}

export type PartnerAuthResult = PartnerAuthOk | PartnerAuthError;

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/**
 * Require any active partner membership.
 * Checks the JWT claims set during login — no extra DB round-trip.
 */
export async function requirePartnerAccess(
    req: NextRequest
): Promise<PartnerAuthResult> {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return { error: 'Unauthorized', status: 401 };
    }

    const user = session.user as {
        tenantId?: string;
        partnerId?: string;
        partnerRole?: string;
        partnerGroupIds?: string[];
    };

    if (!user.tenantId) {
        return { error: 'Unauthorized: no tenant context', status: 401 };
    }

    if (!user.partnerId || !user.partnerRole) {
        return { error: 'Forbidden: no partner membership', status: 403 };
    }

    const permissions = resolvePartnerPermissions(user.partnerRole);

    return {
        partnerId: user.partnerId,
        tenantId: user.tenantId,
        partnerRole: user.partnerRole as PartnerRole,
        permissions,
        partnerGroupIds: user.partnerGroupIds ?? [],
    };
}

/**
 * Require a specific permission. Extends requirePartnerAccess.
 */
export async function requirePartnerPermission(
    req: NextRequest,
    permission: PartnerPermission
): Promise<PartnerAuthResult> {
    const auth = await requirePartnerAccess(req);
    if ('error' in auth) return auth;

    if (!auth.permissions.includes(permission)) {
        return { error: `Forbidden: requires ${permission}`, status: 403 };
    }

    return auth;
}

/**
 * Require an internal partner staff role.
 * Blocks external partner roles from accessing admin-only routes.
 */
export async function requirePartnerAdminAccess(
    req: NextRequest
): Promise<PartnerAuthResult> {
    const auth = await requirePartnerAccess(req);
    if ('error' in auth) return auth;

    if (!isInternalPartnerRole(auth.partnerRole)) {
        return { error: 'Forbidden: internal staff only', status: 403 };
    }

    return auth;
}

/**
 * Helper to narrow auth result type safely.
 */
export function isAuthError(result: PartnerAuthResult): result is PartnerAuthError {
    return 'error' in result;
}
