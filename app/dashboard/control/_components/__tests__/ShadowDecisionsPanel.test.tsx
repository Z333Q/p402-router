/**
 * Slice 3AA-Impl — ShadowDecisionsPanel rendering states.
 *
 * Pins:
 *   - loading skeleton
 *   - error state when fetch rejects
 *   - empty state when there are zero decisions
 *   - migration_pending state when the table is missing
 *   - data render shows code badges + recent rows
 *   - no mutation buttons exist (no PATCH/POST text)
 *   - no copy implies Optimize / savings / recommendation / auto-apply
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

import { ShadowDecisionsPanel } from '../ShadowDecisionsPanel';

vi.mock('@tanstack/react-query', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tanstack/react-query')>();
    return { ...actual, useQuery: vi.fn() };
});

vi.mock('../../../_components/ui', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {
        ...actual,
        Card: ({ title, children }: { title?: string; children?: React.ReactNode }) => (
            <section data-testid="card" aria-label={title}>{children}</section>
        ),
        EmptyState: ({ title, body }: { title?: string; body?: string }) => (
            <div data-testid="empty">{title} {body}</div>
        ),
        ErrorState: ({ title, message }: { title?: string; message?: string }) => (
            <div data-testid="error">{title} {message}</div>
        ),
        Skeleton: () => <div data-testid="skeleton" />,
        Badge: ({ children }: { children?: React.ReactNode }) => (
            <span data-testid="badge">{children}</span>
        ),
    };
});

function withQueryClient(children: React.ReactNode) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    vi.mocked(useQuery).mockReset();
});

describe('ShadowDecisionsPanel — render states', () => {
    it('loading → skeleton', () => {
        vi.mocked(useQuery).mockReturnValue({ isLoading: true, isError: false, data: undefined, error: null } as never);
        render(withQueryClient(<ShadowDecisionsPanel />));
        expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    });

    it('error → ErrorState', () => {
        vi.mocked(useQuery).mockReturnValue({
            isLoading: false, isError: true, data: undefined, error: new Error('boom'),
        } as never);
        render(withQueryClient(<ShadowDecisionsPanel />));
        expect(screen.getByTestId('error')).toBeDefined();
    });

    it('migration_pending → EmptyState with persistence-not-enabled copy', () => {
        vi.mocked(useQuery).mockReturnValue({
            isLoading: false, isError: false, error: null,
            data: {
                migration_pending: true,
                window: { since: 's', until: 'u' },
                byAxis: [], byCode: [], topGaps: [], recent: [],
            },
        } as never);
        render(withQueryClient(<ShadowDecisionsPanel />));
        const empty = screen.getByTestId('empty');
        expect(empty.textContent).toMatch(/Persistence not yet enabled/i);
    });

    it('empty window → EmptyState', () => {
        vi.mocked(useQuery).mockReturnValue({
            isLoading: false, isError: false, error: null,
            data: {
                migration_pending: false,
                window: { since: 's', until: 'u' },
                byAxis: [], byCode: [], topGaps: [], recent: [],
            },
        } as never);
        render(withQueryClient(<ShadowDecisionsPanel />));
        expect(screen.getByTestId('empty').textContent).toMatch(/No shadow decisions/i);
    });

    it('data → code badges and recent rows render', async () => {
        vi.mocked(useQuery).mockReturnValue({
            isLoading: false, isError: false, error: null,
            data: {
                migration_pending: false,
                window: { since: 's', until: 'u' },
                byAxis: [{ axis: 'allowed_models', hour: '2026-06-15T10:00:00Z', n: 2 }],
                byCode: [{ code: 'MODEL_NOT_ALLOWED', n: 2 }],
                topGaps: [],
                recent: [{
                    emitted_at: '2026-06-15T10:01:00Z',
                    axis: 'allowed_models',
                    code: 'MODEL_NOT_ALLOWED',
                    configured_value: ['openai/gpt-4o'],
                    observed_value: 'deepseek/deepseek-chat',
                    model_requested: 'deepseek/deepseek-chat',
                    request_id: 'r1',
                }],
            },
        } as never);
        render(withQueryClient(<ShadowDecisionsPanel />));
        await waitFor(() => {
            expect(screen.getByTestId('badge').textContent).toMatch(/MODEL_NOT_ALLOWED/);
        });
        expect(screen.getAllByText('deepseek/deepseek-chat').length).toBeGreaterThan(0);
    });
});

describe('ShadowDecisionsPanel — copy / mutation guards', () => {
    const SRC = require('node:fs').readFileSync(
        require('node:path').resolve(process.cwd(), 'app/dashboard/control/_components/ShadowDecisionsPanel.tsx'),
        'utf8',
    ) as string;

    it('no PATCH or POST text', () => {
        expect(SRC).not.toMatch(/method:\s*['"]PATCH['"]/);
        expect(SRC).not.toMatch(/method:\s*['"]POST['"]/);
    });

    it('does not contain Optimize / savings / recommendation / auto-apply copy', () => {
        for (const banned of [
            'optimize', 'savings', 'recommendation', 'auto-apply', 'auto_apply', 'savings_proof',
        ]) {
            expect(SRC.toLowerCase()).not.toContain(banned.toLowerCase());
        }
    });

    it('does not reference p402:tcs:enforce', () => {
        expect(SRC).not.toMatch(/p402:tcs:enforce/);
    });
});
