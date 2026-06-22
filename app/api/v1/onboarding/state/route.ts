/**
 * 3AZ-2-B — onboarding state read endpoint.
 *
 * Returns `{ onboarded: boolean }` for the authenticated tenant. The
 * dashboard layout calls this on first render to decide whether to gate
 * the user into onboarding.
 *
 * Fails OPEN per plan §10.3: any error path returns `onboarded: true`
 * so the dashboard renders. Re-prompting a returning user back into
 * onboarding on a transient hiccup is the worst conversion failure.
 *
 * Unauthenticated callers also receive `onboarded: true` so the layout
 * does not double-gate (the session check already redirects to /login).
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// Never let intermediaries / browsers cache this response. The gate
// must see the freshest value the instant completeOnboardingAction
// sets tenants.onboarded_at, otherwise the user gets bounced back
// to /onboarding after clicking "Got it" (regression seen on
// ccb25c7).
const NO_CACHE_HEADERS: Record<string, string> = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
};

function jsonNoCache(body: Record<string, unknown>): NextResponse {
    return NextResponse.json(body, { headers: NO_CACHE_HEADERS });
}

export async function GET() {
    let tenantId: string | undefined;
    try {
        const session = await getServerSession(authOptions);
        tenantId = (session?.user as { tenantId?: string } | undefined)?.tenantId;
    } catch {
        return jsonNoCache({ onboarded: true });
    }

    if (!tenantId) {
        return jsonNoCache({ onboarded: true });
    }

    try {
        const { rows } = (await db.query(
            `SELECT onboarded_at FROM tenants WHERE id = $1`,
            [tenantId]
        )) as { rows: { onboarded_at: Date | string | null }[] };

        const onboarded = rows.length > 0 && !!rows[0]?.onboarded_at;
        return jsonNoCache({ onboarded });
    } catch {
        return jsonNoCache({ onboarded: true });
    }
}
