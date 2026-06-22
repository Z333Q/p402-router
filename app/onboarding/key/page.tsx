/**
 * 3AZ-2-C — Onboarding Stage B (server shell).
 *
 * Server-side gates the page on session + onboarding status, then
 * delegates the interactive surface to OnboardingKeyClient.
 *
 * Per plan §4.3 Stage B: shown only when the user clicks "Take me to
 * my dashboard" on Stage A. Auto-generates an API key, displays it
 * once, and routes to /dashboard via completeOnboardingAction.
 *
 * Stage B is keyed to a single one-shot transition via
 * tenants.onboarded_at: once set, the gate redirects to /dashboard
 * and the user cannot re-enter without /onboarding?force=1 (deferred
 * to a later slice).
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getPostSigninDestination } from '@/lib/auth/postSigninDestination';
import { OnboardingKeyClient } from './_components/OnboardingKeyClient';

export const dynamic = 'force-dynamic';

export default async function OnboardingKeyPage() {
    const session = await getServerSession(authOptions);
    const tenantId = (session?.user as { tenantId?: string } | undefined)?.tenantId;
    if (!tenantId) redirect('/login');

    const destination = await getPostSigninDestination(tenantId);
    if (destination === '/dashboard') redirect('/dashboard');

    return <OnboardingKeyClient />;
}
