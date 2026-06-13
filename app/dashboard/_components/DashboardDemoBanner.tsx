'use client';
/**
 * Slice 3R-A: shared demo-mode shell for the five gap dashboard surfaces
 * that did not previously honor ?demo=1.
 *
 * Purely additive. When demo mode is off this component renders nothing;
 * the surface's live data path is untouched. When demo mode is on it
 * renders:
 *
 *   1. The shared DemoPreviewBanner (safety chips + scenario pill +
 *      framing disclaimer + scenario switcher).
 *   2. A surface-specific readiness note that re-asserts the invariant
 *      for the surface (Settle never executes, Publish never publishes,
 *      Meter events never fabricate fixture rows, Control never writes
 *      a policy).
 *
 * Does not fetch. Does not query. Does not change product behavior.
 */
import { useSearchParams, usePathname } from 'next/navigation';

import { DemoPreviewBanner } from './DemoPreview';
import { isDemoMode } from '@/lib/demo/accountability-story';
import { getDemoScenario } from '@/lib/demo/scenarios';

type Surface = 'meter-events' | 'control' | 'settle' | 'publish';

interface SurfaceNote {
    title: string;
    body: string;
    chips: readonly string[];
}

const SURFACE_NOTES: Record<Surface, SurfaceNote> = {
    'meter-events': {
        title: 'Meter · Events in demo preview',
        body: 'Demo mode does not fabricate economic-event rows. The canonical fixture exposes single-event detail records, not list-shaped meter rows, so the list below stays empty. Filters are inert in demo mode; switch back to live mode to query your real ledger.',
        chips: [
            'No synthetic event rows',
            'Filters disabled in demo mode',
            'Live ledger queries paused',
        ],
    },
    control: {
        title: 'Control · Readiness in demo preview',
        body: 'Demo mode shows scenario framing only. Control does not write policies, change budget caps, or apply runtime enforcement in demo mode. The simulator and live panels remain backed by your real data path.',
        chips: [
            'No policy writes',
            'No runtime enforcement change',
            'Simulator is read-only',
        ],
    },
    settle: {
        title: 'Settle · Readiness in demo preview',
        body: 'Demo mode is read-only context. No settlement is executed, no receipt is generated, no transaction hash is fabricated. The live Settle page below still reads the tenant-scoped processed_tx_hashes ledger only.',
        chips: [
            'No settlement execution',
            'No receipt generation',
            'No fabricated tx hash',
        ],
    },
    publish: {
        title: 'Publish · Readiness in demo preview',
        body: 'Demo mode is read-only context. No external publishing is performed, no facilitator endpoint is exposed, no Bazaar entry is created. The live Publish page below still shows tenant-scoped facilitator counts only.',
        chips: [
            'No external publishing',
            'No facilitator endpoint exposure',
            'No Bazaar entry creation',
        ],
    },
};

export function DashboardDemoBanner({ surface }: { surface: Surface }) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const demoActive = isDemoMode(searchParams);
    if (!demoActive) return null;

    const scenario = getDemoScenario(searchParams);
    const note = SURFACE_NOTES[surface];

    return (
        <div className="space-y-3 mb-6" data-testid={`demo-shell-${surface}`}>
            <DemoPreviewBanner scenario={scenario} pathname={pathname ?? undefined} />
            <div
                className="border-2 border-amber-700 bg-white text-amber-900 p-4 space-y-2"
                data-testid={`demo-surface-note-${surface}`}
            >
                <div className="text-[11px] font-black uppercase tracking-widest">
                    {note.title}
                </div>
                <p className="text-[13px] leading-relaxed">{note.body}</p>
                <ul className="flex flex-wrap gap-1.5">
                    {note.chips.map((chip) => (
                        <li
                            key={chip}
                            className="inline-flex items-center gap-1 px-2 py-0.5 border-2 border-amber-700 bg-amber-50 font-mono text-[10px] font-bold uppercase tracking-wider"
                        >
                            <span aria-hidden="true">•</span> {chip}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
