'use client';
/**
 * Slice 3P — Demo preview UI primitives.
 *
 *   - DemoPreviewBanner   — full-width banner that sits above page content
 *                            when ?demo=1 is active.
 *   - DemoDataDisclaimer  — short reminder rendered inline near data tiles.
 *   - EmptyLedgerStory    — empty-state component with CTAs into the
 *                            activation kit and Mission Control.
 *
 * Pure presentation. No DB. No fetch. Imports the canonical copy
 * constants from lib/demo/accountability-story so the wording stays in
 * lockstep with the demo data shape.
 */

import React from 'react';
import Link from 'next/link';

import {
    DEMO_PREVIEW_LABEL,
    DEMO_STORY_MODE_ENABLED_COPY,
} from '@/lib/demo/accountability-story';

export const DEMO_BANNER_TEST_ID = 'demo-preview-banner';

interface DemoPreviewBannerProps {
    /** Optional CTA href back to a production view. */
    exitHref?: string;
}

export function DemoPreviewBanner({ exitHref = '?' }: DemoPreviewBannerProps) {
    return (
        <div
            data-testid={DEMO_BANNER_TEST_ID}
            role="status"
            aria-live="polite"
            className="border-4 border-amber-700 bg-amber-50 text-amber-900 p-4 flex flex-wrap items-center gap-3"
        >
            <span
                className="inline-flex items-center gap-1 px-2 py-0.5 border-2 border-amber-700 bg-amber-700 text-amber-50 font-mono text-[10px] font-bold uppercase tracking-widest"
                aria-label="demo preview marker"
            >
                <span aria-hidden="true">●</span> {DEMO_PREVIEW_LABEL}
            </span>
            <p className="text-sm leading-snug grow min-w-[14rem]">{DEMO_STORY_MODE_ENABLED_COPY}</p>
            <Link
                href={exitHref}
                className="px-3 h-9 inline-flex items-center border-2 border-amber-700 text-[11px] font-bold uppercase tracking-wider hover:bg-amber-100"
            >
                Exit demo preview
            </Link>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Small inline reminder
// ─────────────────────────────────────────────────────────────────────────

export function DemoDataDisclaimer() {
    return (
        <p
            className="text-[10px] font-bold uppercase tracking-widest text-amber-800"
            data-testid="demo-data-disclaimer"
        >
            ● {DEMO_PREVIEW_LABEL} · example data · never written to your ledger
        </p>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Empty-ledger story (shown when a tenant has no events yet AND demo
// mode is NOT requested). The empty state invites the operator into the
// activation kit OR into the demo preview.
// ─────────────────────────────────────────────────────────────────────────

interface EmptyLedgerStoryProps {
    /** Title — defaults to a non-technical line. */
    title?: string;
    /** Plain-language body. */
    body?: string;
    /** Where the activation CTA points. */
    setupHref?: string;
    /** Demo preview href — typically the same URL with ?demo=1. */
    demoHref?: string;
}

export function EmptyLedgerStory({
    title = 'No economic events yet',
    body = 'P402 has not seen any AI requests for this tenant yet. Send your first request through the router or post a metering event, and Mission Control will start showing real data here.',
    setupHref = '/dashboard/prove/outcomes/setup',
    demoHref = '?demo=1',
}: EmptyLedgerStoryProps) {
    return (
        <div
            data-testid="empty-ledger-story"
            className="border-2 border-dashed border-neutral-400 p-6 bg-white space-y-4"
        >
            <h2 className="text-xl font-extrabold uppercase tracking-tight">{title}</h2>
            <p className="text-sm text-neutral-700 max-w-2xl">{body}</p>
            <ul className="text-xs text-neutral-700 space-y-1 list-disc ml-5">
                <li>Mission Control will show metering as soon as the first event lands.</li>
                <li>Prove turns events into audit-ready evidence; Outcomes tracks accepted / rejected results.</li>
                <li>Optimize recommendations remain blocked until outcome data is sufficient.</li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-2 border-t-2 border-black">
                <Link
                    href={setupHref}
                    className="px-3 h-9 inline-flex items-center border-2 border-black font-bold uppercase text-[11px] hover:bg-neutral-100"
                >
                    Send your first economic event →
                </Link>
                <Link
                    href="/dashboard/prove/outcomes/setup"
                    className="px-3 h-9 inline-flex items-center border-2 border-black font-bold uppercase text-[11px] hover:bg-neutral-100"
                >
                    Set up outcome capture →
                </Link>
                <Link
                    href="/dashboard"
                    className="px-3 h-9 inline-flex items-center border-2 border-black font-bold uppercase text-[11px] hover:bg-neutral-100"
                >
                    Review the product path →
                </Link>
                <Link
                    href={demoHref}
                    className="px-3 h-9 inline-flex items-center border-2 border-amber-700 text-amber-900 font-bold uppercase text-[11px] hover:bg-amber-50"
                >
                    Show a demo preview →
                </Link>
            </div>
        </div>
    );
}
