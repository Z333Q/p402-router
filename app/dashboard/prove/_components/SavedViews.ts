/**
 * Slice 3G — Static saved-view presets.
 *
 * Each preset is a SearchFilters envelope plus a non-technical label. The
 * user picks one and the SearchBar applies it. No DB writes — presets are
 * shipped in code for 3G; a future slice can persist user presets.
 */

import type { SearchFilters } from '@/lib/prove/types';

function isoDaysAgo(days: number): string {
    const d = new Date(Date.now() - days * 86_400_000);
    return d.toISOString();
}

export interface SavedView {
    id: string;
    label: string;
    description: string;
    filters: () => SearchFilters;
}

export const SAVED_VIEWS: SavedView[] = [
    {
        id: 'denied-this-month',
        label: 'Denied events this month',
        description: 'Pre-routing Control denials over the last 30 days.',
        filters: () => ({
            governance_decision: 'denied',
            date_from: isoDaysAgo(30),
            sort_by: 'event_time',
            sort_dir: 'desc',
        }),
    },
    {
        id: 'missing-evidence',
        label: 'Missing evidence bundles',
        description: 'Events without an attached audit bundle.',
        filters: () => ({ evidence_status: 'missing', sort_by: 'event_time', sort_dir: 'desc' }),
    },
    {
        id: 'unattributed',
        label: 'Unattributed spend',
        description: 'Events with no department, employee, workflow, customer, feature, or API key.',
        filters: () => ({ attribution_status: 'unattributed', sort_by: 'cost_usd', sort_dir: 'desc' }),
    },
    {
        id: 'high-cost',
        label: 'High-cost events',
        description: 'Events with cost above $1, sorted by cost desc.',
        filters: () => ({ cost_min: 1, sort_by: 'cost_usd', sort_dir: 'desc' }),
    },
    {
        id: 'private-mode',
        label: 'Private-mode events',
        description: 'Events routed through private_gateway.',
        filters: () => ({ privacy_mode: 'private_gateway', sort_by: 'event_time', sort_dir: 'desc' }),
    },
    {
        id: 'department-budget-review',
        label: 'Department budget review',
        description: 'Last 30 days sorted by cost — pick a department to drill in.',
        filters: () => ({ date_from: isoDaysAgo(30), sort_by: 'cost_usd', sort_dir: 'desc' }),
    },
    {
        id: 'vendor-model-review',
        label: 'Vendor / model spend review',
        description: 'Last 30 days — pick a provider + model to drill in.',
        filters: () => ({ date_from: isoDaysAgo(30), sort_by: 'cost_usd', sort_dir: 'desc' }),
    },
    {
        id: 'procurement-audit',
        label: 'Procurement audit',
        description: 'Approved spend with evidence, last 90 days.',
        filters: () => ({
            date_from: isoDaysAgo(90),
            governance_decision: 'approved',
            evidence_status: 'present',
            sort_by: 'event_time', sort_dir: 'desc',
        }),
    },
    {
        id: 'executive-monthly',
        label: 'Executive monthly review',
        description: 'Last 30 days of all activity, sorted by cost.',
        filters: () => ({ date_from: isoDaysAgo(30), sort_by: 'cost_usd', sort_dir: 'desc' }),
    },
];

export const EXPORT_PRESETS = [
    {
        id: 'finance-review',
        label: 'Finance review',
        description: 'All events last 30 days; CSV.',
        format: 'csv' as const,
        params: () => ({ since: isoDaysAgo(30) } as Record<string, string>),
    },
    {
        id: 'procurement-review',
        label: 'Procurement review',
        description: 'Approved + evidence-present, last 90 days; CSV.',
        format: 'csv' as const,
        params: () => ({ since: isoDaysAgo(90), governance_decision: 'approved' } as Record<string, string>),
    },
    {
        id: 'department-budget',
        label: 'Department budget review',
        description: 'All events last 30 days; JSON.',
        format: 'json' as const,
        params: () => ({ since: isoDaysAgo(30) } as Record<string, string>),
    },
    {
        id: 'denied-only',
        label: 'Denied events only',
        description: 'governance_decision=denied; CSV.',
        format: 'csv' as const,
        params: () => ({ governance_decision: 'denied', since: isoDaysAgo(90) } as Record<string, string>),
    },
    {
        id: 'privacy-audit',
        label: 'Privacy audit',
        description: 'All privacy postures, last 30 days; CSV.',
        format: 'csv' as const,
        params: () => ({ since: isoDaysAgo(30) } as Record<string, string>),
    },
    {
        id: 'evidence-coverage',
        label: 'Evidence coverage audit',
        description: 'Last 30 days; CSV.',
        format: 'csv' as const,
        params: () => ({ since: isoDaysAgo(30) } as Record<string, string>),
    },
    {
        id: 'executive-summary',
        label: 'Executive summary',
        description: 'Last 30 days; JSON for charting.',
        format: 'json' as const,
        params: () => ({ since: isoDaysAgo(30) } as Record<string, string>),
    },
];
