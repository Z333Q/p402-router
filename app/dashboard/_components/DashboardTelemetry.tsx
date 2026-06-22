'use client';

/**
 * 3AZ-2-E — dashboard funnel telemetry.
 *
 * Mounts inside the dashboard layout. Emits two funnel events:
 *
 *   - funnel.dashboard_view  once per mount, with first_visit derived
 *                            from a localStorage flag. Closest to the
 *                            plan §8.3 contract that the runtime
 *                            allows without a server component on the
 *                            critical path.
 *
 *   - funnel.dashboard_meaningful  once per device, when the user
 *                                  navigates to a meaningful dashboard
 *                                  subpath (playground / settings /
 *                                  docs). Once emitted, the
 *                                  PlaygroundTile auto-hides.
 *
 * All emits are fire-and-forget against /api/v1/funnel/event. The
 * route swallows DB failures internally; analytics never blocks the
 * dashboard render path.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const FIRST_VISIT_KEY = 'p402_dashboard_first_visit_recorded';
const MEANINGFUL_KEY = 'p402_meaningful_interaction';

type MeaningfulKind = 'playground' | 'settings' | 'docs';

function inferMeaningfulKind(pathname: string | null): MeaningfulKind | null {
    if (!pathname) return null;
    if (pathname.startsWith('/dashboard/playground')) return 'playground';
    if (pathname.startsWith('/dashboard/settings')) return 'settings';
    if (pathname.startsWith('/dashboard/docs') || pathname.startsWith('/docs')) return 'docs';
    return null;
}

function emit(eventName: string, properties: Record<string, unknown> = {}): void {
    fetch('/api/v1/funnel/event', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventName, properties }),
    }).catch(() => {
        /* fire-and-forget */
    });
}

export function DashboardTelemetry(): null {
    const pathname = usePathname();

    // funnel.dashboard_view — once per mount.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        let recorded = false;
        try {
            recorded = window.localStorage.getItem(FIRST_VISIT_KEY) === '1';
        } catch {
            /* localStorage may throw in private mode */
        }
        emit('funnel.dashboard_view', { first_visit: !recorded });
        if (!recorded) {
            try {
                window.localStorage.setItem(FIRST_VISIT_KEY, '1');
            } catch {
                /* ignore */
            }
        }
    }, []);

    // funnel.dashboard_meaningful — first matching path-change per device.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        let already = false;
        try {
            already = window.localStorage.getItem(MEANINGFUL_KEY) === '1';
        } catch {
            /* ignore */
        }
        if (already) return;

        const kind = inferMeaningfulKind(pathname);
        if (!kind) return;

        try {
            window.localStorage.setItem(MEANINGFUL_KEY, '1');
        } catch {
            /* ignore */
        }
        emit('funnel.dashboard_meaningful', { kind });
    }, [pathname]);

    return null;
}
