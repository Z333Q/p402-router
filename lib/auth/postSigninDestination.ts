/**
 * 3AZ-2-B — post-signin destination helper.
 *
 * Per docs/internal/3AZ-2-onboarding-refresh-plan.md §4.2 + §10.3:
 *
 * - If the tenant has completed onboarding (`tenants.onboarded_at IS NOT
 *   NULL`), send them to `/dashboard`.
 * - Otherwise send them to `/onboarding` (the current page in 3AZ-2-B;
 *   3AZ-2-D cuts this over to `/onboarding/welcome`).
 * - Any DB failure fails OPEN to `/dashboard`. We would rather briefly
 *   show the dashboard before the gate catches up than dead-end a user
 *   in the onboarding loop because of a transient query error.
 *
 * Pure server-side. No NextAuth imports — callers pass tenantId in so
 * this helper can be unit-tested without an auth context.
 */

import db from '@/lib/db';

export type PostSigninDestination = '/dashboard' | '/onboarding';

export async function getPostSigninDestination(
    tenantId: string | null | undefined
): Promise<PostSigninDestination> {
    if (typeof tenantId !== 'string' || tenantId.length === 0) {
        // No tenant means we have no row to consult — send to onboarding
        // so the existing flow has a chance to provision and orient. This
        // is NOT a fail-open case; missing tenantId is a hard signal that
        // the user has never been seen.
        return '/onboarding';
    }

    try {
        const { rows } = (await db.query(
            `SELECT onboarded_at FROM tenants WHERE id = $1`,
            [tenantId]
        )) as { rows: { onboarded_at: Date | string | null }[] };

        if (!rows || rows.length === 0 || !rows[0]) {
            return '/onboarding';
        }
        return rows[0].onboarded_at ? '/dashboard' : '/onboarding';
    } catch {
        // Fail OPEN per plan §10.3: never loop the user back to onboarding
        // because of a transient DB hiccup.
        return '/dashboard';
    }
}
