import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpendOverview } from '../SpendOverview';
import useSWR from 'swr';
import React from 'react';

// Mock SWR
vi.mock('swr', () => ({
    default: vi.fn(),
}));

// Mock the UI components used by SpendOverview
vi.mock('../ui', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        Card: ({ title, children, className }: any) => (
            <div data-testid="card" className={className} title={title}>
                {children}
            </div>
        ),
        Badge: ({ children, variant, className }: any) => (
            <span data-testid="badge" className={`${variant} ${className}`}>
                {children}
            </span>
        ),
        Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
    };
});

describe('SpendOverview', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render loading skeleton when data is loading', () => {
        vi.mocked(useSWR).mockReturnValue({ isLoading: true, data: undefined, error: undefined } as any);

        render(<SpendOverview />);
        expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    });

    it('should render error state when API fails', () => {
        vi.mocked(useSWR).mockReturnValue({ isLoading: false, data: undefined, error: new Error('401') } as any);

        render(<SpendOverview />);
        expect(screen.getByText(/Failed to load spend data/i)).toBeDefined();
    });

    it('should render spend data and verify Neo-Brutalist styles', () => {
        const mockData = {
            summary: {
                total_cost_usd: 125.50,
                total_requests: 1200,
                avg_latency_ms: 450
            },
            period: { days: 30 },
            by_provider: [],
            by_task: []
        };

        vi.mocked(useSWR).mockReturnValue({ isLoading: false, data: mockData, error: undefined } as any);

        render(<SpendOverview />);

        // Verify content
        expect(screen.getByText(/\$125\.50/)).toBeDefined();
        expect(screen.getByText(/1,200/)).toBeDefined();

        // Verify "Neo-Brutalist" constraint: Card must have border-2 border-black
        const card = screen.getByTestId('card');
        expect(card.className).toContain('border-2');
        expect(card.className).toContain('border-black');
    });
});
