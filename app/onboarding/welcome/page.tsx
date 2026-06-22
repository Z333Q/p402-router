/**
 * 3AZ-2-C — Onboarding Stage A.
 *
 * Single-screen value orientation per plan §4.3. No role selection,
 * no wallet copy, no crypto language on the critical path. Three
 * value tiles tied to V5 outcomes; one primary CTA; one tertiary
 * scoping-call link.
 *
 * Server component:
 *   - Gates unauthenticated users to /login.
 *   - Gates onboarded users to /dashboard (via getPostSigninDestination,
 *     fail-open).
 *   - Emits funnel.onboarding_view server-side.
 *
 * The page makes no third-party network calls. The forbidden-token
 * source-shape test in __tests__/welcome-page.shape.test.ts asserts
 * none of the §6.1 tokens leak into the rendered source.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPostSigninDestination } from '@/lib/auth/postSigninDestination';
import { recordFunnelEvent } from '@/lib/analytics/funnel';

export const dynamic = 'force-dynamic';

const VALUE_TILES = [
    {
        title: 'See where your AI spend goes',
        body: 'Every request, every model, every customer. Metadata-first reporting you can show finance without leaking content.',
    },
    {
        title: 'Catch margin leaks before customers feel them',
        body: 'Customer-level cost and feature-level margin. Surface routes that quietly burn ROI before they erode trust.',
    },
    {
        title: 'Procurement-ready evidence for AI governance',
        body: 'Tenant-scoped audit log, retention controls, and a clean evidence trail. Built for the conversation that comes after legal asks.',
    },
];

export default async function OnboardingWelcomePage() {
    const session = await getServerSession(authOptions);
    const tenantId = (session?.user as { tenantId?: string } | undefined)?.tenantId;
    if (!tenantId) redirect('/login');

    const destination = await getPostSigninDestination(tenantId);
    if (destination === '/dashboard') redirect('/dashboard');

    recordFunnelEvent({
        eventName: 'funnel.onboarding_view',
        tenantId,
        properties: { stage: 'A' },
    }).catch(() => { /* fire-and-forget */ });

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 selection:bg-[var(--primary)] selection:text-black">
            <div className="mb-10 border-4 border-black bg-[var(--primary)] px-6 py-2 font-black text-3xl uppercase tracking-tighter text-black shadow-[6px_6px_0px_0px_#000]">
                P402.IO
            </div>

            <div className="max-w-5xl w-full bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 md:p-12">
                <h1 className="text-4xl font-black uppercase tracking-tight text-black">
                    You&apos;re in.
                </h1>
                <p className="font-mono text-neutral-500 mt-2 text-base">
                    Here&apos;s what P402 does for your AI spend.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 mb-10">
                    {VALUE_TILES.map((t) => (
                        <div
                            key={t.title}
                            className="border-4 border-black p-6 bg-neutral-50 flex flex-col gap-3"
                        >
                            <h3 className="font-black text-lg uppercase text-black tracking-tight">
                                {t.title}
                            </h3>
                            <p className="text-sm font-medium text-neutral-700 leading-relaxed">
                                {t.body}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-6 border-t-4 border-black">
                    <Link
                        href="/get-access?intent=scoping-call"
                        className="text-[11px] font-black uppercase tracking-widest text-neutral-500 hover:text-black transition-colors underline"
                    >
                        I&apos;d rather book a scoping call
                    </Link>
                    <Link
                        href="/onboarding/key"
                        className="inline-flex items-center justify-center h-12 px-8 bg-black border-2 border-black text-white font-black text-[11px] uppercase tracking-widest hover:bg-[var(--primary)] hover:text-black transition-colors no-underline"
                    >
                        Take me to my dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
