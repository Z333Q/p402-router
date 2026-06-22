'use server';

import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { recordFunnelEvent } from '@/lib/analytics/funnel';

export async function completeOnboardingAction(formData: FormData) {
    const session = await getServerSession(authOptions);
    const tenantId = (session?.user as any)?.tenantId;
    if (!tenantId) redirect('/login');

    const goal = formData.get('goal') as string;

    // 3AY-8R-3-Impl predecessor: tenants.onboarded_at landed in v2_059.
    // COALESCE makes the set strictly idempotent: the column is set on
    // the first successful call and untouched on every subsequent call,
    // while updated_at refreshes each time. Re-entries never re-set the
    // onboarding lifecycle.
    //
    // RETURNING id lets us verify the UPDATE actually hit a row. If
    // rowCount === 0 the session's tenantId references a tenant row
    // that no longer exists (stale JWT after a DB reset, or a test
    // tenant that was deleted). In that case we send the user to
    // /login so the signIn callback can re-provision the row and
    // refresh the JWT, instead of redirecting them into a dashboard
    // gate that will silently bounce them back to /onboarding.
    let updateOk = false;
    try {
        // Production schema NOTE: tenants does not currently carry an
        // `updated_at` column (verified 2026-06-23 via Vercel function
        // logs: code 42703 "column updated_at of relation tenants does
        // not exist"). Four other call sites in the repo do attempt to
        // SET updated_at on tenants — they will fail with the same
        // error if exercised on production. A dedicated migration is
        // the proper fix; this action only sets onboarded_at to avoid
        // dragging the unrelated column-missing bug into the
        // onboarding critical path.
        const result = await db.query(
            `UPDATE tenants
             SET onboarded_at = COALESCE(onboarded_at, NOW())
             WHERE id = $1
             RETURNING id`,
            [tenantId]
        );
        updateOk = (result.rowCount ?? 0) > 0;
        if (!updateOk) {
            console.warn(
                '[completeOnboardingAction] UPDATE tenants matched 0 rows',
                { tenantId }
            );
        } else {
            recordFunnelEvent({
                eventName: 'funnel.onboarding_completed',
                tenantId,
                properties: typeof goal === 'string' && goal.length > 0 ? { goal } : {},
            }).catch(() => {
                // recordFunnelEvent already swallows internally; this is a
                // belt-and-braces guard.
            });
        }
    } catch (e) {
        console.error('[completeOnboardingAction] UPDATE tenants failed', e);
    }

    if (!updateOk) {
        // No row updated -> tenant row missing or UPDATE threw. Either
        // way, redirecting to /dashboard would just trap the user in
        // the onboarding-gate loop. Bounce them through /login so the
        // signIn callback can re-provision the tenant.
        redirect('/login');
    }

    // 2. Redirect to the personalized "Aha!" moment
    if (goal === 'test_routing') {
        redirect('/dashboard/playground');
    } else if (goal === 'publish_agent') {
        redirect('/dashboard/bazaar/new');
    } else if (goal === 'enterprise_trust') {
        redirect('/dashboard/trust');
    } else {
        redirect('/dashboard');
    }
}
