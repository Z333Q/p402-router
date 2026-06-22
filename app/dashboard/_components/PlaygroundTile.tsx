'use client';

/**
 * 3AZ-2-E — Stage C "Try the Playground" tile.
 *
 * Pinned to the top of the dashboard root (/dashboard) on a tenant's
 * first visit until they either dismiss it or hit a meaningful
 * interaction tracked by DashboardTelemetry. After dismissal, never
 * re-shown on this device.
 *
 * Visibility gates (all must be true to render):
 *   - pathname === '/dashboard'
 *   - tenant has not explicitly dismissed the tile
 *   - tenant has not yet emitted funnel.dashboard_meaningful
 *
 * Plan §4.3 Stage C + §11.5.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, ArrowRight } from 'lucide-react';

const DISMISSED_KEY = 'p402_stage_c_dismissed';
const MEANINGFUL_KEY = 'p402_meaningful_interaction';

export function PlaygroundTile(): React.ReactElement | null {
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            setVisible(false);
            return;
        }
        if (pathname !== '/dashboard') {
            setVisible(false);
            return;
        }
        if (window.localStorage.getItem(DISMISSED_KEY) === '1') {
            setVisible(false);
            return;
        }
        if (window.localStorage.getItem(MEANINGFUL_KEY) === '1') {
            setVisible(false);
            return;
        }
        setVisible(true);
    }, [pathname]);

    if (!visible) return null;

    const handleDismiss = (): void => {
        try {
            window.localStorage.setItem(DISMISSED_KEY, '1');
        } catch {
            /* ignore quota/private-mode failures */
        }
        setVisible(false);
    };

    return (
        <div
            className="mb-6 border-4 border-black bg-[var(--primary)] shadow-[6px_6px_0px_0px_#000] p-5 md:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
            data-testid="stage-c-playground-tile"
        >
            <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-1 opacity-60">
                    First visit
                </div>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-black">
                    Try the Playground.
                </h3>
                <p className="text-sm font-medium text-black opacity-80 mt-1 leading-relaxed">
                    Route a real AI request and see where your spend goes. Two clicks. No setup.
                </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto">
                <Link
                    href="/dashboard/playground"
                    className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-black border-2 border-black text-white font-black text-[11px] uppercase tracking-widest hover:bg-white hover:text-black transition-colors no-underline"
                    data-meaningful-kind="playground"
                >
                    Open Playground
                    <ArrowRight size={14} />
                </Link>
                <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Dismiss"
                    className="p-2 text-black/60 hover:text-black transition-colors border-2 border-transparent hover:border-black"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
