'use client';
/**
 * Slice 3N — Breadcrumbs.
 *
 * Renders deep-page breadcrumbs above the page title. Pass the trail in
 * order from root to current. The last item is rendered as plain text
 * (the current page); the rest are links.
 */

import React from 'react';
import Link from 'next/link';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: readonly BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
    if (items.length === 0) return null;
    return (
        <nav className="flex items-center flex-wrap gap-2 text-xs" aria-label="Breadcrumb" data-testid="breadcrumbs">
            {items.map((it, i) => {
                const isLast = i === items.length - 1;
                return (
                    <React.Fragment key={`${it.label}-${i}`}>
                        {it.href && !isLast ? (
                            <Link href={it.href} className="underline">{it.label}</Link>
                        ) : (
                            <span className={isLast ? 'font-mono' : ''} aria-current={isLast ? 'page' : undefined}>
                                {it.label}
                            </span>
                        )}
                        {!isLast && <span className="text-neutral-400">/</span>}
                    </React.Fragment>
                );
            })}
        </nav>
    );
}
