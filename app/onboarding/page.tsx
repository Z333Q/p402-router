/**
 * 3AZ-2-D — Onboarding cutover.
 *
 * The pre-V5 onboarding flow (role selection, wallet pre-step, "gasless
 * USDC payments" copy) lived in this file from 3AZ-1 through 3AY-8R-3.
 * It is now replaced by Stage A (/onboarding/welcome) and Stage B
 * (/onboarding/key) per docs/internal/3AZ-2-onboarding-refresh-plan.md.
 *
 * This page is now a thin redirect so existing inbound links (the old
 * `callbackUrl: '/onboarding'`, /models page CTAs, etc.) continue to
 * work. Stage A's gates take it from there:
 *   - unauthenticated → /login
 *   - onboarded       → /dashboard
 *   - otherwise       → render Stage A
 */

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function OnboardingRedirectPage() {
    redirect('/onboarding/welcome');
}
