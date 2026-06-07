'use client';
/**
 * Slice 3N — Unified page header.
 *
 * Reusable header pattern for every major dashboard page. Renders:
 *   - product area chip (Meter / Monitor / Control / Prove / Outcomes /
 *     Accountability)
 *   - plain-language title
 *   - one-sentence purpose
 *   - optional disclaimers (from lib/dashboard/language.ts)
 *   - primary actions ("next best action" links)
 *   - secondary actions
 *
 * Pure layout — no DB, no fetch.
 */

import React from 'react';
import Link from 'next/link';

export type ProductArea =
    | 'Mission Control'
    | 'Meter'
    | 'Monitor'
    | 'Control'
    | 'Prove'
    | 'Outcomes'
    | 'Accountability'
    | 'Operations'
    | 'Settings';

export interface PageAction {
    label: string;
    href: string;
    /** Used in tests to find a specific link reliably. */
    id?: string;
}

interface PageHeaderProps {
    /** Product area chip. */
    area: ProductArea;
    /** Plain-language title (uppercase by design, kept readable). */
    title: string;
    /** One-sentence purpose. */
    purpose: string;
    /**
     * Pre-formatted disclaimer strings. Prefer constants from
     * lib/dashboard/language.ts so the same wording appears everywhere.
     */
    disclaimers?: readonly string[];
    /** Primary next-best-action links. Rendered as buttons. */
    primary?: readonly PageAction[];
    /** Secondary action links. Rendered as underlined inline text. */
    secondary?: readonly PageAction[];
    /**
     * Optional breadcrumb row rendered at the very top of the header.
     * Pass the Breadcrumbs component itself or your own JSX.
     */
    breadcrumbs?: React.ReactNode;
}

export function PageHeader({
    area, title, purpose, disclaimers,
    primary, secondary, breadcrumbs,
}: PageHeaderProps) {
    return (
        <header className="space-y-3" data-testid="page-header" data-area={area}>
            {breadcrumbs}
            <div className="flex items-center gap-2">
                <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 border-2 border-black font-mono text-[10px] font-bold uppercase tracking-wide bg-neutral-100"
                    data-testid="page-header-area"
                >
                    {area}
                </span>
            </div>
            <h1 className="text-3xl font-extrabold uppercase tracking-tight" data-testid="page-header-title">{title}</h1>
            <p className="text-sm text-neutral-700 max-w-3xl" data-testid="page-header-purpose">{purpose}</p>

            {disclaimers && disclaimers.length > 0 && (
                <ul className="space-y-1" data-testid="page-header-disclaimers">
                    {disclaimers.map((d) => (
                        <li key={d} className="text-xs text-neutral-500 max-w-3xl">{d}</li>
                    ))}
                </ul>
            )}

            {(primary && primary.length > 0) || (secondary && secondary.length > 0) ? (
                <div className="flex flex-wrap gap-3 items-center pt-1" data-testid="page-header-actions">
                    {primary?.map((a) => (
                        <Link
                            key={a.href}
                            href={a.href}
                            data-testid={a.id ?? `primary-${a.href}`}
                            className="px-3 h-9 inline-flex items-center border-2 border-black font-bold uppercase text-[11px] hover:bg-neutral-100"
                        >
                            {a.label} →
                        </Link>
                    ))}
                    {secondary?.map((a) => (
                        <Link
                            key={a.href}
                            href={a.href}
                            data-testid={a.id ?? `secondary-${a.href}`}
                            className="underline text-[11px]"
                        >
                            {a.label}
                        </Link>
                    ))}
                </div>
            ) : null}
        </header>
    );
}
