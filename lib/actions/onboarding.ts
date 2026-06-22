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

    try {
        // 3AY-8R-3-Impl predecessor: tenants.onboarded_at landed in v2_059.
        // COALESCE makes the set strictly idempotent: the column is set on
        // the first successful call and untouched on every subsequent call,
        // while updated_at refreshes each time. Re-entries never re-set
        // the onboarding lifecycle.
        await db.query(
            `UPDATE tenants
             SET onboarded_at = COALESCE(onboarded_at, NOW()),
                 updated_at = NOW()
             WHERE id = $1`,
            [tenantId]
        );

        recordFunnelEvent({
            eventName: 'funnel.onboarding_completed',
            tenantId,
            properties: typeof goal === 'string' && goal.length > 0 ? { goal } : {},
        }).catch(() => {
            // recordFunnelEvent already swallows internally; this is a
            // belt-and-braces guard.
        });
    } catch (e) {
        console.error('Failed to set onboarding status in DB', e);
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
